import {i as getReact,t as getClient} from '../_next/static/chunks/framework-D_rUT4EX.js';
// Load the 3D module before rendering starts the audio/MIDI preload queue.
await import('../_next/static/chunks/piano-world-C_Yb7aio.js');
const {default:App}=await import('../_next/static/chunks/page-mB9rJmli.js');
getClient().createRoot(document.getElementById('app')).render(getReact().createElement(App));

window.__musicClassroomWeb=true;
await import('../classroom/classroom.mjs');
