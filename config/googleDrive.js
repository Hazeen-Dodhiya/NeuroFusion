const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// ✅ ONLY THIS MATTERS NOW
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});
console.log("REFRESH TOKEN FROM ENV:", process.env.GOOGLE_REFRESH_TOKEN);
module.exports = drive;