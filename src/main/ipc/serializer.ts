/**
 * Recursively converts Prisma objects (Decimal, Date, BigInt) and non-cloneable objects
 * into plain JSON-serializable primitives so they can safely pass through Electron's
 * IPC Structured Clone algorithm without throwing "Error: An object could not be cloned".
 */
export function serializeForIpc<T>(obj: T, seen = new WeakSet()): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Primitive types
  const type = typeof obj;
  if (type === 'number' || type === 'string' || type === 'boolean') {
    return obj;
  }

  if (type === 'bigint') {
    return Number(obj) as any;
  }

  // Date objects to ISO string
  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  // Decimal.js / Prisma.Decimal objects
  if (type === 'object' && typeof (obj as any).toNumber === 'function') {
    return (obj as any).toNumber();
  }

  // Buffers and ArrayBuffers
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
    return obj;
  }
  if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
    return obj;
  }

  // Object / Array recursion
  if (type === 'object') {
    // Avoid circular reference loop
    if (seen.has(obj as object)) {
      return null as any;
    }
    seen.add(obj as object);

    if (Array.isArray(obj)) {
      return obj.map((item) => serializeForIpc(item, seen)) as any;
    }

    const result: Record<string, any> = {};
    for (const key of Object.keys(obj as object)) {
      result[key] = serializeForIpc((obj as any)[key], seen);
    }
    return result as T;
  }

  return obj;
}
