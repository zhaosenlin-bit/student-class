let theme = themeGet()
themeSet(theme)

window.addEventListener('storage', function () {
	//console.log('iframe event: storage')
	let t = themeGet()
	if (t != theme) {
		console.log('changing iframe theme', theme, '=>', t)
		theme = t
		themeSet(theme)
	}
})

function themeGet() {
	let theme = localStorage.getItem('theme')
	//console.log('themeGet', theme)
	if (theme == null) {
		let prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches
		theme = prefersDarkScheme ? 'dark' : 'lite'
		localStorage.setItem('theme', theme)
	}
	if (theme != 'lite' && theme != 'dark') {
		theme = 'lite'
		localStorage.setItem('theme', theme)
	}
	//console.log('themeGet', theme)
	return theme
}

function themeSet(theme) {
	let props = []

	//theme = 'lite' // NB
	//theme = theme  // so we can use it in other JavaScript functions
	console.log('themeSet', theme)

	/* 0 red, 20 orange, 60 yellow, 100 green, 180 aqua, 240 blue, 270 purple/indigo, 300 magenta, 330 pink */

	let liteTxt = `
--txtClr: #333;
--bgClr: hsl(0, 0%, 100%);
--bg: linear-gradient(to right, hsla(214, 100%, 90%, 100%) 0%, hsla(214, 100%, 90%, 0%) 20%, hsla(214, 100%, 90%, 0%) 50%, hsla(214, 100%, 90%, 0%) 80%, hsla(214, 100%, 90%, 100%) 100%);

--a0Clr: hsl(60, 100%, 97%);    /* v v light yellow */   
--a1Clr: hsl(50, 100%, 95%);    /* v light yellow */   
--a2Clr: hsl(50, 100%, 85%);    /* light yellow  */ 
--a3Clr: hsl(45, 100%, 77%);    /* sand */ 
--a4Clr: hsl(50, 100%, 28%);    /* gold (text) */

--b0Clr: hsl(213, 100%, 96%);   /* v v light  blue */ 
--b1Clr: hsl(214, 100%, 93%);   /* v light blue */ 
--b2Clr: hsl(214, 100%, 84%);   /* light blue */ 
--b3Clr: hsl(214, 65%, 43%);    /* pretty blue (text) */
--b4Clr: hsl(214, 100%, 25%);   /* dark blue (text) */

--o1Clr: hsl(100, 100%, 30%);    /* orange (text) */
--r1Clr: hsl(0, 100%, 60%);    /* red (text) */

--hdrImg: url(images/hdr/hdr-main-lite.svg);
--hdrAdvImg: url(images/hdr/hdr-adv-lite.svg);
--h1Shadow: 2px 2px 2px hsl(0, 0%, 100%), inset 1px 1px 1px hsl(24, 100%, 100%);  
`

	let darkTxt = `
--txtClr: hsl(0, 0%, 90%);
--bgClr: hsla(214, 20%, 10%, 100%);
--bg: linear-gradient(to right, hsl(214, 50%, 10%) 0%, hsl(214, 20%, 9%) 20%, hsl(214, 20%, 9%) 50%, hsl(214, 20%, 9%) 80%, hsl(214, 50%, 10%) 100%);

--a0Clr: hsl(220, 50%, 20%);    /* dark blue is much nicer than dark yellow */   
--a1Clr: hsl(220, 65%, 26%);    /*  dark blue*/     
--a2Clr: hsl(220, 50%, 30%);    /*  */ 
--a3Clr: hsl(50, 90%, 85%);    /* sand */ 
--a4Clr: hsl(50, 100%, 96%);    /* v light yellow (text) */

--b0Clr: hsl(210, 80%, 9%);   /* dk blue */ 
--b1Clr: hsl(210, 80%, 12%);    /* dk blue */ 
--b2Clr: hsl(210, 100%, 25%);    /* med blue */ 

--b3Clr: hsl(214, 100%, 84%);   /* light blue (text) */
--b4Clr: hsl(214, 100%, 94%);   /* v light blue (text) */

--o1Clr: hsl(50, 100%, 60%);    /* gold (orange) */
--r1Clr: hsl(0, 100%, 65%);    /* red (text) */

--hdrImg: url(images/hdr/hdr-main-dark.svg);
--hdrAdvImg: url(images/hdr/hdr-adv-dark.svg);
--h1Shadow1: 2px 2px 2px hsl(214, 10%, 19%), -2px -2px 2px hsl(214, 10%, 19%), 2px -2px 2px hsl(214, 10%, 19%), -2px 2px 2px hsl(214, 10%, 19%); 
--h1Shadow: 1px 2px 5px hsl(220, 90%, 20%), 0px 0px 0 hsl(214, 100%, 100%); 
`

	let txt = liteTxt
	this.bgClr = 'white'
	this.txtClr = '#333'

	if (theme == 'dark') {
		txt = darkTxt
		this.bgClr = '#333'
		this.txtClr = '#eee'
	}
	let lns = txt.split('\n')
	//console.log('lns', lns)
	props = []
	lns.map((ln) => {
		ln = ln.trim()
		if (ln.length > 0) {
			let bits = ln.split(/[:;]/g)
			props.push([bits[0].trim(), bits[1].trim()])
		}
	})

	let root = document.documentElement
	for (let i = 0; i < props.length; i++) {
		let prop = props[i]
		//console.log('prop', prop)
		root.style.setProperty(prop[0], prop[1])
	}
}

function iframeTop() {
	console.log('iframeTop')
	document.parent.scrollTo(0, 0)
}

function iframeMax() {
	console.log('iframeMax')
	// let div = document.documentElement
	// div.style.border = '1px solid green'
	// div.style.position = 'absolute'
	// div.style.top = '0'
	// div.style.width = '100px'
	// div.style.height = '100px'
}
function inNew(s, wd, ht) {
	//var src = document.body.outerHTML;
	//console.log('goFull',src)
	//let s = '/mathsisfun/numbers/images/square-root.js'
	//src = `<script src="${s}"></script>`

	let imgHome = document.domain == 'localhost' ? '/mathsisfun/' : '/'

	let html = '<!doctype html><html><head>'
	html += '<meta http-equiv="content-type" content="text/html; charset=utf-8" />'
	//html += '<script src="' + rel + 'images/player.js" type="text/javascript"></script>';
	html += '<link rel="stylesheet" href="' + imgHome + 'style4.css">'
	//html += '<script src="' + imgHome + 'iframe.js" defer></script>';
	html += '<style>body { background: transparent; }</style>'
	html += '</head>'

	html += '<body style="margin: 0; padding: 0;">'
	html += `<script defer src="${s}"></script>`
	html += '</body>'
	html += '</html>'

	console.log('html', wd, ht)

	let win = window.open('', '', 'width=' + wd + ',height=' + ht + ',left=100,top=50,menubar=no,resizable=yes,scrollbars=auto,status=no,titlebar=no')
	win.document.write(html)
	win.document.close()
	//win.moveTo(100,100);
	// win.left = 0;
	win.document.title = 'Math is Fun'

	console.log('name=', win.name)
}

function goFull() {
	console.log('goFull')

	if (!document.fullscreenElement) {
		//var div = document.getElementById('main');
		var div = document.body
		var requestMethod = div.requestFullScreen || div.webkitRequestFullScreen || div.mozRequestFullScreen || div.msRequestFullScreen

		if (requestMethod) {
			requestMethod.call(div)
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen()
		}
	}
	//redraw();
}
