// "Lib" Copyright 2024 by Rod Piercel
// http://localhost/mathsisfun/app.html?folder=geometry&file=area-estim
// https://www.mathsisfun.com/geometry/images/area-estim.js

let w,
	h,
	poly,
	dragQ,
	my = {}

function init() {
	let version = '0.82'
	let mode = getJSQueryVar('mode', 'mom1')

	// TODO: verify Ix, Iy
	// TOOD: show/hide controld button
	// TODO: less dense graph

	//mode = 'mom2' // NB

	my.mode = mode // area, mom1, mom2

	my.modePts = 5
	if (isNaN(my.mode)) {
	} else {
		my.modePts = Number(my.mode)
	}
	console.log('my.mode', my.mode, my.modePts)

	dragQ = false
	my.dragScreenQ = false

	w = 540
	h = 360

	//graphLt = 0;
	//graphTp = 0;
	my.graphWd = w
	my.graphHt = h

	my.boxesTgtN = 5

	let s = ''
	s += '<div style="position:relative; width:' + w + 'px; margin:auto; display:block;">'

	let ofStr = ''
	if (my.mode == 'area') ofStr = 'Area'
	if (my.mode == 'mom1') ofStr = 'Centroid'
	if (my.mode == 'mom2') ofStr = '2nd Moment of Area'

	s += wrap(
		{ tag: 'div', pos: 'dib', style: ' z-index: 2; margin:4px; text-align:left; vertical-align:top;' },
		`
    <div style="font: bold 19px arial;">Estimation of ${ofStr}</div>
    <span style="font: 13px/20px Arial; vertical-align: top; z-index: 2; ">Square Density:</span>
    <input type="range" id="r2"  value="' + my.boxesTgtN + '" min="2" max="30" step="1"  style="width:200px; height:17px; border: none;  " oninput="onBoxesChg(0,this.value)" onchange="onBoxesChg(1,this.value)" />
    `
	)

	s += wrap({ id: 'info', tag: 'out', pos: 'dib', style: '  font: 15px arial; padding:5px; text-align:left;z-index: 2;' })

	s += '<canvas id="canGraph" style="position:absolute; top:45px; left:0; background-color: white;  "></canvas>'

	let btns = [
		{ id: 'centroidBtn', name: 'Centroid' },
		{ id: 'anglesBtn', name: 'Angles' },
		{ id: 'sidesBtn', name: 'Sides' },
		//{ id: 'diagsBtn', name: 'Diags' },
		{ id: 'coordsBtn', name: 'Coords' },
		{ id: 'guidesBtn', name: 'Guides' },
		{ id: 'snapBtn', name: 'Snap' },
		{ id: 'regBtn', name: 'Regular' },
	]
	// s += '<div style=" height:80px; width:2px; ">&nbsp;</div>'
	btns.map((btn) => {
		s += wrap(
			{ id: '', tag: 'div', style: 'margin-left:' + (w - 100) + 'px; width:10px;' },
			//s += wrap('', '', 'rel', 'margin-left:' + (w - 100) + 'px; width:10px;',
			`<button id="${btn.id}" class="btn lo" style="z-index: 2;" onclick="toggle${btn.name}()" >${btn.name}</button>`
		)
	})

	s += '<br><br>'
	s += wrap(
		{ id: 'btns2', tag: 'div', style: 'text-align:center;' },
		// s += wrap('btns2', '', 'rel', 'text-align:center;', `
		`<span style=" font: 13px/20px Arial; vertical-align: top; z-index: 2; ">Zoom:</span>
  <input type="range" id="r1"  value="0.5" min="0" max="1" step=".01"  style="z-index:2; width:200px; height:17px; border: none; " oninput="onZoomChg(0,this.value)" onchange="onZoomChg(1,this.value)" />
  &nbsp;
  <button id="resetBtn" class="btn" style="z-index:2;" onclick="reset()" >Reset</button>
  <button id="editBtn" class="btn" style="z-index:2;" onclick="editpop()" >Edit</button>
  <button id="exBtn" class="btn" style="margin-top:5px; z-index:2;" onclick="exNext()" >Example</button>

   `
	)

	s += '<div id="editpop" style="position:absolute; left:-450px; top:40px; padding: 5px; border: 1px solid red; border-radius: 9px; background-color: #88aaff; box-shadow: 10px 10px 5px 0px rgba(40,40,40,0.75); z-index:1; transition: all linear 0.3s; opacity:0; ">'
	s += '<textarea  id="editbox" value="ddd" style="width: 400px; height: 120px; font: 16px Arial; border: 1px solid red; border-radius: 9px; background-color: #eeeeff; display: block;">'
	//s += 'dqdqd';
	s += '</textarea >'
	s += '<div style="float:right; margin: 0 0 5px 10px;">'
	s += '<button onclick="editYes()" style="z-index:2; font: 22px Arial;" class="btn" >&#x2714;</button>'
	s += '<button onclick="editNo()" style="z-index:2; font: 22px Arial;" class="btn" >&#x2718;</button>'
	s += '</div>'
	s += '</div>'

	//s += wrap('', '', 'rel', 'font: 11px Arial; color: #6600cc;', '&copy; 2021 MathsIsFun.com  v' + version)
	s += wrap({ cls: 'copyrt', pos: 'abs', style: 'left:5px; bottom:3px' }, '&copy; 2024 Rod Pierce v' + version)

	s += '</div>'

	//console.log(s);
	// let aa = document.createElement('div');
	// aa.innerHTML = s
	// document.body.appendChild(aa);
	//document.innerHTML = s

	// put on web page at current location
	let div = document.createElement('div')
	div.innerHTML = s
	let script = document.currentScript // document.scripts[document.scripts.length - 1];
	script.parentElement.insertBefore(div, script) // Add the newly-created div before script location

	my.canGraph = canvasInit('canGraph', w, h, 2)

	my.currZoom = 1

	my.sttRect = [-1, -2.2, 11, 7.5]
	my.coords = new Coords(0, 0, w, h, my.sttRect[0], my.sttRect[1], my.sttRect[2], my.sttRect[3], true)
	//my.coords = new Coords(0, 0, w, h, 2, 2, 9, 7, true);
	this.graph = new Graph(my.canGraph.g, my.coords)

	my.dragNo = 0

	my.anglesQ = false
	my.coordsQ = false
	my.diagsQ = false
	my.sidesQ = false
	my.guidesQ = false
	my.snapQ = false
	my.regQ = false

	document.getElementById('centroidBtn').style.visibility = my.mode == 'mom2' ? 'visible' : 'hidden'

	poly = new Poly()

	makeShapes()

	let el = my.canGraph.el
	el.addEventListener('mousedown', mouseDownListener, false)
	el.addEventListener('touchstart', ontouchstart, false)
	el.addEventListener('mousemove', dopointer, false)

	my.exs = [
		{ name: 'Triangle', coords: '(4.26,5.27), (6.16,1.33), (1.80,1.65)' },
		{ name: 'Rectangle', coords: '(7.50,4.50), (7.50,1.00), (3.50,1.00), (3.50,4.50)' },
		{ name: 'Circl-ish', coords: '(6.01,4.99), (6.96,4.77), (7.74,4.18), (8.21,3.32), (8.29,2.34), (7.97,1.42), (7.30,0.71), (6.39,0.33), (5.42,0.35), (4.53,0.77), (3.89,1.51), (3.61,2.44), (3.73,3.41), (4.24,4.25), (5.04,4.81)' },
		{ name: 'Tilted Square', coords: '(6.91,5.15), (7.59,1.36), (3.80,0.68), (3.12,4.47)' },
		{ name: 'Pentagon', coords: '(6.09,5.80), (2.68,4.90), (2.48,1.38), (5.76,0.10), (8.00,2.83)' },
		{ name: 'Hexagon', coords: '(6.09,5.80), (2.68,4.90), (2.48,1.38), (5.76,0.10), (6.00,2.3), (8.00,2.83)' },
		{ name: 'Hexagon2', coords: '(2,0), (1,-1.73), (-1,-1.73), (-2,0), (-1,1.73), (1,1.73)' },

		//{ name: "T Beam", coords: '(6.50,5.00), (0.50,5.00), (0.50,4.00), (3.00,4.00), (3.00,0.00), (4.00,0.00), (4.00,4.00), (6.50,4.00)'},
		//{ name: "I Beam", coords: '(7.00,7.00), (2.00,7.00), (2.00,6.00), (4.00,6.00), (4.00,1.00), (2.00,1.00), (2.00,0.00), (7.00,0.00), (7.00,1.00), (5.00,1.00), (5.00,6.00), (7.00,6.00)'},
	]
	my.exNo = -1
	exNext()
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1)
	var vars = query.split('&')
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=')
		if (pair[0] == variable) {
			return pair[1]
		}
	}
	return false
}

function exNext() {
	// x centroid 4.75, Moment2 = 55.25
	//decodeCSV('(6.50,7.00), (0.50,7.00), (0.50,6.00), (3.00,6.00), (3.00,0.00), (4.00,0.00), (4.00,6.00), (6.50,6.00)')
	my.exNo++
	if (my.exNo >= my.exs.length) my.exNo = 0

	let coordStr = my.exs[my.exNo].coords
	decodeCSV(coordStr)
}

function getDescr() {
	let polyNames = ['', '', '', 'Triangle', 'Quadrilateral', 'Pentagon', 'Hexagon', 'Heptagon', 'Octagon', 'Nonagon', 'Decagon', 'Hendecagon', 'Dodecagon', 'Triskaidecagon ', 'Tetrakaidecagon ', 'Pentadecagon', 'Hexakaidecagon ', 'Heptadecagon', 'Octakaidecagon ', 'Enneadecagon', 'Icosagon']

	let descrStr = ''
	let infoStr = ''

	if (poly.isComplex()) {
		descrStr += 'Complex '
		infoStr = '(Shape intersects itself.)'
	} else {
		if (poly.isConcave()) {
			descrStr += 'Concave '
		} else {
			if (poly.isRegular(0.01)) {
				if (poly.pts.length > 4) {
					descrStr += 'Regular '
				}
			}
		}
		infoStr = ''
		if (my.mode == 'area' || my.mode == 'mom1' || my.mode == 'mom2') {
			infoStr = my.estimStr
		}
	}

	if (poly.pts.length < polyNames.length) {
		descrStr += polyNames[poly.pts.length]
	} else {
		descrStr += poly.pts.length.toString() + '-gon'
	}
	// special case square, equilateral triangle
	//if (isRegularQ){
	//	if (dragPts.length == 3)
	//		descrStr = "Equilateral Triangle";
	//	if (dragPts.length == 4)
	//		descrStr = "Square";
	//}
	//
	if (my.mode == 'diag') {
		infoStr = poly.getDiagCount() + ' Diagonals'
	}
	if (my.mode == 'coords') {
		descrStr = ''
		infoStr = ''
	}

	return [descrStr, infoStr]
}

function editpop() {
	console.log('editpop')
	let pop = document.getElementById('editpop')
	pop.style.transitionDuration = '0.3s'
	pop.style.opacity = 1
	pop.style.zIndex = 12
	pop.style.left = '100px'

	document.getElementById('editbox').value = getPts()
}

function editYes() {
	let pop = document.getElementById('editpop')
	pop.style.opacity = 0
	pop.style.zIndex = 1
	pop.style.left = '-500px'
	let s = document.getElementById('editbox').value
	console.log('editYes', s)
	decodeCSV(s)
}

function editNo() {
	let pop = document.getElementById('editpop')
	pop.style.opacity = 0
	pop.style.zIndex = 1
	pop.style.left = '-500px'
	//setPtsFromCoords();
}

function getPts() {
	let s = ''
	for (let i = 0; i < poly.pts.length; i++) {
		if (i > 0) s += ', '
		s += '('
		s += poly.pts[i].x.toFixed(my.coords.decDigN)
		s += ','
		s += poly.pts[i].y.toFixed(my.coords.decDigN)
		s += ')'
	}
	return s
}

function decodeCSV(s) {
	console.log('decodeCSV', s)
	s = s.replace(/\s/g, '') // remove blanks

	s = s.replace(/\)\,\(/g, '~') // my.coords may be separated this way
	s = s.replace(/\)\(/g, '~') // or this way
	//
	s = s.replace(/\)/g, '') // now remove brackets
	s = s.replace(/\(/g, '')
	//
	s = s.replace(/\,/g, '_') // and replace , with _

	//console.log("decodeC", s);
	decode(s)
}

function decode(s) {
	let a = s.split('~')
	//console.log("decode",a );

	poly.pts = []
	for (let i = 0; i < a.length; i++) {
		let s1 = a[i]
		let xy = s1.split('_')
		//console.log("decode1",s1,xy );
		if (xy.length >= 2) {
			//let x = my.coords.toXPix(xy[0])
			//let y = my.coords.toYPix(xy[1])
			poly.pts.push(new Pt(Number(xy[0]), Number(xy[1])))
		}
	}
	// console.log("poly.pts", poly.pts);
	poly.pts2pxs()
	//usePts( pts );
	//poly.pxs = poly.pts;

	update()
}

function reset() {
	my.coords = new Coords(0, 0, w, h, my.sttRect[0], my.sttRect[1], my.sttRect[2], my.sttRect[3], true)

	makeShapes()
	update()
}

function getNum() {
	return parseInt(my.modePts)
}

function numDn() {
	let num = getNum()
	//console.log("numDn", num);
	if (num > 3) {
		num--
		chgNumPts(num)
	}
}

function numUp() {
	let num = getNum()
	if (num <= 100) {
		num++
		chgNumPts(num)
	}
}

function chgNumPts(n) {
	my.modePts = n
	//console.log("my.modePts", my.modePts);
	makeShapes()
	update()
}

function toggleCentroid() {
	my.centroidQ = !my.centroidQ
	btn('centroidBtn', my.centroidQ)
	update()
}

function toggleAngles() {
	my.anglesQ = !my.anglesQ
	btn('anglesBtn', my.anglesQ)
	update()
}

function toggleCoords() {
	my.coordsQ = !my.coordsQ
	btn('coordsBtn', my.coordsQ)
	update()
}

function toggleGuides() {
	my.guidesQ = !my.guidesQ
	btn('guidesBtn', my.guidesQ)
	update()
}

function toggleDiags() {
	my.diagsQ = !my.diagsQ
	btn('diagsBtn', my.diagsQ)
	update()
}

function toggleSides() {
	my.sidesQ = !my.sidesQ
	btn('sidesBtn', my.sidesQ)
	update()
}

function toggleRegular() {
	my.regQ = !my.regQ
	btn('regBtn', my.regQ)
	update()
}

function toggleSnap() {
	my.snapQ = !my.snapQ
	btn('snapBtn', my.snapQ)
	update()
}

function btn(btn, onq) {
	if (onq) {
		document.getElementById(btn).classList.add('hi')
		document.getElementById(btn).classList.remove('lo')
	} else {
		document.getElementById(btn).classList.add('lo')
		document.getElementById(btn).classList.remove('hi')
	}
}

function ontouchstart(evt) {
	let touch = evt.targetTouches[0]
	evt.clientX = touch.clientX
	evt.clientY = touch.clientY
	evt.touchQ = true
	mouseDownListener(evt)
}

function ontouchmove(evt) {
	//Assume only one touch/only process one touch even if there's more
	let touch = evt.targetTouches[0]
	evt.clientX = touch.clientX
	evt.clientY = touch.clientY
	evt.touchQ = true
	mouseMoveListener(evt)

	evt.preventDefault()
}

function ontouchend(evt) {
	el.addEventListener('touchstart', ontouchstart, false)
	window.removeEventListener('touchend', ontouchend, false)
	if (dragQ) {
		dragQ = false
		window.removeEventListener('touchmove', ontouchmove, false)
	}
}

function dopointer(e) {
	let el = my.canGraph.el
	let bRect = el.getBoundingClientRect()
	let mouseX = (e.clientX - bRect.left) * (el.width / my.canGraph.ratio / bRect.width)
	let mouseY = (e.clientY - bRect.top) * (el.height / my.canGraph.ratio / bRect.height)
	let overQ = false
	for (let i = 0; i < poly.pxs.length; i++) {
		if (hitTest(poly.pxs[i], mouseX, mouseY)) {
			overQ = true
			my.dragNo = i
		}
	}
	if (overQ) {
		el.style.cursor = 'pointer'
	} else {
		el.style.cursor = 'default'
	}
}

// function domousemove(e) {
//   document.body.style.cursor = "default";
//   let bRect = el.getBoundingClientRect();
//   mouseX = (e.clientX - bRect.left) * (el.width / ratio / bRect.width);
//   mouseY = (e.clientY - bRect.top) * (el.height / ratio / bRect.height);
//   for (i = 0; i < poly.pxs.length; i++) {
//     if (hitTest(poly.pxs[i], mouseX, mouseY)) {
//       my.dragNo = i;
//       document.body.style.cursor = "pointer";
//     }
//   }
// }

function mouseDownListener(evt) {
	let i
	//We are going to pay attention to the layering order of the objects so that if a mouse down occurs over more than object,
	//only the topmost one will be dragged.
	let highestIndex = -1

	//getting mouse position correctly, being mindful of resizing that may have occured in the browser:
	let el = my.canGraph.el
	let bRect = el.getBoundingClientRect()
	let mouseX = (evt.clientX - bRect.left) * (el.width / my.canGraph.ratio / bRect.width)
	let mouseY = (evt.clientY - bRect.top) * (el.height / my.canGraph.ratio / bRect.height)

	// downX = mouseX;
	// downY = mouseY;
	my.prevX = mouseX
	my.prevY = mouseY

	//find which shape was clicked
	dragQ = false
	my.dragScreenQ = false
	for (i = 0; i < poly.pxs.length; i++) {
		if (hitTest(poly.pxs[i], mouseX, mouseY)) {
			my.dragNo = i
			dragQ = true
			if (i > highestIndex) {
				//We will pay attention to the point on the object where the mouse is "holding" the object:
				my.dragHoldX = mouseX - poly.pxs[i].x
				my.dragHoldY = mouseY - poly.pxs[i].y
				highestIndex = i
				my.dragNo = i
			}
		}
	}

	if (!dragQ) {
		dragQ = true
		my.dragScreenQ = true // not dragging shape so dragging screen
	}

	if (evt.touchQ) {
		window.addEventListener('touchmove', ontouchmove, false)
	} else {
		window.addEventListener('mousemove', mouseMoveListener, false)
	}
	console.log('mouseDownListener', dragQ, my.dragScreenQ, highestIndex)
	update()

	if (evt.touchQ) {
		el.removeEventListener('touchstart', ontouchstart, false)
		window.addEventListener('touchend', ontouchend, false)
	} else {
		el.removeEventListener('mousedown', mouseDownListener, false)
		window.addEventListener('mouseup', mouseUpListener, false)
	}

	//code below prevents the mouse down from having an effect on the main browser window:
	if (evt.preventDefault) {
		evt.preventDefault()
	} //standard
	else if (evt.returnValue) {
		evt.returnValue = false
	} //older IE
	return false
}

function mouseUpListener(evt) {
	dragQ = false
	let el = my.canGraph.el
	el.addEventListener('mousedown', mouseDownListener, false)
	window.removeEventListener('mouseup', mouseUpListener, false)
	window.removeEventListener('mousemove', mouseMoveListener, false)
}

function mouseMoveListener(evt) {
	let posX
	let posY
	let el = my.canGraph.el
	let shapeRad = poly.pts[my.dragNo].rad
	let minX = shapeRad
	let maxX = el.width - shapeRad
	let minY = shapeRad
	let maxY = el.height - shapeRad
	//getting mouse position correctly
	let bRect = el.getBoundingClientRect()
	let mouseX = (evt.clientX - bRect.left) * (el.width / my.canGraph.ratio / bRect.width)
	let mouseY = (evt.clientY - bRect.top) * (el.height / my.canGraph.ratio / bRect.height)

	if (my.dragScreenQ) {
		let moveX = my.prevX - mouseX
		let moveY = mouseY - my.prevY

		if (Math.abs(moveX) > 1 || Math.abs(moveY) > 1) {
			//console.log("then", moveX, moveY);
			my.coords.drag(moveX, moveY)
			//doGraph();
			//my.coords.xStt =
			my.prevX = mouseX
			my.prevY = mouseY
			// update poly pts
			poly.pxs = []
			for (let i = 0; i < poly.pts.length; i++) {
				let pt = new Pt(my.coords.toXPix(poly.pts[i].x), my.coords.toYPix(poly.pts[i].y))
				poly.pxs.push(pt)
			}
		}
	} else {
		//clamp x and y positions to prevent object from dragging outside of canvas
		posX = mouseX - my.dragHoldX
		posX = posX < minX ? minX : posX > maxX ? maxX : posX
		posY = mouseY - my.dragHoldY
		posY = posY < minY ? minY : posY > maxY ? maxY : posY

		let xVal = my.coords.toXVal(posX)
		let yVal = my.coords.toYVal(posY)

		if (my.snapQ) {
			// let snapDig = my.coords.toTick()
			// let fact = Math.pow(10,snapDig)
			let fact = my.coords.tick
			console.log('fact', fact)
			xVal = Math.round(xVal / fact) * fact
			yVal = Math.round(yVal / fact) * fact

			posX = my.coords.toXPix(xVal)
			posY = my.coords.toYPix(yVal)
		}

		poly.pts[my.dragNo].x = xVal
		poly.pts[my.dragNo].y = yVal

		//if (my.regQ) {
		//console.log("mouseMove", my.regQ, my.dragNo);
		poly.pxs[my.dragNo].x = posX
		poly.pxs[my.dragNo].y = posY

		//}
	}

	update()

	//drawPts();
}

function hitTest(shape, mx, my) {
	let dx
	let dy
	dx = mx - shape.x
	dy = my - shape.y

	//a "hit" will be registered if the distance away from the center is less than the radius of the circular object
	return dx * dx + dy * dy < shape.rad * shape.rad
}

function onBoxesChg(n, v) {
	my.boxesTgtN = parseInt(1 + v / 3)
	console.log('onBoxesChg', v)
	update()
}

function onZoomChg(n, v) {
	//let scaleBy = (v * 2 + 0.01) / my.currZoom; // add 0.01 to avoid zero
	let zoom = Math.pow(4, v * 2 - 1) // 0.5 = no zoom
	let scaleBy = zoom / my.currZoom

	my.coords.scale(scaleBy)
	my.currZoom *= scaleBy
	//console.log('my.coords',my.coords)

	if (n == 1) {
		// reset so can zoom more
		my.currZoom = 1
		document.getElementById('r1').value = 0.5
	}

	// update poly pts
	poly.pxs = []
	for (let i = 0; i < poly.pts.length; i++) {
		let pt = new Pt(my.coords.toXPix(poly.pts[i].x), my.coords.toYPix(poly.pts[i].y))
		poly.pxs.push(pt)
	}

	update()
}

function update() {
	//console.log("update", getType());
	let g = my.canGraph.g
	g.clearRect(0, 0, g.canvas.width, g.canvas.height)

	this.graph.drawGraph()

	if (my.regQ) {
		poly.makeRegular()

		poly.pts = []
		for (let i = 0; i < poly.pxs.length; i++) {
			let pt = new Pt(my.coords.toXVal(poly.pxs[i].x), my.coords.toYVal(poly.pxs[i].y))
			poly.pts.push(pt)
		}

		//console.log('poly.pxs after makeRegular', poly.pxs, poly.pts)
	}

	drawPts()

	if (my.mode == 'area') {
		areaUpdate()
	}
	if (my.mode == 'mom1') {
		areaUpdate()
	}
	if (my.mode == 'mom2') {
		areaUpdate()
	}
	let descr = ['', '']
	if (my.mode == 'coords') {
	} else {
		descr = getDescr()
	}
	//document.getElementById(my.titleid).innerHTML = descr[0];
	document.getElementById('info').innerHTML = descr[1]
}

function areaUpdate() {
	let showCentroidQ = my.mode == 'mom1' || my.mode == 'mom2'
	let showDistsQ = my.mode == 'mom1' || my.mode == 'mom2'

	// get extents
	let rect = poly.extents()

	// longest span (x or y)
	let lenMax = Math.max(rect.xSpan, rect.ySpan)

	let tick = toTick(lenMax / my.boxesTgtN) // make a nice tick value like 1, 2 or 5

	let xStt = Math.floor(rect.xStt / tick) * tick
	let yStt = Math.floor(rect.yStt / tick) * tick
	console.log('doArea: lenMax, my.boxesTgtN, tick, xStt, yStt', lenMax, my.boxesTgtN, tick, xStt, yStt)

	let tickPx = tick / my.coords.xScale // tick size in pixels

	// let insideN = 0

	// let sumX = 0 // to calculate centroid
	// let sumY = 0

	// compile list of boxes that are inbside shape
	let boxs = []
	for (let x = xStt; x < rect.xEnd; x += tick) {
		for (let y = yStt; y < rect.yEnd; y += tick) {
			let midx = x + tick / 2
			let midy = y + tick / 2
			let insideQ = poly.insideQ(midx, midy)
			if (insideQ) {
				boxs.push({ x: x, y: y })
			}
		}
	}
	//insideN = boxs.length
	//console.log('boxs', boxs)

	let g = my.canGraph.g

	let sumX = 0
	let sumY = 0
	let insideN = 0

	boxs.map((box) => {
		g.strokeStyle = '#ccc'

		let midx = box.x + tick / 2
		let midy = box.y + tick / 2
		// let insideQ = poly.insideQ(midx, midy)

		sumX += midx
		sumY += midy
		insideN++
		g.fillStyle = 'hsla(240,100%,90%,0.2)'
		g.strokeStyle = '#888'
		let xPx = my.coords.toXPix(box.x)
		let yPx = my.coords.toYPix(box.y)
		g.beginPath()
		g.rect(xPx, yPx, tickPx, -tickPx)
		g.fill()
		g.stroke()

		if (showDistsQ) {
			let midXPx = my.coords.toXPix(box.x) + tickPx / 2
			let axisXPx = my.centroidQ ? my.coords.toXPix(0) : my.coords.toXPix(0)
			let midYPx = my.coords.toYPix(box.y) - tickPx / 2
			let axisYPx = my.coords.toYPix(0)

			g.fillStyle = '#faa'
			g.beginPath()
			g.arc(midXPx, midYPx, 3, 0, 2 * Math.PI)
			g.fill()

			g.strokeStyle = g.fillStyle
			g.beginPath()
			lineArrow(midXPx, midYPx, midXPx, axisYPx)
			g.stroke()
			g.beginPath()
			lineArrow(midXPx, midYPx, axisXPx, midYPx)
			g.stroke()
		}
		// }
	})

	let areaEst = insideN * tick * tick
	console.log('area ', insideN, tick, areaEst)

	// now use coordinate points to calculate area
	let areaTrue = poly.getArea()
	//areaTrue = areaTrue * my.coords.getXScale() * my.coords.getYScale();

	// calc centroid
	let cx = sumX / insideN
	let cy = sumY / insideN

	// show centroid
	if (showCentroidQ) {
		g.strokeStyle = '#888'
		g.fillStyle = 'hsla(240,100%,90%,1)'

		g.beginPath()
		g.arc(my.coords.toXPix(cx), my.coords.toYPix(cy), 6, 0, 2 * Math.PI)
		g.fill()
		g.stroke()

		g.fillStyle = 'blue'
		let s = '(' + fmt(cx, 3) + ',' + fmt(cy, 3) + ')'
		g.font = '18px Arial'
		g.fillText(s, my.coords.toXPix(cx) + 6, my.coords.toYPix(cy) + 8)
	}

	let sumX2 = 0 // to calculate 2nd moment (moment of inertia)
	let sumY2 = 0

	boxs.map((box) => {
		g.strokeStyle = '#ccc'

		let midx = box.x + tick / 2
		let midy = box.y + tick / 2
		// let insideQ = poly.insideQ(midx, midy)
		// if (insideQ) {
		if (my.centroidQ) {
			sumX2 += Math.pow(Math.abs(midx - cx), 2)
			sumY2 += Math.pow(Math.abs(midy - cy), 2)
		} else {
			sumX2 += Math.pow(Math.abs(midx), 2)
			sumY2 += Math.pow(Math.abs(midy), 2)
			//console.log('midy', box, Math.pow(Math.abs(midy), 2), sumY2)
		}
	})

	sumX2 = sumX2 * tick * tick
	sumY2 = sumY2 * tick * tick
	console.log('tick,sumX2,sumY2', tick, sumX2, sumY2)

	let s = ''
	if (my.mode == 'area') {
		s += 'Count = ' + insideN + '<br>'
		s += 'Estim Area = ' + insideN + ' &times; ' + fmt(tick, 4) + ' &times; ' + fmt(tick, 4) + '<br>'
		s += 'Estim Area = ' + fmt(areaEst, 4) + '<br>'
		s += 'True Area = ' + fmt(areaTrue, 5)
	}
	if (my.mode == 'mom1') {
		s += 'Count = ' + insideN + '<br><br>'
		s += 'Sum of x distances = ' + fmt(sumX, 4) + '<br>'
		s += 'Centroid x &asymp; ' + fmt(sumX, 4) + '/' + insideN + ' &asymp; <b>' + fmt(cx, 4) + '</b><br><br>'
		s += 'Sum of y distances = ' + fmt(sumY, 4) + '<br>'
		s += 'Centroid y &asymp; ' + fmt(sumY, 4) + '/' + insideN + ' &asymp; <b>' + fmt(cy, 4) + '</b><br>'
	}

	if (my.mode == 'mom2') {
		//s += 'Count = ' + insideN + '<br>'
		let axisStr = my.centroidQ ? 'centroid' : 'axis'
		s += 'In relation to x ' + axisStr + ':<br>'
		s += 'Sum of (y<sup>2</sup> &times; area) = <b>' + fmt(sumY2, 4) + '</b><br>'
		s += '<br>'
		s += 'In relation to y ' + axisStr + ':<br>'
		s += 'Sum of (x<sup>2</sup> &times; area) = <b>' + fmt(sumX2, 4) + '</b>'
	}
	my.estimStr = s
}

function toTick(val) {
	// convert to mantissa * 10^index
	let index10 = Math.floor(Math.log(val) * Math.LOG10E)
	let pow10 = Math.pow(10, index10)
	let mantissa = val / pow10

	// now find the closest tick value to the mantissa (0.8 * tick/mantissa but not over 1 seems to work OK)

	let ticks = [1, 2, 5, 10]

	let best = 0
	let found = -1
	for (let i = 0; i < ticks.length; i++) {
		let tick = ticks[i]
		let score = (0.8 * tick) / mantissa
		if (score > 1) break
		if (score > best) {
			best = score
			found = i
		}
	}
	if (found < 0) {
		console.log('Error: toTick', val)
		return 1
	} else {
		return ticks[found] * pow10
	}
	// console.log('toTick',val, ticks[found] + ' * 10^' + index10 )
}

function getRegular(midX, midY, radius, sttAngle, n) {
	let pts = []
	let dAngle = (Math.PI * 2) / n

	for (let i = 0; i < n; i++) {
		let angle = sttAngle + i * dAngle
		let x = midX + radius * Math.cos(angle)
		let y = midY + radius * Math.sin(angle)
		pts.push(new Pt(x, y))
	}

	return pts
}

function makeShapes() {
	let i

	let pos = getRegular(5, 3, 3, 1.2, my.modePts)

	poly.pts = []
	poly.pxs = []
	for (i = 0; i < my.modePts; i++) {
		poly.pts.push(pos[i])
		let pt = new Pt(my.coords.toXPix(poly.pts[i].x), my.coords.toYPix(poly.pts[i].y))
		poly.pxs.push(pt)
	}

	// poly.pxs = pts
	console.log('makeShapes', my.modePts, poly.pts, poly.pxs)
}

function drawPts() {
	let i
	let g = my.canGraph.g
	g.strokeStyle = 'rgba(0, 0, 255, 0.5)'
	g.fillStyle = 'rgba(255, 255, 100, 0.1)'

	// poly.pts (real values) to pts (pixels)
	// let pts = [];
	// for (i = 0; i < poly.pts.length; i++) {
	//   let pt = new Pt(my.coords.toXPix(poly.pts[i].x), my.coords.toYPix(poly.pts[i].y));
	//   pts.push(pt);

	// }
	let pts = poly.pxs
	//console.log("drawPts", pts, poly.pxs);
	//console.table(pts);

	// points for dragging
	let dbg = ''
	for (i = 0; i < pts.length; i++) {
		let pt = pts[i]
		// circle
		g.fillStyle = 'rgba(0, 0, 255, 0.3)'
		g.beginPath()
		g.arc(pt.x, pt.y, pt.rad, 0, 2 * Math.PI, false)
		g.closePath()
		g.fill()

		//dot
		g.fillStyle = 'rgba(0, 0, 0, 0.8)'
		g.beginPath()
		g.arc(pt.x, pt.y, 2, 0, 2 * Math.PI, false)
		g.closePath()
		g.fill()

		g.textAlign = 'left'
		if (my.coordsQ) {
			g.font = 'bold 14px Arial'
			let txt = '('
			txt += fmtFix(poly.pts[i].x, my.coords.decDigN)
			txt += ', '
			txt += fmtFix(poly.pts[i].y, my.coords.decDigN)
			txt += ')'
			g.fillText(txt, pt.x + 5, pt.y - 9)
		} else {
			//g.font = "14px Arial";
			//g.fillText(String.fromCharCode(65 + i), pt.x + 5, pt.y - 9);  // alpha "A" upwards
		}

		dbg += '[' + Math.floor(poly.pts[i].x) + ',' + Math.floor(poly.pts[i].y) + '],'
	}
	//console.log(dbg);

	poly.pxs = pts
	poly.updateMe()

	g.strokeStyle = 'rgba(255, 0, 0, 0.5)'
	g.lineWidth = 1.5
	if (my.guidesQ) {
		let orig = {
			x: my.coords.toXPix(0),
			y: my.coords.toYPix(0),
		}
		poly.drawGuides(g, orig)
	}

	g.strokeStyle = 'rgba(0, 0, 255, 0.5)'
	g.fillStyle = 'rgba(255, 255, 100, 0.1)'
	g.lineWidth = 1

	let drawShapeQ = true
	if (my.mode == 'coords') {
		drawShapeQ = my.sidesQ
	}

	if (drawShapeQ) {
		g.fillStyle = 'rgba(255, 255, 100, 0.16)'
		poly.drawLines(g)
	}
	if (my.anglesQ) poly.drawAngles(g)
	if (my.diagsQ) poly.drawDiags(g)
	if (my.sidesQ) poly.drawSides(g)
}

//}
/********************/

/** Libraries **/

class Poly {
	constructor() {
		this.pts = []
		this.pxs = []
	}
	updateMe() {
		setAngles(this.pxs)
		this.sides = getSides(this.pxs)
	}

	insideQ(x, y) {
		// ray-casting algorithm based on
		// https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

		// from https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon:
		// "Note: This code doesn't work reliably when the point is a corner of the polygon or on an edge. There is an improved version here: https://github.com/mikolalysenko/robust-point-in-polygon"

		var inside = false
		for (var i = 0, j = this.pts.length - 1; i < this.pts.length; j = i++) {
			let xi = this.pts[i].x
			let yi = this.pts[i].y
			let xj = this.pts[j].x
			let yj = this.pts[j].y

			var intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
			if (intersect) inside = !inside
		}

		return inside
	}

	pts2pxs() {
		this.pxs = []
		for (let i = 0; i < this.pts.length; i++) {
			let pt = this.pts[i]
			let px = new Pt(my.coords.toXPix(pt.x), my.coords.toYPix(pt.y))
			this.pxs.push(px)
		}
	}

	extents(borderFactor = 1) {
		//console.log("fitToPts", pts.toString());

		let xStt, xEnd, yStt, yEnd

		for (let i = 0; i < this.pts.length; i++) {
			let pt = this.pts[i]
			//console.log("pt", pt.x, pt.y);
			if (i == 0) {
				xStt = pt.x
				xEnd = pt.x
				yStt = pt.y
				yEnd = pt.y
			} else {
				xStt = Math.min(xStt, pt.x)
				xEnd = Math.max(xEnd, pt.x)
				yStt = Math.min(yStt, pt.y)
				yEnd = Math.max(yEnd, pt.y)
			}
		}
		//console.log("before factor", xStt, yStt, "-->", xEnd, yEnd);
		let xMid = (xStt + xEnd) / 2
		let xhalfspan = (borderFactor * (xEnd - xStt)) / 2
		xStt = xMid - xhalfspan
		xEnd = xMid + xhalfspan
		let yMid = (yStt + yEnd) / 2
		let yhalfspan = (borderFactor * (yEnd - yStt)) / 2
		yStt = yMid - yhalfspan
		yEnd = yMid + yhalfspan

		return { xStt: xStt, xEnd: xEnd, yStt: yStt, yEnd: yEnd, xSpan: xEnd - xStt, ySpan: yEnd - yStt }
	}

	drawDiags(g) {
		// draw diagonals
		g.strokeStyle = '#666666'

		let diagCount = 0
		for (let i = 0; i < this.pxs.length - 2; i++) {
			for (let j = i + 2; j < this.pxs.length; j++) {
				if (i == 0 && j == this.pxs.length - 1) {
					// not first to last as that is a side
				} else {
					g.beginPath()
					g.moveTo(this.pxs[i].x, this.pxs[i].y)
					g.lineTo(this.pxs[j].x, this.pxs[j].y)
					g.stroke()
					diagCount++
					//console.log("i,j=" + i, j);
				}
			}
		}
		//console.log("diagCount=" + diagCount);
	}
	drawLines(g) {
		g.beginPath()
		for (let i = 0; i < this.pxs.length; i++) {
			g.lineTo(this.pxs[i].x, this.pxs[i].y)
		}
		g.closePath()
		g.fill()
		g.stroke()
	}
	drawGuides(g, orig) {
		let ptsLen = this.pxs.length
		for (let i = 0; i < ptsLen; i++) {
			let pt = this.pxs[i]
			g.beginPath()
			g.strokeStyle = 'rgba(0, 0, 0, 0.5)'
			g.moveTo(orig.x, pt.y)
			g.lineTo(pt.x, pt.y)
			g.stroke()
			g.beginPath()
			//g.strokeStyle = "rgba(255, 0, 0, 0.5)";
			g.moveTo(pt.x, pt.y)
			g.lineTo(pt.x, orig.y)
			g.stroke()
		}
	}
	drawSides(g) {
		// draw sides and sides text
		// find centroid
		let ptC = new Pt()
		ptC.setAvg(this.pxs)

		//g.beginPath();
		//g.fillStyle = "#000000";
		//g.arc(ptC.x, ptC.y, 6, 0, Math.PI*2);
		//g.fill();
		g.fillStyle = '#000000'
		g.font = 'bold 12px Arial'

		let ptM = new Pt()
		let ptsLen = this.pxs.length
		for (let i = 0; i < ptsLen; i++) {
			//let pt = this.pxs[i];
			//if (isSideKnownQ[i]){
			//	sideTextArray[i].text = "" + userSide(i);
			//} else {
			//	sideTextArray[i].text = sideLabels[i];
			//}
			ptM.setAvg([this.pxs[i], this.pxs[loop(i, 0, ptsLen - 1, 1)]]) // midpoint of line

			ptM.interpolate(ptM, ptC, 1.2) // extend outward from centroid

			//g.beginPath();
			//g.fillStyle = "#000000";
			//g.arc(ptM.x, ptM.y, 4, 0, Math.PI*2);
			//g.fill();
			let side = this.sides[loop(i - 1, 0, ptsLen - 1, 1)]
			side = (my.coords.xScale * side).toFixed(2)

			g.fillText(side, ptM.x - 10, ptM.y + 5, 100)
		}
	}
	isConcave() {
		// look for angle>180 (as that is what user sees)
		for (let i = 0; i < this.pxs.length; i++) {
			let pt = this.pxs[i]
			let angDeg = Math.round((pt.getAngle() * 180) / Math.PI)
			if (angDeg > 180) return true
		}
		return false
	}
	drawAngles(g) {
		// draw angles and angle text
		let angSum = 0
		let angDescr = ''
		let angs = []
		for (let i = 0; i < this.pxs.length; i++) {
			let pt = this.pxs[i]

			let angDeg = Math.round((pt.getAngle() * 180) / Math.PI)

			let d = 30

			if (angDeg == 90) {
				// draw a tilted square
				g.strokeStyle = '#888888'
				//g.lineWidth = 2;
				g.drawBox(pt.x, pt.y, 25, pt.angleOut - Math.PI / 2)
			} else {
				if (angDeg > 90) {
					g.strokeStyle = '#ff0000'
					//g.lineWidth = 2;
					d = Math.max(20, 30 - (angDeg - 90) / 6) // slightly smaller diameter looks better on large angles
				} else {
					g.strokeStyle = '#4444FF'
					//g.lineWidth = 2;
				}

				//g.beginFill(0xffffee);
				g.fillStyle = 'rgba(0, 0, 255, 0.3)'
				g.beginPath()
				g.moveTo(pt.x, pt.y)
				g.arc(pt.x, pt.y, d, pt.angleIn, pt.angleOut, false)
				g.closePath()
				g.fill()
			}
			/*
       if (isAngleKnownQ[i]){
       angleTextArray[i].text = userAngle(pts[i].getAngle()) + "°";
       } else {
       angleTextArray[i].text = angleLabels[i];
       }
       */
			//pts[i].drawMe(g);
			let ang = this.userAngle(pt.getAngle())

			if (i < this.pxs.length - 1) {
				angSum += ang
			} else {
				//angt = ang;
				ang = (this.pxs.length - 2) * 180 - angSum // make last angle so that all add to (n-2)*180;

				//console.log("drawAngles",angt,ang);
				if (ang < 0) ang += 360
			}
			angs[i] = ang
			angDescr += ang + '° + '

			let aMid = (pt.angleIn + pt.angleOut) / 2

			let txtPt = new Pt(0, 0)
			txtPt.x = pt.x + (d + 15) * Math.cos(aMid) - 0
			txtPt.y = pt.y + (d + 15) * Math.sin(aMid) - 0
			//txtPt.drawMe(g)
			g.fillStyle = 'rgba(0, 0, 255, 1)'
			g.fillText(Math.round(ang) + '°', txtPt.x - 10, txtPt.y + 5, 100)
			//angleTextArray[i].x = pts[i].x + (d + 15) * Math.cos(aMid) - 25;
			//angleTextArray[i].y = pts[i].y + (d + 15) * Math.sin(aMid) - 10;
		}
		return angs
	}
	userAngle(x) {
		return Math.round((x * 180) / Math.PI, this.dec)
	}
	getArea() {
		let a = 0
		for (let i = 0; i < this.pts.length; i++) {
			let pt0 = this.pts[i]
			let pt1 = this.pts[loop(i, 0, this.pxs.length - 1, 1)]
			//console.log("pt=" + pt0.x, pt0.y, " => ", pt1.x, pt1.y);
			//let a1 = (pt1.x - pt0.x) * (pt0.y + pt1.y) / 2;
			let a1 = pt0.x * pt1.y - pt0.y * pt1.x

			//console.log("a1=" + a1);
			a += a1
		}
		a = Math.abs(a) / 2 // note: clockwise gives positive area
		return a
	}
	getDiagCount() {
		let n = this.pxs.length
		return (n * (n - 3)) / 2
	}
	isComplex() {
		// make lines
		let lns = []
		for (let i = 0; i < this.pxs.length; i++) {
			lns.push(new Line(this.pxs[i], this.pxs[loop(i, 0, this.pxs.length - 1, 1)]))
		}

		for (let i = 0; i < this.pxs.length - 1; i++) {
			for (let j = i + 2; j < this.pxs.length; j++) {
				if (i == 0 && j == this.pxs.length - 1) continue
				let ln = lns[i]
				if (ln.isIntersect(lns[j])) {
					// lines intersect
					// but maybe the line SEGMENTS don't intersect
					if (ln.getIntersection(lns[j], true) == null) {
						//console.log("isComplex not a segment intersect");
					} else {
						return true
					}
				}
			}
		}
		return false
	}
	isRegular(tolerRatio) {
		tolerRatio = typeof tolerRatio !== 'undefined' ? tolerRatio : 0.001
		// tolerRatio is a ratio of radius: 0.01 means my.coords should be within 1% of radius length
		let ptC = new Pt()
		ptC.setAvg(this.pxs)

		let rads = []
		let lens = []
		for (let i = 0; i < this.pxs.length; i++) {
			let pt = this.pxs[i]
			rads[i] = dist(pt.x - ptC.x, pt.y - ptC.y)
			let nxt = (i + 1) % this.pxs.length
			let ptN = this.pxs[nxt]
			lens[i] = dist(pt.x - ptN.x, pt.y - ptN.y)
			//console.log("i=" + i, nxt, "ptN=" + ptN, "lens[i]=" + lens[i]);
		}

		let radAvg = avg(rads)
		let lenAvg = avg(lens)

		let toler = radAvg * tolerRatio
		//console.log("radAvg=" + radAvg, "lenAvg=" + lenAvg, "toler=" + toler, this.pxs.length);
		let sameQ = true
		for (let i = 0; i < this.pxs.length; i++) {
			//console.log("rad=" + rads[i], "len=" + lens[i], "i=" + i);
			if (!isNear(rads[i], radAvg, toler)) {
				sameQ = false
				//console.log("isNear(rads[i], radAvg, toler)=" + isNear(rads[i], radAvg, toler));
				break
			}
			if (!isNear(lens[i], lenAvg, toler)) {
				sameQ = false
				//console.log("isNear(lens[i], lenAvg, toler)=" + isNear(lens[i], lenAvg, toler));
				break
			}
		}

		return sameQ
	}
	makeRegular() {
		// central point
		let ptC = new Pt()
		ptC.setAvg(this.pxs)

		let rad = 1
		let avgQ = false
		if (avgQ) {
			// average radius
			let rads = []
			for (let i = 0; i < this.pxs.length; i++) {
				let pt = this.pxs[i]
				rads[i] = dist(pt.x - ptC.x, pt.y - ptC.y)
			}
			rad = avg(rads)
		} else {
			// NB get radius from single point
			let pt
			if (my.dragNo < this.pxs.length) {
				// in case my.dragNo exceeds number of pts (example after reducing number of points)
				pt = this.pxs[my.dragNo]
			} else {
				pt = this.pxs[0]
			}
			rad = dist(pt.x - ptC.x, pt.y - ptC.y)
		}

		let sttAngle = Math.atan2(this.pxs[0].y - ptC.y, this.pxs[0].x - ptC.x)
		let dAngle = (Math.PI * 2) / this.pxs.length

		for (let i = 0; i < this.pxs.length; i++) {
			let angle = sttAngle + i * dAngle

			//let pt = this.pxs[i];
			this.pxs[i].x = ptC.x + rad * Math.cos(angle)
			this.pxs[i].y = ptC.y + rad * Math.sin(angle)
		}
	}
}

class Pt {
	constructor(ix, iy) {
		this.x = ix
		this.y = iy

		this.rad = 9
		this.color = 'rgb(' + 0 + ',' + 0 + ',' + 255 + ')'

		this.prevx = 0
		this.prevy = 0
		this.prevQ = false

		//let a;

		//let prevQ = false;

		// assume that point has lines in and out
		this.angleIn = 0
		this.angleOut = 0
	}
	/*
   function toString() {
   return x.toString() + "," + y.toString();
   }
  
  
   function add(dx, dy):Pt {
   return new Pt(this.x + dx, this.y + dy);
   }
  
   function addMe(dx, dy) {
   this.x += dx;
   this.y += dy;
   }
  
   function addPtMe(pt:Pt, factor=1) {
   this.x += pt.x*factor;
   this.y += pt.y*factor;
   }
   */
	setxy(ix, iy) {
		//setPrevPt();
		this.x = ix
		this.y = iy
	}
	setPrevPt() {
		this.prevx = this.x
		this.prevy = this.y
		this.prevQ = true
	}
	/*
   function getPrevPt():Pt {
   return new Pt(prevx, prevy);
   }
   */
	getAngle() {
		return this.angleOut - this.angleIn
	}
	drawMe(g) {
		//setPrevPt();
		g.fillStyle = 'rgba(0, 0, 255, 0.3)'
		g.beginPath()
		g.arc(this.x, this.y, 20, 0, 2 * Math.PI, false)
		g.closePath()
		g.fill()
	}
	getAvg(pts) {
		let xSum = 0
		let ySum = 0
		for (let i = 0; i < pts.length; i++) {
			xSum += pts[i].x
			ySum += pts[i].y
		}
		let newPt = new Pt(xSum / pts.length, ySum / pts.length)
		newPt.x = xSum / pts.length
		newPt.y = ySum / pts.length
		return newPt
	}
	setAvg(pts) {
		this.setPrevPt()
		let newPt = this.getAvg(pts)
		this.x = newPt.x
		this.y = newPt.y
	}
	/*
   function setMin(pts) {
   setPrevPt();
   for (let i = 0; i < pts.length; i++){
   if (pts[i].x < this.x)
   this.x = pts[i].x;
   if (pts[i].y < this.y)
   this.y = pts[i].y;
   }

   }
  
   function setMax(pts) {
   setPrevPt();
   for (let i = 0; i < pts.length; i++){
   if (pts[i].x > this.x)
   this.x = pts[i].x;
   if (pts[i].y > this.y)
   this.y = pts[i].y;
   }

   }
   */
	interpolate(pt1, pt2, f) {
		this.setPrevPt()

		//let p:Point = Point.interpolate(pt1, pt2, f);
		this.x = pt1.x * f + pt2.x * (1 - f)
		this.y = pt1.y * f + pt2.y * (1 - f)
	}
	/*
   function lengthTo(toPt:Pt) {
   return Math.sqrt(Math.pow(toPt.x - this.x, 2) + Math.pow(toPt.y - this.y, 2));
   }
  
   function translateMe(pt:Pt, addQ = true) {
   if (addQ){
   this.x += pt.x;
   this.y += pt.y
   } else {
   this.x -= pt.x;
   this.y -= pt.y
   }
   }
   */
	translate(pt, addQ) {
		addQ = typeof addQ !== 'undefined' ? addQ : true
		let t = new Pt(this.x, this.y)
		t.x = this.x
		t.y = this.y
		if (addQ) {
			t.x += pt.x
			t.y += pt.y
		} else {
			t.x -= pt.x
			t.y -= pt.y
		}
		return t
	}
	multiply(fact) {
		return new Pt(this.x * fact, this.y * fact)
	}
	multiplyMe(fact) {
		this.x *= fact
		this.y *= fact
	}
}

/*
 Pt.prototype.isNear = function(vsPt, toler = 0) {
 if (!Maths.isNear(this.x, vsPt.x, toler))
 return false;
 if (!Maths.isNear(this.y, vsPt.y, toler))
 return false;
 return true;
 }
 */
function isNear(a, b, toler) {
	if (Math.abs(a - b) <= toler) {
		return true
	} else {
		return false
	}
}

/*
 function translatePolar(angle, dist):Pt {
 let cosa = Math.cos(angle);
 let sina = Math.sin(angle);
 let xPos = this.x + dist * cosa;
 let yPos = this.y + dist * sina;
 //trace("translatePolar=" + this.x, this.y, xPos, yPos);
 return new Pt(xPos, yPos);
 }

 function rotate(angle):Pt {
 // rotate about (0,0)
 let cosa = Math.cos(angle);
 let sina = Math.sin(angle);
 let xPos = this.x * cosa + this.y * sina;
 let yPos = -this.x * sina + this.y * cosa;
 return new Pt(xPos, yPos);
 }

 function rotateMe(angle) {
 let t:Pt = new Pt(this.x, this.y).rotate(angle);
 this.x = t.x;
 this.y = t.y;
 }

 function setPt(p:Pt) {
 this.x = p.x;
 this.y = p.y;
 }

 function setPolarDeg(radius, angle) {
 //if (angle < 0)
 //	angle += 180;
 let cosa = Math.cos(angle * Math.PI / 180.);
 let sina = Math.sin(angle * Math.PI / 180.);
 this.x = radius * cosa;
 this.y = radius * sina;
 //trace("radius,angle=" + radius,angle,this.x,this.y);

 }

 function inRectangle(r:Rectangle)
 {
 //trace("=" + this.x, this.y, r.x, r.y,r.left,r.bottom);
 if (this.x < r.x) return false;
 if (this.y < r.y) return false;
 if (this.x > r.right) return false;
 if (this.y > r.bottom) return false;
 return true;
 }

 */

function setAngles(pts) {
	let CW = getClockwise(pts)

	let numPoints = pts.length

	//let angles = [];
	for (let i = 0; i < numPoints; i++) {
		let pt = pts[i]
		let ptm1 = pts[loop(i, 0, numPoints - 1, -1)]
		let ptp1 = pts[loop(i, 0, numPoints - 1, 1)]

		let a1 = Math.atan2(ptm1.y - pt.y, ptm1.x - pt.x)
		let a2 = Math.atan2(ptp1.y - pt.y, ptp1.x - pt.x)
		if (CW == 1) {
			let temp = a1
			a1 = a2
			a2 = temp
		}
		if (a1 > a2) a2 += 2 * Math.PI

		pt.angleIn = a1
		pt.angleOut = a2
	}
}

function getClockwise(pts) {
	// http://debian.fmi.uni-sofia.bg/~sergei/cgsr/docs/clockwise.htm

	let numPoints = pts.length

	let count = 0
	for (let i = 0; i < numPoints; i++) {
		let pt = pts[i]
		let ptm1 = pts[loop(i, 0, numPoints - 1, -1)]
		let ptp1 = pts[loop(i, 0, numPoints - 1, 1)]

		let z = 0
		z += (pt.x - ptm1.x) * (ptp1.y - pt.y)
		z -= (pt.y - ptm1.y) * (ptp1.x - pt.x)
		if (z < 0) {
			count--
		} else if (z > 0) {
			count++
		}
	}

	// count==numPoints is Clockwise, count==-numPoints is CounterClockwise
	// for numPoints=4 can also return 2 (CW and concave); -2 (CCW and concave); 0 self-intersecting
	if (count > 0) return 1
	if (count == 0) return 0
	return -1
}

function getSides(pts) {
	let numPoints = pts.length

	let sides = []
	for (let i = 0; i < numPoints; i++) {
		let pt = pts[i]
		let ptp1 = pts[loop(i, 0, numPoints - 1, 1)]
		sides.push(dist(ptp1.x - pt.x, ptp1.y - pt.y))
	}

	return sides
}

function avg(vals) {
	let sum = 0
	let count = vals.length
	for (let i = 0; i < count; i++) {
		sum += vals[i]
	}
	return sum / count
}

function dist(dx, dy) {
	return Math.sqrt(dx * dx + dy * dy)
}

function loop(currNo, minNo, maxNo, incr) {
	// includes minNo and maxNo
	currNo += incr
	// let was = currNo;
	let range = maxNo - minNo + 1
	if (currNo < minNo) {
		//trace("w=" + currNo, maxNo-(-currNo+minNo)%range);
		currNo = maxNo - ((-currNo + maxNo) % range)
	}
	if (currNo > maxNo) {
		//trace("y=" + currNo, minNo+(currNo-minNo)%range);
		currNo = minNo + ((currNo - minNo) % range)
	}
	//trace("loop=" + was, currNo);
	return currNo
}

function constrain(min, val, max) {
	return Math.min(Math.max(min, val), max)
}

class Line {
	constructor(pt1, pt2) {
		this.a = pt1
		this.b = pt2
	}
	/*
   function toString() {
   let s = "[" + pt1.toString() + " => " + pt2.toString() + "]";
   return s;
   }
  
   function fromMinMaxPts(pts) {
   if (pts.length <= 0)
   return;
   pt1 = new Pt(pts[0].x, pts[0].y);
   pt2 = new Pt(pts[0].x, pts[0].y);
   for (let i = 1; i < pts.length; i++){
   if (pts[i].x < pt1.x)
   pt1.x = pts[i].x;
   if (pts[i].y < pt1.y)
   pt1.y = pts[i].y;
   if (pts[i].x > pt2.x)
   pt2.x = pts[i].x;
   if (pts[i].y > pt2.y)
   pt2.y = pts[i].y;
   }
  
   }
  
   function getSlope() {
   if (pt1.x == pt2.x)
   return NaN;
   return (pt1.y - pt2.y) / (pt1.x - pt2.x);
   }
  
   function getIntercept() {
   if (pt1.x == pt2.x)
   return NaN;
   let b = pt1.y - getSlope() * pt1.x;
   return b;
   }
  
   function getDist() {
   return Maths.dist(pt2.x - pt1.x, pt2.y - pt1.y);
   }
   */
	isIntersect(b) {
		let a = this
		if (this.ccw(a.a, a.b, b.a) * this.ccw(a.a, a.b, b.b) > 0) {
			return false
		}
		if (this.ccw(b.a, b.b, a.a) * this.ccw(b.a, b.b, a.b) > 0) {
			return false
		}
		return true
	}
	ccw(a, b, c) {
		// http://algs4.cs.princeton.edu/91primitives/
		// TWICE THE area: can be positive (clockwise), 0 or negative (ccw)
		//trace("ccw=" + a.toString(), b.toString(), c.toString(), (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y));
		return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
	}
	getIntersection(ln, asSegmentsQ) {
		let A = this.a
		let B = this.b
		let E = ln.a
		let F = ln.b

		let a1 = B.y - A.y
		let b1 = A.x - B.x
		let c1 = B.x * A.y - A.x * B.y
		let a2 = F.y - E.y
		let b2 = E.x - F.x
		let c2 = F.x * E.y - E.x * F.y

		let denom = a1 * b2 - a2 * b1
		if (denom == 0) {
			return null
		}

		let ip = new Pt()
		ip.x = (b1 * c2 - b2 * c1) / denom
		ip.y = (a2 * c1 - a1 * c2) / denom

		//---------------------------------------------------
		//Do checks to see if intersection to endpoints
		//distance is longer than actual Segments.
		//Return null if it is with any.
		//---------------------------------------------------
		if (asSegmentsQ) {
			if (Math.pow(ip.x - B.x, 2) + Math.pow(ip.y - B.y, 2) > Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2)) {
				return null
			}
			if (Math.pow(ip.x - A.x, 2) + Math.pow(ip.y - A.y, 2) > Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2)) {
				return null
			}

			if (Math.pow(ip.x - F.x, 2) + Math.pow(ip.y - F.y, 2) > Math.pow(E.x - F.x, 2) + Math.pow(E.y - F.y, 2)) {
				return null
			}
			if (Math.pow(ip.x - E.x, 2) + Math.pow(ip.y - E.y, 2) > Math.pow(E.x - F.x, 2) + Math.pow(E.y - F.y, 2)) {
				return null
			}
		}
		return ip
	}
	getMidPt() {
		return new Pt((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2)
	}
	getClosestPoint(toPt, inSegmentQ) {
		// find the closest point on the line (nearest to "toPt")
		let AP = toPt.translate(this.a, false)
		let AB = this.b.translate(this.a, false)
		let ab2 = AB.x * AB.x + AB.y * AB.y
		let ap_ab = AP.x * AB.x + AP.y * AB.y
		let t = ap_ab / ab2
		if (inSegmentQ) {
			t = constrain(0, t, 1)
		}
		return this.a.translate(AB.multiply(t))
	}
	setLen(newLen, fromMidQ) {
		fromMidQ = typeof fromMidQ !== 'undefined' ? fromMidQ : true

		let len = this.getLength()

		if (fromMidQ) {
			let midPt = this.getMidPt()
			let halfPt = new Pt(this.a.x - midPt.x, this.a.y - midPt.y)
			halfPt.multiplyMe(newLen / len)

			this.a = midPt.translate(halfPt)
			this.b = midPt.translate(halfPt, false)
		} else {
			let diffPt = new Pt(this.a.x - this.b.x, this.a.y - this.b.y)
			diffPt.multiplyMe(newLen / len)
			this.b = this.a.translate(diffPt, false)
		}
	}
	getAngle() {
		return Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x)
	}
}

class Coords {
	constructor(left, top, width, height, xStt, yStt, xEnd, yEnd, uniScaleQ) {
		this.left = left
		this.top = top
		this.width = width
		this.height = height

		this.xStt = xStt
		this.yStt = yStt
		this.xEnd = xEnd
		this.yEnd = yEnd

		this.uniScaleQ = uniScaleQ

		this.xLogQ = false
		this.yLogQ = false

		//let skewQ = true;
		this.xScale
		//let xLogScale;
		this.yScale
		//console.log("my.coords: ", this.xStt, this.yStt, this.xEnd, this.yEnd);
		this.calcScale()
	}
	calcScale() {
		//console.log("calcScale: ", this.xStt, this.yStt, this.xEnd, this.yEnd);

		if (this.xLogQ) {
			if (this.xStt <= 0) this.xStt = 1
			if (this.xEnd <= 0) this.xEnd = 1
		}
		if (this.yLogQ) {
			if (this.yStt <= 0) this.yStt = 1
			if (this.yEnd <= 0) this.yEnd = 1
		}

		let temp
		if (this.xStt > this.xEnd) {
			temp = this.xStt
			this.xStt = this.xEnd
			this.xEnd = temp
		}
		if (this.yStt > this.yEnd) {
			temp = this.yStt
			this.yStt = this.yEnd
			this.yEnd = temp
		}

		this.xSpan = this.xEnd - this.xStt
		if (this.xSpan <= 0) this.xSpan = 0.1
		this.xScale = this.xSpan / this.width
		this.xLogScale = (Math.log(this.xEnd) - Math.log(this.xStt)) / this.width

		this.ySpan = this.yEnd - this.yStt
		if (this.ySpan <= 0) this.ySpan = 0.1
		this.yScale = this.ySpan / this.height
		this.yLogScale = (Math.log(this.yEnd) - Math.log(this.yStt)) / this.height

		// useful values
		this.maxSpan = Math.max(this.xSpan, this.ySpan)
		this.tick = this.toTick(this.maxSpan / 50)
		let pow10 = Math.floor(Math.log(this.maxSpan) * Math.LOG10E)
		this.decDigN = 3 - pow10 // suggested number of decimal digits

		//console.log("xScale=" + xScale);
		if (this.uniScaleQ && !this.xLogQ && !this.yLogQ) {
			let newScale = Math.max(this.xScale, this.yScale)

			this.xScale = newScale
			this.xSpan = this.xScale * this.width
			let xMid = (this.xStt + this.xEnd) / 2
			this.xStt = xMid - this.xSpan / 2
			this.xEnd = xMid + this.xSpan / 2
			//console.log("xEnd=" + xEnd);
			this.yScale = newScale
			this.ySpan = this.yScale * this.height
			let yMid = (this.yStt + this.yEnd) / 2
			this.yStt = yMid - this.ySpan / 2
			this.yEnd = yMid + this.ySpan / 2
			//console.log("yEnd=" + yEnd);
		}

		console.log('calcScale', this)
	}

	toTick(val) {
		// convert to mantissa * 10^index
		let index10 = Math.floor(Math.log(val) * Math.LOG10E)
		let pow10 = Math.pow(10, index10)
		let mantissa = val / pow10

		// now find the closest tick value to the mantissa (0.8 * tick/mantissa but not over 1 seems to work OK)

		let ticks = [1, 2, 5, 10]

		let best = 0
		let found = -1
		for (let i = 0; i < ticks.length; i++) {
			let tick = ticks[i]
			let score = (0.8 * tick) / mantissa
			if (score > 1) break
			if (score > best) {
				best = score
				found = i
			}
		}
		if (found < 0) {
			console.log('Error: toTick', val)
			return 1
		} else {
			return ticks[found] * pow10
		}
		// console.log('toTick',val, ticks[found] + ' * 10^' + index10 )
	}

	getXScale() {
		return this.xScale
	}
	getYScale() {
		return this.yScale
	}
	scale(factor, xMid, yMid) {
		if (typeof xMid == 'undefined') xMid = (this.xStt + this.xEnd) / 2
		this.xStt = xMid - (xMid - this.xStt) * factor
		this.xEnd = xMid + (this.xEnd - xMid) * factor
		if (typeof yMid == 'undefined') yMid = (this.yStt + this.yEnd) / 2
		this.yStt = yMid - (yMid - this.yStt) * factor
		this.yEnd = yMid + (this.yEnd - yMid) * factor
		this.calcScale()
	}
	drag(xPix, yPix) {
		this.xStt += xPix * this.xScale
		this.xEnd += xPix * this.xScale
		this.yStt += yPix * this.yScale
		this.yEnd += yPix * this.yScale
		this.calcScale()
	}
	/*
   function moveX(val) {
   xStt += val;
   xEnd += val;
   calcScale();
   }
  
   function moveRelX(val) {
   let move = (xEnd - xStt) * val;
   xStt += move;
   xEnd += move;
   calcScale();
   }
  
   function moveY(val) {
   yStt += val;
   yEnd += val;
   calcScale();
   }
  
   function moveRelY(val) {
   let move = (yEnd - yStt) * val;
   yStt += move;
   yEnd += move;
   calcScale();
   }
   */
	newCenter(x, y) {
		let xMid = this.xStt + x * this.xScale
		let xhalfspan = (this.xEnd - this.xStt) / 2
		this.xStt = xMid - xhalfspan
		this.xEnd = xMid + xhalfspan
		let yMid = this.yEnd - y * this.yScale
		let yhalfspan = (this.yEnd - this.yStt) / 2
		this.yStt = yMid - yhalfspan
		this.yEnd = yMid + yhalfspan
		this.calcScale()
	}
	fitToPts(pts, borderFactor) {
		//console.log("fitToPts", pts.toString());

		for (let i = 0; i < pts.length; i++) {
			let pt = pts[i]
			//console.log("pt", pt.x, pt.y);
			if (i == 0) {
				this.xStt = pt.x
				this.xEnd = pt.x
				this.yStt = pt.y
				this.yEnd = pt.y
			} else {
				this.xStt = Math.min(this.xStt, pt.x)
				this.xEnd = Math.max(this.xEnd, pt.x)
				this.yStt = Math.min(this.yStt, pt.y)
				this.yEnd = Math.max(this.yEnd, pt.y)
			}
		}
		//console.log("before factor", xStt, yStt, "-->", xEnd, yEnd);
		let xMid = (this.xStt + this.xEnd) / 2
		let xhalfspan = (borderFactor * (this.xEnd - this.xStt)) / 2
		this.xStt = xMid - xhalfspan
		this.xEnd = xMid + xhalfspan
		let yMid = (this.yStt + this.yEnd) / 2
		let yhalfspan = (borderFactor * (this.yEnd - this.yStt)) / 2
		this.yStt = yMid - yhalfspan
		this.yEnd = yMid + yhalfspan

		//console.log("after factor", this.xStt, this.yStt, "-->", this.xEnd, this.yEnd);
		this.calcScale()
	}
	/*
  
   function toPtPix(pt, useCornerQ) {
   return new Pt(toXPix(pt.x, useCornerQ), toYPix(pt.y, useCornerQ));
   }
   */
	toXPix(val, useCornerQ) {
		if (this.xLogQ) {
			return this.left + (Math.log(val) - Math.log(this.xStt)) / this.xLogScale
		} else {
			return this.left + (val - this.xStt) / this.xScale
		}
	}
	toYPix(val) {
		//let top0 = 0;
		//if (useCornerQ)
		//	top0 = top;
		if (this.yLogQ) {
			return this.top + (Math.log(this.yEnd) - Math.log(val)) / this.yLogScale
		} else {
			return this.top + (this.yEnd - val) / this.yScale
		}
	}
	toPtVal(pt, useCornerQ) {
		return new Pt(this.toXVal(pt.x, useCornerQ), this.toYVal(pt.y, useCornerQ))
	}
	toXVal(pix, useCornerQ) {
		if (useCornerQ) {
			return this.xStt + (pix - this.left) * this.xScale
		} else {
			return this.xStt + pix * this.xScale
		}
	}
	toYVal(pix, useCornerQ) {
		if (useCornerQ) {
			return this.yEnd - (pix - this.top) * this.yScale
		} else {
			return this.yEnd - pix * this.yScale
		}
	}
	/*
   function nearestXPix(pix, decimals = 0, useCornerQ = true) {
   return (toXPix(Maths.round(toXVal(pix, useCornerQ), decimals), useCornerQ));
   }
  
   function nearestYPix(pix, decimals = 0, useCornerQ = true) {
   return (toYPix(Maths.round(toYVal(pix, useCornerQ), decimals), useCornerQ));
   }
  
   function nearestXVal(pix, decimals = 0, useCornerQ = true) {
   return (Maths.round(toXVal(pix, useCornerQ), decimals));
   }
  
   function nearestYVal(pix, decimals = 0, useCornerQ = true) {
   return (Maths.round(toYVal(pix, useCornerQ), decimals));
   }
   */
	getTicks(stt, span, ratio) {
		let ticks = []

		let inter = this.tickInterval(span / ratio, false)
		let tickStt = Math.ceil(stt / inter) * inter
		let i = 0
		let tick = 0
		do {
			tick = tickStt + i * inter
			tick = Number(tick.toPrecision(8))
			ticks.push([tick, 1])
			i++
		} while (tick < stt + span)

		// go thru list and mark all major ticks
		inter = this.tickInterval(span / ratio, true)
		for (i = 0; i < ticks.length; i++) {
			let t = ticks[i][0]
			if (Math.abs(Math.round(t / inter) - t / inter) < 0.001) {
				ticks[i][1] = 0
				//console.log(t)
			}
		}

		//console.log("ticks",ticks);
		return ticks
	}
	tickInterval(span, majorQ) {
		//console.log("tickInterval=", span, majorQ);
		//console.log("a=" + Math.log(span) * Math.LOG10E);
		let pow10 = Math.pow(10, Math.floor(Math.log(span) * Math.LOG10E))
		//console.log("pow10=" + pow10, majorQ);
		let mantissa = span / pow10
		//console.log("mantissa=" + mantissa);
		//document.getElementById('dbg').innerHTML = mantissa;
		if (mantissa >= 5) {
			if (majorQ) {
				return 5 * pow10
			} else {
				return 1 * pow10
			}
		}
		if (mantissa >= 3) {
			if (majorQ) {
				return 2 * pow10
			} else {
				return 0.2 * pow10
			}
		}
		if (mantissa >= 1.4) {
			// 1.4 to 3
			if (majorQ) {
				return 0.5 * pow10
			} else {
				return 0.2 * pow10
			}
		}
		if (mantissa >= 0.8) {
			if (majorQ) {
				return 0.5 * pow10
			} else {
				return 0.1 * pow10
			}
		}
		if (majorQ) {
			return 0.2 * pow10
		} else {
			return 0.1 * pow10
		}
	}
}

//coords.prototype.xTickInterval = function ( tickDensity, majorQ ) {
//	return this.tickInterval((this.xEnd - this.xStt) / tickDensity, majorQ);
//};
//
//coords.prototype.yTickInterval = function ( tickDensity, majorQ ) {
//	return this.tickInterval((this.yEnd - this.yStt) / tickDensity, majorQ);
//};

class Graph {
	constructor(g, coords) {
		this.g = g
		my.coords = coords
		//let xClr = 0x4444ff;
		//let yClr = 0xff4444;
		this.xLinesQ = true
		this.yLinesQ = true
		//this.xArrowQ = true;
		//this.yArrowQ = true;
		this.xValsQ = true
		this.yValsQ = true

		this.majorTickClr = 'rgba(0,0,256,0.2)'
		this.minorTickClr = 'rgba(0,0,256,0.07)'

		//let polyLineQ = false;
		//let polyLine = new Array; // point-to-point-to-point
		//let polyLines = new Array;
		this.skewQ = false
	}
	drawGraph() {
		// sort out where to put axes and labels

		this.hzAxisY = my.coords.toYPix(0)
		if (this.hzAxisY < 0) this.hzAxisY = 0
		if (this.hzAxisY > my.coords.height) this.hzAxisY = my.coords.height

		this.hzNumsY = this.hzAxisY + 14
		if (this.hzAxisY > my.coords.height - 10) this.hzNumsY = my.coords.height - 3

		this.vtAxisX = my.coords.toXPix(0)
		if (this.vtAxisX < 0) this.vtAxisX = 0
		if (this.vtAxisX > my.coords.width) this.vtAxisX = my.coords.width

		this.vtNumsX = this.vtAxisX - 5 //
		if (this.vtAxisX < 10) this.vtNumsX = 20

		//console.log("drawGraph", this.hzAxisY, this.hzNumsY, this.vtAxisX, this.vtNumsX);
		if (my.coords.xLogQ) {
			this.drawLinesLogX()
		} else {
			if (this.xLinesQ) {
				this.drawHzLines()
			}
		}
		if (my.coords.yLogQ) {
			this.drawLinesLogY()
		} else {
			if (this.yLinesQ) {
				this.drawVtLines()
			}
		}

		// draw box
		//if (!this.skewQ) {
		//	g.beginPath();
		//	g.lineWidth = 1;
		//	g.strokeStyle = "#000000";
		//	g.rect(my.coords.left, my.coords.top, my.coords.width, my.coords.height);
		//	g.stroke();
		//	g.closePath();
		//
		//}
	}
	drawVtLines() {
		//let numAtAxisQ = (yAxisPos >= 0 && yAxisPos < my.coords.width);

		let g = this.g

		//let xTick = minorTick;
		g.lineWidth = 1

		//let tickStt = Math.ceil(my.coords.xStt / xTick) * xTick;
		//let tickEnd = my.coords.xEnd;
		let ticks = my.coords.getTicks(my.coords.xStt, my.coords.xEnd - my.coords.xStt, my.graphWd / 100)
		//console.log('coords', my.coords)
		//for (let xVal = tickStt; xVal <= tickEnd; xVal += xTick){
		//let s = '(';
		for (let i = 0; i < ticks.length; i++) {
			let tick = ticks[i]
			//s += tick + ')(';
			let xVal = tick[0]
			let tickLevel = tick[1]
			if (tickLevel == 0) {
				// Major Ticks
				//g.setLineDash([]);
				g.strokeStyle = this.majorTickClr
			} else {
				// Minor Ticks
				//g.setLineDash([5, 5]);
				g.strokeStyle = this.minorTickClr
			}

			let xPix = my.coords.toXPix(xVal, false)
			g.beginPath()
			g.moveTo(xPix, my.coords.toYPix(my.coords.yStt, false))
			g.lineTo(xPix, my.coords.toYPix(my.coords.yEnd, false))
			g.stroke()

			if (tickLevel == 0 && this.xValsQ) {
				g.fillStyle = '#0000ff'
				g.font = 'bold 12px Verdana'
				g.textAlign = 'center'

				g.fillText(fmt(xVal), xPix, this.hzNumsY)
			}
		}
		//console.log("ticks",s);
		//	g.setLineDash([]);
		if (this.skewQ) return

		// Y zero line
		//lineStyle(2, yClr, 0.7);
		////yAxisPos = Maths.constrain(0, yAxisPos, 600);
		//let numAtAxisQ = (yAxisPos >= 0 && yAxisPos < my.coords.width);
		//if (yAxisPos < 0) yAxisPos=0;
		//if (yAxisPos >= 0 && yAxisPos < my.coords.width) {
		////console.log("yAxisPos=" + yAxisPos);
		//moveTo(yAxisPos, 0);
		//lineTo(yAxisPos, my.coords.height);
		//
		g.lineWidth = 1.5
		g.strokeStyle = '#ff0000'
		g.beginPath()
		g.moveTo(this.vtAxisX, my.coords.toYPix(my.coords.yStt, false))
		g.lineTo(this.vtAxisX, my.coords.toYPix(my.coords.yEnd, false))
		g.stroke()

		//if (yArrowQ){
		g.beginPath()
		g.fillStyle = g.strokeStyle
		g.drawArrow(this.vtAxisX, my.coords.toYPix(my.coords.yEnd), 15, 2, 20, 10, Math.PI / 2, 10, false)
		g.stroke()
		g.fill()
		//}
		//}
		//this.g.globalAlpha = 1;
	}
	drawHzLines() {
		//let xAxisPos = my.coords.toYPix(0);
		//let yAxisPos = my.coords.toXPix(0);
		//let numAtAxisQ = (xAxisPos >= 0 && xAxisPos < my.coords.height);
		let g = this.g

		//let yTick = minorTick;
		g.lineWidth = 1

		//let tickStt = Math.ceil(my.coords.xStt / yTick) * yTick;
		//let tickEnd = my.coords.xEnd;
		let ticks = my.coords.getTicks(my.coords.yStt, my.coords.yEnd - my.coords.yStt, my.graphHt / 100)

		//for (let yVal = Math.ceil(my.coords.yStt / yTick) * yTick; yVal <= my.coords.yEnd; yVal += yTick){
		for (let i = 0; i < ticks.length; i++) {
			let tick = ticks[i]

			let yVal = tick[0]
			let tickLevel = tick[1]
			if (tickLevel == 0) {
				// Major Ticks
				//g.setLineDash([]);

				g.strokeStyle = this.majorTickClr
			} else {
				// Minor Ticks
				//g.setLineDash([5, 5]);
				g.strokeStyle = this.minorTickClr
			}

			let yPix = my.coords.toYPix(yVal, false)
			g.beginPath()
			g.moveTo(my.coords.toXPix(my.coords.xStt, false), yPix)
			g.lineTo(my.coords.toXPix(my.coords.xEnd, false), yPix)
			g.stroke()

			if (tickLevel == 0 && this.yValsQ) {
				g.fillStyle = '#ff0000'
				g.font = 'bold 12px Verdana'
				g.textAlign = 'right'
				g.fillText(fmt(yVal), this.vtNumsX, yPix + 5)
			}
		}
		//	g.setLineDash([]);
		if (this.skewQ) return

		// X zero line
		//lineStyle(2, xClr, 0.7);
		//if (xAxisPos >= 0 && xAxisPos < my.coords.height) {
		g.lineWidth = 2
		g.strokeStyle = '#0000ff'
		g.beginPath()
		g.moveTo(my.coords.toXPix(my.coords.xStt, false), this.hzAxisY) // this.vtAxisX
		g.lineTo(my.coords.toXPix(my.coords.xEnd, false), this.hzAxisY)
		g.stroke()

		//if (xArrowQ){
		g.beginPath()
		g.fillStyle = g.strokeStyle
		g.drawArrow(my.coords.toXPix(my.coords.xEnd, false), this.hzAxisY, 15, 2, 20, 10, 0, 10, false)
		g.stroke()
		g.fill()
		//}
		//}
	}
}

/*
 function drawLinesLogX() {

 let vals = new Array;
 vals.push(my.coords.xStt);

 // find powers of ten
 let loPower = Math.log(my.coords.xStt) / Math.log(10);
 let hiPower = Math.log(my.coords.xEnd) / Math.log(10);

 for (let i = loPower; i < hiPower; i++){
 for (let j = 1; j < 10; j++){
 let v = j * Math.pow(10, i);
 if (v > my.coords.xStt && v < my.coords.xEnd)
 vals.push(v);
 }
 }
 vals.push(my.coords.xEnd);

 lineStyle(0, 0x0000ff, 0.2);
 let prevPix = -Number.MAX_VALUE;
 for (i = 0; i < vals.length; i++){
 let val = vals[i];
 let pix = my.coords.toXPix(val, false);
 moveTo(pix, 0);
 lineTo(pix, my.coords.height);

 console.log("X=" + pix, prevPix);
 if ((pix - prevPix) > 0){
 let lblStr = Maths.enuffDigits(val, my.coords.xStt, my.coords.xEnd).toString();
 let lblObj = new TextBox("Arial", 14, 100, 1, lblStr); // EnuffDigits(x,xstt,xend);
 lblObj.setAlign("center");

 lblObj.x = pix - 100 / 2;
 lblObj.y = my.coords.height;
 addChild(lblObj);
 prevPix = pix + lblStr.length * 8;
 }
 }

 }

 /***/

function lineArrow(aX, aY, bX, bY) {
	let g = my.canGraph.g

	g.beginPath()
	g.moveTo(aX, aY)
	g.lineTo(bX, bY)
	g.stroke()

	g.beginPath()
	let ang = Math.atan2(bY - aY, -(bX - aX))
	//let ang2 = -ang
	//if (ang2<0) ang2 += 2 * Math.PI
	g.drawArrow(aX, aY, 0, 0, 10, 5, ang, 5, false)
	g.stroke()

	g.beginPath()
	ang = Math.atan2(aY - bY, -(aX - bX))
	g.drawArrow(bX, bY, 0, 0, 10, 5, ang, 5, false)
	g.stroke()

	// g.fill();
}

CanvasRenderingContext2D.prototype.drawArrow = function (x0, y0, totLen, shaftHt, headLen, headHt, angle, sweep, invertQ) {
	let g = this

	// angle: 0 points right, Math.PI points left
	//console.log("drawArrow=" + totLen, headLen, headHt, angle);
	let pts = [
		[0, 0],
		[-headLen, -headHt / 2],
		[-headLen + sweep, -shaftHt / 2],
		[-totLen, -shaftHt / 2],
		[-totLen, shaftHt / 2],
		[-headLen + sweep, shaftHt / 2],
		[-headLen, headHt / 2],
		[0, 0],
	]

	if (invertQ) {
		pts.push([0, -headHt / 2], [-totLen, -headHt / 2], [-totLen, headHt / 2], [0, headHt / 2])
	}
	for (let i = 0; i < pts.length; i++) {
		//let cosa = Math.cos(-angle * Math.PI / 180.);
		//let sina = Math.sin(-angle * Math.PI / 180.);
		let cosa = Math.cos(-angle)
		let sina = Math.sin(-angle)
		let xPos = pts[i][0] * cosa + pts[i][1] * sina
		let yPos = pts[i][0] * sina - pts[i][1] * cosa
		if (i == 0) {
			g.moveTo(x0 + xPos, y0 + yPos)
		} else {
			g.lineTo(x0 + xPos, y0 + yPos)
		}
	}
}

CanvasRenderingContext2D.prototype.drawBox = function (midX, midY, radius, angle) {
	//g = this;

	g.beginPath()

	let pts = [
		[0, 0],
		[Math.cos(angle), Math.sin(angle)],
		[Math.cos(angle) + Math.cos(angle + Math.PI / 2), Math.sin(angle) + Math.sin(angle + Math.PI / 2)],
		[Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2)],
		[0, 0],
	]
	for (let i = 0; i < pts.length; i++) {
		if (i == 0) {
			g.moveTo(midX + radius * pts[i][0], midY + radius * pts[i][1])
		} else {
			g.lineTo(midX + radius * pts[i][0], midY + radius * pts[i][1])
		}
	}
	g.stroke()
}

function fmt(num, digits = 14) {
	// digits = 14;
	if (num == Number.POSITIVE_INFINITY) return 'undefined'
	if (num == Number.NEGATIVE_INFINITY) return 'undefined'

	num = num.toPrecision(digits)
	num = Number(num).toString() // to remove e+1 etc
	//console.log('num',num)
	//num = num.replace(/0+$/, ""); // more than one leading 0
	if (num.charAt(num.length - 1) == '.') num = num.substr(0, num.length - 1) // remove trailing .

	if (Math.abs(num) < 1e-15) num = 0

	return num
}

function fmtFix(num, digN = 14) {
	//console.log('',num, digits)
	let s = Number(num).toFixed(Math.max(0, digN))
	s = s.replace(/\.0+$/g, '') // trailing 0s

	return s
}

function canvasInit(id, wd, ht, ratio) {
	let el = document.getElementById(id)
	//el.style.border = "1px solid black";
	//my.ratio = 1
	el.width = wd * ratio
	el.style.width = wd + 'px'
	el.height = ht * ratio
	el.style.height = ht + 'px'
	let g = el.getContext('2d')
	g.setTransform(ratio, 0, 0, ratio, 0, 0)
	return { el: el, g: g, ratio: ratio }
}

function getJSQueryVar(varName, defaultVal) {
	let scripts = document.getElementsByTagName('script')
	let lastScript = scripts[scripts.length - 1]
	let scriptName = lastScript.src

	let bits = scriptName.split('?')
	if (bits.length < 2) return defaultVal

	let query = bits[1]
	console.log('query: ', query)

	// let query = window.location.search.substring(1);
	let vars = query.split('&')
	for (let i = 0; i < vars.length; i++) {
		let pair = vars[i].split('=')
		if (pair[0] == varName) {
			return pair[1]
		}
	}
	return defaultVal
}

function docInsert(s) {
	let div = document.createElement('div')
	div.innerHTML = s
	let script = document.currentScript
	script.parentElement.insertBefore(div, script) // Add the newly-created div before script location
}

function wrap({ id = '', cls = '', pos = 'rel', style = '', txt = '', tag = 'div', lbl = '', fn = '', opts = [] }, ...mores) {
	let s = ''
	s += '\n'

	txt += mores.join('')

	let noProp = 'event.stopPropagation(); '

	// prettier-ignore
	let tags = {
    btn:  {stt: '<button ' + (fn.length > 0 ? ' onclick="' + noProp + fn + '" ' : ''), cls:'btn', fin:'>' + txt + '</button>'},
    can:  {stt: '<canvas ', cls:'', fin:'></canvas>'},
    div:  {stt: '<div ' + (fn.length > 0 ? ' onclick="' + fn + '" ' : ''), cls:'', fin:' >' + txt + '</div>'},
    edit: {stt: '<textarea onkeyup="' + fn + '" onchange="' + fn + '"', cls:'', fin:' >' + txt + '</textarea>'},
    inp:  {stt: '<input value="' + txt + '"' + (fn.length > 0 ? '  oninput="' + fn + '" onchange="' + fn + '"' : ''), cls:'input', fin:'>' + (lbl.length > 0 ? '</label>' : '')},
    out:  {stt: '<span ', cls:'output', fin:' >' + txt + '</span>' + (lbl.length > 0 ? '</label>' : '')},
    radio:{stt:'<div ', cls:'radio', fin:'>\n'},
    sel:  {stt: '<select ' + (fn.length > 0 ? ' onchange="' + fn + '"' : ''), cls:'select', fin:'>\n'},
    sld:  {stt:'<input type="range" ' + txt + ' oninput="' + noProp + fn + '" onchange="'  + noProp + fn + '"', cls:'select', fin: '>' + (lbl.length > 0 ? '</label>' : '')},
  }

	let type = tags[tag]

	if (lbl.length > 0) s += '<label class="label">' + lbl + ' '

	s += type.stt
	if (cls.length == 0) cls = type.cls
	if (tag == 'div') style += fn.length > 0 ? ' cursor:pointer;' : ''

	if (id.length > 0) s += ' id="' + id + '"'
	if (cls.length > 0) s += ' class="' + cls + '"'
	if (pos == 'dib') s += ' style="position:relative; display:inline-block;' + style + '"'
	if (pos == 'rel') s += ' style="position:relative; ' + style + '"'
	if (pos == 'abs') s += ' style="position:absolute; ' + style + '"'

	// if (tag == 'sld') s += '>'
	s += type.fin

	if (tag == 'radio') {
		for (let i = 0; i < opts.length; i++) {
			let chk = ''
			if (i == 0) chk = 'checked'
			let idi = id + i
			let lbl = opts[i]
			s += '<input id="' + idi + '" type="radio" name="' + id + '" value="' + lbl.name + '" onclick="' + fn + '(' + i + ');" ' + chk + ' >'
			s += '<label for="' + idi + '">' + lbl.name + ' </label>'
		}
		s += '</div>'
	}
	if (tag == 'sel') {
		for (let i = 0; i < opts.length; i++) {
			let opt = opts[i]
			let idStr = id + i
			let chkStr = opt.name == txt ? ' selected ' : ''
			let descr = opt.hasOwnProperty('descr') ? opt.descr : opt.name
			s += '<option id="' + idStr + '" value="' + opt.name + '"' + chkStr + '>' + descr + '</option>\n'
		}
		s += '</select>'
		if (lbl.length > 0) s += '</label>'
	}

	s += '\n'
	//console.log('wrap', tag + '\n', s + '\n')

	return s.trim()
}
init()

// function wrap(id, classStr, type = 'rel', styleExtra = '', middle = '') {
//   let s = ''
//   s += '\n'

//   let inpQ = classStr.includes('input')

//   s += inpQ ? '<input class="input" value="' + middle + '"  oninput="onChg()" onchange="onChg()"' : '<div'

//   if (id.length > 0) s += ' id="' + id + '"'
//   if (classStr.length > 0) s += ' class="' + classStr + '"'
//   if (type == 'rel') {
//     s += ' style="position:relative; ' + styleExtra + '"'
//   }
//   if (type == 'abs') {
//     s += ' style="position:absolute; ' + styleExtra + '"'
//   }

//   s += inpQ ? ' />' : ' >' + middle + '</div>'

//   return s
// }
