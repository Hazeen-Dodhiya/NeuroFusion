const MRI = require("../models/MRI");
const drive = require("../config/googleDrive");
const { Readable } = require("stream");
const axios = require("axios");

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

    const driveRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
    });

    const fileId = driveRes.data.id;

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
    // 🧠 STEP 3: Download SAME file from Drive
    // ==============================

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const fileRes = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });

    const fileBuffer = Buffer.from(fileRes.data);

    // ==============================
    // 🧠 STEP 4: Send to HuggingFace model
    // ==============================

    const form = new FormData();

    form.append("file", new Blob([fileBuffer]), file.originalname);
    form.append("xai_method", "Attention Rollout");
    form.append("top_k", "6");

    const response = await fetch(
      "https://hehehanz-4156-1-slicevit.hf.space/api/predict",
      {
        method: "POST",
        body: form,
      }
    );

    const result = await response.json();

    // ==============================
    // 🧠 STEP 5: LOG RESULT
    // ==============================

    console.log("=== MRI ANALYSIS RESULT ===");
    console.log("Prediction:", result.prediction);
    console.log("Probabilities:", result.probabilities);

    // ==============================
    // 🧠 STEP 6: Respond to frontend
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