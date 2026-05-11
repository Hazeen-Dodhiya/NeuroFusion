const express = require('express')
const router = express.Router();
const {signup, login, updateProfile, forgotPassword, resetPassword, verifyResetToken, googleLogin, googleSignup, googleCallback} = require('../controllers/userController');
const auth = require('../middelware/auth')


router.get("/verify-reset-token/:token", verifyResetToken)

router.post("/signup", signup);
router.post("/login", login);

router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

router.put("/update-profile", auth, updateProfile)


router.post("/google-login", googleLogin);
router.post("/google-signup", googleSignup);

router.get("/auth/google/callback", googleCallback);

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

module.exports = router;