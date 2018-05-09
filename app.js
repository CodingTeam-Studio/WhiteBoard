const {port} = require("./modules/constants/config");
const https = require("https");
const pem = require("./pem.json");
const staticFile = require("./modules/controllers/staticFile");
const whiteBoard = require("./modules/controllers/whiteBoard");

const options = {
  key: pem.serviceKey,
  cert: pem.certificate
};

const server = https.createServer(options, staticFile);

server.listen(port);

whiteBoard(server);
