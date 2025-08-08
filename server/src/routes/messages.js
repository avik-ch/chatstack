const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(auth); // making all routes require authentication

// recent messages - this must come before /:messageId routes
router.get('/recent/all', messageController.getRecentMessages);

// group messages
router.post('/groups/:groupId', upload.single('image'), messageController.sendGroupMessage);
router.get('/groups/:groupId', messageController.getGroupMessages);

// message management - these must come last since they use parameters
router.put('/:messageId', messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
