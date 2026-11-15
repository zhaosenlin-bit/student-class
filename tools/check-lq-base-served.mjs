/* Does the local copy hand the document a base it can actually use? */
const PORT = Number(process.env.LQ_PORT || 4173);

for (const id of process.argv.slice(2)) {
  const res = await fetch(`http://127.0.0.1:${PORT}/courseware/${id}?local=1`);
  const text = await res.text();
  const base = (text.match(/<base href="[^"]*">/) || [])[0] || '(no base)';
  console.log(`${res.status}  ${id.padEnd(12)} ${base}`);
}
