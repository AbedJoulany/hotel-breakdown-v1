export async function hashArrayBuffer(data: ArrayBuffer): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return `length-${data.byteLength}`;
}
