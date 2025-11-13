const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const visitsRoutes = require("./routes/visits");

const app = express();

// enable CORS for preflight requests
app.use(
  cors({
    origin: "https://pavol-humeny.github.io",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// also handle OPTIONS manually
app.options("*", cors());

app.use(bodyParser.json());

app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/visits", visitsRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
