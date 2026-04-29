const mongoose = require("mongoose");

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
      type: String,
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
      of: Number, // dynamic keys like "CN", "PAD"
    },

    analysedAt: {
      type: Date,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("MRI", mriSchema);





// const mongoose = require("mongoose");

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
//       type: String, // Google Drive file ID or URL
//       required: true,
//     },

//     fileUrl: {
//         type : String,
//         required: true
//     },

//     uploadNumber: {
//       type: Number, // 1, 2, 3...
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("MRI", mriSchema);