const dotenv = require('dotenv')
dotenv.config()
console.log("TEST ENV:", process.env.GOOGLE_REFRESH_TOKEN);
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("GOOGLE CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
const express = require('express')
const cors = require('cors')
const connectDB = require('./db')
const mriRoutes = require("./routes/mriRoutes");

connectDB();

const app = express()


//middlewares
app.use(
  cors({
    origin: ["http://localhost:3000","https://neuro-fusion-front.vercel.app"]
    credentials: true,
  })
);
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//routes
app.use("/user", require("./routes/userRoutes"));

app.use("/mri", mriRoutes);

//test route
app.get("/", (req, res)=>{
    res.send("API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server Started at PORT: ${PORT}`)
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Server Error",
  });
});