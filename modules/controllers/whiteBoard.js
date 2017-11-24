var socketIO = require('socket.io');
var encrypter = require('../utils/encryptor');

var whiteBoard = [];

function service(server) {
	var io = socketIO.listen(server);

	io.on('connection', function(socket) {
		var canvasId;

		socket.on('set_id', function(data) {
			canvasId = encrypter(data.id);

			if (whiteBoard[canvasId] === undefined) {
				whiteBoard[canvasId] = Object();
				whiteBoard[canvasId].lineHistory = [];
				whiteBoard[canvasId].dotHistory = [];
			}

			socket.emit('set_id_success', {
				id: canvasId
			});

			socket.on('roll_back', function(data) {
				socket.emit('draw_dot' + canvasId, {
					dot: whiteBoard[canvasId].dotHistory
				});

				socket.emit('draw_line' + canvasId, {
					line: whiteBoard[canvasId].lineHistory
				});
			});

			socket.on('draw_dot' + canvasId, function(data) {
				for (var i = 0; i < data.dot.length; i++) {
					whiteBoard[canvasId].dotHistory.push(data.dot[i]);
				}

				socket.broadcast.emit('draw_dot' + canvasId, {
					dot: data.dot
				});
			});

			socket.on('draw_line' + canvasId, function(data) {
				for (var i = 0; i < data.line.length; i++) {
					whiteBoard[canvasId].lineHistory.push(data.line[i]);
				}

				socket.broadcast.emit('draw_line' + canvasId, {
					line: data.line
				});
			});

			socket.on('clear' + canvasId, function(data) {
				whiteBoard[canvasId].lineHistory = [];
				whiteBoard[canvasId].dotHistory = [];

				socket.broadcast.emit('clear' + canvasId, {});
			});
		});

	});
}

module.exports = service;
