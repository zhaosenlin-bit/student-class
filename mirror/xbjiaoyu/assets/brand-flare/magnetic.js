/**
 * A fixed hit area with independently moving visual layers.
 * The anchor stays a normal anchor: this controller never handles its click.
 * CSS variables are inherited by .magnetic-disc/.magnetic-label/.magnetic-orbit.
 * --label-x/y are an EXTRA offset inside the disc; --orbit-x/y are absolute.
 */
export function mountMagneticButton(root) {
  if (!root?.ownerDocument?.defaultView) {
    throw new TypeError('A mounted magnetic button element is required.');
  }

  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const finePointer = win.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['--magnet-x', '--magnet-y', '--label-x', '--label-y', '--orbit-x', '--orbit-y'];
  const previous = names.map(name => [name, root.style.getPropertyValue(name), root.style.getPropertyPriority(name)]);
  const spring = () => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
  const disc = spring();
  const label = spring();
  let active = true;
  let destroyed = false;
  let raf = 0;
  let lastTime = 0;
  let bounds = null;
  let near = false;

  function permitted() {
    return !destroyed && active && doc.visibilityState !== 'hidden'
      && finePointer.matches && !reducedMotion.matches;
  }

  function write() {
    const values = [disc.x, disc.y, label.x, label.y, disc.x * 0.45, disc.y * 0.45];
    values.forEach((value, i) => root.style.setProperty(names[i], `${Math.abs(value) < 0.005 ? 0 : value.toFixed(3)}px`));
  }

  function stop() {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
  }

  function reset() {
    stop();
    near = false;
    for (const state of [disc, label]) {
      state.x = state.y = state.vx = state.vy = state.tx = state.ty = 0;
    }
    if (!destroyed) write();
  }

  // Exact underdamped spring integration: stable at 30, 60, and 144 Hz.
  function stepAxis(position, velocity, target, dt, frequency, damping) {
    const error = position - target;
    const attenuation = damping * frequency;
    const oscillation = frequency * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-attenuation * dt);
    const cos = Math.cos(oscillation * dt);
    const sin = Math.sin(oscillation * dt);
    return [
      target + decay * (error * cos + (velocity + attenuation * error) / oscillation * sin),
      decay * (velocity * cos - (attenuation * velocity + frequency * frequency * error) / oscillation * sin),
    ];
  }

  function integrate(state, dt, limit, frequency, damping) {
    [state.x, state.vx] = stepAxis(state.x, state.vx, state.tx, dt, frequency, damping);
    [state.y, state.vy] = stepAxis(state.y, state.vy, state.ty, dt, frequency, damping);
    const length = Math.hypot(state.x, state.y);
    if (length > limit) {
      state.x *= limit / length;
      state.y *= limit / length;
      const outwardVelocity = (state.vx * state.x + state.vy * state.y) / (limit * limit);
      if (outwardVelocity > 0) {
        state.vx -= outwardVelocity * state.x;
        state.vy -= outwardVelocity * state.y;
      }
    }
    const settled = Math.hypot(state.x - state.tx, state.y - state.ty) < 0.035
      && Math.hypot(state.vx, state.vy) < 0.15;
    if (settled) {
      state.x = state.tx;
      state.y = state.ty;
      state.vx = state.vy = 0;
    }
    return settled;
  }

  function animate(now) {
    raf = 0;
    if (!permitted()) return reset();
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    const discSettled = integrate(disc, dt, 40, near ? 20 : 17, near ? 0.84 : 0.58);
    const labelSettled = integrate(label, dt, 14, near ? 22 : 18, near ? 0.88 : 0.62);
    write();
    if (!discSettled || !labelSettled) raf = win.requestAnimationFrame(animate);
    else lastTime = 0;
  }

  function wake() {
    if (!raf && permitted()) raf = win.requestAnimationFrame(animate);
  }

  function release() {
    if (destroyed) return;
    near = false;
    disc.tx = disc.ty = label.tx = label.ty = 0;
    if (!permitted()) reset();
    else if (disc.x || disc.y || label.x || label.y || disc.vx || disc.vy || label.vx || label.vy) wake();
  }

  function invalidate() {
    bounds = null;
    release();
  }

  function move(event) {
    if (event.pointerType !== 'mouse') return reset();
    if (!permitted()) return;
    if (!bounds) bounds = root.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return reset();

    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    // Start outside the fixed hit area, fade in without snapping at its edge.
    const radiusX = Math.max(bounds.width / 2, 1);
    const radiusY = Math.max(bounds.height / 2, 1);
    const ellipse = Math.hypot(dx / (radiusX + 80), dy / (radiusY + 80));
    if (ellipse >= 1) return release();
    const fade = Math.max(0, Math.min(1, (1 - ellipse) / 0.32));
    const strength = fade * fade * (3 - 2 * fade);
    const distance = Math.hypot(dx, dy);
    const discScale = distance ? Math.min(0.3 * strength, 40 / distance) : 0;
    const labelScale = distance ? Math.min(0.105 * strength, 14 / distance) : 0;
    disc.tx = dx * discScale;
    disc.ty = dy * discScale;
    label.tx = dx * labelScale;
    label.ty = dy * labelScale;
    near = true;
    wake();
  }

  function pointerDown(event) {
    // A tablet that last used a mouse should not retain its offset on touch.
    if (event.pointerType !== 'mouse') reset();
  }

  function pointerOut(event) {
    if (!event.relatedTarget) release();
  }

  function visibility() {
    if (doc.visibilityState === 'hidden') reset();
    bounds = null;
  }

  function preference() {
    bounds = null;
    reset();
  }

  const subscriptions = [];
  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    subscriptions.push(() => target.removeEventListener(type, listener, options));
  }
  function listenMedia(query) {
    if (query.addEventListener) listen(query, 'change', preference);
    else {
      query.addListener(preference);
      subscriptions.push(() => query.removeListener(preference));
    }
  }

  listen(win, 'pointermove', move, { passive: true });
  listen(win, 'pointerdown', pointerDown, { passive: true });
  listen(win, 'pointerout', pointerOut, { passive: true });
  listen(win, 'pointercancel', release, { passive: true });
  listen(win, 'blur', reset);
  listen(win, 'resize', invalidate, { passive: true });
  listen(win, 'scroll', invalidate, { passive: true, capture: true });
  listen(doc, 'visibilitychange', visibility);
  listenMedia(finePointer);
  listenMedia(reducedMotion);
  const observer = win.ResizeObserver ? new win.ResizeObserver(invalidate) : null;
  observer?.observe(root);
  write();

  return {
    setActive(value) {
      if (destroyed) return;
      active = Boolean(value);
      bounds = null;
      reset();
    },
    reset,
    destroy() {
      if (destroyed) return;
      reset();
      destroyed = true;
      observer?.disconnect();
      subscriptions.forEach(unsubscribe => unsubscribe());
      for (const [name, value, priority] of previous) {
        if (value) root.style.setProperty(name, value, priority);
        else root.style.removeProperty(name);
      }
    },
  };
}
