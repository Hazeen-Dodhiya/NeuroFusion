const express = require("express");
const router = express.Router();

const auth = require("../middelware/auth");
const googleOnly = require("../middelware/googleOnly");
const upload = require("../middelware/upload");

const { uploadMRI } = require("../controllers/mriController");

router.post(
  "/upload",
  auth,
  googleOnly,
  upload.single("mri"),
  uploadMRI
);

module.exports = router;