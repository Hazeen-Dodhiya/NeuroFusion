const MRI = require("../models/MRI");
const drive = require("../config/googleDrive");
const { Readable } = require("stream");
exports.getMRIResults = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔥 get all MRIs of this user (latest first)
    const mris = await MRI.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id fileName prediction probabilities analysedAt fileUrl heatmapUrl heatmapFileId");

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
    try {
      if (mri.heatmapFileId) {
        await drive.files.delete({
          fileId: mri.heatmapFileId,
        });
      }
    } catch (err) {
      console.error("❌ Heatmap delete failed:", err.message);
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

// exports.uploadMRI = async (req, res) => {
//   try {
//     const file = req.file;
//     const userId = req.user._id;

//     if (!file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     // ==============================
//     // 🧠 STEP 0: GET OR CREATE USER FOLDER
//     // ==============================
//     const folderName = userId.toString();

//     const folderQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

//     let folderRes = await drive.files.list({
//       q: folderQuery,
//       fields: "files(id, name)",
//     });

//     let userFolderId;

//     if (folderRes.data.files.length > 0) {
//       userFolderId = folderRes.data.files[0].id;
//     } else {
//       const folder = await drive.files.create({
//         requestBody: {
//           name: folderName,
//           mimeType: "application/vnd.google-apps.folder",
//           parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
//         },
//       });

//       userFolderId = folder.data.id;
//     }

//     // ==============================
//     // 🧠 STEP 1: Upload to Google Drive
//     // ==============================

//     const count = await MRI.countDocuments({ userId });
//     const uploadNumber = count + 1;

//     const fileName = `MRI_${userId}_${uploadNumber}`;
//     const stream = Readable.from(file.buffer);

//     const driveUpload = await drive.files.create({
//       requestBody: {
//         name: fileName,
//         parents: [userFolderId], // 🔥 ONLY CHANGE HERE
//       },
//       media: {
//         mimeType: file.mimetype,
//         body: stream,
//       },
//     });

//     const fileId = driveUpload.data.id;

//     const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

//     // ==============================
//     // 🧠 STEP 2: Save in DB
//     // ==============================

//     const newMRI = await MRI.create({
//       userId,
//       originalName: file.originalname,
//       fileName,
//       filePath: fileId,
//       fileUrl,
//       uploadNumber,
//     });

//     // ==============================
//     // 🧠 STEP 3: Download file from Drive
//     // ==============================

//     const driveDownload = await drive.files.get(
//       {
//         fileId: fileId,
//         alt: "media",
//       },
//       { responseType: "arraybuffer" }
//     );

//     const fileBuffer = Buffer.from(driveDownload.data);

//     // ==============================
//     // 🧠 STEP 4: Send to HuggingFace model
//     // ==============================

//     const form = new FormData();

//     form.append(
//       "file",
//       new Blob([fileBuffer]),
//       file.originalname
//     );

//     form.append("xai_method", "Attention Rollout");
//     form.append("top_k", "6");

//     const hfResponse = await fetch(
//       "https://hehehanz-4156-1-slicevit.hf.space/api/explain",
//       {
//         method: "POST",
//         body: form,
//       }
//     );

//     const result = await hfResponse.json();

//     // ==============================
//     // 🧠 STEP 5: SAVE RESULT
//     // ==============================

//     newMRI.prediction = result.prediction;
//     newMRI.probabilities = result.probabilities;
//     newMRI.analysedAt = new Date();

//     await newMRI.save();

//     // ==============================
//     // 🧠 STEP 6: RESPONSE
//     // ==============================

//     return res.status(201).json({
//       success: true,
//       message: "MRI uploaded successfully",
//       mri: newMRI,
//     });

//   } catch (err) {
//     console.error("❌ ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// };



exports.uploadMRI = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ==============================
    // 🧠 STEP 0: GET OR CREATE USER FOLDER
    // ==============================
    const folderName = userId.toString();

    const folderQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    let folderRes = await drive.files.list({
      q: folderQuery,
      fields: "files(id, name)",
    });

    let userFolderId;

    if (folderRes.data.files.length > 0) {
      userFolderId = folderRes.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
      });

      userFolderId = folder.data.id;
    }

    // ==============================
    // 🧠 STEP 1: UPLOAD MRI
    // ==============================
    const count = await MRI.countDocuments({ userId });
    const uploadNumber = count + 1;

    const fileName = `MRI_${userId}_${uploadNumber}`;
    const stream = Readable.from(file.buffer);

    const driveUpload = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [userFolderId],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
    });

    const fileId = driveUpload.data.id;
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

    // ==============================
    // 🧠 STEP 2: CREATE DB ENTRY
    // ==============================
    const newMRI = await MRI.create({
      userId,
      originalName: file.originalname,
      fileName,
      filePath: fileId,
      fileUrl,
      uploadNumber,
    });

    // ==============================
    // 🧠 STEP 3: SEND TO MODEL (NO NEED TO REDOWNLOAD 🔥)
    // ==============================
    const form = new FormData();

    form.append(
      "file",
      new Blob([file.buffer]), // 🔥 direct use (optimized)
      file.originalname
    );

    form.append("xai_method", "GradCAM");
    form.append("top_k", "6");

    const hfResponse = await fetch(
      "https://hehehanz-4156-1-slicevit.hf.space/api/explain",
      {
        method: "POST",
        body: form,
      }
    );

    const result = await hfResponse.json();

    // ==============================
    // 🧠 STEP 4: HANDLE HEATMAP
    // ==============================
    let heatmapUrl = null;
    let heatmapFileId = null;

    if (result.heatmap_png) {
      const heatmapBuffer = Buffer.from(result.heatmap_png, "base64");

      const heatmapStream = Readable.from(heatmapBuffer);

      const heatmapFileName = `prediction_mri_${uploadNumber}.png`;

      const heatmapUpload = await drive.files.create({
        requestBody: {
          name: heatmapFileName,
          parents: [userFolderId],
        },
        media: {
          mimeType: "image/png",
          body: heatmapStream,
        },
      });

      heatmapFileId = heatmapUpload.data.id;
      heatmapUrl = `https://drive.google.com/uc?id=${heatmapFileId}`;
    }

    // ==============================
    // 🧠 STEP 5: SAVE RESULT
    // ==============================
    newMRI.prediction = result.prediction;
    newMRI.probabilities = result.probabilities;
    newMRI.xaiMethod = result.xai_method;
    newMRI.topSlices = result.top_slices;
    newMRI.heatmapUrl = heatmapUrl;
    newMRI.heatmapFileId = heatmapFileId;
    newMRI.analysedAt = new Date();

    await newMRI.save();

    // ==============================
    // 🧠 STEP 6: RESPONSE
    // ==============================
    return res.status(201).json({
      success: true,
      message: "MRI uploaded and analyzed successfully",
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