const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const SIGNATURES: Array<{ mime: string; ext: string; bytes: number[] }> = [
  { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function validateAvatarBuffer(buffer: Buffer): { mime: string; ext: string } {
  if (!buffer || buffer.length === 0) {
    throw new Error('El archivo de imagen está vacío');
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new Error('La imagen no puede superar 2 MB');
  }

  for (const sig of SIGNATURES) {
    const match = sig.bytes.every((b, i) => buffer[i] === b);
    if (match) {
      if (sig.mime === 'image/webp') {
        const webpMark = buffer.slice(8, 12).toString('ascii');
        if (webpMark !== 'WEBP') {
          continue;
        }
      }
      return { mime: sig.mime, ext: sig.ext };
    }
  }

  throw new Error('Formato no permitido. Use JPEG, PNG o WebP');
}
