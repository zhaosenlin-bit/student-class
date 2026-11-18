function polymodelsMain(  ) {
	this.version = '0.92';

	//this.shapeName = typeof shapeName !== 'undefined' ? shapeName : 'cube';
	var m = getQueryVariable('m');
	if (m) {
		m = m.replace(/%20/g,' ');
		m = m.toLowerCase();
		this.shapeName = m;
	} else {
		this.shapeName = 'icosidodecahedron';
		this.shapeName = 'rhombicosidodecahedron';
		this.shapeName = 'cube';
		this.shapeName = 'truncated icosahedron';
	//this.shapeName = 'triakis icosahedron';
	}

	this.curvyQ = ['cone', 'cylinder', 'sphere', 'hemisphere'].indexOf(this.shapeName) >= 0;
	this.flatyQ = ['plane'].indexOf(this.shapeName) >= 0;

	console.log("polymodelsMain", this.shapeName);
	//this.shapeName = 'pent-prism';

	w = 550;
	h = 550;
	topMargin = 65;

	var s = "";
	s += '<div style="position:relative; width:' + w + 'px; height:' + h + 'px; border-radius: 10px;  margin:auto; display:block; ">';   // box-shadow: 0px 0px 19px 10px rgba(0,0,68,0.46);
	//s += '<canvas id="canvasId" width="' + w + '" height="' + h + '" style="z-index:1;"></canvas>';
	s += '<canvas id="canvas2" style="position: absolute; width:' + w + 'px; height:' + h + 'px; z-index: 1; border: none;"></canvas>';
	s += '<canvas id="canvas1" style="position: absolute; width:' + w + 'px; height:' + h + 'px; z-index: 1; border: none;"></canvas>';

	s += '<div style="position: relative; height:33px;  z-index:2;  background-color: #48f;border-radius: 10px;">';
	//s += '<button id="dnBtn" style="font-size: 16px; color: #000aae; " class="togglebtn"  onclick="numDn()" >&#x25BC;</button>';
	//s += '<button id="dnBtn" style="font-size: 16px; color: #000aae; " class="togglebtn"  onclick="numDn()" >&#x25B2;</button>';
	s += '<button id="prevBtn" style="position: absolute; left:1px;  z-index:3;font-size: 16px; color: #000aae; " class="togglebtn"  onclick="prevPoly()" >&#x25C0;</button>';
	s += '<button id="nextBtn" style="position: absolute;right:1px; z-index:3;font-size: 16px; color: #000aae; " class="togglebtn"  onclick="nextPoly()" >&#x25B6;</button>';
	s += '<div id="title" style="z-index:2; color: white;text-align: center; position: relative; font: bold 20px Arial; padding-top: 2px; ">';
	s += '</div>';
	s += '</div>';

	s += '<div style="position: relative; height:20px;  z-index:2; font: 18px Arial; ">';
	s += '<button id="dragBtn" onclick="toggleDrag()" style="z-index:2; position: absolute; top: 3px; left: 3px;" class="togglebtn lo" >Spin</button>';
	if (this.curvyQ || this.flatyQ) {
	} else {
		s += '<button id="explodeBtn" onclick="toggleExplode()" style="z-index:2; position: absolute; top: 3px; left: 60px;" class="togglebtn lo" >Explode</button>';
		s += '<button id="netBtn" onclick="toggleNet()" style="z-index:2; position: absolute; top: 3px; left: 140px;" class="togglebtn lo" >Net</button>';
		s += '<button id="solidBtn" onclick="toggleSolid()" style="z-index:2; position: absolute; top: 3px; left: 190px;" class="togglebtn hi" >Solid</button>';

		s += '<div style="z-index:2;position: absolute; top: 7px; right: 5px; font: 18px Arial;">';
		s += "Coloring: ";
		s += getDropdownHTML(['Multi', 'Shaded', 'Two', 'Glass', 'PureGlass', 'Beams'], 'clrChg', 'clrType');
		s += '</div>';
	}
	s += '</div>';

	s += '<button style="z-index:2;font: 16px Arial; position:absolute; right:64px; bottom:3px;" class="togglebtn"  onclick="canvasPrint()" >Print</button>';
	s += '<button style="z-index:2;font: 16px Arial; position:absolute; right:3px; bottom:3px;" class="togglebtn"  onclick="canvasSave()" >Save</button>';
	s += '<div id="copyrt" style="font: 7pt arial; font-weight: bold; color: #6600cc; position:absolute; left:5px; bottom:3px;">&copy; 2016 MathsIsFun.com  v' + this.version + '</div>';
	s += '</div>';

	document.write(s);

	el = document.getElementById('canvas1');
	//el.style.border = "1px solid black";
	ratio = 2;
	el.width = w * ratio;
	el.height = h * ratio;
	el.style.width = w + "px";
	el.style.height = h + "px";
	g = el.getContext("2d");
	g.setTransform(ratio, 0, 0, ratio, 0, 0);

	el2 = document.getElementById('canvas2');
	//el.style.border = "1px solid black";
	el2.width = w * ratio;
	el2.height = h * ratio;
	el2.style.width = w + "px";
	el2.style.height = h + "px";
	g2 = el2.getContext("2d");
	g2.setTransform(ratio, 0, 0, ratio, 0, 0);

	transMat = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]];
	this.f = 500;

	this.shapes = [];

	// var Scale;
	// var clrMethod;

	this.clrs = ["#ff0000", "#0000ff", "#ff9900", "#00ff00", "#ffff00", "#660066", "#99ff00", "#0099ff", "#00ff99", "#9900ff", "#ff0099", "#006666", "#666600", "#990000", "#009999", "#999900", "#003399", "#ff00ff", "#993333", "#330099"];

	this.explodeQ = false;
	this.netQ = false;
	this.solidQ = true;

	dragQ = false;
	draggingQ = false;
	prevmouseX = 0;
	prevmouseY = 0;

	this.poly = new Poly();

	xAngle = 2;
	yAngle = 4;
	zAngle = 0;

	el.addEventListener('touchstart', ontouchstart, false);
	el.addEventListener('touchmove', ontouchmove, false);
	el.addEventListener('mousedown', onmouseDown, false);
	el.addEventListener('mousemove', onmouseMove, false);
	el.addEventListener("mouseup", onmouseUp, false);

	polys = getPolyData();
	polyNo = 0;

	for (var i = 0; i < polys.length; i++) {
		//console.log("#", polys[i][0], this.shapeName);
		if (polys[i][0].toLowerCase() == this.shapeName) {
			polyNo = i;
			break;
		}
	}
	console.log("stt", this.shapeName, polyNo);

	settransMat(200, 50, 0, transMat);  // give it a nice tilt to start with
	restart();
	animate();

}

function ontouchstart( evt ) {
	draggingQ = true;
	var touch = evt.targetTouches[0];
	var bRect = el.getBoundingClientRect();
	prevmouseX = (touch.clientX - bRect.left) * (el.width / ratio / bRect.width);
	prevmouseY = (touch.clientY - bRect.top) * (el.height / ratio / bRect.height);
}
function ontouchmove( evt ) {
	//Assume only one touch/only process one touch even if there's more
	var touch = evt.targetTouches[0];
	evt.clientX = touch.clientX;
	evt.clientY = touch.clientY;
	evt.touchQ = true;
	onmouseMove(evt);

	evt.preventDefault();
}

function onmouseDown() {
	draggingQ = true;
	prevmouseX = mouseX;
	prevmouseY = mouseY;
}
function onmouseUp() {
	draggingQ = false;
}
function onmouseMove( evt ) {
	//getting mouse position correctly
	var bRect = el.getBoundingClientRect();
	mouseX = (evt.clientX - bRect.left) * (el.width / ratio / bRect.width);
	mouseY = (evt.clientY - bRect.top) * (el.height / ratio / bRect.height);
	//console.log("onmouseMove", mouseX, mouseY, xAngle, yAngle);

	if (dragQ) {
		if (draggingQ) {
			settransMat(-(prevmouseY - mouseY) * 3, (prevmouseX - mouseX) * 3, 0, transMat);
			prevmouseX = mouseX;
			prevmouseY = mouseY;
			update();
		}
	} else {
		yAngle = -(mouseX - w / 2) / 50;
		xAngle = (mouseY - h / 2) / 50;
	}

}
function toggleDrag() {
	dragQ = !dragQ;
	toggleBtn("dragBtn", dragQ);
	if (dragQ) {
		document.getElementById("dragBtn").innerHTML = 'Drag';
	} else {
		document.getElementById("dragBtn").innerHTML = 'Spin';
	}
	//restart();
}
function toggleExplode() {
	this.explodeQ = !this.explodeQ;
	toggleBtn("explodeBtn", this.explodeQ);
	restart();
}
function toggleNet() {
	this.netQ = !this.netQ;
	toggleBtn("netBtn", this.netQ);
	restart();
}
function toggleSolid() {
	this.solidQ = !this.solidQ;
	toggleBtn("solidBtn", this.solidQ);
	restart();
}
function toggleBtn( btn, onq ) {
	if (onq) {
		document.getElementById(btn).classList.add("hi");
		document.getElementById(btn).classList.remove("lo");
	} else {
		document.getElementById(btn).classList.add("lo");
		document.getElementById(btn).classList.remove("hi");
	}
}

function prevPoly() {
	polyNo--;
	if (polyNo < 0) polyNo = polys.length - 1;
	console.log("prevPoly", polyNo, polys.length);
	restart();
}
function nextPoly() {
	polyNo = (++polyNo) % polys.length;
	console.log("nextPoly", polyNo, polys.length);
	restart();
}

function getDropdownHTML( opts, funcName, id ) {

	var s = '';
	s += '<select id="' + id + '" style="font: 16px Arial; color: #6600cc; background: rgba(200,220,256,0.7); padding: 1px;" onchange="' + funcName + '()">';
	for (var i = 0; i < opts.length; i++) {
		var idStr = id + i;
		var chkStr = i == 3 ? 'selected' : '';
		s += '<option id="' + idStr + '" value="' + opts[i] + '" style="height:18px;" ' + chkStr + ' >' + opts[i] + '</option>';
	}
	s += '</select>';

	return s;
}

function clrChg() {
	var el = document.getElementById('clrType');

	if (el.selectedIndex == -1)
		return null;

	var t = el.options[el.selectedIndex].text;
	//console.log("clrChg", t);

	setClrs(t);
	update();

}
function getClrType() {
	if (this.curvyQ || this.flatyQ) {
		if (this.shapeName == 'plane') {
			return "Glass";
		} else {
			return "Shaded";
		}
	} else {
		var div = document.getElementById('clrType');

		if (div.selectedIndex == -1)return 'Multi';

		//console.log("clrChg", t);
		return div.options[div.selectedIndex].text;
	}
}

function init() {



	//drawShapes();

}

function restart() {
	console.log("restart", polyNo, polys[polyNo][0]);

	shapes = [];
	poly.shapeSource = "data";
	poly.shapeType = polys[polyNo][0];
	setShapesFromPoly();

	document.getElementById('title').innerHTML = poly.shapeType.capitalize();

	g2.clearRect(0, 0, el.width, el.height);
	if (this.netQ) drawNet();

	this.frameNo = 0;

	g.clearRect(0, 0, el.width, el.height);
	update();
	// shapes are sorted after they are drawn, so when in drag mode a single update is not enough
	// this second update fixes that:
	update();
}

function animate() {

	this.frameNo++;

	if (dragQ) {
	} else {
		settransMat(xAngle, yAngle, zAngle, transMat);
		update();
	}

	if (this.frameNo < 1e8) {
		requestAnimationFrame(animate);
	}

}

function update() {

	g.clearRect(0, 0, el.width, el.height);

	//g.beginPath();
	//g.fillStyle = 'rgba(255,255,255,0.001)';
	//g.rect(0, 0, el.width, el.height);
	//g.fill();
	if (this.solidQ)  drawShapes();

}
function drawShapes() {

	var prevDepth = 0;
	var sortNeededQ = false;

	for (var i = 0, len = shapes.length; i < len; i++) {
		var shape = shapes[i];
		//shape.transMat = transMat;
		shape.drawsurface(false, "N");   // TODO: drawsurface to AFTER sort

		if (i > 0) {
			if (shape.depth < prevDepth) {  // prevDepth only makes sense when i>0
				sortNeededQ = true;
			}
		}
		prevDepth = shape.depth;
		//console.log("i=" + i, "depth=" + shape.depth, sortNeededQ);

	}

	if (sortNeededQ) {
		//console.log("sortNeededQ");
		// place in order
		shapes.sort(compareDepth);
		//for (i = 0; i < shapes.length; i++) {
		//	shape = shapes[i];
		//solidSprite.setChildIndex(shape, i);
		//}
	}

}

function compareDepth( a, b ) {
	if (a.depth < b.depth) return -1;
	return 1;
}

function setShapesFromPoly() {

	var C = poly.getSolid();

	var i = 0;
	while (i < C.length) {
		var surf = C[i];
		addShape3D("surface", coords2Lines(surf, poly.scale), 1, '#ffffff', 'rgba(0,0,255,0.3)');
		//addShape3D("surface", Coords2Lines(surf, poly.scale), 1, '#ffffff', 1, this.clrs[i], 0.7);
		i++;
	}
	//setClrs(poly.getClrMethod());
	setClrs(getClrType());
}

function coords2Lines( surf, Scale ) {

	var P = [];

	var midPt = [0, 0, 0];

	//console.log("P=" + Strings.fmtArray(surf));
	for (var i = 0; i < surf.length; i++) {
		// Set the Points equal to coordinates, including returning to start
		if (i < surf.length - 1) {
			var tonum = i + 1;
		} else {
			tonum = 0;
		}
		P[i] = [];
		if (surf[i] == undefined) {
			console.log("Error surface =" + i, surf[i]);
		} else {
			// scale the points
			for (var j = 0; j < 3; j++) { // x, y, z
				P[i][j] = surf[i][j] * Scale;
				if (explodeQ) midPt[j] += P[i][j]; // sum up to calculate centroid (for exploding)
			}
		}

	}
	if (explodeQ) {
		// finish calculating centroid by dividing by how many
		for (j = 0; j < 3; j++) {
			midPt[j] /= surf.length;
			//console.log("midPt=" + midPt);
		}
		for (i = 0; i < surf.length; i++) {
			for (j = 0; j < 3; j++) { // x, y, z
				P[i][j] += midPt[j] / 2;
			}
		}
	}

	return P;
}

function addShape3D( shapeType, pointarray, lineweight, lineClr, fillClr ) {
	var shape = new Shape3D;

	shape.transMat = transMat;
	shape.f = this.f;

	shape.setPts(pointarray);
	shape.shapeType = shapeType;
	shape.lineweight = lineweight;
	shape.lineClr = lineClr;
	shape.fillClr = fillClr;
	//shape.fillClr = convertHexClr(fillClr, 0.8);
	//if (fillClr == 0 || fillClr == 1) shape.doShading();

	//console.log("shape",shape);
	shapes.push(shape);

	//solidSprite.addChild(shape);
	//this[objtype + "s"] ++;
}

// Sets the global transformation matrix using matrix multiplication routine. Temporary transformation matrix generated from x, y, z coordinates passed as parameters.
function settransMat( x, y, z, M ) {
	var vectorLength = Math.sqrt(x * x + y * y + z * z);
	if (vectorLength > .0001) {
		x /= vectorLength;
		y /= vectorLength;
		z /= vectorLength;
		var Theta = vectorLength / 500;
		var cosT = Math.cos(Theta);
		var sinT = Math.sin(Theta);
		var tanT = 1 - cosT;
		var T = [[], [], []];
		T[0][0] = tanT * x * x + cosT;
		T[0][1] = tanT * x * y - sinT * z;
		T[0][2] = tanT * x * z + sinT * y;
		T[1][0] = tanT * x * y + sinT * z;
		T[1][1] = tanT * y * y + cosT;
		T[1][2] = tanT * y * z - sinT * x;
		T[2][0] = tanT * x * z - sinT * y;
		T[2][1] = tanT * y * z + sinT * x;
		T[2][2] = tanT * z * z + cosT;
		transMat = matMatMult(T, M);
	}
}

// Performs a matrix-matrix multiplication with matrix A and matrix B parameters. Returns matrix C as result.
function matMatMult( A, B ) {
	var C = [[], [], []];
	C[0][0] = A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0];
	C[0][1] = A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1];
	C[0][2] = A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2];
	C[1][0] = A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0];
	C[1][1] = A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1];
	C[1][2] = A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2];
	C[2][0] = A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0];
	C[2][1] = A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1];
	C[2][2] = A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2];
	return C;
}

function setClrs( clrMethod ) {
	for (var i = 0; i < shapes.length; i++) {
		var shape = shapes[i];
		shape.clrMethod = clrMethod;

		//var clr = 0;
		// "Array", "Alternating", "Smooth", "Glass", "Shaded"
		switch ( clrMethod ) {
			case "Multi":
				//var cc =
				shape.fillClr = convertHexClr(clrs[i % clrs.length], 0.7);
				break;

			case "Two":
				shape.fillClr = convertHexClr(clrs[i % 2], 0.8);
				break;

			case "Smooth":
				var FromMiddle = parseInt(Math.abs(shapes.length / 2 - i));
				//clr = FromMiddle * 0x000009 + 0x226600;
				var blu = FromMiddle * 8 + 1;
				var ccc = rgb2hex([blu, 128, blu]);
				//console.log("Smooth", blu, ccc);
				shape.fillClr = ccc;
				//if (surfaceNo==0) clr = 0x666699;
				break;

			case "Glass":
			case "PureGlass":
				shape.doShading();

				break;
			case "Shaded":
				shape.doShading();
				break;

			default:
		}
	}

}

//function getAnySolid( shapeSource ) {
//
//	var C = [];
//	switch ( shapeSource ) {
//
//		case "file":
//		case "data":
//			//C = [[[3, 1, 1], [-1, 1, -1], [1, -1, -1]], [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]], [[1, 1, 1], [1, -1, -1], [-1, -1, 1]], [[1, 1, 1], [-1, -1, 1], [-1, 1, -1]]];
//			//C = poly.getC();
//
//			//games = new Games(["symbol", "dual", "number", "vertices", "net", "solid", "hinges"]);
//			//games.setGame(shapeType);
//			//polyName = games.getGameName();
//			//vertices = games.option("vertices");
//			//netFaces = games.option("net");
//			//solidFaces = games.option("solid");
//			//setHinges(games.option("hinges"));
//
//			var solid = polys[polyNo][1];
//
//			//var solidFaces = games.option("solid");
//			var vertices = solid[3];
//			var solidFaces = solid[5];
//
//			C = [];
//			for (var i = 0; i < solidFaces.length; i++) {
//				var faceVerts = [];
//				for (var j = 0; j < solidFaces[i].length; j++) {
//					//trace("=" + solidFaces[i][j]);
//					faceVerts.push(vertices[solidFaces[i][j]]);
//				}
//				C.push(faceVerts);
//			}
//
//			//clrMethod = "Shaded";
//			clrMethod = "Glass";
//			Scale = 150; // NB 150
//			break;
//
//		case "calc":
//			C = poly.getSolid();
//			break;
//
//		default:
//
//	}
//
//	return C;
//}

function Poly() {
	this.shapeType = 'cube';
	this.shapeSource = 'calc';
	this.scale = 90;
}
Poly.prototype.getSolid = function () {

	//console.log("getSolid", this);

	var C = [];
	switch ( this.shapeSource ) {

		case "file":
		case "data":
			//C = [[[3, 1, 1], [-1, 1, -1], [1, -1, -1]], [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]], [[1, 1, 1], [1, -1, -1], [-1, -1, 1]], [[1, 1, 1], [-1, -1, 1], [-1, 1, -1]]];
			//C = poly.getC();

			var solid = polys[polyNo][1];

			//var solidFaces = games.option("solid");
			var vertices = solid[3];
			var solidFaces = solid[5];

			C = [];
			for (var i = 0; i < solidFaces.length; i++) {
				var faceVerts = [];
				for (var j = 0; j < solidFaces[i].length; j++) {
					//console.log("=" + solidFaces[i][j]);
					faceVerts.push(vertices[solidFaces[i][j]]);
				}
				C.push(faceVerts);
			}

			//clrMethod = "Shaded";
			clrMethod = "Glass";
			Scale = 100; // NB 150
			this.scale = 120;
			break;

		case "calc":
			C = this.getCalcSolid();
			break;

		default:

	}

	return C;
};
Poly.prototype.getNet = function () {

	var solid = polys[polyNo][1];

	//var solidFaces = games.option("solid");
	var vertices = solid[3];
	var netFaces = solid[4];

	var C = [];
	for (var i = 0; i < netFaces.length; i++) {
		var faceVerts = [];
		for (var j = 0; j < netFaces[i].length; j++) {
			//trace("=" + solidFaces[i][j]);
			faceVerts.push(vertices[netFaces[i][j]]);
		}
		C.push(faceVerts);
	}

	return C;
};

Poly.prototype.getCalcSolid = function () {

	var C = [];
	this.scale = 90;
	var i;
	var j;

	switch ( this.shapeType.toLowerCase() ) {

		case "net":
			C = [[[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], [[1, 0, 0], [2, 0, 0], [2, 1, 0], [1, 1, 0]], [[2, 0, 0], [3, 0, 0], [3, 1, 0], [2, 1, 0]]];
			clrMethod = "Glass";
			this.scale = 100;
			break;

		case "sphere":
			C = this.createNSphere(3);
			clrMethod = "Alternating";
			this.scale = 110;
			break;

		case "hemisphere":
			C = CreateNSphere(3, true);
			clrMethod = "Shaded";
			this.scale = 110;
			break;

		case "cone":
			C = this.createNCone(60, 1.3);
			this.scale = 140;
			clrMethod = "Smooth";
			break;

		case "cylinder":
			C = this.createNCylinder(60);
			clrMethod = "Smooth";
			this.scale = 110;
			break;

		case "square-pyramid":
			C = this.createNCone(4, 0.5);
			//clrMethod = "Smooth";
			this.scale = 180;
			break;

		case "pent-pyramid":
			C = this.createNCone(5, 0.7);
			//clrMethod = "Smooth";
			this.scale = 180;
			break;

		case "tetrahedron":
			C = [[[1, 1, 1], [-1, 1, -1], [1, -1, -1]], [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]], [[1, 1, 1], [1, -1, -1], [-1, -1, 1]], [[1, 1, 1], [-1, -1, 1], [-1, 1, -1]]];
			break;

		case "irr-tetrahedron":
			C = [[[2, 1, -0.2], [-1, 1, -1], [1, -1, -1]], [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]], [[2, 1, -0.2], [1, -1, -1], [-1, -1, 1]], [[2, 1, -0.2], [-1, -1, 1], [-1, 1, -1]]];
			this.scale = 80;
			break;

		case "cube":
			C = [[[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]];
			//C = [[[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]];  //  Just one face to start with
			break;

		case "3 points":
			C = [[[-1, -1, -1], [1, -1, -1], [1, -1, 1]]];
			this.scale = 80;
			break;

		case "4 coplanar points": // Coplanar
			C = [[[-1.5, -1, -1], [1, -1, -1], [0.3, -1, 1], [-1.5, -1, 1]]];
			this.scale = 80;
			break;

		case "4 points":
			C = [[[-1.1, -2, -2], [1, -1, -1], [0.8, 2, 1]], [[1, -1, -1], [0.8, 2, 1], [1.5, -1, 1]]];
			Scale = 70;
			break;

		case "plane":
			var a = 0.5;
			var b = 0.5;
			var c = 0.5;
			var d = -3;
			C = [];
			for (i = 0; i < 6; i++) {
				for (j = 0; j < 6; j++) {
					//var d = i;
					C.push([[a, -b + d + i, -c + d + j], [a, b + d + i, -c + d + j], [a, b + d + i, c + d + j], [a, -b + d + i, c + d + j]]);
				}
			}
			this.scale = 80;
			break;

		case "cuboid":
		case "rect-prism":
			a = 1.2;
			b = 0.7;
			c = 0.7;

			C = [[[-a, -b, -c], [a, -b, -c], [a, -b, c], [-a, -b, c]], [[-a, -b, -c], [-a, -b, c], [-a, b, c], [-a, b, -c]], [[-a, -b, c], [a, -b, c], [a, b, c], [-a, b, c]], [[-a, b, -c], [-a, b, c], [a, b, c], [a, b, -c]], [[a, -b, -c], [a, b, -c], [a, b, c], [a, -b, c]], [[-a, -b, -c], [-a, b, -c], [a, b, -c], [a, -b, -c]]];
			break;

		case "pent-prism":
			a = 1.2;
			b = 0.70;
			c = 0.73;
			d = 0.16;
			var e = 0.44;
			C = [[[-a, 0, b], [-a, c, d], [-a, e, -b], [-a, -e, -b], [-a, -c, d]], [[a, 0, b], [a, c, d], [a, e, -b], [a, -e, -b], [a, -c, d]], [[-a, 0, b], [-a, c, d], [a, c, d], [a, 0, b]], [[-a, c, d], [-a, e, -b], [a, e, -b], [a, c, d]], [[-a, e, -b], [-a, -e, -b], [a, -e, -b], [a, e, -b]], [[-a, -e, -b], [-a, -c, d], [a, -c, d], [a, -e, -b]], [[-a, -c, d], [-a, 0, b], [a, 0, b], [a, -c, d]]];

			break;

		case "oct-prism":
			a = 1.1;
			b = 0.33;
			c = 0.79;
			C = [[[-a, b, c], [-a, c, b], [-a, c, -b], [-a, b, -c], [-a, -b, -c], [-a, -c, -b], [-a, -c, b], [-a, -b, c]], [[a, b, c], [a, c, b], [a, c, -b], [a, b, -c], [a, -b, -c], [a, -c, -b], [a, -c, b], [a, -b, c]]];
			for (i = 0; i < 8; i++) {
				j = Maths.loop(i, 0, 7, 1);
				C.push([[C[0][i][0], C[0][i][1], C[0][i][2]], [C[0][j][0], C[0][j][1], C[0][j][2]], [C[1][j][0], C[1][j][1], C[1][j][2]], [C[1][i][0], C[1][i][1], C[1][i][2]]]);
			}

			break;

		case "irr-pent-prism":
			a = 1.2;
			b = 0.70;
			c = 0.73;
			d = 0.16;
			e = 0.9;
			C = [[[-a, 0, b], [-a, c, d], [-a, e, -b], [-a, -e, -b], [-a, -c, d]], [[a, 0, b], [a, c, d], [a, e, -b], [a, -e, -b], [a, -c, d]], [[-a, 0, b], [-a, c, d], [a, c, d], [a, 0, b]], [[-a, c, d], [-a, e, -b], [a, e, -b], [a, c, d]], [[-a, e, -b], [-a, -e, -b], [a, -e, -b], [a, e, -b]], [[-a, -e, -b], [-a, -c, d], [a, -c, d], [a, -e, -b]], [[-a, -c, d], [-a, 0, b], [a, 0, b], [a, -c, d]]];
			break;

		case "tri-prism-n":
			C = CreateNCylinder(3);
			//clrMethod = "Smooth";
			this.scale = 100;
			break;

		case "tri-prism":
			a = 1.2;
			b = 0.7;
			c = 0.7;
			d = 0.6;
			C = [[[-a, -b, -c], [-a, -b, c], [-a, d, 0]], [[a, -b, -c], [a, -b, c], [a, d, 0]], [[-a, -b, -c], [a, -b, -c], [a, -b, c], [-a, -b, c]], [[-a, -b, c], [a, -b, c], [a, d, 0], [-a, d, 0]], [[-a, -b, -c], [-a, d, 0], [a, d, 0], [a, -b, -c]]];
			break;

		case "strange-prism":
			a = 1.2;
			b = 0.7;
			c = 0.7;
			C = [[[-a, -b, -c], [a, -b, -c], [a, -b, c]], [[-a, -b, -c], [-a, -b, c], [-a, b, c]], [[-a, -b, c], [a, -b, c], [a, b, c]], [[-a, b, -c], [-a, b, c], [a, b, c]], [[a, -b, -c], [a, b, -c], [a, b, c]], [[-a, -b, -c], [-a, b, -c], [a, b, -c]]];
			break;

		case "octahedron":
			a = 3 / (2 * Math.sqrt(2));
			b = 3 / 2;
			C = [[[-a, 0, a], [-a, 0, -a], [0, b, 0]], [[-a, 0, -a], [a, 0, -a], [0, b, 0]], [[a, 0, -a], [a, 0, a], [0, b, 0]], [[a, 0, a], [-a, 0, a], [0, b, 0]], [[a, 0, -a], [-a, 0, -a], [0, -b, 0]], [[-a, 0, -a], [-a, 0, a], [0, -b, 0]], [[a, 0, a], [a, 0, -a], [0, -b, 0]], [[-a, 0, a], [a, 0, a], [0, -b, 0]]];
			Scale = 100;
			break;

		case "dodecahedron":
			var phi = (1 + Math.sqrt(5)) / 2; // golden ratio
			a = 1;
			b = 1 / phi;
			c = 2 - phi;
			a *= 1.5;
			b *= 1.5;
			c *= 1.5; // scale to make it fit nicely
			C = [[[c, 0, a], [-c, 0, a], [-b, b, b], [0, a, c], [b, b, b]], [[-c, 0, a], [c, 0, a], [b, -b, b], [0, -a, c], [-b, -b, b]], [[c, 0, -a], [-c, 0, -a], [-b, -b, -b], [0, -a, -c], [b, -b, -b]], [[-c, 0, -a], [c, 0, -a], [b, b, -b], [0, a, -c], [-b, b, -b]], [[0, a, -c], [0, a, c], [b, b, b], [a, c, 0], [b, b, -b]], [[0, a, c], [0, a, -c], [-b, b, -b], [-a, c, 0], [-b, b, b]], [[0, -a, -c], [0, -a, c], [-b, -b, b], [-a, -c, 0], [-b, -b, -b]], [[0, -a, c], [0, -a, -c], [b, -b, -b], [a, -c, 0], [b, -b, b]], [[a, c, 0], [a, -c, 0], [b, -b, b], [c, 0, a], [b, b, b]], [[a, -c, 0], [a, c, 0], [b, b, -b], [c, 0, -a], [b, -b, -b]], [[-a, c, 0], [-a, -c, 0], [-b, -b, -b], [-c, 0, -a], [-b, b, -b]], [[-a, -c, 0], [-a, c, 0], [-b, b, b], [-c, 0, a], [-b, -b, b]]

			];
			break;

		case "icosahedron-intersected":
			phi = (1 + Math.sqrt(5)) / 2; // golden ratio
			a = 1;
			b = 1 / phi;
			c = 2 - phi;
			a *= 1.5;
			b *= 1.5;
			c *= 1.5; // scale to make it fit nicely
			C = [[[0, b, -a], [b, a, 0], [-b, a, 0]], [[0, 0, 0], [-b, a, 0], [b, a, 0]], [[0, 0, 0], [0, -b, a], [-a, 0, b]], [[0, 0, 0], [a, 0, b], [0, -b, a]], [[0, b, -a], [0, 0, 0], [a, 0, -b]], [[0, b, -a], [-a, 0, -b], [0, 0, 0]], [[0, -b, a], [b, -a, 0], [-b, -a, 0]], [[0, 0, 0], [-b, -a, 0], [b, -a, 0]], [[-b, a, 0], [-a, 0, b], [-a, 0, -b]], [[-b, -a, 0], [-a, 0, -b], [-a, 0, b]], [[b, a, 0], [a, 0, -b], [a, 0, b]], [[b, -a, 0], [a, 0, b], [a, 0, -b]], [[0, 0, 0], [-a, 0, b], [-b, a, 0]], [[0, 0, 0], [b, a, 0], [a, 0, b]], [[0, b, -a], [-b, a, 0], [-a, 0, -b]], [[0, b, -a], [a, 0, -b], [b, a, 0]], [[0, 0, 0], [-a, 0, -b], [-b, -a, 0]], [[0, 0, 0], [b, -a, 0], [a, 0, -b]], [[0, -b, a], [-b, -a, 0], [-a, 0, b]], [[0, -b, a], [a, 0, b], [b, -a, 0]]

			];
			break;

		case "icosahedron":
			phi = (1 + Math.sqrt(5)) / 2; // golden ratio
			a = 1 / 2;
			b = 1 / (2 * phi);
			a *= 3;
			b *= 3; // scale to make it fit nicely
			C = [[[0, b, -a], [b, a, 0], [-b, a, 0]], [[0, b, a], [-b, a, 0], [b, a, 0]], [[0, b, a], [0, -b, a], [-a, 0, b]], [[0, b, a], [a, 0, b], [0, -b, a]], [[0, b, -a], [0, -b, -a], [a, 0, -b]], [[0, b, -a], [-a, 0, -b], [0, -b, -a]], [[0, -b, a], [b, -a, 0], [-b, -a, 0]], [[0, -b, -a], [-b, -a, 0], [b, -a, 0]], [[-b, a, 0], [-a, 0, b], [-a, 0, -b]], [[-b, -a, 0], [-a, 0, -b], [-a, 0, b]], [[b, a, 0], [a, 0, -b], [a, 0, b]], [[b, -a, 0], [a, 0, b], [a, 0, -b]], [[0, b, a], [-a, 0, b], [-b, a, 0]], [[0, b, a], [b, a, 0], [a, 0, b]], [[0, b, -a], [-b, a, 0], [-a, 0, -b]], [[0, b, -a], [a, 0, -b], [b, a, 0]], [[0, -b, -a], [-a, 0, -b], [-b, -a, 0]], [[0, -b, -a], [b, -a, 0], [a, 0, -b]], [[0, -b, a], [-b, -a, 0], [-a, 0, b]], [[0, -b, a], [a, 0, b], [b, -a, 0]]];
			this.scale = 80;
			break;

		default:

	}

	return C;

};

Poly.prototype.createNCone = function ( ngon, ht ) {
	// Create a triangular facet approximation to a cone

	// initialize D array
	var D = [];

	// bottom n-gon
	D[0] = [];

	var sumx = 0;
	var sumy = 0;

	for (var i = 0; i < ngon; i++) {
		var Angle = (Math.PI * 2 * i) / ngon;
		D[0][i] = [];
		D[0][i][0] = Math.sin(Angle) * 0.8;
		D[0][i][1] = Math.cos(Angle) * 0.8;
		D[0][i][2] = -ht / 2;
		sumx = sumx + D[0][i][0];
		sumy = sumy + D[0][i][1];
	}

	// apex position
	var apexx = sumx / ngon;
	var apexy = sumy / ngon;

	// sides
	for (i = 0; i < ngon; i++) {
		var n = i + 1;
		D[n] = [];
		// apex
		D[n][0] = [];
		D[n][0][0] = apexx;
		D[n][0][1] = apexy;
		D[n][0][2] = ht;
		// base corner 1
		D[n][1] = [];
		D[n][1][0] = D[0][i][0];
		D[n][1][1] = D[0][i][1];
		D[n][1][2] = D[0][i][2];
		// base corner 2
		var i1 = i + 1;
		if (i1 == ngon)
			i1 = 0;
		D[n][2] = [];
		D[n][2][0] = D[0][i1][0];
		D[n][2][1] = D[0][i1][1];
		D[n][2][2] = D[0][i1][2];
	}
	//  ShowArray(D);
	return D;

};

Poly.prototype.createNCylinder = function ( ngon ) {
	// Create a triangular facet approximation to a cylinder

	// initialize D array
	var D = [];

	// top n-gon
	D[0] = [];
	for (var i = 0; i < ngon; i++) {
		var Angle = (Math.PI * 2 * i) / ngon;
		D[0][i] = [];
		D[0][i][0] = Math.sin(Angle) * 0.8;
		D[0][i][1] = Math.cos(Angle) * 0.8;
		D[0][i][2] = 1.4;
	}
	// bottom n-gon
	D[1] = [];
	for (i = 0; i < ngon; i++) {
		Angle = (Math.PI * 2 * i) / ngon;
		D[1][i] = [];
		D[1][i][0] = Math.sin(Angle) * 0.8;
		D[1][i][1] = Math.cos(Angle) * 0.8;
		D[1][i][2] = -1.1;
	}

	// sides
	for (i = 0; i < ngon; i++) {
		var n = i + 2;
		D[n] = [];

		var i1 = i + 1;
		if (i1 == ngon)
			i1 = 0;

		// top corner 1
		D[n][0] = [];
		D[n][0][0] = D[0][i][0];
		D[n][0][1] = D[0][i][1];
		D[n][0][2] = D[0][i][2];
		// top corner 2
		D[n][1] = [];
		D[n][1][0] = D[0][i1][0];
		D[n][1][1] = D[0][i1][1];
		D[n][1][2] = D[0][i1][2];

		// base corner 2
		D[n][2] = [];
		D[n][2][0] = D[1][i1][0];
		D[n][2][1] = D[1][i1][1];
		D[n][2][2] = D[1][i1][2];
		// base corner 1
		D[n][3] = [];
		D[n][3][0] = D[1][i][0];
		D[n][3][1] = D[1][i][1];
		D[n][3][2] = D[1][i][2];
	}
	//  ShowArray(D);
	return D;

};

//Poly.prototype.createNSphere = function (iterations, hemiQ) {
//// Create a triangular facet approximation to a sphere
//// Return the array of facets created.
//// The number of facets will be (4^iterations) * 8
//
//	var i, it;
//	var p = [[0, 0, 1], [0, 0, -1], [-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]];
//
//	var nt = 0;
//	var ntold;
//
//	// Create the level 0 object
//	var a = 1 / Math.sqrt(2);
//	for (i = 0; i < 6; i++) {
//		p[i][0] *= a; //x
//		p[i][1] *= a; //y
//	}
//
//	// initialize f1 array
//	var f1 = [];
//	for (i = 0; i < 8; i++) {
//		f1[i] = [];
//		f1[i][0] = [];
//		f1[i][1] = [];
//		f1[i][2] = [];
//	}
//
//	for (i = 0; i < 3; i++) {
//		f1[0][0][i] = p[0][i];
//		f1[0][1][i] = p[3][i];
//		f1[0][2][i] = p[4][i];
//		f1[1][0][i] = p[0][i];
//		f1[1][1][i] = p[4][i];
//		f1[1][2][i] = p[5][i];
//		f1[2][0][i] = p[0][i];
//		f1[2][1][i] = p[5][i];
//		f1[2][2][i] = p[2][i];
//		f1[3][0][i] = p[0][i];
//		f1[3][1][i] = p[2][i];
//		f1[3][2][i] = p[3][i];
//		if (!hemiQ) {
//			f1[4][0][i] = p[1][i];
//			f1[4][1][i] = p[4][i];
//			f1[4][2][i] = p[3][i];
//			f1[5][0][i] = p[1][i];
//			f1[5][1][i] = p[5][i];
//			f1[5][2][i] = p[4][i];
//			f1[6][0][i] = p[1][i];
//			f1[6][1][i] = p[2][i];
//			f1[6][2][i] = p[5][i];
//			f1[7][0][i] = p[1][i];
//			f1[7][1][i] = p[3][i];
//			f1[7][2][i] = p[2][i];
//		}
//	}
//
//	if (iterations < 1)
//		return (f1);
//
//	var pa = [];
//	var pb = [];
//	var pc = [];
//	// Bisect each edge and move to the surface of a unit sphere
//	nt = 8;
//	for (it = 0; it < iterations; it++) {
//		ntold = nt;
//		for (i = 0; i < ntold; i++) {
//
//			pa[0] = (f1[i][0][0] + f1[i][1][0]) / 2;
//			pa[1] = (f1[i][0][1] + f1[i][1][1]) / 2;
//			pa[2] = (f1[i][0][2] + f1[i][1][2]) / 2;
//			pb[0] = (f1[i][1][0] + f1[i][2][0]) / 2;
//			pb[1] = (f1[i][1][1] + f1[i][2][1]) / 2;
//			pb[2] = (f1[i][1][2] + f1[i][2][2]) / 2;
//			pc[0] = (f1[i][2][0] + f1[i][0][0]) / 2;
//			pc[1] = (f1[i][2][1] + f1[i][0][1]) / 2;
//			pc[2] = (f1[i][2][2] + f1[i][0][2]) / 2;
//
//			this.sphereNormalise(pa);
//			this.sphereNormalise(pb);
//			this.sphereNormalise(pc);
//
//			// create three new entries in f1
//			for (var j = 0; j < 3; j++) {
//				f1[nt + j] = [];
//				f1[nt + j][0] = [];
//				f1[nt + j][1] = [];
//				f1[nt + j][2] = [];
//			}
//			// put new coords in each new entry
//			for (j = 0; j < 3; j++) {
//				f1[nt + 0][0][j] = f1[i][0][j];
//				f1[nt + 0][1][j] = pa[j];
//				f1[nt + 0][2][j] = pc[j];
//				f1[nt + 1][0][j] = pa[j];
//				f1[nt + 1][1][j] = f1[i][1][j];
//				f1[nt + 1][2][j] = pb[j];
//				f1[nt + 2][0][j] = pb[j];
//				f1[nt + 2][1][j] = f1[i][2][j];
//				f1[nt + 2][2][j] = pc[j];
//				f1[i][0][j] = pa[j];
//				f1[i][1][j] = pb[j];
//				f1[i][2][j] = pc[j];
//			}
//			nt = nt + 3;
//		}
//	}
//
//	if (hemiQ) {
//		// circle
//		var ht = 0;
//		var D = new Array;
//		for (i = 0; i < 20; i++) {
//			var Angle = (Math.PI * 2 * i) / 20;
//			D[i] = [];
//			D[i][0] = Math.sin(Angle) * 1.0;
//			D[i][1] = Math.cos(Angle) * 1.0;
//			D[i][2] = -ht / 2;
//			//sumx = sumx + D[0][i][0];
//			//sumy = sumy + D[0][i][1];
//		}
//		f1.push(D);
//	}
//
//	return (f1);
//
//}

Poly.prototype.sphereNormalise = function ( p ) {
// Normalise a vector
	//var length;

	var vectorLength = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);

	if (vectorLength != 0) {
		p[0] /= vectorLength;
		p[1] /= vectorLength;
		p[2] /= vectorLength;
	} else {
		p[0] = 0;
		p[1] = 0;
		p[2] = 0;
	}
};

function Shape3D() {
	//this.transMat = [];
	var rotSelfMatrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]];
	var rotSelfQ = false;
	this.velQ = false;
	// NB can't currently have off-center rotSelfQ and velQ at same time, as velQ recalcs centroid

	this.lt = w / 2;
	this.tp = (h - topMargin) / 2 + topMargin;

	//var f;
	this.eye = new Pt3d;
	this.eye.setMe(0, 0, 400);
	//var world3d = new Pt3d;

	this.pts = []; // use getPts/setPts

	this.lineweight;
	this.lineClr = 'white';
	//this.linealpha;
	this.fillClr = 'rgba(255,0,0,0.9)';
	//this.fillalpha = 1;

	this.shapeType = "surf";
	this.clrMethod = "None";

	this.depth = 0;

	this.showPtsQ = false;
	this.centroid = new Pt3d();

	this.vel3d = new Pt3d;
	//var prevTime = getTimer();

	//var m; // mass
	//var r; // radius

	this.hideCount = 0;

	//eye.setMe(0, 0, 400);
	//setMass(200000);
}
/*
 function speedTest() {
 // C = matrixVectorMultiply(A, B) 974, 966, 970

 var sttTime = getTimer();
 //var p3d = new Pt3d(2, 3, 4);
 var A = [[2, 3, 4], [5, 6, 7], [8, 9, 10]];
 var B = [2, 3, 4];
 var C;

 var G3d = new Pt3d;
 G.setMe(2, 3, 4);
 var H3d;

 var D:Matrix = new Matrix(3, 3);
 D.setEntries([2, 3, 4, 5, 6, 7, 8, 9, 10]);
 var E:Matrix = new Matrix(3, 1);
 E.setEntries([2, 3, 4]);
 var F:Matrix = new Matrix(3, 1);

 for (var i = 0; i < 1000000; i++) {
 //C = matrixVectorMultiply(A, B);
 //H = matrixPt3dMultiply(A, G);
 F = D.multiply(E);
 }
 var elapsed = getTimer() - sttTime;
 console.log("speedTest=" + elapsed, F.getFmt());

 }

 function getPts() {
 return pts;
 }
 */
Shape3D.prototype.setPts = function ( apts ) {
	this.pts = [];

	for (var i = 0; i < apts.length; i++) {
		var p3d = new Pt3d;
		p3d.setMe(apts[i][0], apts[i][1], apts[i][2]);
		this.pts.push(p3d);
	}
	//pts = apts;
	this.calcCentroid();
};
/*
 function getMass() {
 return m;
 }

 function setMass(x) {
 m = x;
 r = Math.pow(m, 0.3);
 console.log("setMass=" + m, r);
 }
 */

/*
 function setClrMethod(clrMethod) {
 this.clrMethod = clrMethod;
 }
 */
Shape3D.prototype.doShading = function () {

	var alpha = 0.8;
	switch ( this.clrMethod ) {
		case 'Glass':
			alpha = 0.5;
			break;
		case 'PureGlass':
			alpha = 0.5;
			break;
		default:

	}
	//fillClr = ((dark * 0xff) << 16) + ((dark * 0xff) << 8);
	//
	//angle = getNormalAngle(pts, 1);
	//dark = (1 - angle / Math.PI);
	//fillClr += (dark * 0xff);

	var angle = this.getNormalAngle(this.pts, 0);
	var dark = (1 - angle / Math.PI);
	var red = (dark * 255 >> 0) + 1;
	//var grn = 128 - (dark * 128 >> 0);
	var grn = (dark * 255 >> 0) + 1;

	angle = this.getNormalAngle(this.pts, 1);
	dark = (1 - angle / Math.PI);
//	var blu = Math.min(128, dark * 128 >> 0) + 100;
	var blu = (dark * 255 >> 0) + 1;
	this.fillClr = 'rgba(' + red + ',' + grn + ',' + blu + ',' + alpha + ')';
	//var a = 127.5;
	//console.log("doShading=" + angle, dark, this.fillClr, a, a >> 0);
};

Shape3D.prototype.getNormalAngle = function ( pts, dimN ) {
	var a = [pts[1].x - pts[0].x, pts[1].y - pts[0].y, pts[1].z - pts[0].z];
	var b = [pts[2].x - pts[1].x, pts[2].y - pts[1].y, pts[2].z - pts[1].z];

	// cross product, and its magnitude
	var cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
	var mag = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);

	// use dot product vs (1,0,0) to calculate angle
	// a.b = |a|*|b|*cos(theta) => theta = acos( a.b / ( |a| * |b| )
	// when b = (1,0,0), then a.b = a[0]*1 + a[1]*0 + a[2]*0 = a[0]
	var theta = Math.acos(cross[dimN] / mag);

	return theta;
}
/*
 function move(xMove, yMove, zMove) {
 var i = 0;
 while (i < pts.length) {
 pts[i].x += xMove;
 pts[i].y += yMove;
 pts[i].z += zMove;
 i++;
 }
 calcCentroid();
 }

 function moveWorld(xMove, yMove, zMove) {
 world.x += xMove;
 world.y += yMove;
 world.z += zMove;
 }

 function getRotPoints() {
 var ptRot = [];
 var i = 0;

 var invMat:Matrix = new Matrix(3, 3);
 for (i = 0; i < 3; i++) {
 for (var j = 0; j < 3; j++) {
 invMat.setEntry(i, j, transMat[i][j]);
 }
 }

 var ptMat:Matrix = new Matrix(3, 1);
 i = 0;
 while (i < pts.length) {
 ptMat.setEntries(pts[i]);
 //ptRot.push(matrixVectorMultiply(apts, pointarray[i]));
 ptRot.push(invMat.inverse().multiply(ptMat).getArray());
 i++;
 }

 return ptRot;

 }
 */
Shape3D.prototype.calcCentroid = function () {
	centroid = new Pt3d;
	for (var i = 0; i < this.pts.length; i++) {
		centroid.addPtMe(this.pts[i]);
		//centroid.addMe( pts[i][0], pts[i][1], pts[i][2]);
	}
	if (this.pts.length > 0) {
		centroid.x /= this.pts.length;
		centroid.y /= this.pts.length;
		centroid.z /= this.pts.length;
	}
	//console.log("centroid=" + centroid);

};

Shape3D.prototype.drawsurface = function ( aboutEyeQ, viewType ) {
	//this.aboutEyeQ = typeof aboutEyeQ !== 'undefined' ? aboutEyeQ : false;
	//this.viewType = typeof viewType !== 'undefined' ? viewType : 'L';

	//if (hideCount > 0) {
	//	hideCount--;
	//	return;
	//}

	//var behindCount = 0;

	var xsum = 0;
	var ysum = 0;
	var zsum = 0;

	//var pointarray = [];
	//var pt2s = [];
	//twoDg.lineStyle(3, 0xff0000, 1);
	//var f3 = Math.pow(f, 3);

	// add velocity to world
	//if (this.velQ) {
	//	var now = getTimer();
	//	var elapsed = (now - prevTime) * 0.1;
	//	//moveWorld( vel.x * elapsed, vel.y * elapsed, vel.z * elapsed );
	//	elapsed = -elapsed;
	//	move(vel.x * elapsed, vel.y * elapsed, vel.z * elapsed);
	//	prevTime = now;
	//}

	//var ptMoved3d;
	var clips = [];
	var zMin = Number.MAX_VALUE;
	var zMax = -Number.MAX_VALUE;
	var i = 0;

	var ptRot;

	//console.log("drawsurface", this.pts);
	while (i < this.pts.length) {

		//var pt:Point = new PoparseInt();
		var pt3d = this.pts[i];
		if (this.aboutEyeQ) {

			//ptMoved = new Pt3d(pt3d);
			//if (rotSelfQ) {
			//	//console.log("3=" + ptMoved, centroid);
			//	ptMoved.addPtMe(centroid, -1);
			//	//console.log("1=" + ptMoved);
			//	ptMoved = matrixPtMultiply(rotSelfMatrix, ptMoved);
			//	//console.log("2=" + ptMoved);
			//	ptMoved.addPtMe(centroid);
			//} else {
			//	//ptMoved = new Pt3d( pts[i].x - world.x, pts[i].y - world.y, pts[i].z - world.z - eye.z );
			//	//ptMoved = new Pt3d( pts[i].x, pts[i].y, pts[i].z );
			//	//ptMoved.setPt( pts[i] );
			//}
			//ptMoved.addPtMe(world, -1);
			//
			//var ptRot3d = matrixPtMultiply(transMat, ptMoved);
			//
			//// 90 rot about y:  http://en.wikipedia.org/wiki/Rotation_matrix
			//var rot90YRMat = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
			//var rot90YLMat = [[0, 0, -1], [0, 1, 0], [1, 0, 0]];
			//switch (viewType) {
			//	case "L":
			//		ptRot = matrixPtMultiply(rot90YLMat, ptRot);
			//		break;
			//	case "R":
			//		ptRot = matrixPtMultiply(rot90YRMat, ptRot);
			//		break;
			//	default:
			//}
			//
			//var p3d3d = new Pt3d(ptRot);
			//p3d.addPtMe(eye, -1);
			////console.log("=" + i, p3d);
			//clips.push(p3d);
			//
			//if (p3d.z < -eye.z + 10) {
			//	behindCount++;
			//}

		} else {

			ptRot = this.matPtMult(transMat, pt3d);
			//p3d = ptRot;

			//pt.x = ptRot.x / (1 - (ptRot.z / f));
			//pt.y = ptRot.y / (1 - (ptRot.z / f));
			clips.push(ptRot);

		}

		//console.log("p3d",pt3d, p3d, ptRot);
		//if (!behindQ) {
		//pt2s.push(pt);

		zMin = Math.min(zMin, ptRot.z);
		zMax = Math.max(zMax, ptRot.z);

		xsum += ptRot.x;
		ysum += ptRot.y;
		zsum += ptRot.z;
		//}
		i++;
	}
	//return;  // 7.2%

	//if (false) {
	//	var zNear = -eye.z + 10;
	//	var zFar = 10000;
	//
	//	if (zMin > zFar || zMax < zNear) {
	//		g.clear();
	//		this.hideCount = 20;  // don't try to calculate or draw again for another second
	//		//depth = 0;
	//		return;
	//	}
	//
	//	if (zMin <= zNear) { // crosses over near plane
	//		//console.log("clippy=" + clips);
	//		//console.log("=" + zMin, zMax);
	//		clips = clipZ(clips, zNear);
	//	}
	//}

	// convert to 2d
	var pt2s = [];
	i = 0;
	while (i < clips.length) {

		var p3d = clips[i];
		//console.log("=" + i, p3d);

		var pt = new Pt();
		pt.x = this.lt + (this.eye.z * (p3d.x)) / (this.eye.z + p3d.z);
		pt.y = this.tp + (this.eye.z * (p3d.y)) / (this.eye.z + p3d.z);

		//console.log("pt=", pt);
		//if (!behindQ) {
		pt2s.push(pt);

		//}
		i++;
	}

	var fillQ = true;
	var strokeQ = true;
	//console.log("pts=" + pts);
	switch ( this.clrMethod ) {
		case "Glass":
			g.lineWidth = 1;
			g.strokeStyle = '#000000';
			g.fillStyle = this.fillClr;
			//g.lineStyle(3, 0x000000, 1);
			//g.beginFill(fillClr, 0.3);
			break;
		case "PureGlass":
			g.lineWidth = 3;
			//g.strokeStyle = '#ffffff';
			//g.strokeStyle = this.fillClr;
			//g.strokeStyle = 'rgba(25,25,255,0.9)';
			g.strokeStyle = 'rgba(205,205,205,0.9)';
			g.fillStyle = this.fillClr;
			//g.fillStyle = 'rgba(225,235,255,0.5)';
			g.lineJoin = "round";
			//strokeQ = false;
			//g.lineStyle(1, 0xffffff, 0.2);
			//g.beginFill(fillClr, 0.3);
			break;
		case "Beams":
			g.lineWidth = 18;
			g.strokeStyle = '#444444';
			//g.strokeStyle = this.fillClr;
			//g.strokeStyle = 'rgba(0,0,50,0.4)';
			g.fillStyle = 'rgba(250,250,250,0.2)';
			//fillQ = false;
			g.lineJoin = "round";
			break;
		case "Shaded":
			g.fillStyle = this.fillClr;
			strokeQ = false;
			break;
		default:
			g.lineWidth = 1;
			g.strokeStyle = this.lineClr;
			g.fillStyle = this.fillClr;
		//g.lineStyle(lineweight, lineClr, linealpha);
		//g.beginFill(fillClr, fillalpha);
	}
	//g.fillStyle = 'rgba(0,0,255,0.3)';
	//g.strokeStyle = 'rgba(0,0,0,0.9)';
	//console.log("this.fillClr",this.fillClr);
	//g.fillStyle = 'black';
	//g.strokeStyle = 'black';
	if (pt2s.length > 2) {
		g.beginPath();
		for (i = 0, len = pt2s.length; i < len; i++) {
			pt = pt2s[i];
			//s += "(" + i.toString() + ": " + pt.fmt(3) + ") "
			if (i == 0) {
				g.moveTo(pt.x, pt.y);
			} else {
				g.lineTo(pt.x, pt.y);
			}
		}
		//pt = pt2s[0];
		//g.lineTo(pt.x, pt.y);
		g.closePath();
		if (strokeQ) g.stroke();
		if (fillQ)  g.fill();
	}

	// calc depth
	var iRecip = 1 / (pt2s.length + 1);
	xsum *= iRecip;
	ysum *= iRecip;
	zsum = f - zsum * iRecip;
	//var camDistQuick =
	//var camdist = 100;
	this.depth = (xsum * xsum + ysum * ysum + zsum * zsum) / 10000;

	/*
	 g.clear();
	 //if (behindQ) {
	 //	depth = 0;
	 //	return;
	 //}

	 //if (behindCount > 0) console.log("=" + behindCount,pt2s.length );
	 //if (behindCount == pt2s.length) { // all behind
	 //	depth = 0;
	 //	return;
	 //}

	 //var camdist = Math.sqrt(Math.pow((xsum) / (i + 1), 2) + Math.pow((ysum) / (i + 1), 2) + Math.pow(f - ((zsum) / (i + 1)), 2));

	 // avg sums
	 var iRecip = 1 / (i + 1);
	 xsum *= iRecip;
	 ysum *= iRecip;
	 zsum = f - zsum * iRecip;
	 var camDistQuick = (xsum * xsum + ysum * ysum + zsum * zsum) / 10000;
	 //var camdist = 100;
	 depth = -camDistQuick;
	 //depth = 100;

	 // return; 9.5%

	 // now draw points
	 switch (clrMethod) {
	 case "Glass":
	 g.lineStyle(3, 0x000000, 1);
	 g.beginFill(fillClr, 0.3);
	 break;
	 case "PureGlass":
	 g.lineStyle(1, 0xffffff, 0.2);
	 g.beginFill(fillClr, 0.3);
	 break;
	 case "Beams":
	 g.lineStyle(18, 0x444444, 1);
	 g.beginFill(fillClr, 0.0);
	 break;
	 default:
	 g.lineStyle(lineweight, lineClr, linealpha);
	 g.beginFill(fillClr, fillalpha);
	 }
	 //return;  9.9%

	 switch (shapeType) {
	 case "surf":
	 //if (behindCount>0) {
	 //	drawClipped(pt2s, g);
	 //} else {
	 drawPts(pt2s, g);
	 //}
	 break;
	 case "sphere":
	 pt = pt2s[0];
	 //var pt1:Point = pt2s[1];
	 var radius = r * 1000 / (p3d.z + eye.z);
	 //if (radius>1)
	 g.drawCircle(pt.x, pt.y, radius);
	 break;
	 }
	 g.endFill();

	 showPtsQ = false;
	 if (showPtsQ) {
	 for (i = 0; i < pts.length; i++) {
	 pt = pts[i];
	 g.beginFill(0x000000, 1);
	 g.drawCircle(pt.x, pt.y, 3);
	 g.endFill();
	 }
	 }

	 if (clrMethod == "Beams") {
	 this.graphics.lineStyle(1, 0xffffff, 1);
	 for (i = 0; i < pts.length; i++) {
	 pt = pts[i];
	 if (i == 0) {
	 this.graphics.moveTo(pt.x, pt.y);
	 } else {
	 this.graphics.lineTo(pt.x, pt.y);
	 }
	 }
	 this.graphics.lineTo(pts[0].x, pts[0].y);

	 }

	 //return;  11.2%
	 */
};
/*
 function drawClipped(pts, g:Graphics) {

 var r:Rectangle = new Rectangle(-400, -400, 800, 800);

 //console.log(">" + s);
 var clips = clipSide(pts, r.left, "l");
 clips = clipSide(clips, r.right, "r");
 clips = clipSide(clips, r.top, "u");
 clips = clipSide(clips, r.bottom, "d");

 drawPts(clips, g);

 }

 function drawPts(pts, g:Graphics) {
 //g.moveTo(r, pt.y);
 var s = "";
 if (pts.length > 2) {
 for (var i = 0; i < pts.length; i++) {
 var pt = pts[i];
 //s += "(" + i.toString() + ": " + pt.fmt(3) + ") "
 if (i == 0) {
 g.moveTo(pt.x, pt.y);
 } else {
 g.lineTo(pt.x, pt.y);
 }
 }
 }
 //console.log("<" + s);

 }

 function clipSide(pts, v, side="u")
 {
 if (pts.length<2) return pts;

 var s = "";
 var clips = [];
 var prevPt = null;
 var prevInQ = true;
 for (var i = 0; i <= pts.length; i++) {
 var pt = pts[Maths.loop(i, 0, pts.length - 1)];

 var inQ = true;
 switch (side) {
 case "u":
 if (pt.y < v)
 inQ = false;
 break;
 case "d":
 if (pt.y > v)
 inQ = false;
 break;
 case "l":
 if (pt.x < v)
 inQ = false;
 break;
 case "r":
 if (pt.x > v)
 inQ = false;
 break;
 default:
 }

 //s += "(" + i.toString() + ": " + pt.fmt(3) + ", " + inQ + ") "

 if (i > 0) { // first loop is just to establish a "previous point"
 if (inQ && prevInQ) {
 clips.push(pt);
 }
 if (!inQ && prevInQ) {
 if (side=="u" || side=="d") {
 clips.push(getCutPtY(prevPt, pt, v));
 } else {
 clips.push(getCutPtX(prevPt, pt, v));
 }
 }
 if (inQ && !prevInQ) {
 if (side=="u" || side=="d") {
 clips.push(getCutPtY(prevPt, pt, v));
 } else {
 clips.push(getCutPtX(prevPt, pt, v));
 }
 clips.push(pt);
 }
 }
 prevPt = pt;
 prevInQ = inQ;
 }

 //console.log("=" + s);
 return clips;
 }

 function clipZ(pts, z)
 {
 if (pts.length<2) return pts;

 var s = "";
 var clips = [];
 var prevPt3d = null;
 var prevInQ = true;
 for (var i = 0; i <= pts.length; i++) {
 var pt3d = pts[Maths.loop(i, 0, pts.length - 1)];

 var inQ = true;
 if (pt.z < z)
 inQ = false;
 //break;

 //s += "(" + i.toString() + ": " + pt.fmt(3) + ", " + inQ + ") "

 if (i > 0) { // first loop is just to establish a "previous point"
 if (inQ && prevInQ) {
 clips.push(pt);
 }
 if (!inQ && prevInQ) {
 clips.push(getCutPtZ(prevPt, pt, z));
 }
 if (inQ && !prevInQ) {
 clips.push(getCutPtZ(prevPt, pt, z));
 clips.push(pt);
 }
 }
 prevPt = pt;
 prevInQ = inQ;
 }

 //console.log("=" + s);
 return clips;
 }

 function getCutPtY(pt1, pt2, v) {
 // find where the line joining p1 to p2 crosses v
 // assumes it DOES cross
 //return new Pt(pt1.x * (1 - ratio) + pt2.x * ratio, pt1.y * (1 - ratio) + pt2.y * ratio);
 if ((pt1.y < v && pt2.y > v) || (pt1.y > v && pt2.y < v)) {
 var newx = pt1.x + (pt2.x - pt1.x) * (v - pt1.y) / (pt2.y - pt1.y);
 return new Pt(newx, v);
 }
 if (pt1.y == v) return pt1;
 return pt2;
 }

 function getCutPtX(pt1, pt2, v) {
 // find where the line joining p1 to p2 crosses v=
 if ((pt1.x < v && pt2.x > v) || (pt1.x > v && pt2.x < v)) {
 var newy = pt1.y + (pt2.y - pt1.y) * (v - pt1.x) / (pt2.x - pt1.x);
 return new Pt(v, newy);
 }
 if (pt1.x == v) return pt1;
 return pt2;
 }

 function getCutPtZ(pt13d, pt23d, z)3d {
 // find where the line joining p1 to p2 crosses v=
 if ((pt1.z < z && pt2.z > z) || (pt1.z > z && pt2.z < z)) {
 var newx = pt1.x + (pt2.x - pt1.x) * (z - pt1.z) / (pt2.z - pt1.z);
 var newy = pt1.y + (pt2.y - pt1.y) * (z - pt1.z) / (pt2.z - pt1.z);
 var newPt3d = new Pt3d();
 newPt.setxyz(newx, newy, z);
 return newPt;
 }
 if (pt1.z == z) return pt1;
 return pt2;
 }


 function getDepth() {
 return depth;
 }

 function getString() {
 return Strings.fmtArray(pts, 2);
 }

 // Performs a matrix-vector multiplication with matrix A and vector B parameters. Returns vector C as result.

 function zmatrixVectorMultiply(A, B) {
 var C = [];
 C[0] = A[0][0] * B[0] + A[0][1] * B[1] + A[0][2] * B[2];
 C[1] = A[1][0] * B[0] + A[1][1] * B[1] + A[1][2] * B[2];
 C[2] = A[2][0] * B[0] + A[2][1] * B[1] + A[2][2] * B[2];
 //console.log("C=" + C);
 return C;
 }

 // Performs a matrix-vector multiplication with matrix A and vector B parameters. Returns vector C as result.
 */
Shape3D.prototype.matPtMult = function ( A, B ) {
	var C = new Pt3d;
	C.x = A[0][0] * B.x + A[0][1] * B.y + A[0][2] * B.z;
	C.y = A[1][0] * B.x + A[1][1] * B.y + A[1][2] * B.z;
	C.z = A[2][0] * B.x + A[2][1] * B.y + A[2][2] * B.z;
	return C;
};
/*
 function rotateAboutLine(aPt, bPt, angle) {
 //var i = 0;
 //while (i < pointarray.length){
 for (var i = 0; i < pts.length; i++) {

 var pt = pts[i];
 var newPt = rotatePtAboutLine(pt, aPt, bPt, angle);

 pt[0] = newPt[0];
 pt[1] = newPt[1];
 pt[2] = newPt[2];
 }

 }

 function getRadius() {
 // radius of planet is approx square root of mass: http://phl.upr.edu/library/notes/standardmass-radiusrelationforexoplanets
 return r;
 }

 function rotatePtAboutLine(pt, aPt, bPt, angle) {
 // http://inside.mines.edu/~gmurray/ArbitraryAxisRotation/

 //console.log("pt=" + pt + ",aPt=" + aPt);

 var x = pt[0];
 var y = pt[1];
 var z = pt[2];

 var a = aPt[0];
 var b = aPt[1];
 var c = aPt[2];

 var u = bPt[0] - aPt[0];
 var v = bPt[1] - aPt[1];
 var w = bPt[2] - aPt[2];

 var L = u * u + v * v + w * w;
 var rootL = Math.sqrt(L);

 var cosA = Math.cos(angle);
 var sinA = Math.sin(angle);

 var rx = (a * (v * v + w * w) - u * (b * v + c * w - u * x - v * y - w * z)) * (1 - cosA) + L * x * cosA + rootL * (-c * v + b * w - w * y + v * z) * sinA;
 var ry = (b * (u * u + w * w) - v * (a * u + c * w - u * x - v * y - w * z)) * (1 - cosA) + L * y * cosA + rootL * (c * u - a * w + w * x - u * z) * sinA;
 var rz = (c * (u * u + v * v) - w * (a * u + b * v - u * x - v * y - w * z)) * (1 - cosA) + L * z * cosA + rootL * (-b * u + a * v - v * x + u * y) * sinA;

 rx /= L;
 ry /= L;
 rz /= L;

 //rx += aPt[0]
 //ry += aPt[1]
 //rz += aPt[2]

 return [rx, ry, rz];
 }

 */
function Pt() {
	this.x = 0;
	this.y = 0;
}
Pt.prototype.toString = function () {
	return this.x + ',' + this.y;
};

function Pt3d() {
	this.x = 0;
	this.y = 0;
	this.z = 0;

}
Pt3d.prototype.setMe = function ( x, y, z ) {
	this.x = x;
	this.y = y;
	this.z = z;
};
Pt3d.prototype.addPtMe = function ( pt3d, factor ) {
	factor = typeof factor !== 'undefined' ? factor : 1;
	if (factor == 1) {
		this.x += pt3d.x;
		this.y += pt3d.y;
		this.z += pt3d.z;
	} else {
		this.x += pt3d.x * factor;
		this.y += pt3d.y * factor;
		this.z += pt3d.z * factor;
	}
};

function drawNet() {

	var bareQ = false;

	var shapes = poly.getNet();

//	console.log("shapes", shapes);

	// find extents
	var minPt = new Pt();
	var maxPt = new Pt();
	for (var i = 0; i < shapes.length; i++) {
		for (var j = 0; j < shapes[i].length; j++) {
			var pt = new Pt();
			pt.x = shapes[i][j][0];
			pt.y = shapes[i][j][1];
			if (pt.x < minPt.x) minPt.x = pt.x;
			if (pt.y < minPt.y) minPt.y = pt.y;
			if (pt.x > maxPt.x) maxPt.x = pt.x;
			if (pt.y > maxPt.y) maxPt.y = pt.y;
			//pts.push(pt);
		}
	}

	var xSpan = maxPt.x - minPt.x;
	var ySpan = maxPt.y - minPt.y;
	//var widest = Math.max(maxPt.x - minPt.x, maxPt.y - minPt.y);

	var scale = Math.min(w / xSpan, (h - topMargin) / ySpan);
	var xLeft = (w - xSpan * scale) / 2;
	var yTop = (h - topMargin - ySpan * scale) / 2 + topMargin;
	//console.log("widest=" + widest, minPt.toString(), maxPt.toString());
	//var widest = 4;

	g2.clearRect(0, 0, el.width, el.height);
	if (bareQ) {
		g2.strokeStyle = '#000000';
		g2.fillStyle = 'white';
	} else {
		g2.strokeStyle = '#ff4400';
		g2.fillStyle = 'rgba(250,230,200,0.3)';
	}
	for (i = 0; i < shapes.length; i++) {
		//console.log("net face=" + shapes[i]);
		g2.beginPath();

		var xStt = 0;
		var yStt = 0;

		for (j = 0; j < shapes[i].length; j++) {
			//console.log("vertex=" + shapes[i][j]);
			var xPos = (shapes[i][j][0] - minPt.x) * scale + xLeft;
			var yPos = (shapes[i][j][1] - minPt.y) * scale + yTop;
			if (j == 0) {
				g2.moveTo(xPos, yPos);
				xStt = xPos;
				yStt = yPos;
			} else {
				g2.lineTo(xPos, yPos);
			}
		}
		g2.lineTo(xStt, yStt); // return to stt

		g2.fill();
		g2.stroke();

	}

}

function convertHexClr( hex, opacity ) {
	// from http://jsfiddle.net/ekinertac/3Evx5/1/

	hex = hex.replace('#', '');
	var r = parseInt(hex.substring(0, 2), 16);
	var g = parseInt(hex.substring(2, 4), 16);
	var b = parseInt(hex.substring(4, 6), 16);

	return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

}

function rgb2hex( color ) {
	var hex = [];
	for (var i = 0; i < 3; i++) {
		hex.push(color[i].toString(16));
		if (hex[i].length < 2) { hex[i] = "0" + hex[i]; }
	}
	return "#" + hex[0] + hex[1] + hex[2];
}

String.prototype.capitalize = function () {
	return this.replace(/(?:^|\s)\S/g, function ( a ) { return a.toUpperCase(); });
};

function canvasGetExtents(can) {
	var g = can.getContext('2d');

	// https://stackoverflow.com/questions/23255825/javascript-method-to-detect-area-of-a-png-that-is-not-transparent

	var wd = can.width * ratio;
	var ht = can.height * ratio;

	var idata = g.getImageData(0, 0, wd, ht); // get image data for canvas
	var buffer = idata.data; // get buffer (unnes. step)
	var buffer32 = new Uint32Array(buffer.buffer); // get a 32-bit representation
	var x, y; // iterators
	var x1 = wd,
		y1 = ht,
		x2 = 0,
		y2 = 0; // min/max values
	//console.log("canvasGetExtents", x1, y1, x2, y2);

	// get edges 
	for (y = 0; y < ht; y++) { // line by line
		for (x = 0; x < wd; x++) { // 0 to width
			if (buffer32[x + y * wd] > 0) { // non-transparent pixel?
				if (x < x1) x1 = x; // if less than current min update
				if (x > x2) x2 = x;
				if (y < y1) y1 = y;
				if (y > y2) y2 = y;
			}
		}
	}
	console.log("canvasGetExtents", can, x1, y1, x2, y2);

	return { left: x1, top: y1, wd: x2 - x1, ht: y2 - y1 }
}

function canvasCrop(c1, rect) {

	var c2 = document.createElement('canvas');
	c2.width = rect.wd;
	c2.height = rect.ht;
	var g2 = c2.getContext("2d");
	//console.log("canvasCrop", c1, c2, rect);
	//g2.drawImage(c1, rect.left * ratio, rect.top * ratio, rect.wd * ratio, rect.ht * ratio, 0, 0, rect.wd * ratio2, rect.ht * ratio2);
	g2.drawImage(c1, rect.left, rect.top, rect.wd, rect.ht, 0, 0, rect.wd, rect.ht);

	return c2;
}

function canvasSave(typ) {
	typ = (typ == undefined) ? 'png' : typ;
	if (typ == 'jpg') typ = 'jpeg';

	canID = "canvas1";
	if (netQ) canID = "canvas2";
	var can = document.getElementById(canID);
	
	var rect = canvasGetExtents(can);
	can = canvasCrop(can, rect);

	var dataUrl = can.toDataURL('image/' + typ);

	var win = window.open();
	win.document.write("<img src='" + dataUrl + "'/>");
	win.document.location = "#";
}

function canvasPrint() {
	canID = "canvas1";
	if (netQ) canID = "canvas2";
	var can = document.getElementById(canID);
	
	var rect = canvasGetExtents(can);
	can = canvasCrop(can, rect);

	var dataUrl = can.toDataURL('image/png');

	var win = window.open();
	win.document.write("<img src='" + dataUrl + "'/>");
	win.document.location = "#";
	win.setTimeout(function () {
		win.focus();
		win.print();
	}, 500);
}

function getQueryVariable( variable ) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable) {return pair[1];}
	}
	return false;
}