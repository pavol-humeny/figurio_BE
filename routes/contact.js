const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/", contactController.sendContactForm);
router.post(
  "/:userId/visitDuringMaintenance",
  contactController.visitDuringMaintenance,
);

module.exports = router;
