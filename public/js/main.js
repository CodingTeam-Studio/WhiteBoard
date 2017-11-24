document.addEventListener("DOMContentLoaded", function() {
	var constant = {
		pointSize: 5,
		minAngleChange: Math.PI / 180,
		penSize: 1,
		color: '#000000',
		maxLinePointTime: 25
	};

	var mouse = {
		click: false,
		move: false,
		pos: { x: 0, y: 0 },
		pos_prev: false,
		pos_turn: false,
		distance: 0,
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

		contextBG.beginPath();
		for (i = 0; i < line.length; i++) {
			line_history.push(line[i]);
			contextBG.strokeStyle = constant.color;
			contextBG.lineWidth = constant.penSize;
			contextBG.moveTo(line[i][0].x, line[i][0].y);
			for (var j = 1; j < line[i].length; j++) {
				contextBG.lineTo(line[i][j].x, line[i][j].y);
			}
		}
		contextBG.stroke();
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
		socket.emit('clear', {});
	};
	// register mouse event handlers
	canvas.onmousedown = function(e) {
		e.preventDefault();
		mouse.click = true;
		mouse.dot = true;
		mouse.pos.x = e.clientX;
		mouse.pos.y = e.clientY;
		mouse.pos_prev = { x: mouse.pos.x, y: mouse.pos.y };
		mouse.pos_turn = false;
		mouse.distance = 0;
		linePoint = [];
		linePoint.push({ x: mouse.pos.x, y: mouse.pos.y });
	};
	canvas.onmouseup = function(e) { endLineDraw(); };
	canvas.onmouseout = function(e) { endLineDraw(); };

	canvas.onmousemove = function(e) {
		if (mouse.click && mouse.pos_prev) {
			mouse.distance += distance(mouse.pos, { x: e.clientX, y: e.clientY });
			mouse.pos.x = e.clientX;
			mouse.pos.y = e.clientY;
			var dis = distance(mouse.pos, mouse.pos_prev);

			if (dis >= constant.pointSize) {
				if (!mouse.pos_turn)
					mouse.pos_turn = { x: mouse.pos.x, y: mouse.pos.y };

				context.clearRect(0, 0, width, height);
				if (dis <= mouse.distance - constant.pointSize * 2 || hasPenChange(mouse.pos, mouse.pos_prev, mouse.pos_turn)) {
					mouse.dot = false;
					line(contextBG, mouse.pos_prev, mouse.pos);
					linePoint.push({ x: mouse.pos.x, y: mouse.pos.y });
					mouse.pos_turn = false;
					mouse.distance = 0;
					mouse.pos_prev.x = mouse.pos.x;
					mouse.pos_prev.y = mouse.pos.y;
				} else
					line(context, mouse.pos_prev, mouse.pos);

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
				dot: [{ x: mouse.pos_prev.x, y: mouse.pos_prev.y }]
			});
		} else if (distance(mouse.pos, mouse.pos_prev) >= constant.pointSize) {
			line(contextBG, mouse.pos_prev, mouse.pos);
			linePoint.push({ x: mouse.pos.x, y: mouse.pos.y });
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

	function line(context, start, end) {
		context.strokeStyle = constant.color;
		context.lineWidth = constant.penSize;
		context.beginPath();
		context.moveTo(start.x, start.y);
		context.lineTo(end.x, end.y);
		context.stroke();
	}

	function dotTo(context, dot) {
		contextBG.fillStyle = constant.color;
		contextBG.beginPath();
		contextBG.arc(dot.x, dot.y, constant.penSize * 1.5, 0, 2 * Math.PI);
		contextBG.fill();
	}

	function redraw() {
		contextBG.beginPath();
		for (i = 0; i < line_history.length; i++) {
			contextBG.strokeStyle = constant.color;
			contextBG.lineWidth = constant.penSize;
			contextBG.moveTo(line_history[i][0].x, line_history[i][0].y);
			for (var j = 1; j < line_history[i].length; j++) {
				contextBG.lineTo(line_history[i][j].x, line_history[i][j].y);
			}
		}
		contextBG.stroke();

		for (var i = 0; i < dot_history.length; i++)
			dotTo(contextBG, dot_history[i]);
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
