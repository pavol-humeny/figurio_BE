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

module.exports = router;
