const express = require('express');
const { uploadMeme, uploadMiddleware } = require('../controllers/uploadController.js');

const router = express.Router();

router.post('/', uploadMiddleware, uploadMeme);

module.exports = router; 