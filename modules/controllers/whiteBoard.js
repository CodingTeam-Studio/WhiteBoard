const socketIO = require("socket.io");
const encrypter = require("../utils/encryptor");

// 记录各点线位置
let whiteBoard = [];

function service(server) {
  const io = socketIO.listen(server);

  io.on("connection", function(socket) {
    socket.on("set_id", function(data) {
      const canvasId = encrypter(data.id);

      // 判断房间是否已存在
      if (whiteBoard[canvasId] === undefined) {
        whiteBoard[canvasId] = new Object();
        whiteBoard[canvasId].dotHistory = [];
        whiteBoard[canvasId].lineHistory = [];
      }

      let {dotHistory, lineHistory} = whiteBoard[canvasId];

      // 添加 socket 至对应房间
      socket.join(canvasId);

      socket.emit("set_id_success", {});

      socket.on("roll_back", function(data) {
        socket.emit("draw_dot", {
          dot: dotHistory
        });

        socket.emit("draw_line", {
          line: lineHistory
        });
      });

      // 绘制点
      socket.on("draw_dot", function(data) {
        const {
          dot,
          dot: {length}
        } = data;

        // 在房间进行广播
        socket.to(canvasId).emit("draw_dot", {
          dot: dot
        });

        // 保存至历史记录
        for (let i = 0; i < length; i++) {
          dotHistory.push(dot[i]);
        }
      });

      // 绘制线
      socket.on("draw_line", function(data) {
        const {
          line,
          line: {length}
        } = data;

        // 在房间进行广播
        socket.to(canvasId).emit("draw_line", {
          line: line
        });

        // 保存至历史记录
        for (let i = 0; i < length; i++) {
          lineHistory.push(line[i]);
        }
      });

      // 清屏
      socket.on("clear", function(data) {
        socket.to(canvasId).emit("clear", {});
        dotHistory = [];
        lineHistory = [];
      });
    });
  });
}

module.exports = service;
