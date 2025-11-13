const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

const cors = require("cors");

// Enable CORS for all routes in this router
router.use(
  cors({
    origin: ["https://pavol-humeny.github.io", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// handle preflight OPTIONS requests for all paths in this router
router.options("*", cors());

router.get("/", userController.getAllUsers);
router.get("/:userId/visits", userController.getUserVisits);
router.post("/:userId/visits", userController.addUserVisit);
router.get("/:userId/events", userController.getUserEvents);
router.post("/:userId/events", userController.addUserEvent);

module.exports = router;
