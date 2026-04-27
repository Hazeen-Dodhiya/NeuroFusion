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

    // 🧠 STEP 1: count previous uploads
    const count = await MRI.countDocuments({ userId });

    const uploadNumber = count + 1;

    // 🧠 STEP 2: generate file name
    const fileName = `MRI_${userId}_${uploadNumber}`;

    // 🧠 STEP 3: stream file
    const stream = Readable.from(file.buffer);

    // 🧠 STEP 4: upload to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
    });
    const fileUrl = `https://drive.google.com/file/d/${response.data.id}/view`;

    // 🧠 STEP 5: save in DB
    const newMRI = await MRI.create({
      userId,
      originalName: file.originalname,
      fileName,
      filePath: response.data.id, // Drive file ID
      fileUrl,
      uploadNumber,
    });

    res.status(201).json({
      message: "MRI uploaded successfully",
      mri: newMRI,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};