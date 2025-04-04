const { upload } = require('../config/cloudinary.js');

const uploadMeme = async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }
    // Cloudinary automatically uploads the file and req.file.path contains the URL
    res.json({ success: true, fileUrl: req.file.path });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Middleware for handling file uploads
const uploadMiddleware = upload.single('meme');

module.exports = { uploadMeme, uploadMiddleware }; 