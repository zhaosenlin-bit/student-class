#!/usr/bin/env node
/*
 * 做一份三维模型（.glb）放在本地，供那些等着加载模型的课件用。
 *
 * 《毛公鼎》的课件里留了一串备用的模型名字（写法还各不相同），
 * 浏览器会挨个去试；本地一份都没有，于是画面上空空的。这里照着
 * 一个青铜圆鼎的样子自己做一份，把那串名字都补上。
 *
 *   node tools/make-glb-model.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const NAMES = [
  'duke_mao.glb',
  'Duke_Mao.glb',
  'DukeMao.glb',
  'maogongding.glb',
  'MaoGongDing.glb',
  'mao_gong_ding.glb',
  'model.glb',
  'scene.glb',
  'ding.glb',
  '毛公鼎.glb',
  '%E6%AF%9B%E5%85%AC%E9%BC%8E.glb',
];

const TARGETS = [
  'mirror/leqixiang/courseware/afe-196.assets',
  'mirror/aifunengjiaoyu/courseware/196.assets',
];

/* ---- geometry ------------------------------------------------------- */

const pos = [];
const nrm = [];
const idx = [];

function pushTri(a, b, c, na, nb, nc) {
  idx.push(a, b, c);
  void na;
  void nb;
  void nc;
}

/* A cylinder standing on the y axis: bottom at y0, top at y1. */
function cylinder(cx, cy, cz, r, h, seg, cap = true, rTop = null) {
  const rt = rTop === null ? r : rTop;
  const base = pos.length / 3;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    pos.push(cx + ca * r, cy, cz + sa * r);
    nrm.push(ca, 0, sa);
    pos.push(cx + ca * rt, cy + h, cz + sa * rt);
    nrm.push(ca, 0, sa);
  }
  for (let i = 0; i < seg; i++) {
    const a = base + i * 2;
    pushTri(a, a + 2, a + 1);
    pushTri(a + 1, a + 2, a + 3);
  }
  if (cap) {
    for (const [y, rr, ny] of [
      [cy, r, -1],
      [cy + h, rt, 1],
    ]) {
      const c = pos.length / 3;
      pos.push(cx, y, cz);
      nrm.push(0, ny, 0);
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr);
        nrm.push(0, ny, 0);
      }
      for (let i = 0; i < seg; i++) {
        if (ny > 0) pushTri(c, c + 1 + i, c + 2 + i);
        else pushTri(c, c + 2 + i, c + 1 + i);
      }
    }
  }
}

/* A box with its middle at (cx, cy, cz). */
function box(cx, cy, cz, sx, sy, sz) {
  const b = pos.length / 3;
  const x = sx / 2;
  const y = sy / 2;
  const z = sz / 2;
  const faces = [
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
    [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
    [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]],
    [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0]],
    [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0]],
  ];
  for (const f of faces) {
    const n = f[4];
    const c = pos.length / 3;
    for (let i = 0; i < 4; i++) {
      pos.push(cx + f[i][0], cy + f[i][1], cz + f[i][2]);
      nrm.push(n[0], n[1], n[2]);
    }
    pushTri(c, c + 1, c + 2);
    pushTri(c, c + 2, c + 3);
  }
  void b;
}

/* The vessel: a deep belly, a flared rim, two ears and three feet. */
cylinder(0, 0, 0, 0.62, 0.16, 40, false, 0.7); /* foot ring */
cylinder(0, 0.16, 0, 0.7, 0.86, 40, false, 0.74); /* belly */
cylinder(0, 1.02, 0, 0.74, 0.1, 40, true, 0.78); /* rim */
cylinder(0, 1.12, 0, 0.78, 0.06, 40, true, 0.76); /* lip */
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + 0.4;
  cylinder(Math.cos(a) * 0.46, -0.34, Math.sin(a) * 0.46, 0.09, 0.36, 14);
}
for (const s of [-1, 1]) {
  box(s * 0.8, 0.82, 0, 0.1, 0.34, 0.13);
  box(s * 0.72, 0.98, 0, 0.24, 0.09, 0.1);
}

const positions = new Float32Array(pos);
const normals = new Float32Array(nrm);
const indices = new Uint16Array(idx);

const bin = Buffer.alloc(positions.byteLength + normals.byteLength + indices.byteLength);
Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength).copy(
  bin,
  0
);
Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength).copy(
  bin,
  positions.byteLength
);
Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength).copy(
  bin,
  positions.byteLength + normals.byteLength
);

const lo = [Infinity, Infinity, Infinity];
const hi = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k], positions[i + k]);
    hi[k] = Math.max(hi[k], positions[i + k]);
  }
}

const gltf = {
  asset: { version: '2.0', generator: '乐启享课件库 · 自制模型' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: '毛公鼎' }],
  meshes: [
    {
      name: '毛公鼎',
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
        },
      ],
    },
  ],
  materials: [
    {
      name: '青铜',
      pbrMetallicRoughness: {
        baseColorFactor: [0.44, 0.35, 0.17, 1],
        metallicFactor: 0.85,
        roughnessFactor: 0.42,
      },
    },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    {
      buffer: 0,
      byteOffset: positions.byteLength,
      byteLength: normals.byteLength,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: positions.byteLength + normals.byteLength,
      byteLength: indices.byteLength,
      target: 34963,
    },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      min: lo,
      max: hi,
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: normals.length / 3,
      type: 'VEC3',
    },
    {
      bufferView: 2,
      componentType: 5123,
      count: indices.length,
      type: 'SCALAR',
    },
  ],
};

let json = Buffer.from(JSON.stringify(gltf), 'utf8');
while (json.length % 4) json = Buffer.concat([json, Buffer.from(' ')]);
const binPad = bin.length % 4 ? 4 - (bin.length % 4) : 0;
const binFull = binPad ? Buffer.concat([bin, Buffer.alloc(binPad)]) : bin;

const total = 12 + 8 + json.length + 8 + binFull.length;
const out = Buffer.alloc(total);
out.write('glTF', 0, 'latin1');
out.writeUInt32LE(2, 4);
out.writeUInt32LE(total, 8);
out.writeUInt32LE(json.length, 12);
out.writeUInt32LE(0x4e4f534a, 16);
json.copy(out, 20);
let p = 20 + json.length;
out.writeUInt32LE(binFull.length, p);
out.writeUInt32LE(0x004e4942, p + 4);
binFull.copy(out, p + 8);

for (const dir of TARGETS) {
  if (!fs.existsSync(dir)) continue;
  for (const name of NAMES) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out);
    console.log(`  写了 ${file}  ${out.length} 字节`);
  }
}

console.log(`\n模型共 ${out.length} 字节，三角面 ${indices.length / 3}`);
