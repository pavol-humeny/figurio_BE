const fs = require("fs");
const https = require("https");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const visitsRoutes = require("./routes/visits");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/visits", visitsRoutes);

const PORT = process.env.PORT || 3000;

// Load SSL cert and key
const sslOptions = {
  key: fs.readFileSync("/var/www/figurio/certs/server.key"),
  cert: fs.readFileSync("/var/www/figurio/certs/server.crt"),
};

// Start HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running on https://139.59.143.44:${PORT}`);
});
