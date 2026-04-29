const express = require("express");
const router = express.Router();

const auth = require("../middelware/auth");
const googleOnly = require("../middelware/googleOnly");
const upload = require("../middelware/upload");


const { uploadMRI, getMRIResults } = require("../controllers/mriController");

router.get(
  "/get_results",
  auth,
  googleOnly,
  getMRIResults
);
router.post(
  "/upload",
  auth,
  googleOnly,
  upload.single("mri"),
  uploadMRI
);

module.exports = router;