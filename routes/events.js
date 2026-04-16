/**
 * @file: events.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Express router for handling event-related API endpoints, including fetching all events, event overviews, and specific event types for the Figurio application.
 */

const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.getAllEvents);
router.get("/overview", eventController.getEventsOverview);
router.get("/toggleTool", eventController.getToggleToolEvents);
router.get("/applyOperation", eventController.getApplyOperationEvents);
router.get("/uploadImage", eventController.getUploadImageEvents);
router.get("/exportImage", eventController.getExportImageEvents);
router.get("/openModal", eventController.getOpenModalEvents);
router.get("/keyboardShortcuts", eventController.getKeyboardShortcutsEvents);
router.get("/eventsByUser", eventController.getEventsByUser);
router.get("/appInstalledCount", eventController.getAppInstalledCount);

module.exports = router;
