const urls = [
  'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js',
  'https://unpkg.com/three@0.128.0/examples/js/renderers/CSS2DRenderer.js',
  'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js',
  'https://unpkg.com/@mediapipe/control_utils/control_utils.js',
  'https://unpkg.com/@mediapipe/drawing_utils/drawing_utils.js',
  'https://unpkg.com/@mediapipe/hands/hands.js',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.9/?meta',
  'https://cdn.tailwindcss.com',
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
];
await Promise.all(
  urls.map(async (u) => {
    const t = Date.now();
    try {
      const r = await fetch(u, { redirect: 'follow' });
      const len = r.headers.get('content-length');
      const body = await r.arrayBuffer();
      console.log(
        String(r.status).padEnd(4),
        String(body.byteLength).padStart(9),
        `${Date.now() - t}ms`,
        u,
        r.headers.get('content-type')
      );
    } catch (e) {
      console.log('ERR ', ' '.repeat(9), `${Date.now() - t}ms`, u, e.message);
    }
  })
);
