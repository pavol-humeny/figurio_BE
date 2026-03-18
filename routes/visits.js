const express = require("express");
const router = express.Router();
const visitsController = require("../controllers/visitsController");

router.get("/", visitsController.getVisitsByDay);
router.get("/allVisits", visitsController.getAllVisitsCount);
router.get("/uniqueVisits", visitsController.getUniqueVisitsCount);
router.get("/lastDaysVisits", visitsController.getLastDaysVisits);
router.get("/visitsByCountry", visitsController.getVisitsByCountry);
router.get("/byDayFullRange", visitsController.getVisitsByDayFullRange);
router.get(
  "/avgEventsPerVisitByDay",
  visitsController.getAvgEventsPerVisitByDay,
);
router.get("/visitsByUser", visitsController.getVisitsByUser);
router.get("/numberOfPWAVisits", visitsController.getNumberOfPWAVisits);

module.exports = router;
