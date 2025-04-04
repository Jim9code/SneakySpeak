const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { verifyPayment } = require('../controllers/paymentController');

// Protected routes (require authentication)
router.post('/verify/:reference', verifyToken, verifyPayment);

module.exports = router; 