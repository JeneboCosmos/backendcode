// server/config/db.js

const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST || "metro.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "EUARxqdcfrryvsRtOiMIPcUzLEnEnxsj",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 46439,
  ssl: {
    rejectUnauthorized: false, // ✅ Required for Railway external connection
  },
  connectTimeout: 20000, // 20 seconds to prevent ETIMEDOUT
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Connected to MySQL database");
    connection.release();
  } catch (err) {
    console.error("❌ Error connecting to MySQL:", err.message);
  }
})();

;
module.exports = db;
