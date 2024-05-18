export async function waitUntilEstablished(getter: any) {
  while (true) {
    const v = getter();
    if (v !== void 0 && v !== false)
      return v;
    await new Promise(r => setTimeout(r));
  }
}
