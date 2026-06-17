require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { connectDB } = require("./models/db");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "Auth service running ✅" }));
app.use("/", authRoutes);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🔐 Auth Service on port ${PORT}`));
});
