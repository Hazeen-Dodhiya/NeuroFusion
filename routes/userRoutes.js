const express = require('express')
const router = express.Router();
const {signup, login, updateProfile, forgotPassword, resetPassword, verifyResetToken, googleLogin, googleSignup, googleCallback} = require('../controllers/userController');
const auth = require('../middelware/auth')
// const authMiddleware = require("../middleware/auth"); // your JWT middleware
//hello



router.get("/verify-reset-token/:token", verifyResetToken)

router.post("/signup", signup);
router.post("/login", login);

router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

router.put("/update-profile", auth, updateProfile)

//hello
router.post("/google-login", googleLogin);
router.post("/google-signup", googleSignup);

router.get("/auth/google/callback", googleCallback);

module.exports = router;