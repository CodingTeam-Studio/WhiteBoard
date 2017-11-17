var socketIO = require('socket.io');

var line_history = [];

function service(server) {
    var io = socketIO.listen(server);

    io.on('connection', function (socket) {

        for (var i in line_history) {
            socket.emit('draw_line', { line: line_history[i] } );
        }

        socket.on('draw_line', function (data) {
            line_history.push(data.line);
            io.emit('draw_line', { line: data.line });
        });
    });
}

module.exports = service;