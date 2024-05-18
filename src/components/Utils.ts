import mermaid from "mermaid";

export async function waitUntilEstablished(getter: any) {
  while (true) {
    const v = getter();
    if (v !== void 0 && v !== false)
      return v;
    await new Promise(r => setTimeout(r));
  }
}

export async function isValidMindMapString(mindmapStr: string) {
  try {
    await mermaid.parse(mindmapStr);
    return true;
  }
  catch (error: any) {
    return error.message;
  }
}
