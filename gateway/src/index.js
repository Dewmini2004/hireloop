const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { verifyToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting — 100 req/min per IP
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ─── Health check ─────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "Gateway running ✅" }));

// ─── Proxy Routes ─────────────────────────────────────────

// Public — no auth needed
app.use("/api/auth", createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/auth": "" },
}));

// Protected — JWT required
app.use("/api/jobs",    verifyToken, createProxyMiddleware({ target: process.env.JOB_PARSER_SERVICE_URL,  changeOrigin: true, pathRewrite: { "^/api/jobs": "" } }));
app.use("/api/interviews", verifyToken, createProxyMiddleware({ target: process.env.INTERVIEW_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/api/interviews": "" } }));
app.use("/api/evaluations", verifyToken, createProxyMiddleware({ target: process.env.EVALUATION_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/api/evaluations": "" } }));
app.use("/api/progress", verifyToken, createProxyMiddleware({ target: process.env.PROGRESS_SERVICE_URL,  changeOrigin: true, pathRewrite: { "^/api/progress": "" } }));
app.use("/api/notifications", verifyToken, createProxyMiddleware({ target: process.env.NOTIFICATION_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/api/notifications": "" }, ws: true }));

app.listen(PORT, () => console.log(`🚪 Gateway running on port ${PORT}`));
