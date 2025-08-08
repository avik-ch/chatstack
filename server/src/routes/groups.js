const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(auth);

// group management
router.post('/', upload.single('avatar'), groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.get('/:groupId', groupController.getGroupById);
router.put('/:groupId', upload.single('avatar'), groupController.updateGroup);

// group membership - specific routes first
router.delete('/:groupId/leave', groupController.leaveGroup);
router.post('/:groupId/members', groupController.addMember);
router.delete('/:groupId/members/:userId', groupController.removeMember);

module.exports = router;
