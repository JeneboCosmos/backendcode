const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getMyOrders,
  verifyPaystackPayment,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

// Routes
router.post("/", createOrder);         // Create order
router.get("/", getOrders);            // Get all orders
router.get("/:id", getOrderById);      // Get single order
router.put("/:id", updateOrder);       // Update order status/payment_status
router.delete("/:id", deleteOrder);    // Delete order


router.get("/verify/:orderId", verifyPaystackPayment);

module.exports = router;



