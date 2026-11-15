/**
 * Independent glass facets; navigation and brand remain on a stable layer.
 * Tilt/glare interaction studied in vanilla-tilt.js (MIT); artwork/controller
 * independently implemented. See docs/首页玻璃动效-20261008.md.
 */
const home = document.querySelector('#brand-home');
const surface = home?.querySelector('.home-glass');
if (home && surface) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const quality = document.querySelector('#scene-quality');
  const pause = document.querySelector('#scene-paused');
  const dynamics = [[13.4,.73,17],[16.2,.77,18],[11.9,.76,16],[15.1,.71,18]];
  const facets = [...surface.querySelectorAll('.glass-shard')].map((element, index) => ({
    element, light: element.querySelector('radialGradient'),
    frequency: dynamics[index][0], damping: dynamics[index][1], angle: dynamics[index][2],
    x:0, y:0, z:0, vx:0, vy:0, vz:0, tx:0, ty:0, tz:0,
    lx:.34, ly:.22, tlx:.34, tly:.22,
  }));
  let active = !home.hidden, raf = 0, previousTime = 0, lastPaint = 0, geometry = null;
  let low = false, paused = false;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const allowed = () => active && !home.hidden && !document.hidden && !reduced.matches && !paused;
  function write(facet) {
    facet.element.style.setProperty('--shard-rx', `${facet.x.toFixed(3)}deg`);
    facet.element.style.setProperty('--shard-ry', `${facet.y.toFixed(3)}deg`);
    facet.element.style.setProperty('--shard-z', `${facet.z.toFixed(2)}px`);
    facet.light.setAttribute('cx', facet.lx.toFixed(4));
    facet.light.setAttribute('cy', facet.ly.toFixed(4));
  }
  function stop() {
    cancelAnimationFrame(raf); raf = previousTime = lastPaint = 0;
    surface.dataset.moving = 'false';
  }
  function reset() {
    stop(); geometry = null;
    for (const facet of facets) {
      for (const name of ['x','y','z','vx','vy','vz','tx','ty','tz']) facet[name] = 0;
      facet.lx = facet.tlx = .34; facet.ly = facet.tly = .22;
      write(facet);
    }
  }
  // Analytic damped springs keep the return smooth at 30 Hz and during quick
  // pointer changes. Each piece has its own inertia and independent highlight.
  function spring(position, velocity, target, dt, frequency, damping) {
    const error = position - target, attenuation = damping * frequency;
    const wave = frequency * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-attenuation * dt), cosine = Math.cos(wave * dt), sine = Math.sin(wave * dt);
    return [target + decay * (error * cosine + (velocity + attenuation * error) / wave * sine),
      decay * (velocity * cosine - (attenuation * velocity + frequency * frequency * error) / wave * sine)];
  }
  function paint(time) {
    raf = 0;
    if (!allowed()) return stop();
    if (low && lastPaint && time - lastPaint < 32) { raf = requestAnimationFrame(paint); return; }
    const dt = previousTime ? Math.min(.05, (time - previousTime) / 1000) : 1 / 60;
    previousTime = lastPaint = time;
    let moving = false;
    for (const facet of facets) {
      [facet.x,facet.vx] = spring(facet.x,facet.vx,facet.tx,dt,facet.frequency,facet.damping);
      [facet.y,facet.vy] = spring(facet.y,facet.vy,facet.ty,dt,facet.frequency,facet.damping);
      [facet.z,facet.vz] = spring(facet.z,facet.vz,facet.tz,dt,facet.frequency*.8,.82);
      const follow = 1 - Math.exp(-facet.frequency * dt);
      facet.lx += (facet.tlx - facet.lx) * follow;
      facet.ly += (facet.tly - facet.ly) * follow;
      const distance = Math.abs(facet.x-facet.tx) + Math.abs(facet.y-facet.ty) + Math.abs(facet.z-facet.tz);
      const velocity = Math.abs(facet.vx)+Math.abs(facet.vy)+Math.abs(facet.vz);
      const lightDistance = Math.abs(facet.lx-facet.tlx)+Math.abs(facet.ly-facet.tly);
      if (distance > .012 || velocity > .025 || lightDistance > .0007) moving = true;
      else {
        facet.x=facet.tx;facet.y=facet.ty;facet.z=facet.tz;
        facet.vx=facet.vy=facet.vz=0;facet.lx=facet.tlx;facet.ly=facet.tly;
      }
      write(facet);
    }
    if (moving) raf = requestAnimationFrame(paint);
    else stop();
  }
  function wake() {
    if (!raf && allowed()) { surface.dataset.moving = 'true'; raf = requestAnimationFrame(paint); }
  }
  function release() {
    for (const facet of facets) { facet.tx=facet.ty=facet.tz=0;facet.tlx=.34;facet.tly=.22; }
    if (allowed()) wake(); else reset();
  }
  function measure() {
    const rect = surface.getBoundingClientRect();
    // Layout offsets ignore animated transforms, avoiding geometric feedback.
    const plane=surface.querySelector('.home-glass-plane');
    geometry = facets.map(({element}) => ({
      left:rect.left+plane.offsetLeft+element.offsetLeft, top:rect.top+plane.offsetTop+element.offsetTop,
      width:element.offsetWidth, height:element.offsetHeight,
    }));
  }
  function move(event) {
    if (!allowed() || (event.pointerType === 'touch' && event.type === 'pointermove' && !event.buttons)) return;
    if (!geometry) measure();
    const qualityScale = low ? .5 : 1;
    facets.forEach((facet,index) => {
      const box = geometry[index];
      if (!box.width || !box.height) return;
      const x = (event.clientX-box.left)/box.width, y = (event.clientY-box.top)/box.height;
      const dx = (x-.5)*2, dy = (y-.5)*2, distance = Math.hypot(dx,dy);
      // Near-edge motion can use the full 16–18 degree pitch/yaw range. Other
      // facets react to their own centers, with distance softening their motion.
      const proximity = distance <= 1.3 ? 1 : .17 + .83*Math.exp(-(distance-1.3)*1.25);
      const angle = facet.angle * qualityScale * proximity;
      facet.tx = -clamp(dy,-1,1)*angle;
      facet.ty = clamp(dx,-1,1)*angle;
      facet.tz = Math.max(0,1-distance/2.1) * 12 * qualityScale;
      facet.tlx = clamp(x,.04,.96); facet.tly = clamp(y,.03,.97);
    });
    wake();
  }
  function preferences(event) {
    let stored = 'auto';
    try { stored=localStorage.getItem('xb-home-quality')||'auto'; } catch {}
    low=(event?.type==='change'?quality?.value||stored:stored)==='low';
    paused=!!pause?.checked;
    surface.dataset.quality=low?'low':'high';
    reset();
  }
  home.addEventListener('pointermove',move,{passive:true});
  home.addEventListener('pointerdown',move,{passive:true});
  home.addEventListener('pointerleave',release,{passive:true});
  home.addEventListener('pointercancel',release,{passive:true});
  home.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')release();},{passive:true});
  window.addEventListener('brandflare:visibility',event=>{active=!!event.detail?.active;reset();});
  window.addEventListener('brandflare:reset',reset);
  window.addEventListener('blur',reset);
  window.addEventListener('pagehide',stop);
  window.addEventListener('resize',reset,{passive:true});
  document.addEventListener('visibilitychange',reset);
  quality?.addEventListener('change',preferences);
  pause?.addEventListener('change',preferences);
  if(reduced.addEventListener)reduced.addEventListener('change',preferences);else reduced.addListener(preferences);
  new MutationObserver(()=>{active=!home.hidden;reset();}).observe(home,{attributes:true,attributeFilter:['hidden']});
  preferences();
}
