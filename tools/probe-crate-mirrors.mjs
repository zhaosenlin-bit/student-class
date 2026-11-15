#!/usr/bin/env node
/* Which crates mirror actually has the version the lockfile pins? */
const v = process.argv[2] || '1.0.154';
const crate = process.argv[3] || 'serde_json';

const mirrors = {
  rsproxy: `https://rsproxy.cn/api/v1/crates/${crate}/${v}/download`,
  ustc: `https://mirrors.ustc.edu.cn/crates.io/api/v1/crates/${crate}/${v}/download`,
  tuna: `https://mirrors.tuna.tsinghua.edu.cn/crates.io/crates/${crate}/${crate}-${v}.crate`,
  nju: `https://mirror.nju.edu.cn/crates.io/crates/${crate}/${crate}-${v}.crate`,
  sjtug: `https://mirrors.sjtug.sjtu.edu.cn/crates.io/crates/${crate}/${crate}-${v}.crate`,
  sjtu2: `https://mirror.sjtu.edu.cn/crates.io/crates/${crate}/${crate}-${v}.crate`,
};

for (const [name, url] of Object.entries(mirrors)) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
    console.log(
      `${name.padEnd(8)} ${r.status} ${r.headers.get('content-length') || '?'} ${url}`
    );
  } catch (e) {
    console.log(`${name.padEnd(8)} ERR ${e.message}`);
  }
}
