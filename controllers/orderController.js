const db = require("../config/db");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✉️ Email Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📦 Create new order + initialize Paystack payment
const createOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      payment_method,
      items_price,
      total_price,
      shipping,
      orderItems,
    } = req.body;

    await connection.beginTransaction();

    const shipping_price = 0;

    // ✅ Insert into orders (no user_id for guests)
    const [orderResult] = await connection.query(
      `INSERT INTO orders (payment_method, items_price, shipping_price, total_price)
       VALUES (?, ?, ?, ?)`,
      [payment_method, items_price, shipping_price, total_price]
    );

    const orderId = orderResult.insertId;

    // ✅ Insert shipping details
    await connection.query(
      `INSERT INTO shipping (order_id, name, phone, email, address)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, shipping.name, shipping.phone, shipping.email, shipping.address]
    );

    // ✅ Insert order items
    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    // ✅ Generate Paystack reference
    const reference = `order_${orderId}_${Date.now()}`;
    await connection.query(`UPDATE orders SET reference = ? WHERE id = ?`, [
      reference,
      orderId,
    ]);

    await connection.commit();

    // ✅ Initialize Paystack if selected
    if (payment_method === "Paystack") {
      const paystackResponse = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: shipping.email,
          amount: total_price * 100,
          reference,
          callback_url: `http://localhost:5000/api/orders/verify/${orderId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(201).json({
        message: "Order created successfully",
        orderId,
        paystack: paystackResponse.data,
      });
    }

    // ✅ If not Paystack
    res.status(201).json({ message: "Order created successfully", orderId });
  } catch (error) {
    await connection.rollback();
    console.error(error.response?.data || error.message);
    res.status(500).json({ message: "Failed to create order" });
  } finally {
    connection.release();
  }
};

// 📋 Get all orders (for admin) — includes guest orders
const getOrders = async (req, res) => {
  try {
    const { user_id, status } = req.query;

    let sql = `
      SELECT o.*, u.name AS user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      sql += " AND o.user_id = ?";
      params.push(user_id);
    }

    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }

    sql += " ORDER BY o.created_at DESC";

    const [orders] = await db.query(sql, params);

    for (let order of orders) {
      const [shipping] = await db.query(
        `SELECT * FROM shipping WHERE order_id = ?`,
        [order.id]
      );
      order.shipping = shipping[0];

      const [items] = await db.query(
        `SELECT oi.*, p.name AS product_name, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// 📦 Get order by ID (guest-safe)
const getOrderById = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name AS user_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

    const [shipping] = await db.query(
      `SELECT * FROM shipping WHERE order_id = ?`,
      [order.id]
    );
    order.shipping = shipping[0];

    const [items] = await db.query(
      `SELECT oi.*, p.name AS product_name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

// 📬 Verify Paystack Payment + Send Email
const verifyPaystackPayment = async (req, res) => {
  const { orderId } = req.params;

  try {
    const [rows] = await db.query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [
      orderId,
    ]);
    if (!rows.length) return res.status(404).send("Order not found");

    const order = rows[0];
    const reference = order.reference;

    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const paymentData = verifyResponse.data.data;

    if (paymentData.status === "success") {
      await db.query(
        `UPDATE orders 
         SET payment_status = 'paid', status = 'processing', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [orderId]
      );

      const [shipping] = await db.query(
        `SELECT * FROM shipping WHERE order_id = ?`,
        [orderId]
      );
      const [items] = await db.query(
        `SELECT oi.*, p.name AS product_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );

      const emailBody = `
        <h2>✅ Payment Successful!</h2>
        <p>Dear ${shipping[0].name},</p>
        <p>Thank you for your purchase. Your order has been received and is being processed.</p>
        <h3>Order ID: ${orderId}</h3>
        <h4>Order Summary:</h4>
        <ul>
          ${items
            .map(
              (i) =>
                `<li>${i.product_name} - Qty: ${i.quantity} - GHS ${i.price}</li>`
            )
            .join("")}
        </ul>
        <p><strong>Total:</strong> GHS ${order.total_price}</p>
        <p>We’ll notify you when your order ships.</p>
        <p>— Your Shop Team</p>
      `;

      await transporter.sendMail({
        from: `"Your Shop" <${process.env.EMAIL_USER}>`,
        to: shipping[0].email,
        subject: `Order Confirmation - #${orderId}`,
        html: emailBody,
      });

      // ✅ Return or redirect
      if (req.headers.accept?.includes("application/json")) {
        return res.json({
          status: "success",
          orderId,
          redirectUrl: `/success/${orderId}`,
        });
      }

      return res.redirect(`http://localhost:3000/success/${orderId}`);
    } else {
      if (req.headers.accept?.includes("application/json")) {
        return res.json({
          status: "failed",
          orderId,
          redirectUrl: `/cancel/${orderId}`,
        });
      }
      return res.redirect(`http://localhost:3000/cancel/${orderId}`);
    }
  } catch (error) {
    console.error("Paystack Verify Error:", error.response?.data || error.message);
    if (req.headers.accept?.includes("application/json")) {
      return res.json({
        status: "error",
        orderId,
        message: "Verification failed",
      });
    }
    return res.redirect(`http://localhost:3000/cancel/${orderId}`);
  }
};

// 📌 Update order
// 📌 Update order (preserve payment_status if not provided)
const updateOrder = async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const orderId = req.params.id;

    // 🧠 Step 1: Get existing order's payment_status if not sent
    let currentPaymentStatus = payment_status;
    if (!currentPaymentStatus) {
      const [rows] = await db.query(
        `SELECT payment_status FROM orders WHERE id = ?`,
        [orderId]
      );
      if (!rows.length) {
        return res.status(404).json({ message: "Order not found" });
      }
      currentPaymentStatus = rows[0].payment_status || "unpaid";
    }

    // 🧠 Step 2: Update only the status but preserve payment_status
    const [result] = await db.query(
      `UPDATE orders 
       SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, currentPaymentStatus, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Order update error:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
};


// 📌 Delete order
const deleteOrder = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM orders WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete order" });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  verifyPaystackPayment,
};
