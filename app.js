const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const visitsRoutes = require("./routes/visits");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: [
      "https://pavol-humeny.github.io",
      "https://figurio.online",
      "http://localhost:5173", // allow local dev server
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());

app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/visits", visitsRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
