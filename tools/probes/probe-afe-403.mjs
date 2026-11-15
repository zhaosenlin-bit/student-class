/* What does the refusal say about itself? */
const url = process.argv[2];
const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  },
});
console.log('status:', res.status);
for (const [k, v] of res.headers) console.log(`  ${k}: ${v}`);
console.log('body:', (await res.text()).slice(0, 300));
