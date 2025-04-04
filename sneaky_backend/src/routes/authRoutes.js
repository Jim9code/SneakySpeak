const express = require('express');
const { initiateLogin, verifyCode, getProfile, logout, updateUsername, verifyTokenAndRefresh } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', initiateLogin);
router.post('/verify', verifyCode);
router.post('/verify-token', verifyTokenAndRefresh);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.post('/logout', verifyToken, logout);
router.put('/username', verifyToken, updateUsername);

module.exports = router; 