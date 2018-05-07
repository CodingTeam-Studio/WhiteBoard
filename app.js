const {port} = require("./modules/constants/config");
const express = require("express");
const http = require("http");
const service = require("./modules/controllers/whiteBoard");

const app = express();
const server = http.createServer(app);

app.use(express.static(__dirname + "/public"));

service(server);

server.listen(port);
