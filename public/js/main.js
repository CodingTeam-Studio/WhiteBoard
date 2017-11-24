document.addEventListener("DOMContentLoaded", function() {
	var constant = {
		minAngleChange: Math.PI / 180,
		maxDragging: 20,
		wheelSpeed: 0.01,
		pointSize: 5,
		penSize: 1,
		color: '#000000',
		offsetX: 0,
		offsetY: 0
	};

	var mouse = {
		rightClick: false,
		click: false,
		move: false,
		pos: { x: 0, y: 0 },
		pos_prev: false,
		pos_turn: false,
		distance: 0
	};
	// get canvas element and create context
	var clearButton = document.getElementById('clear');

	var background = document.getElementById('background');
	var contextBG = background.getContext('2d');

	var canvas = document.getElementById('drawing');
	var context = canvas.getContext('2d');

	var width = window.innerWidth;
	var height = window.innerHeight;
	var socket = io.connect();

	var linePoint = [];
	var line_history = [];
	var dot_history = [];



	// draw line received from server
	socket.on('draw_line', function(data) {
		var line = data.line;
		for (var i = 0; i < line.length; i++) {
			line_history.push(line[i]);
		}

		redraw();
	});

	socket.on('draw_dot', function(data) {
		var dot = data.dot;

		for (var i = 0; i < dot.length; i++) {
			dot_history.push(dot[i]);
			dotTo(contextBG, dot[i]);
		}

	});

	socket.on('clear', function(data) {
		contextBG.clearRect(0, 0, width, height);
		line_history = [];
		dot_history = [];
	});

	clearButton.onclick = function() {
		contextBG.clearRect(0, 0, width, height);
		line_history = [];
		dot_history = [];
		socket.emit('clear', {});
	};

	canvas.onmousewheel = function(e) {
		if (mouse.click || mouse.rightClick)
			return;

		var delta = e.detail || e.wheelDelta;
		constant.penSize += delta * constant.wheelSpeed;
		context.clearRect(0, 0, width, height);
		drawCursor(e.clientX, e.clientY);
	};

	// register mouse event handlers
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
				mouse.pos_prev = { x: mouse.pos.x, y: mouse.pos.y };
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
		if (e.which == 3)
			mouse.rightClick = false;
		endLineDraw();
	};
	canvas.onmouseout = function(e) {
		mouse.rightClick = false;
		endLineDraw();
	};
	canvas.oncontextmenu = function(e) { e.preventDefault(); };

	canvas.onmousemove = function(e) {
		context.clearRect(0, 0, width, height);
		drawCursor(e.clientX, e.clientY);
		if (mouse.rightClick) {
			if (mouse.pos_prev) {
				var dx = Math.min(constant.maxDragging, mouse.pos.x - e.clientX);
				var dy = Math.min(constant.maxDragging, mouse.pos.y - e.clientY);
				constant.offsetX += dx;
				constant.offsetY += dy;
				redraw();
			}
			mouse.pos_prev = true;
			mouse.pos.x = e.clientX;
			mouse.pos.y = e.clientY;
		} else if (mouse.click && mouse.pos_prev) {
			mouse.distance += distance(mouse.pos, { x: e.clientX, y: e.clientY });
			mouse.pos.x = e.clientX;
			mouse.pos.y = e.clientY;
			var dis = distance(mouse.pos, mouse.pos_prev);

			if (dis >= constant.pointSize) {
				if (!mouse.pos_turn)
					mouse.pos_turn = { x: mouse.pos.x, y: mouse.pos.y };

				if (dis <= mouse.distance - constant.pointSize * 2 || hasPenChange(mouse.pos, mouse.pos_prev, mouse.pos_turn)) {
					putPoint(mouse.pos.x, mouse.pos.y);
					line(context, linePoint);
					mouse.dot = false;
					mouse.pos_turn = false;
					mouse.distance = 0;
					mouse.pos_prev.x = mouse.pos.x;
					mouse.pos_prev.y = mouse.pos.y;
				} else
					line(context, linePoint, mouse.pos);

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
			dotTo(contextBG, { x: mouse.pos_prev.x, y: mouse.pos_prev.y });
			socket.emit('draw_dot', {
				dot: [{ x: mouse.pos_prev.x + constant.offsetX, y: mouse.pos_prev.y + constant.offsetY }]
			});
		} else if (!mouse.dot) {
			contextBG.lineWidth = constant.penSize;
			contextBG.color = constant.color;
			line(contextBG, linePoint, mouse.pos);
			putPoint(mouse.pos.x, mouse.pos.y);
		}

		if (linePoint.length > 1) {
			socket.emit('draw_line', { line: [linePoint] });
			line_history.push(linePoint);
		}
	}

	function hasPenChange(now, prev, turn) {
		if (now && prev && turn) {
			var dx = now.x - prev.x;
			var dy = now.y - prev.y;
			var tdx = turn.x - prev.x;
			var tdy = turn.y - prev.y;

			var dis1 = distance(now, prev);
			var dis2 = distance(turn, prev);
			if (!dis1 && !dis2) return false;

			var cos = (dx * tdx + dy * tdy) / (dis1 * dis2);
			return (cos < 0 || Math.abs(cos) < Math.cos(constant.minAngleChange));
		} else
			return false;
	}

	function distance(start, end) {
		var dx = start.x - end.x;
		var dy = start.y - end.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function line(context, points, temp) {
		if (!points && points.length <= 0)
			return;

		context.lineJoin = "round";
		context.lineCap = "round";
		context.beginPath();
		context.moveTo(points[0].x, points[0].y);
		for (var j = 1; j < points.length; j++)
			context.lineTo(points[j].x - constant.offsetX, points[j].y - constant.offsetY);

		if (temp)
			context.lineTo(temp.x, temp.y);

		context.stroke();
	}

	function dotTo(context, dot) {
		context.fillStyle = constant.color;
		context.beginPath();
		context.arc(dot.x, dot.y, constant.penSize * 0.5, 0, 2 * Math.PI);
		context.fill();
	}

	function drawCursor(cursorX, cursorY) {
		context.save();
		context.lineWidth = 1;
		context.beginPath();
		context.arc(cursorX, cursorY, Math.max(constant.penSize * 0.5 + 2.5, 7.5), 0, 2 * Math.PI);
		context.stroke();
		dotTo(context, { x: cursorX, y: cursorY });
		context.restore();
	}

	function redraw() {
		contextBG.clearRect(0, 0, width, height);
		contextBG.beginPath();
		for (i = 0; i < line_history.length; i++) {
			contextBG.strokeStyle = line_history[i][0].color;
			contextBG.lineWidth = line_history[i][0].penSize;
			line(contextBG, line_history[i]);
		}

		for (var i = 0; i < dot_history.length; i++)
			dotTo(contextBG, dot_history[i]);
	}

	function putPoint(posX, posY) {
		linePoint.push({ x: posX + constant.offsetX, y: posY + constant.offsetY });
	}

	// set canvas to full browser width/height
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
