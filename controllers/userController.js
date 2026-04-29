const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto')
const nodemailer = require('nodemailer')

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    user = new User({
      first_name,
      last_name,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE USER PROFILE (name, email, password)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { first_name, last_name, email, password } = req.body;

    // find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // update fields only if provided
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (email) user.email = email;

    // if password is provided, hash it
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//forget pass
exports.forgotPassword = async (req, res) => {
  try {
    console.log("📩 Forgot password request received");

    const { email } = req.body;
    console.log("➡️ Email received:", email);

    // ==============================
    // 🔍 Find user
    // ==============================
    const user = await User.findOne({ email });

    console.log("👤 User found:", user ? user.email : "NOT FOUND");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ==============================
    // 🔐 Generate token
    // ==============================
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    console.log("🔑 Reset token generated");

    // reset previous tokens
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    user.resetPasswordUsed = false;

    await user.save();

    console.log("💾 Token saved in DB");

    // ==============================
    // 🔗 Reset link
    // ==============================
    const resetLink = `https://neurofusion.me/reset-password/${resetToken}`;
    console.log("🔗 Reset link:", resetLink);

    // ==============================
    // 📧 Setup transporter
    // ==============================
    console.log("📧 Setting up transporter...");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
    console.log(
      "📧 EMAIL_PASS:",
      process.env.EMAIL_PASS ? "EXISTS ✅" : "MISSING ❌"
    );

    // ==============================
    // 🧪 Verify SMTP connection
    // ==============================
    try {
      await transporter.verify();
      console.log("✅ SMTP server is ready");
    } catch (verifyErr) {
      console.error("❌ SMTP verification failed:", verifyErr.message);
    }

    // ==============================
    // 📤 Send email
    // ==============================
    console.log("📤 Sending email...");

    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Reset Password",
        html: `
          <h2>Password Reset Request</h2>
          <p>Click below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link expires in 10 minutes.</p>
        `,
      });

      console.log("✅ Email sent:", info.response);

    } catch (mailErr) {
      console.error("❌ Email sending failed:", mailErr);
      return res.status(500).json({
        error: "Email failed to send",
        details: mailErr.message,
      });
    }

    // ==============================
    // ✅ Final response
    // ==============================
    res.json({ message: "Reset link sent to email" });

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // reset only if not already active (optional cleanup safety)
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
//     user.resetPasswordUsed = false;

//     const resetToken = crypto.randomBytes(32).toString("hex");

//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(resetToken)
//       .digest("hex");

//     user.resetPasswordToken = hashedToken;
//     user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

//     await user.save();

//     // const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
//     const resetLink = `https://neurofusion.me/reset-password/${resetToken}`;
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: user.email,
//       subject: "Reset Password",
//       html: `
//         <h2>Password Reset Request</h2>
//         <p>Click below to reset your password:</p>
//         <a href="${resetLink}">${resetLink}</a>
//         <p>This link expires in 10 minutes.</p>
//       `,
//     });

//     res.json({ message: "Reset link sent to email" });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

//reset link
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "invalid_or_used_token" });
    }

    // 🔥 CHECK IF ALREADY USED
    if (user.resetPasswordUsed) {
      return res.status(400).json({ message: "token_already_used" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 🔥 MARK AS USED (IMPORTANT)
    user.resetPasswordUsed = true;

    // clear token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//verify token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "invalid_or_used_token",
      });
    }

    if (user.resetPasswordUsed) {
      return res.status(400).json({
        message: "token_already_used",
      });
    }

    res.json({ message: "valid_token" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// GOOGLE LOGIN (SAFE ADDITION ONLY)
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, sub: googleId, given_name, family_name } = payload;

    let user = await User.findOne({ email });

    // 🔥 CASE 1: user does NOT exist → create new
    if (!user) {
      user = await User.create({
        first_name: given_name,
        last_name: family_name,
        email,
        googleId, // ✅ store google id
        authProvider: "google",
      });
    }

    // 🔥 CASE 2: user exists BUT no googleId yet → LINK ACCOUNT
    else if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = "google"; // optional update
      await user.save();
    }

    // 🔥 CASE 3: user exists AND googleId matches → do nothing

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// exports.googleLogin = async (req, res) => {
//   try {
//     const { credential } = req.body;

//     const ticket = await client.verifyIdToken({
//       idToken: credential,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();

//     const { email } = payload;

//     // ONLY CHECK EXISTING USER
//     // const user = await User.findOne({ email });

//     let user = await User.findOne({ email });

//       if (!user) {
//         user = await User.create({
//           first_name: payload.given_name,
//           last_name: payload.family_name,
//           email,
//           authProvider: "google",
//         });
//       }

//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       token,
//       user,
//     });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.googleSignup = async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, given_name, family_name, sub, picture } = payload;

    // check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // treat as login instead of error
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        token,
        user,
        message: "Logged in with existing Google account",
      });
    }

    // CREATE USER ONLY HERE
    user = await User.create({
      first_name: given_name,
      last_name: family_name || "",
      email,
      googleId: sub,
      avatar: picture,
      authProvider: "google",
      password: null,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};















const { google } = require("googleapis");

exports.googleCallback = async (req, res) => {
  try {
    const code = req.query.code;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:5000/user/auth/google/callback"
    );

    // 🔥 EXCHANGE CODE FOR TOKENS
    const { tokens } = await oauth2Client.getToken(code);

    console.log("ACCESS TOKEN:", tokens.access_token);
    console.log("REFRESH TOKEN:", tokens.refresh_token);

    res.send("Check terminal for refresh token");

  } catch (err) {
    console.log("ERROR:", err.message);
    res.status(500).send("Error getting token");
  }
};