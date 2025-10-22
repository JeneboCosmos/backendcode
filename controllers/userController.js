const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_jwt_secret"; // replace with strong secret

// Register
async function register(req, res) {
  try {
    const { name, email, password, phone, role } = req.body;

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length > 0) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, phone, role || "customer"]
    );

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Remove password before sending response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all users
async function getUsers(req, res) {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, phone, role, created_at, updated_at FROM users"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get one user
async function getUser(req, res) {
  try {
    const { id } = req.params;
    const [user] = await db.query(
      "SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );
    if (user.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update user
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, role } = req.body;

    await db.query(
      "UPDATE users SET name=?, phone=?, role=? WHERE id=?",
      [name, phone, role || "customer", id]
    );

    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete user
async function deleteUser(req, res) {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};
