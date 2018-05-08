const {port} = require("./modules/constants/config");
const http = require("http");
const whiteBoard = require("./modules/controllers/whiteBoard");
const staticFile = require("./modules/controllers/staticFile");

const server = http.createServer(staticFile);

server.listen(port);

whiteBoard(server);
