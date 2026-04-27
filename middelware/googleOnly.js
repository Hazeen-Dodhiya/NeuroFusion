module.exports = function (req, res, next) {
  if (req.user.authProvider !== "google") {
    return res.status(403).json({
      message: "Only Google users can upload MRI files",
    });
  }

  next();
};