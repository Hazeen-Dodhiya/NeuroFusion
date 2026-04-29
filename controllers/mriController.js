const MRI = require("../models/MRI");
const drive = require("../config/googleDrive");
const { Readable } = require("stream");

exports.uploadMRI = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ==============================
    // 🧠 STEP 1: Upload to Google Drive
    // ==============================

    const count = await MRI.countDocuments({ userId });
    const uploadNumber = count + 1;

    const fileName = `MRI_${userId}_${uploadNumber}`;
    const stream = Readable.from(file.buffer);

    const driveUpload = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
    });

    const fileId = driveUpload.data.id;

    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

    // ==============================
    // 🧠 STEP 2: Save in DB
    // ==============================

    const newMRI = await MRI.create({
      userId,
      originalName: file.originalname,
      fileName,
      filePath: fileId, // 🔥 IMPORTANT
      fileUrl,
      uploadNumber,
    });

    // ==============================
    // 🧠 STEP 3: Download file from Drive (CORRECT WAY)
    // ==============================

    const driveDownload = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    const fileBuffer = Buffer.from(driveDownload.data);

    // ==============================
    // 🧠 STEP 4: Send to HuggingFace model
    // ==============================

    const form = new FormData();

    form.append(
      "file",
      new Blob([fileBuffer]),
      file.originalname // keeps extension (.npz, .nii, etc)
    );

    form.append("xai_method", "Attention Rollout");
    form.append("top_k", "6");

    const hfResponse = await fetch(
      "https://hehehanz-4156-1-slicevit.hf.space/api/predict",
      {
        method: "POST",
        body: form,
      }
    );

    const result = await hfResponse.json();
    // 🔥 SAVE RESULT IN DB
    newMRI.prediction = result.prediction;
    newMRI.probabilities = result.probabilities;
    newMRI.analysedAt = new Date();

    await newMRI.save();
    // ==============================
    // 🧠 STEP 5: LOG RESULT (THIS WAS YOUR ISSUE BEFORE)
    // ==============================

    // ==============================
    // 🧠 STEP 6: RESPONSE TO FRONTEND
    // ==============================

    return res.status(201).json({
      success: true,
      message: "MRI uploaded successfully",
      mri: newMRI,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};



exports.getMRIResults = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔥 get all MRIs of this user (latest first)
    const mris = await MRI.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id fileName prediction probabilities analysedAt fileUrl");

    if (!mris.length) {
      return res.status(404).json({
        success: false,
        message: "No MRI results found",
      });
    }

    return res.json({
      success: true,
      count: mris.length,
      results: mris,
    });

  } catch (err) {
    console.error("ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


// exports.deleteMRI = async (req, res) => {
//   try {
//     const userId = req.user.id; // from JWT middleware
//     const { id } = req.body;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "MRI id required",
//       });
//     }

//     const mri = await MRI.findById(id);

//     if (!mri) {
//       return res.status(404).json({
//         success: false,
//         message: "MRI not found",
//       });
//     }

//     // 🔒 IMPORTANT: match with your schema (userId)
//     if (mri.userId.toString() !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     await MRI.findByIdAndDelete(id);

//     res.json({
//       success: true,
//       message: "MRI deleted successfully",
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// }

exports.deleteMRI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "MRI id required",
      });
    }

    const mri = await MRI.findById(id);

    if (!mri) {
      return res.status(404).json({
        success: false,
        message: "MRI not found",
      });
    }

    // 🔒 ownership check
    if (mri.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ==============================
    // 🗑 STEP 1: Delete from Google Drive
    // ==============================
    try {
      await drive.files.delete({
        fileId: mri.filePath, // ✅ this is your Google Drive fileId
      });
    } catch (driveErr) {
      console.error("Google Drive delete failed:", driveErr.message);
      // You can choose to continue or stop here
    }

    // ==============================
    // 🗑 STEP 2: Delete from MongoDB
    // ==============================
    await MRI.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "MRI deleted successfully (Drive + DB)",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











// const axios = require("axios");

// // ❗ DO NOT use form-data package

// exports.uploadMRI = async (req, res) => {
//   try {
//     const FILE_ID = "1T45lOt3Mnh2RBt0la48LZecaOzF7Plmh";

//     const url = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;

//     // download file
//     const fileRes = await axios.get(url, {
//       responseType: "arraybuffer",
//     });

//     const fileBuffer = Buffer.from(fileRes.data);

//     // 🔥 USE fetch FormData (native)
//     const form = new FormData();

//     form.append(
//       "file",
//       new Blob([fileBuffer]),
//       "mri.npz"
//     );

//     form.append("xai_method", "Attention Rollout");
//     form.append("top_k", "6");

//     const response = await fetch(
//       "https://hehehanz-4156-1-slicevit.hf.space/api/predict",
//       {
//         method: "POST",
//         body: form, // NO headers needed
//       }
//     );

//     const json = await response.json();

//     console.log("RAW RESPONSE:", json);

//     return res.json(json);

//   } catch (err) {
//     console.error("ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// };

// exports.uploadMRI = async (req, res) => {
//   try {
//     const file = req.file;
//     const userId = req.user._id;

//     if (!file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     // 🧠 STEP 1: count previous uploads
//     const count = await MRI.countDocuments({ userId });

//     const uploadNumber = count + 1;

//     // 🧠 STEP 2: generate file name
//     const fileName = `MRI_${userId}_${uploadNumber}`;

//     // 🧠 STEP 3: stream file
//     const stream = Readable.from(file.buffer);

//     // 🧠 STEP 4: upload to Google Drive
//     const response = await drive.files.create({
//       requestBody: {
//         name: fileName,
//         parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
//       },
//       media: {
//         mimeType: file.mimetype,
//         body: stream,
//       },
//     });
//     const fileUrl = `https://drive.google.com/file/d/${response.data.id}/view`;

//     // 🧠 STEP 5: save in DB
//     const newMRI = await MRI.create({
//       userId,
//       originalName: file.originalname,
//       fileName,
//       filePath: response.data.id, // Drive file ID
//       fileUrl,
//       uploadNumber,
//     });

//     res.status(201).json({
//       message: "MRI uploaded successfully",
//       mri: newMRI,
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };