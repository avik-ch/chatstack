const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

router.use(auth); // making all routes require authentication

// search users
router.get("/search", userController.searchUsers);

// friends - these must come before /:userId route
router.get("/friends/list", userController.getFriends);
router.get("/friends/pending", userController.getPendingRequests);

// friend requests
router.post("/friend-request", userController.sendFriendRequest);
router.put(
  "/friend-request/:friendshipId",
  userController.respondToFriendRequest
);

// get user by ID - this must come last since it uses a parameter
router.get("/:userId", userController.getUserById);

module.exports = router;
