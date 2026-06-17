const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretjwt");
    req.headers["x-user-id"]    = decoded.userId;
    req.headers["x-user-email"] = decoded.email;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = { verifyToken };
