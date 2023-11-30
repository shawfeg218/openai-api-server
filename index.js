// file: index.js
const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// import routes
const apiRoutes = require("./routes/apiRoutes");

app.use(express.json());
app.use(cors());

// use your routes
app.use("/api", apiRoutes);

const server = http.createServer(app);

server.listen(5000, () => {
  console.log("Express server listening on port 5000");
});
