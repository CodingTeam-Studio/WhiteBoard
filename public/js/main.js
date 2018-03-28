function fadeIn(element, time) {
  if (element.style.opacity === '') {
    element.style.opacity = 0;
  }

  if (element.style.display === '' || element.style.display === 'none') {
    element.style.display = 'block';
  }

  let timer = setInterval(function() {
    if (element.style.opacity < 1) {
      element.style.opacity = parseFloat(element.style.opacity) + 0.01;
      return;
    }

    clearInterval(timer);
  }, time / 100);
}

function fadeOut(element, time) {
  if (element.style.opacity === '') {
    element.style.opacity = 1;
  }

  if (element.style.display === '' || element.style.display === 'none') {
    element.style.display = 'block';
  }

  let timer = setInterval(function() {
    if (element.style.opacity > 0) {
      element.style.opacity = parseFloat(element.style.opacity) - 0.01;
      return;
    }

    clearInterval(timer);
    element.style.display = 'none';
  }, time / 100);
}

const socket = io.connect();

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('canvasIdInput').onkeyup = function(e) {
    e = e || window.event;

    if (e.keyCode === 13) {
      socket.emit('set_id', {
        id: document.getElementById('canvasIdInput').value
      });
    }
  };

  let constant = {
    minAngleChange: Math.PI / 180,
    wheelSpeed: 0.01,
    pointSize: 5,
    penSize: 1,
    color: '#000000',
    offsetX: 0,
    offsetY: 0
  };

  let mouse = {
    rightClick: false,
    click: false,
    move: false,
    pos: {x: 0, y: 0},
    pos_prev: false,
    pos_turn: false,
    out: false,
    distance: 0
  };

  let clearButton = document.getElementById('clear');

  let background = document.getElementById('background');
  let contextBG = background.getContext('2d');
  let canvas = document.getElementById('drawing');
  let context = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;

  let linePoint = [];
  let lineHistory = [];
  let dotHistory = [];

  socket.on('set_id_success', function(data) {
    document.getElementById('board').style.display = 'block';
    fadeOut(document.getElementById('form'), 500);
    fadeIn(document.getElementById('background'), 500);

    socket.emit('roll_back', {});
  });

  socket.on('draw_line', function(data) {
    let line = data.line;

    for (let i = 0; i < line.length; i++) {
      lineHistory.push(line[i]);
    }

    redraw();
  });

  socket.on('draw_dot', function(data) {
    let dot = data.dot;

    for (let i = 0; i < dot.length; i++) {
      dotHistory.push(dot[i]);
      dotTo(contextBG, dot[i]);
    }
  });

  socket.on('clear', function(data) {
    contextBG.clearRect(0, 0, width, height);
    lineHistory = [];
    dotHistory = [];
  });

  clearButton.onclick = function() {
    contextBG.clearRect(0, 0, width, height);
    lineHistory = [];
    dotHistory = [];
    socket.emit('clear', {});
  };

  canvas.onmousewheel = function(e) {
    if (mouse.click || mouse.rightClick) {
      return;
    }

    let delta = e.detail || e.wheelDelta;

    constant.penSize += delta * constant.wheelSpeed;
    context.clearRect(0, 0, width, height);
    drawCursor(e.clientX, e.clientY);
  };

  canvas.onmousedown = function(e) {
    e.preventDefault();

    switch (e.which) {
      case 1:
        linePoint = [];
        context.lineWidth = constant.penSize;
        context.color = constant.color;
        mouse.click = true;
        mouse.dot = true;
        mouse.pos.x = e.clientX;
        mouse.pos.y = e.clientY;
        mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
        mouse.pos_turn = false;
        mouse.distance = 0;
        putPoint(mouse.pos.x, mouse.pos.y);
        linePoint[0].color = constant.color;
        linePoint[0].penSize = constant.penSize;
        break;
      case 3:
        mouse.rightClick = true;
        mouse.pos_prev = false;
        if (mouse.click) endLineDraw();
        break;
    }
  };

  canvas.onmouseup = function(e) {
    if (e.which == 3) mouse.rightClick = false;

    endLineDraw();
  };

  canvas.onmouseout = function(e) {
    mouse.rightClick = false;
    mouse.out = true;
    endLineDraw();
  };

  canvas.oncontextmenu = function(e) {
    e.preventDefault();
  };

  canvas.onmousemove = function(e) {
    mouse.out = false;
    context.clearRect(0, 0, width, height);
    drawCursor(e.clientX, e.clientY);

    if (mouse.rightClick) {
      if (mouse.pos_prev) {
        let dx = mouse.pos.x - e.clientX;
        let dy = mouse.pos.y - e.clientY;
        constant.offsetX += dx;
        constant.offsetY += dy;
        redraw();
      }
      mouse.pos_prev = true;
      mouse.pos.x = e.clientX;
      mouse.pos.y = e.clientY;
    } else if (mouse.click && mouse.pos_prev) {
      mouse.distance += distance(mouse.pos, {x: e.clientX, y: e.clientY});
      mouse.pos.x = e.clientX;
      mouse.pos.y = e.clientY;
      let dis = distance(mouse.pos, mouse.pos_prev);

      if (dis >= constant.pointSize) {
        if (!mouse.pos_turn) {
          mouse.pos_turn = {x: mouse.pos.x, y: mouse.pos.y};
        }

        mouse.dot = false;

        if (
          dis <= mouse.distance - constant.pointSize * 2 ||
          hasPenChange(mouse.pos, mouse.pos_prev, mouse.pos_turn)
        ) {
          putPoint(mouse.pos.x, mouse.pos.y);
          line(context, linePoint);
          mouse.pos_turn = false;
          mouse.distance = 0;
          mouse.pos_prev.x = mouse.pos.x;
          mouse.pos_prev.y = mouse.pos.y;
        } else line(context, linePoint, mouse.pos);
      } else if (linePoint.length > 0) {
        line(context, linePoint, mouse.pos);
      }
    }
  };

  function endLineDraw() {
    if (!mouse.click) return;

    mouse.click = false;

    context.clearRect(0, 0, width, height);

    if (!mouse.pos_turn && mouse.dot) {
      dotTo(contextBG, {x: mouse.pos_prev.x, y: mouse.pos_prev.y});
      socket.emit('draw_dot', {
        dot: [
          {
            x: mouse.pos_prev.x + constant.offsetX,
            y: mouse.pos_prev.y + constant.offsetY
          }
        ]
      });
    } else if (!mouse.dot) {
      contextBG.strokeStyle = constant.color;
      contextBG.lineWidth = constant.penSize;
      line(contextBG, linePoint, mouse.pos);
      putPoint(mouse.pos.x, mouse.pos.y);
    }

    if (linePoint.length > 1) {
      socket.emit('draw_line', {line: [linePoint]});
      lineHistory.push(linePoint);
    }
  }

  function hasPenChange(now, prev, turn) {
    if (now && prev && turn) {
      let dx = now.x - prev.x;
      let dy = now.y - prev.y;
      let tdx = turn.x - prev.x;
      let tdy = turn.y - prev.y;
      let dis1 = distance(now, prev);
      let dis2 = distance(turn, prev);

      if (!dis1 && !dis2) {
        return false;
      }

      let cos = (dx * tdx + dy * tdy) / (dis1 * dis2);

      return cos < 0 || Math.abs(cos) < Math.cos(constant.minAngleChange);
    } else return false;
  }

  function distance(start, end) {
    let dx = start.x - end.x;
    let dy = start.y - end.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function line(context, points, temp) {
    if (!points && points.length <= 0) {
      return;
    }

    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(
      points[0].x - constant.offsetX,
      points[0].y - constant.offsetY
    );

    for (let j = 1; j < points.length; j++) {
      context.lineTo(
        points[j].x - constant.offsetX,
        points[j].y - constant.offsetY
      );
    }

    if (temp) {
      context.lineTo(temp.x, temp.y);
    }

    context.stroke();
  }

  function dotTo(context, dot) {
    context.fillStyle = constant.color;
    context.beginPath();
    context.arc(dot.x, dot.y, constant.penSize * 0.5, 0, 2 * Math.PI);
    context.fill();
  }

  function drawCursor(cursorX, cursorY) {
    if (mouse.out) {
      return;
    }

    context.save();
    context.lineWidth = 1;
    context.beginPath();
    context.arc(
      cursorX,
      cursorY,
      Math.max(constant.penSize * 0.5 + 2.5, 7.5),
      0,
      2 * Math.PI
    );
    context.stroke();
    dotTo(context, {x: cursorX, y: cursorY});
    context.restore();
  }

  function redraw() {
    contextBG.clearRect(0, 0, width, height);
    contextBG.beginPath();

    for (let i = 0; i < lineHistory.length; i++) {
      contextBG.strokeStyle = lineHistory[i][0].color;
      contextBG.lineWidth = lineHistory[i][0].penSize;
      line(contextBG, lineHistory[i]);
    }

    for (let i = 0; i < dotHistory.length; i++) {
      dotTo(contextBG, dotHistory[i]);
      dotTo(contextBG, dotHistory[i]);
    }
  }

  function putPoint(posX, posY) {
    linePoint.push({x: posX + constant.offsetX, y: posY + constant.offsetY});
  }

  window.onresize = function() {
    width = window.innerWidth;
    height = window.innerHeight;
    background.width = width;
    background.height = height;
    canvas.width = width;
    canvas.height = height;
    redraw();
  };

  window.onresize();
});
