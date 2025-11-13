const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const visitsRoutes = require("./routes/visits");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://pavol-humeny.github.io",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // for non-browser requests
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS not allowed"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
