const express = require("express");
const {
  register,
  login,
  getUsers,
  getUser,
  updateUser,
  deleteUser
} = require("../controllers/userController");

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// No middleware (all routes are now public)
router.get("/", getUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
