const mongoose = require("mongoose");

// const mriSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     originalName: {
//       type: String,
//       required: true,
//     },

//     fileName: {
//       type: String,
//       required: true,
//     },

//     filePath: {
//       type: String,
//       required: true,
//     },

//     fileUrl: {
//       type: String,
//       required: true,
//     },

//     uploadNumber: {
//       type: Number,
//       required: true,
//     },

//     prediction: {
//       label: {
//         type: String,
//       },
//       label_index: {
//         type: Number,
//       },
//     },

//     probabilities: {
//       type: Map,
//       of: Number, // dynamic keys like "CN", "PAD"
//     },

//     analysedAt: {
//       type: Date,
//     },

//   },
//   { timestamps: true }
// );

const mriSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String, // Google Drive file ID
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    uploadNumber: {
      type: Number,
      required: true,
    },

    // ==============================
    // 🧠 MODEL OUTPUT
    // ==============================

    prediction: {
      label: {
        type: String,
      },
      label_index: {
        type: Number,
      },
    },

    probabilities: {
      type: Map,
      of: Number,
    },

    // ==============================
    // 🧠 EXPLAINABILITY (NEW)
    // ==============================

    xaiMethod: {
      type: String, // e.g. "GradCAM"
    },

    topSlices: [
      {
        slice_index: Number,
      },
    ],

    heatmapUrl: {
      type: String, // Google Drive URL of heatmap image
    },

    // (optional but VERY useful)
    heatmapFileId: {
      type: String, // store Drive fileId separately
    },

    // ==============================
    analysedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MRI", mriSchema);
