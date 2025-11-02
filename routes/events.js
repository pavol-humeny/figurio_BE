const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.getAllEvents);
router.get("/overview", eventController.getEventsOverview);
router.get("/toggleTool", eventController.getToggleToolEvents);
router.get("/uploadImage", eventController.getUploadImageEvents);
router.get("/exportImage", eventController.getExportImageEvents);
router.get("/openModal", eventController.getOpenModalEvents);
router.get("/keyBoardShortcut", eventController.getKeyBoardShortcutEvents);




module.exports = router;
