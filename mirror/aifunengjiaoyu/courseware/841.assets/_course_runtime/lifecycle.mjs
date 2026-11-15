// Explicit authored adapter hooks; no access to parent DOM or platform storage.
export async function applyControl(controller, client, command, {signal}) {
  if (command === 'dispose') { controller.dispose(); return; }
  if (signal.aborted) throw Error('REVOKED');
  if (!['pause', 'resume', 'checkpoint'].includes(command)) throw Error('CONTROL');
  await controller[command]();
  if (signal.aborted) throw Error('REVOKED');
  if (command === 'checkpoint') {
    await client.flush();
    if (signal.aborted) throw Error('REVOKED');
  }
}
