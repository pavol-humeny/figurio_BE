/**
 * @file: users.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Express router for handling user-related API endpoints, including fetching user data, visits, events, sessions, and comparisons for the Figurio application.
 */

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
router.get("/:userId/comparison", userController.getUserComparison);

module.exports = router;
