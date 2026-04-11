const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/", userController.getAllUsers);
router.get("/:userId/visits", userController.getUserVisits);
router.post("/:userId/visits", userController.addUserVisit);
router.get("/:userId/events", userController.getUserEvents);
router.post("/:userId/events", userController.addUserEvent);
router.post("/:userId/sessions", userController.addUserSession);
router.get("/sessions", userController.getUserSessions);
router.get("/sessionDurationByUser", userController.getSessionDurationByUser);
router.get("/:userId/userVisits", userController.getUserVisits);
router.get("/:userId/toolUsage", userController.getUserToolUsage);
router.get("/:userId/eventsStats", userController.getUserEventsStats);
router.get("/:userId/sessionStats", userController.getUserSessionStats);

module.exports = router;
