const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: null,
      minlength: 8,
    },

    googleId: {
      type: String,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    resetPasswordToken: { type: String, default: null, index: true },
    resetPasswordExpire: { type: Date, default: null },
    resetPasswordUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);