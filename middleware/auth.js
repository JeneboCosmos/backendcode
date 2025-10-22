const jwt = require("jsonwebtoken");
const db = require("../config/db");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // fetch user from DB
      const [rows] = await db.query("SELECT id, name, email, role FROM users WHERE id = ?", [decoded.id]);

      if (!rows.length) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = rows[0]; // ✅ attach user to request
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
