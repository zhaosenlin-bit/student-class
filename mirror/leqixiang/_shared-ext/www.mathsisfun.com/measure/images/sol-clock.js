let my = {}
let deg2rad = Math.PI / 180.0
let w = 726;
let h = 363;

function solclockMain(mode = 'sun') {
  let version = '0.64';
  my.mode = mode
  // http://www.mathsisfun.com/measure/images/sol-clock.js

  // http://localhost/mathsisfun/app.html?folder=measure&file=sol-clock

  // The Sun Rules!

  /* TODO: 
  show time in time zone on hover
  */

  my.drag = { onQ: false, lastTime: -1000000 }
  my.lastTimeStr = ''
  my.days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  my.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let s = "";
  s += '<style>'
  s += '.btn { display: inline-block; position: relative; text-align: center; margin: 2px; text-decoration: none; font: bold 12px/16px Arial, sans-serif; color: #268; border: 1px solid #88aaff; border-radius: 10px;cursor: pointer; background: linear-gradient(to top right, rgba(170,190,255,1) 0%, rgba(255,255,255,1) 100%); outline-style:none;}'
  s += '.btn:hover { background: linear-gradient(to top, rgba(255,255,0,1) 0%, rgba(255,255,255,1) 100%); }'
  s += '.yy { border: solid 2px #eeeeaa; background: linear-gradient(to top, rgba(255,220,130,1) 0%, rgba(255,255,255,1) 100%);  }'
  s += '.hi { border: solid 2px #eeeeaa; background: linear-gradient(to top, rgba(130,220,255,1) 0%, rgba(255,255,255,1) 100%); box-shadow: 2px 2px 6px #66a; }'
  s += '.lo { border: solid 1px #888888; background: linear-gradient(to top, rgba(170,170,170,1) 0%, rgba(205,205,205,1) 100%);  }'
  s += '</style>'

  s += `<div id="main" style="position:relative; width:${w}px; min-height:${h}px; margin:auto; display:block;
   border: none; border-radius: 10px; background: linear-gradient(to top, rgba(130,220,255,1) 0%, rgba(255,255,255,1) 100%)">`

  my.imgHome = (document.domain == 'localhost') ? '/mathsisfun/measure/images/' : '/measure/images/'
  s += '<img id="nightImg" src="' + my.imgHome + 'earth-night726x363.jpg" style="position: absolute; left: 0px; top: 0px; visibility: hidden;" />';
  s += '<img id="dayImg" src="' + my.imgHome + 'earth-day726x363.jpg" style="position: absolute; left: 0px; top: 0px;" />';
  //s += '<img id="dayImg" src="' + my.imgHome + 'world-map-3.jpg" style="position: absolute; left: 0px; top: 0px; width:726px; height:363px" />';
  //s += '<img id="sol" src="' + my.imgHome + 'sol.svg" style="position: absolute; left: 0px; top: 0px;" />';

  my.gs = []
  for (let i = 0; i < 4; i++) {
    s += `<canvas id="canvas${i}" width="${w}" height="${h}" style="position: absolute; left: 0px; top: 0px;"></canvas>`
    my.gs.push(i)
  }

  s += '<div style="position: absolute; left:9px; bottom: 50px; color: #990; font: 14px Arial;  ">'

  s += '<div style="">'
  s += '<div style="">Local: <span id="locDate"></span></div>'
  s += '<div id="locTime" style="font: 40px Arial; color: yellow;"></div>'
  s += '</div>'

  s += '<div style="margin-top: 2px;">'
  s += '<div style="display: inline-block;">UTC: &nbsp;</div>'
  s += '<div id ="UTCTime" style="display: inline-block; font: 14px Arial; width:100px;color: yellow;"></div>'
  s += '</div>'

  s += '</div>'

  s += '<div style="position: absolute; right:2px; bottom: 48px; color: white; font: 12px Arial;  ">'
  s += '<button id="solBtn" class="btn hi" style=" " onclick="toggleSol()" >Sun</button>';
  s += '<button id="tzBtn" class="btn lo" style="  " onclick="toggleTz()" >Timezones</button>';
  s += '</div>'

  // s += '</div>';
  s += '<div style="position: absolute; right: 6px; top: 3px; font: 11px Arial; color: #68a;">&copy; 2020 MathsIsFun.com  v' + version + '</div>';

  s += '</div>';

  document.write(s);

  let ratio = 2;

  my.gs = my.gs.map(g => {
    let el = document.getElementById('canvas' + g);
    el.width = w * ratio;
    el.height = h * ratio;
    el.style.width = w + "px";
    el.style.height = h + "px";
    g = el.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    //console.log('g',g)
    return g
  })

  my.mapType = 'mask' // mask or draw

  my.sol = new Sun('aaa', 55, 'yellow')
  //my.sun.setxy(0.27123966942149025, -115.89520661157025)
  my.sol.draw();

  if (my.mode == 'sun') {
    my.solQ = true
    my.tzQ = false
  } else {
    my.solQ = false
    my.tzQ = true
  }
  my.solQ = !my.solQ // invert before toggle
  toggleSol()
  my.tzQ = !my.tzQ
  toggleTz()

  window.addEventListener('mousemove', function (ev) {
    mouseMove(ev)
  })

  window.addEventListener('touchmove', function (ev) {
    console.log('touchmove')
    let touch = ev.targetTouches[0];
    ev.clientX = touch.clientX;
    ev.clientY = touch.clientY;
    ev.touchQ = true;
    mouseMove(ev)
  })

  window.addEventListener("keydown", key, false);

  //console.log('my.gs', my.gs)
  my.xChg = 0
  my.yChg = 0
  my.sclChg = 0

  my.tzs = tzsGet()
  my.tzFracs = [
    { time: 3.5, name: '', latMin: 25, latMax: 38 },
    { time: 4.5, name: '', latMin: 23, latMax: 35 },
    { time: 5.5, name: 'India', latMin: 5, latMax: 31 },
    { time: 6.5, name: 'Burma?', latMin: 13, latMax: 33 },
    { time: 9.5, name: 'SA', latMin: -38, latMax: -10 },
  ]
  my.tzTime = 0
  tzLoop(my.gs[0])

  let div = document.getElementById('nightImg')
  div.onload = function () {
    // so shadowPlot has images
    solPos(my.gs[1])
  };

  footerPlot(my.gs[2])

  timeUpdate()
  setInterval(timeUpdate, 1000) // once a second

}

function timeUpdate() {

  let dt = new Date()
  //let off = dt.getTimezoneOffset()

  let dateStr = my.months[dt.getMonth()]  + ' ' + dt.getDate()
  let timeStr = my.days[dt.getDay()] + ' ' + timeFmt(dt.getHours(), dt.getMinutes())

  if (timeStr != my.lastTimeStr) { // only do update when time has changed
    my.lastTimeStr = timeStr

    document.getElementById('locDate').innerHTML = dateStr
    document.getElementById('locTime').innerHTML = timeStr
    document.getElementById('UTCTime').innerHTML = my.days[dt.getUTCDay()] + ' ' + timeFmt(dt.getUTCHours(), dt.getUTCMinutes())

    //console.log('dt', dt, off)
    if (my.drag.lastTime + 20000 < performance.now()) { // don't move Sun if user has dragged it recently
      solPos(my.gs[1])
    } else {
      console.log('NO MOVE SUN')
    }

  }

}

function isDST(d) {
  // from https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
  let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
  let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) != d.getTimezoneOffset(); 
}

function timeFmt(h, m) {
  let mode = '24'

  let hh = h.toString()
  if (mode == 'am') {
    if (h > 12) h -= 12
    if (h == 0) {
      hh = '12'
    } else {
      hh = (h < 10) ? '0' + h : '' + h
    }
  } else {
    if (h < 10) hh = '0' + h;
  }

  let mm = (m < 10) ? '0' + m : '' + m

  let timeStr = ''
  if (mode == 'am') {
    timeStr = hh + mm;
  } else {
    timeStr = hh + ':' + mm
  }

  return timeStr
}

function tzLoop() {

  let g = my.gs[3]
  //console.log('tzLoop', my.xChg, my.yChg, my.sclChg)

  g.clearRect(0, 0, g.canvas.width, g.canvas.height)

  my.tzs.map(tz => {
    // if (tz.time == my.tzTime-1) {
    // }

    // if (tz.time == my.tzTime+1) {
    //     tzPlot(tz,false)
    // }
    if (tz.time == my.tzTime) {
      tzPlot(g, tz, true)
    } else {
      //tzPlot(tz,false)

    }

  })

  //console.log('tzLoop',my.tzTime)
}

function footerPlot(g) {

  g.strokeStyle = 'black'

  g.textAlign = 'center'

  for (let i = 0; i <= 24; i++) {

    let x = (i - 0.5) * (w / 24) - 1
    let y = 320
    g.fillStyle = 'hsla(0,0%,0%,0.8)'
    // g.fillStyle = 'black'
    g.beginPath()
    g.rect(x, y, w / 24, 35)
    g.fill()
    //g.stroke()

    let hh = i - 12

    let ew = '0'
    if (hh > 0) ew = hh * 15 + 'E'
    if (hh < 0) ew = -hh * 15 + 'W'

    g.fillStyle = 'white'
    g.font = '11px Arial'
    g.fillText(ew, x + w / 48, y + 15)

    let hhStr = ((hh > 0) ? '+' : '') + hh
    g.fillStyle = 'yellow'
    g.font = '14px Arial'
    g.fillText(hhStr, x + w / 48, y + 30)

    //console.log('i', i, hh, ew, hhStr)
  }

}

function tzPlot(g, tz, chgQ) {

  let poly1 = tz.poly
  //let s = `xStt:${tz.xStt + my.xChg}, yStt:${tz.yStt + my.yChg}, xScl:${tz.xScl + my.sclChg}, yScl:${tz.xScl + my.sclChg}`
  //console.log(tz.time,s)

  g.strokeStyle = 'black'
  g.fillStyle = chgQ ? 'hsla(240,100%,90%,0.5)' : 'hsla(60,100%,90%,0.05)'

  g.beginPath()
  g.moveTo(1, 1)
  //g.lineTo(100,100)

  let xStt = tz.xStt
  let yStt = tz.yStt

  let xScl = tz.xScl
  let yScl = tz.yScl

  if (chgQ) {
    xStt += my.xChg
    yStt += my.yChg

    xScl += my.sclChg
    yScl += my.sclChg
  }

  let sttQ = false
  poly1.map(pt => {
    let xp = xStt + pt[0] * xScl
    let yp = yStt + pt[1] * yScl

    if (!sttQ) {
      g.moveTo(xp, yp)
      sttQ = true
    }
    g.lineTo(xp, yp)
    //console.log(pt)
  })
  g.fill();
  //g.stroke()

}

function solChg(x, y) {
  let lon = intToLon(x)
  let lat = intToLat(y)
  console.log('solChg', x, y, lat, lon)

  polyDo(my.gs[1], lat, lon)

}

function mouseMove(ev) {
  if (my.drag.onQ) {

    my.drag.lastTime = performance.now() // so we know not to move Sun until after user has given up dragging

    let div = my.drag.div

    let lt = parseFloat(div.style.left) + ev.clientX - my.drag.x
    div.style.left = lt + 'px'
    my.drag.x = ev.clientX

    let tp = parseFloat(div.style.top) + ev.clientY - my.drag.y
    //tp = Math.max(h/4,Math.min(tp,h*0.75))
    div.style.top = tp + 'px'
    my.drag.y = ev.clientY

  } else {
    let el = document.getElementById('canvas0')
    var bRect = el.getBoundingClientRect();
    let ratio = 2
    let mouseX = (ev.clientX - bRect.left) * (el.width / ratio / bRect.width);
    let mouseY = (ev.clientY - bRect.top) * (el.height / ratio / bRect.height);
    //console.log('mouseMove', mouseX, mouseY, intToLon(mouseX), intToLat(mouseY))

    let time = Math.round(24 * mouseX / w) - 12

    // deal with fractional time zones like 6.5
    let lon = intToLon(mouseX)
    let lat = intToLat(mouseY)
    let tzFrac = null
    my.tzFracs.map(tz => {
      if (tz.time > time && tz.time < time + 1) { // time tolerance += 0.5
        if (lat > tz.latMin && lat < tz.latMax) { // alos is mouse within latitiude range
          tzFrac = tz
        }
      }
    })
    if (tzFrac != null) time = tzFrac.time

    if (time != my.tzTime) { // only update when changed
      my.tzTime = time
      tzLoop()
    }
  }

  //ev.preventDefault();
}

function solVal(solLat, solLon, pLat, pLon) {

  let sX = Math.cos(solLat * deg2rad) * Math.cos(solLon * deg2rad);
  let sY = Math.cos(solLat * deg2rad) * Math.sin(solLon * deg2rad);
  let sZ = Math.sin(solLat * deg2rad);

  let pX = Math.cos(pLat * deg2rad) * Math.cos(pLon * deg2rad);
  let pY = Math.cos(pLat * deg2rad) * Math.sin(pLon * deg2rad);
  let pZ = Math.sin(pLat * deg2rad);

  let sv = sX * pX + sY * pY + sZ * pZ
  ///aaa = Math.round(aaa*10)/10
  //console.log('solVal',sv )
  return sv
}

function intToLat(i) {
  return 90 - i / h * 180;
}

function latToInt(lat) {
  return h / 2 - (lat / 90) * h / 2
}

function intToLon(i) {
  // return 180 - i / w * 360;
  //console.log('intToLon',i,i / w * 360 - 180)
  return 180 - i / w * 360
}

function lonToInt(lon) {
  return w / 2 - (lon / 180) * w / 2 // shouldn't this be "+" ?
}

function solPos(g) {
  if (!my.solQ) return

  // TODO:  longitude currently reversed, with -180 on right rather than left, but still works somehow

  let now = new Date()
  // now.setMinutes( now.getMinutes() - 70 );
  // console.log('now',now)

  let utc = Math.round(now.getTime() / 1000) // seconds since 1970 (UTC)

  let T = (utc / 86400 - 10957.5) / 36525;

  let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T * T // Solar longitude (deg)
  let M = 357.5291 + 35999.0503 * T - 0.0001559 * T * T - 4.8e-7 * T * T * T; // Solar mean anomaly M (deg)

  let solC = (1.9146 - 0.004817 * T - 0.000014 * T * T) * Math.sin(deg2rad * M) + (0.019993 - 0.000101 * T) * Math.sin(deg2rad * 2 * M) + 0.00029 * Math.sin(deg2rad * 3 * M); // Sun’s equation of center (deg)

  let L = L0 + solC; // Solar true longitude  (deg)
  //console.log('solPos', now, now.toISOString(), utc, T, L0, solC, L)

  let eps = 23.43999;
  let x = Math.cos(L * deg2rad);
  let y = Math.cos(eps * deg2rad) * Math.sin(L * deg2rad);
  let z = Math.sin(eps * deg2rad) * Math.sin(L * deg2rad);
  let r = Math.sqrt(1 - z * z)

  let lat = Math.atan2(z, r) / deg2rad;
  //RA = Math.atan2(Y, X + R) / deg2rad;
  //JD = T * 36525 + 2451545;

  // let lat = delta;
  let fmod = utc - Math.floor(utc / 86400) * 86400;
  let lon = (fmod - 43200) * 0.004166666;
  //theta0 = lon + RA;

  lat = lat / 180;
  lat = lat - Math.floor(lat);
  if (lat < 0) {
    lat = lat + 1;
  }
  lat = lat * 180;
  if (lat > 90) {
    lat = lat - 180;
  }

  // lat = 90
  // lon = -180

  console.log('solPos lon,lat:', lon, lat)
  // console.log('solPos lon,lat:', lon, lat, lonToInt(lon), latToInt(lat))

  my.sol.setxy(lonToInt(lon), latToInt(lat))

  polyDo(g, lat, lon)

  // can misbehave close to equator
  //polyDo(0.27123966942149025, -115.89520661157025)

  //let c2 = document.getElementById("canvas2");
  // let ratio = 2;
  // c2.width = w * ratio;
  // c2.height = h * ratio;
  // c2.style.width = w + "px";
  // c2.style.height = h + "px";
  //   let g2 = c2.getContext("2d");

  //   let img = document.getElementById("nightImg");
  //   g2.beginPath();
  //   g2.arc(100, 75, 150, 0, Math.PI * 2);
  //   g2.clip();

  // g2.drawImage(img, 0, 0);
  //   console.log('g2',g2)

  //g.clearRect(0, 0, g.canvas.width, g.canvas.height)

}

function polyDo(g, lat, lon) {
  let poly = shadowPoly(lat, lon, -0.01)
  //console.log('poly', poly)
  // let plotType = 's'
  if (my.mapType == "mask") {

    let g2 = my.gs[1]

    // all this stupid jiggery pokery is so we wipe out the previous clip:
    let el = g2.canvas
    let ratio = 1
    el.width = w * ratio;
    el.height = h * ratio;
    el.style.width = w + "px";
    el.style.height = h + "px";

    //let c2 = document.getElementById("canvas2");
    //let g2 = c2.getContext("2d");
    //g2.save()
    // g2.restore()
    // g.clearRect(0, 0, g.canvas.width, g.canvas.height)
    //g2 = g2.canvas.getContext("2d");
    // g2.width += 1
    g2.beginPath();

    let ptN = 0;
    while (ptN < poly.length) {
      if (ptN == 0) {
        g2.moveTo(poly[ptN][0], poly[ptN][1]);
      } else {
        g2.lineTo(poly[ptN][0], poly[ptN][1]);
      }
      ptN++;
    }

    //g.fillStyle = 'hsla(240,100%,20%,0.5)'
    // g.fill();

    //g2.arc(220, 75, 150, 0, Math.PI * 2);
    g2.clip();
    let img = document.getElementById("nightImg");
    g2.drawImage(img, 0, 0);
    //maskDo(poly1,shadedPolyQ,w,h,_root.DayMask,_root.DayMap);
    //maskDo(poly1,shadedPolyQ,w,h,_root.DrawOnMask,_root.DrawOn);
    //maskDo(poly1,!shadedPolyQ,w,h,_root.NightMask,_root.NightMap);
  }

  if (false) {
    // inverts poly within rectangle  (hilite rather than shade)
    poly.map(pt => {
      if (pt[1] == 0) pt[1] = h
      else if (pt[1] == h) pt[1] = 0
    })

    g.clearRect(0, 0, g.canvas.width, g.canvas.height)

    //g.strokeStyle = 'hsla(60,100%,20%,0.2)'
    //g.lineWidth = 20
    //g.fillStyle = 'hsla(240,100%,20%,0.5)'  // dark blue
    g.fillStyle = 'hsla(60,100%,90%,0.2)' // lite yellow
    g.beginPath()
    polyPlot(g, poly, true, w, h);
    g.fill();
    //g.stroke()
  }

}

function shadowPoly(solLat, solLon, svWanted) {
  //console.log('shadowPlot', solLat, solLon, svWanted)
  // g.lineStyle(1,0,0);

  let poly1 = [];
  let poly2 = [];
  // let pntN = 0;
  // let shadedKnownQ = false;
  // let shadedPolyQ = true;
  // let prevEmptyQ = false
  let delta = w / 50
  let i = 0;
  while (i <= w) {
    let pLon = intToLon(i);
    let latLo = solLatFind(solLat, solLon, pLon, solLat, intToLat(h), svWanted);
    let latHi = solLatFind(solLat, solLon, pLon, intToLat(0), solLat, svWanted);
    //console.log('pLon', pLon, ' => ', latLo, latHi)

    if (latLo == -1000 && latHi == -1000) {
      if (solLat > 0) {
        poly1.push([i, h])
        poly2.push([i, h])
      } else {
        poly1.push([i, 0])
        poly2.push([i, 0])
      }
      i = i + delta;
      continue
    }

    if (latLo == -1000) { // but not both
      if (solLat > 0) {
        poly1.push([i, latToInt(latHi)])
        poly2.push([i, h])
      } else {
        poly1.push([i, 0])
        poly2.push([i, latToInt(latHi)])
      }
      i = i + delta;
      continue
    }

    if (latHi == -1000) { // but not both
      if (solLat > 0) {
        poly1.push([i, latToInt(latLo)])
        poly2.push([i, h])
      } else {
        poly1.push([i, 0])
        poly2.push([i, latToInt(latLo)])
      }
      i = i + delta;
      continue
    }

    // if ( latLo > -1000 || latHi > -1000) {
    //   if (!prevEmptyQ) {
    //     poly1[pntN] = [i, latToInt(solLat)];
    //     poly2[pntN] = [i, latToInt(solLat)];
    //     pntN++;
    //     prevEmptyQ = true
    //   }
    // } else if (prevEmptyQ) {
    //   poly1[pntN] = [i, latToInt(solLat)];
    //   poly2[pntN] = [i, latToInt(solLat)];
    //   pntN++;
    //   prevEmptyQ = false
    // }

    // if (!(latLo <= -1000 || latHi <= -1000)) {
    //   poly1[pntN] = [i, latToInt(latHi)];
    //   poly2[pntN] = [i, latToInt(latLo)];
    //   if (!shadedKnownQ) {
    //     if (solVal(solLat, solLon, (latHi + latLo) / 2, pLon) < svWanted) {
    //       shadedPolyQ = true;
    //     } else {
    //       shadedPolyQ = false;
    //     }
    //     shadedKnownQ = true;
    //   }
    //   pntN++;
    // }

    // if (!(latLo <= -1000 ? false : -1000 >= latHi ? false : !(-1000 < latLo ? false : latHi > -1000))) {
    if (true) { // neither latLo or LatHi can be -1000 now
      let lat = 0
      if (latLo > -1000) {
        lat = latLo;
      } else {
        lat = latHi;
      }
      if (solLat > 0) {
        poly1.push([i, latToInt(lat)])
        poly2.push([i, h])
      } else {
        poly1.push([i, 0])
        poly2.push([i, latToInt(lat)])
      }
      // pntN++;
    }

    i = i + delta;

  }
  if (poly1.length > 0) {
    poly2.reverse();
    poly1 = poly1.concat(poly2);
    return poly1
  }
  return []
}

function polyPlot(g, poly, shadedPolyQ, outerW, outerH) {

  let ptN = 0;
  while (ptN < poly.length) {
    if (ptN == 0) {
      g.moveTo(poly[ptN][0], poly[ptN][1]);
    } else {
      g.lineTo(poly[ptN][0], poly[ptN][1]);
    }
    ptN++;
  }
  g.lineTo(poly[0][0], poly[0][1]);
  if (!shadedPolyQ) {
    let xmin = 0;
    let ymin = 0;
    let xmax = outerW;
    let ymax = outerH;
    g.lineTo(xmin, ymin);
    g.lineTo(xmax, ymin);
    g.lineTo(xmax, ymax);
    g.lineTo(xmin, ymax);
    g.lineTo(xmin, ymin);
    g.lineTo(poly[0][0], poly[0][1]);
  }
  g.fill();
}

function solLatFind(solLat, solLon, pLon, lat1, lat2, aWanted) {
  //console.log('solLatFind', pLon, lat1, lat2, aWanted)

  let sv1 = solVal(solLat, solLon, lat1, pLon);
  let sv2 = solVal(solLat, solLon, lat2, pLon);

  // if (!(a1 == a2 ? false : a1 <= aWanted ? false : a2 > aWanted ? false : !(a1 >= aWanted ? false : a2 < aWanted))) {
  //   return -1000;
  // }
  if (sv1 == sv2) return -1000
  if (sv1 < aWanted && sv2 < aWanted) return -1000
  if (sv1 > aWanted && sv2 > aWanted) return -1000

  let svSign = sv1 > sv2 ? -1 : 1
  let latMid = 0

  while (true) {
    latMid = (lat1 + lat2) / 2;
    let svMid = solVal(solLat, solLon, latMid, pLon);
    if (svMid == aWanted) {
      break;
    }
    if (svMid * svSign < aWanted * svSign) {
      lat1 = latMid;
      sv1 = svMid;
    } else {
      lat2 = latMid;
      sv2 = svMid;
    }
    //console.log('lat1,lat2', lat1 , lat2)
    if (Math.abs(lat1 - lat2) < 1) return lat1 // loop until gap is small enough

  }

  return latMid
}

/*
if(!hasOwnProperty("_load"))
{
   _load = true;
   tellTarget("..")
   {
      HiLiteOffset = 0;
   }
   function ShowLocalTime()
   {
      tellTarget(".."._target);
      t = new Date();
      hhmm = TwoDigits(t.getHours()) + ":" + TwoDigits(t.getMinutes());
      hhmm = NeatTime(t,false,true);
      s = hhmm + ":" + TwoDigits(t.getSeconds());
      _root.LocalTime.text = s;
      _root.LocalDate.text = NeatDate(t,"f",true);
      return hhmm;
   }
   function ShowTimes()
   {
      tellTarget(".."._target);
      let OffSets = [0,-8,-5,-3,0,1,5,8,11];
      let i = 1;
      while(i < OffSets.length)
      {
         t = new Date();
         t.setHours(t.getHours() + OffSets[i]);
         eval("Time" + i).text = NeatTime(t,false);
         eval("Date" + i).text = NeatDate(t,"d");
         i++;
      }
      ShowHiLiteTime(HiLiteOffset);
   }
   function ShowHiLiteTime(Offset)
   {
      tellTarget(".."._target);
      HiLiteOffset = Offset;
      let t = new Date();
      t.setHours(t.getHours() + Math.floor(OffSet));
      t.setMinutes(t.getMinutes() + (Offset - Math.floor(OffSet)) * 60);
      _root.DebugText.text = _root.DebugText.text + ("<" + Offset + ">");
      HiLite.Time0.text = NeatTime(t,false);
      HiLite.Date0.text = NeatDate(t,"d");
      HiLite.HourDiff.text = Offset;
      if(Offset > 0)
      {
         HiLite.HourDiff.text = "+" + HiLite.HourDiff.text;
      }
   }
   function NeatTime(TheTime, IsSec, MakeLocal)
   {
      tellTarget(".."._target);
      if(MakeLocal)
      {
         TheHours = TheTime.getHours();
         TheMins = TheTime.getMinutes();
         TheSecs = TheTime.getSeconds();
      }
      else
      {
         TheHours = TheTime.getUTCHours();
         TheMins = TheTime.getUTCMinutes();
         TheSecs = TheTime.getUTCSeconds();
      }
      s = TwoDigits(TheHours) + ":" + TwoDigits(TheMins);
      if(IsSec)
      {
         s = s + (":" + TwoDigits(TheSecs));
      }
      return s;
   }
   function NeatDate(TheTime, DateStyle, MakeLocal)
   {
      tellTarget(".."._target);
      if(MakeLocal)
      {
         TheDay = TheTime.getDay();
         TheMonth = TheTime.getMonth();
         TheDate = TheTime.getDate();
      }
      else
      {
         TheDay = TheTime.getUTCDay();
         TheMonth = TheTime.getUTCMonth();
         TheDate = TheTime.getUTCDate();
      }
      DaysOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      DayName = DaysOfWeek[TheDay];
      s = DayName;
      if(DateStyle == "f")
      {
         Months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
         MonthName = Months[TheMonth];
         s = s + ", " + TheDate + " " + MonthName;
      }
      return s;
   }
   function TwoDigits(num)
   {
      tellTarget(".."._target);
      if(num < 10)
      {
         return "0" + num;
      }
      return num;
   }
}
stop();

*/

/*
if(!hasOwnProperty("_load"))
{
   _load = true;
   tellTarget("..")
   {
   }
   function InitTZ()
   {
      tellTarget(".."._target);
      TZ = [["Afghanistan",4,30,0],["Argentina",-3,0,0],["Australia - Adelaide",9,30,4],["Australia - Brisbane",10,0,0],["Australia - Darwin",9,30,0],["Australia - Melbourne",10,0,4],["Australia - Perth",8,0,0],["Australia - Tasmania",10,0,5],["Bolivia",-4,0,0],["Brazil - Andes",-5,0,1],["Brazil - East",-3,0,1],["Brazil - West",-4,0,1],["Burma (Myanmar)",6,30,0],["Canada - Calgary",-7,0,2],["Canada - Newfoundland",-3,30,2],["Canada - Nova Scotia",-4,0,2],["Canada - Quebec",-5,0,2],["Canada - Toronto",-5,0,2],["Canada - Vancouver",-8,0,2],["Canada - Winnipeg",-6,0,2],["China - Mainland",8,0,1],["China - Taiwan",8,0,0],["Colombia",-5,0,0],["Cuba",-5,0,1],["Egypt",2,0,1],["Finland",2,0,3],["France",1,0,3],["Germany",1,0,3],["Ghana",0,0,0],["Greece",2,0,3],["India",5,30,0],["Indonesia - Bali, Borneo",8,0,0],["Indonesia - Irian Jaya",9,0,0],["Indonesia - Sumatra, Java",7,0,0],["Iran",3,30,1],["Iraq",3,0,0],["Israel",2,0,1],["Jamaica",-5,0,1],["Kenya",3,0,0],["Korea (North & South)",9,0,0],["Malaysia",8,0,0],["Mexico City",-6,0,1],["Morocco",0,0,0],["Nepal",5,45,0],["New Zealand",12,0,6],["Pakistan",5,0,0],["Peru",-5,0,0],["Philippines",8,0,0],["Poland",1,0,3],["Russia - Kamchatka",11,0,7],["Russia - Moscow",3,0,7],["Russia - Vladivostok",9,0,7],["Singapore",8,0,0],["South Africa",2,0,0],["Spain",1,0,3],["Sweden",1,0,3],["Thailand",7,0,0],["Tonga",12,0,0],["Turkey",2,0,3],["Ukraine",3,0,1],["Uzbekistan",5,0,0],["Vietnam",7,0,0],["USA - Alaska",-9,0,2],["USA - Atlanta",-5,0,2],["USA - Boulder",-7,0,2],["USA - Chicago",-6,0,2],["USA - East Indiana",-5,0,0],["USA - Hawaii",-10,0,0],["USA - Seattle",-8,0,2]];
   }
   function CheckDST()
   {
      tellTarget(".."._target);
      let uNow = new Date();
      let uMonth = uNow.getMonth();
      let uDate = uNow.getDate();
      let uDay = uNow.getDay();
      let FirstSun8Feb = !(uMonth != 1?false:uDate > 14?true:uMonth > 1)?false:true;
      if(!(uMonth != 1?true:uDate < 8))
      {
         let DaysLeft = 14 - uDate;
         FirstSun8Feb = 6 < uDay + DaysLeft?false:true;
      }
      let FirstSun15Mar = !(uMonth != 2?false:uDate > 21?true:uMonth > 2)?false:true;
      if(!(uMonth != 2?true:uDate < 15))
      {
         DaysLeft = 21 - uDate;
         FirstSun15Mar = 6 < uDay + DaysLeft?false:true;
      }
      let LastSunMar = uMonth <= 2?false:true;
      if(!(uMonth != 2?true:uDate < 25))
      {
         DaysLeft = 31 - uDate;
         LastSunMar = 6 < uDay + DaysLeft?false:true;
      }
      let FirstSunApr = !(uMonth != 3?false:uDate > 7?true:uMonth > 3)?false:true;
      if(!(uMonth != 3?true:7 < uDate))
      {
         let DaysGone = 7 - uDate;
         FirstSunApr = uDay - DaysGone <= 0?false:true;
      }
      let LastSunSep = uMonth <= 8?false:true;
      if(!(uMonth != 8?true:uDate < 24))
      {
         DaysLeft = 30 - uDate;
         LastSunSep = 6 < Day + DaysLeft?false:true;
      }
      let FirstSunOct = !(uMonth != 9?false:uDate > 7?true:uMonth > 9)?false:true;
      if(!(uMonth != 9?true:7 < uDate))
      {
         DaysGone = 7 - uDate;
         FirstSunOct = uDay - DaysGone <= 0?false:true;
      }
      let FirstSun15Oct = !(!(uMonth != 9?true:uDate <= 21)?true:uMonth > 9)?false:true;
      if(!(uMonth != 9?true:!(uDate >= 15?true:21 >= uDate)))
      {
         DaysLeft = 21 - uDate;
         FirstSun15Oct = 6 < uDay + DaysLeft?false:true;
      }
      let LastSunOct = uMonth <= 9?false:true;
      if(!(uMonth != 9?true:uDate < 25))
      {
         DaysLeft = 31 - uDate;
         LastSunOct = 6 < uDay + DaysLeft?false:true;
      }
      dstZones[0] = "X";
      dstZones[1] = "?";
      dstZones[2] = !(!FirstSunApr?false:!LastSunOct)?"N":"Y";
      dstZones[3] = !(!LastSunMar?false:!LastSunOct)?"N":"Y";
      dstZones[4] = !(!!LastSunOct?true:!LastSunMar)?"N":"Y";
      dstZones[5] = !(!!FirstSunOct?true:!LastSunMar)?"N":"Y";
      dstZones[6] = !(!!FirstSunOct?true:!FirstSun15Mar)?"N":"Y";
      dstZones[7] = !(!LastSunMar?false:!LastSunSep)?"N":"Y";
   }
}
stop();
*/

class Sun {
  constructor(name, sz, clr) {
    this.name = name;
    this.sz = sz;
    this.clr = clr;
    this.showQ = true;

    this.rad = 20

    this.div = document.createElement("div");

    this.div.style.pointerEvents = "auto"
    this.div.style.position = 'absolute'

    this.can = document.createElement('canvas');
    this.g = this.can.getContext("2d");

    let ratio = 2;

    this.can.width = this.rad * 2 * ratio
    this.can.height = this.rad * 2 * ratio
    this.can.style.width = this.rad * 2 + "px";
    this.can.style.height = this.rad * 2 + "px";

    // position canvas so Sun's center is at (0,0) of div
    this.can.style.position = 'absolute'
    this.can.style.left = -this.rad + 'px'
    this.can.style.top = -this.rad + 'px'

    this.g.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.div.appendChild(this.can);
    document.getElementById('main').appendChild(this.div);

    // NB PROBLEMS!!  When dragging fast we leave this local canvas and object gets dropped
    // does not happen when in developer console (F12)
    // does not happen when using app.html
    // why then?

    let me = this;
    me.drag = { onQ: false, x: 0, y: 0 };
    let div = this.div;
    div.addEventListener('touchstart', function (ev) {
      if (!me.showQ) return;
      console.log('touchstart');

      me.drag.onQ = true;
      me.drag.x = ev.clientX;
      me.drag.y = ev.clientY;

      me.div.style.transition = "";

      me.goneOutQ = true;

      let touch = ev.targetTouches[0];
      ev.clientX = touch.clientX;
      ev.clientY = touch.clientY;
      ev.touchQ = true;
      ev.preventDefault();

    });

    div.addEventListener('touchend', function () {
      me.dropMe(me);
    });

    div.addEventListener('mouseover', function () {
      document.body.style.cursor = "pointer";
    });
    div.addEventListener('mousedown', function (ev) {
      me.drag.onQ = true;
      me.drag.x = ev.clientX;
      me.drag.y = ev.clientY;
      me.drag.div = me.div

      me.div.style.transition = "";
      ev.stopPropagation()
      my.drag = me.drag

    });
    div.addEventListener('mouseleave', function (ev) {
      document.body.style.cursor = "auto";
      me.moveMe(me, ev);
    });

    div.addEventListener('mouseup', function () {
      me.dropMe(me);
    });

  }
  show(onQ) {
    if (onQ) {
      this.div.style.visibility = 'visible';
    } else {
      this.div.style.visibility = 'hidden';

    }
  }
  dropMe(me) {
    me.drag.onQ = false;

    let lt = parseFloat(me.div.style.left);
    me.div.style.left = lt + 'px';

    let tp = parseFloat(me.div.style.top);
    tp = Math.max(h * 0.2, Math.min(tp, h * 0.8)) // NB: limit Sun within certain range
    me.div.style.top = tp + 'px';

    solChg(lt, tp)

  }
  moveMe(me, ev) {
    ev.preventDefault();

    if (me.drag.onQ) {
      let lt = parseFloat(me.div.style.left) + ev.clientX - me.drag.x;
      //lt -= me.rad
      me.div.style.left = lt + 'px';
      me.drag.x = ev.clientX;

      let tp = parseFloat(me.div.style.top) + ev.clientY - me.drag.y;
      //tp -= me.rad
      me.div.style.top = tp + 'px';
      me.drag.y = ev.clientY;
    }

  }

  setxy(lt, tp) {
    //console.log('setxy', lt, tp);     
    this.div.style.left = lt + 'px';
    this.div.style.top = tp + 'px';
  }

  draw() {

    let g = this.g;
    let rad = this.rad

    g.beginPath();

    var gradient = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
    gradient.addColorStop(0, 'hsla(60,100%,93%,1)');
    gradient.addColorStop(0.4, 'hsla(60,100%,82%,1)');
    gradient.addColorStop(0.7, 'hsla(60,100%,50%,1)');
    gradient.addColorStop(1, 'hsla(60,100%,90%,0.1)');
    g.fillStyle = gradient;

    g.arc(rad, rad, rad - 1, 0, 2 * Math.PI)
    g.fill();

  }

}

function key(ev) {

  let keyCode = ev.keyCode;

  switch (keyCode) {
  case 37: // arrow lt
  case 65: // a
  case 100: // num lt (4)
  case 52: // num lt (4)
    my.xChg--
    break;

  case 39: // arrow rt
  case 68: // d
  case 102: // num rt (6)
  case 54: // num rt (6)
    my.xChg++
    break;

  case 38: // arrow up
  case 87: // w
  case 104: // num up (8)
  case 56: // num up (8)
    my.yChg--
    break;

  case 40: // arrow dn
  case 83: // s
  case 98: // num dn (2)
  case 50: // num dn (2)
    my.yChg++
    break;

  case 74: // j
    my.tzTime--
    break;
  case 75: // k
    my.tzTime++
    break;
  case 76: // l
    my.tzTime += 0.5
    break;

  case 70: // f
    my.sclChg--
    break;

  case 71: // g
    my.sclChg++
    break;

  default:
    console.log("key", keyCode);
  }
  //console.log('my', my)
  tzLoop()
}

function toggleSol() {
  my.solQ = !my.solQ;
  //console.log('toggleSol', my.solQ)
  if (my.solQ) {
    document.getElementById('canvas1').style.visibility = 'visible';
  } else {
    document.getElementById('canvas1').style.visibility = 'hidden';
  }
  my.sol.show(my.solQ)
  //update();
  toggleBtn('solBtn', my.solQ)
}

function toggleTz() {
  my.tzQ = !my.tzQ;
  if (my.tzQ) {
    document.getElementById('canvas3').style.visibility = 'visible';
  } else {
    document.getElementById('canvas3').style.visibility = 'hidden';
  }
  //update();
  toggleBtn('tzBtn', my.tzQ)
}

function toggleBtn(btn, onq) {
  if (onq) {
    document.getElementById(btn).classList.add("hi")
    document.getElementById(btn).classList.remove("lo")
  } else {
    document.getElementById(btn).classList.add("lo")
    document.getElementById(btn).classList.remove("hi")
  }

}