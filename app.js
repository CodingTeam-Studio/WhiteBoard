var express = require('express');
var http = require('http');
var service = require('./modules/controllers/whiteBoard');
var config = require('./modules/constants/config');

var app = express();
var server = http.createServer(app);

app.use(express.static(__dirname + '/public'));

service(server);

server.listen(config.port);