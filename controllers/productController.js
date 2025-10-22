const db = require("../config/db");

// 📌 Get all products (excluding soft-deleted ones)
const getProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url,
              p.category_id, c.name AS category_name, p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_deleted = 0
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Get single product by ID (only if not deleted)
const getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url,
              p.category_id, c.name AS category_name, p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_deleted = 0`,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Product not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Get products by category (excluding soft-deleted)
const getProductsByCategory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url,
              p.category_id, c.name AS category_name, p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = ? AND p.is_deleted = 0
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No products found in this category" });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Create new product
const createProduct = async (req, res) => {
  try {
    const { name, description, price, image_url, category_id } = req.body;
    if (!name || !price || !category_id) {
      return res
        .status(400)
        .json({ message: "Name, price, and category are required" });
    }

    const [result] = await db.query(
      "INSERT INTO products (name, description, price, image_url, category_id) VALUES (?, ?, ?, ?, ?)",
      [name, description, price, image_url, category_id]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description,
      price,
      image_url,
      category_id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Update product
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, image_url, category_id } = req.body;

    const [result] = await db.query(
      "UPDATE products SET name=?, description=?, price=?, image_url=?, category_id=? WHERE id=? AND is_deleted = 0",
      [name, description, price, image_url, category_id, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Soft delete product (mark as deleted instead of removing)
const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE products SET is_deleted = 1 WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted (soft delete)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Restore a soft-deleted product
const restoreProduct = async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE products SET is_deleted = 0 WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ message: "Product not found or already active" });

    res.json({ message: "Product restored successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
};
