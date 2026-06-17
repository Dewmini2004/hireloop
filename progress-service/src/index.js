require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./models/db");
const { connectRabbitMQ } = require("./consumers/evaluationConsumer");
const progressRoutes = require("./routes/progress");

const app = express();
const PORT = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());
app.get("/health", (_, res) => res.json({ status: "Progress Service running ✅" }));
app.use("/", progressRoutes);

connectDB().then(() => {
  connectRabbitMQ();
  app.listen(PORT, () => console.log(`📈 Progress Service on port ${PORT}`));
});
