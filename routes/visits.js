const express = require("express");
const router = express.Router();
const visitsController = require("../controllers/visitsController");

router.get("/", visitsController.getVisitsByDay);
router.get("/allVisits", visitsController.getAllVisitsCount);
router.get("/uniqueVisits", visitsController.getUniqueVisitsCount);
router.get("/lastSevenDaysVisits", visitsController.getLastSevenDaysVisits);
router.get("/visitsByCountry", visitsController.getVisitsByCountry);
router.get("/byDayFullRange", visitsController.getVisitsByDayFullRange);

module.exports = router;
