const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/", userController.getAllUsers);
router.get("/:userId/visits", userController.getUserVisits);
router.post("/:userId/visits", userController.addUserVisit);
router.get("/:userId/events", userController.getUserEvents);
router.post("/:userId/events", userController.addUserEvent);

module.exports = router;
