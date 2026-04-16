/**
 * @file: visits.js
 * @author: Pavol Humeny
 * @date: 15.5.2026
 * @description: Express router for handling visit-related API endpoints, including fetching visits by day, unique visits, visits by country, and other visit statistics for the Figurio application.
 */

const express = require("express");
const router = express.Router();
const visitsController = require("../controllers/visitsController");

router.get("/", visitsController.getVisitsByDay);
router.get("/allVisits", visitsController.getAllVisitsCount);
router.get("/uniqueVisits", visitsController.getUniqueVisitsCount);
router.get("/lastDaysVisits", visitsController.getLastDaysVisits);
router.get("/visitsByCountry", visitsController.getVisitsByCountry);
router.get("/byDayFullRange", visitsController.getVisitsByDayFullRange);
router.get("/avgEventsPerVisitByDay", visitsController.getAvgEventsPerVisitByDay);
router.get("/visitsByUser", visitsController.getVisitsByUser);
router.get("/numberOfPWAVisits", visitsController.getNumberOfPWAVisits);

module.exports = router;
