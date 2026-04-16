/**
 * @file: contact.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Express router for handling contact-related API endpoints, including contact form submissions, notifications for visits during maintenance, and user ratings.
 */

const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/", contactController.sendContactForm);
router.post(
  "/:userId/visitDuringMaintenance",
  contactController.visitDuringMaintenance,
);
router.post("/:userId/rating", contactController.submitRating);

module.exports = router;
