const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, upload.single('avatar'), authController.updateProfile);
router.post('/logout', auth, authController.logout);

module.exports = router;
