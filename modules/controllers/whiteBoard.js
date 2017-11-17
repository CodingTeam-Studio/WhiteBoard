var socketIO = require('socket.io');

var line_history = [];
var dot_history = [];

function service(server) {
	var io = socketIO.listen(server);

	io.on('connection', function(socket) {

		for (var i in line_history)
			socket.emit('draw_line', { line: line_history[i] });

		for (var j in dot_history)
			socket.emit('draw_dot', { dot: dot_history[j] });


		socket.on('draw_line', function(data) {
			line_history.push(data.line);
			socket.broadcast.emit('draw_line', { line: data.line });
		});

		socket.on('draw_dot', function(data) {
			dot_history.push(data.dot);
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
