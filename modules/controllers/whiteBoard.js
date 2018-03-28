const socketIO = require('socket.io');
const encrypter = require('../utils/encryptor');

let whiteBoard = [];

function service(server) {
  const io = socketIO.listen(server);

  io.on('connection', function(socket) {
    socket.on('set_id', function(data) {
      const canvasId = encrypter(data.id);

      if (whiteBoard[canvasId] === undefined) {
        whiteBoard[canvasId] = Object();
        whiteBoard[canvasId].lineHistory = [];
        whiteBoard[canvasId].dotHistory = [];
      }

      socket.join(canvasId);

      socket.emit('set_id_success', {});

      socket.on('roll_back', function(data) {
        socket.emit('draw_dot', {
          dot: whiteBoard[canvasId].dotHistory
        });

        socket.emit('draw_line', {
          line: whiteBoard[canvasId].lineHistory
        });
      });

      socket.on('draw_dot', function(data) {
        socket.to(canvasId).emit('draw_dot', {
          dot: data.dot
        });

        for (let i = 0; i < data.dot.length; i++) {
          whiteBoard[canvasId].dotHistory.push(data.dot[i]);
        }
      });

      socket.on('draw_line', function(data) {
        socket.to(canvasId).emit('draw_line', {
          line: data.line
        });

        for (let i = 0; i < data.line.length; i++) {
          whiteBoard[canvasId].lineHistory.push(data.line[i]);
        }
      });

      socket.on('clear', function(data) {
        socket.to(canvasId).emit('clear', {});

        whiteBoard[canvasId].lineHistory = [];
        whiteBoard[canvasId].dotHistory = [];
      });
    });
  });
}

module.exports = service;
