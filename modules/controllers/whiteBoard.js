var socketIO = require('socket.io');

var line_history = [];
var dot_history = [];

function service(server) {
	var io = socketIO.listen(server);

	io.on('connection', function(socket) {

		socket.emit('draw_line', { line: line_history });
		socket.emit('draw_dot', { dot: dot_history });

		socket.on('draw_line', function(data) {
			for (var i = 0; i < data.line.length; i++)
				line_history.push(data.line[i]);

			socket.broadcast.emit('draw_line', { line: data.line });
		});

		socket.on('draw_dot', function(data) {
			for (var i = 0; i < data.dot.length; i++)
				dot_history.push(data.dot[i]);

			socket.broadcast.emit('draw_dot', { dot: data.dot });
		});

		socket.on('clear', function(data) {
			line_history = [];
			dot_history = [];
			socket.broadcast.emit('clear', {});
		});
	});
}

module.exports = service;
