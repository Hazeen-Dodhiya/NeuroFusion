const { Client } = require("@gradio/client");
const NodeFormData = require("form-data");
const https = require("https");

// Promisified https POST that works with form-data
function httpsPost(url, form) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: "POST",
      headers: form.getHeaders(),
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on("error", reject);
    form.pipe(req);
  });
}

exports.uploadMRI = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("Received file:", file.originalname, "size:", file.size);

    // ── Step 1: Upload file to Gradio /upload endpoint ──
    const form = new NodeFormData();
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: "application/octet-stream",
    });

    console.log("Uploading to Gradio...");

    const uploadResponse = await httpsPost(
      "https://hehehanz-4156-1-slicevit.hf.space/upload",
      form
    );

    console.log("Upload status:", uploadResponse.status);
    console.log("Upload body:", uploadResponse.body);

    if (uploadResponse.status !== 200) {
      throw new Error(`Gradio upload failed: ${uploadResponse.status} — ${uploadResponse.body}`);
    }

    const uploadedPaths = JSON.parse(uploadResponse.body);
    console.log("Gradio upload success:", uploadedPaths);

    if (!uploadedPaths || uploadedPaths.length === 0) {
      throw new Error("Gradio returned empty upload paths");
    }

    // ── Step 2: Run prediction ──
    console.log("Connecting to Gradio client...");
    const client = await Client.connect("hehehanz-4156-1/slicevit");

    console.log("Running prediction...");
    const result = await client.predict("/analyse", [
      { path: uploadedPaths[0], orig_name: file.originalname },
      "Attention Rollout",
      6,
    ]);

    console.log("RESULT:", result.data);

    const [markdownResult, probabilities, heatmap] = result.data;

    return res.json({
      success: true,
      markdownResult,
      probabilities,
      heatmap,
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
// const MRI = require("../models/MRI");
// const drive = require("../config/googleDrive");
// const { Readable } = require("stream");

// exports.uploadMRI = async (req, res) => {
//   try {
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     // ✅ Allowed file types
//     const allowedExtensions = [".nii", ".nii.gz", ".npz", ".dcm"];

//     const isValid = allowedExtensions.some(ext =>
//       file.originalname.toLowerCase().endsWith(ext)
//     );

//     if (!isValid) {
//       return res.status(400).json({
//         message: "Invalid file type. Only .nii, .nii.gz, .npz, .dcm allowed",
//       });
//     }

//     console.log("Uploading file:", file.originalname);
//     console.log("File size:", file.size);

//     // 🔹 Convert buffer → base64
//     const base64File = file.buffer.toString("base64");

//     // 🔹 Send to Hugging Face (NO IMPORT NEEDED)
//     const response = await fetch(
//     "https://hehehanz-4156-1-slicevit.hf.space/run/predict",
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         data: [
//           {
//             name: file.originalname,
//             data: base64File,   // ❌ NO prefix
//           },
//           "Attention Rollout",
//           6,
//         ],
//       }),
//     }
//   );

//     // 🔥 Read raw response for debugging
//     const text = await response.text();
//     console.log("RAW RESPONSE:", text);

//     let json;
//     try {
//       json = JSON.parse(text);
//     } catch (err) {
//       throw new Error("Invalid JSON response from model");
//     }

//     if (!json.data) {
//       throw new Error("Model did not return expected data");
//     }

//     const [markdownResult, probabilities, heatmap] = json.data;

//     // 🔥 Console output
//     console.log("=== MRI ANALYSIS RESULT ===");
//     console.log("Markdown:", markdownResult);
//     console.log("Probabilities:", probabilities);

//     return res.status(200).json({
//       success: true,
//       message: "MRI analysed successfully",
//       result: {
//         markdown: markdownResult,
//         probabilities,
//       },
//     });

//   } catch (err) {
//     console.error("❌ ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to analyse MRI",
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