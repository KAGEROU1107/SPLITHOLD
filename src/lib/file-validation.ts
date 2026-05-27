type ValidationResult = { valid: boolean; detectedType: string; extension: string }

const SIGNATURES: Array<{
  type: string
  ext: string
  bytes: number[]
  offset?: number
}> = [
  { type: 'image/jpeg',       ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png',        ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'application/pdf',  ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  // WebP: first 4 bytes = RIFF, bytes 8-11 = WEBP
  { type: 'image/webp',       ext: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
]

export function validateFileMagicBytes(buffer: ArrayBuffer): ValidationResult {
  const view = new Uint8Array(buffer)

  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0
    const match = sig.bytes.every((byte, i) => view[offset + i] === byte)
    if (match) {
      return { valid: true, detectedType: sig.type, extension: sig.ext }
    }
  }

  return { valid: false, detectedType: 'unknown', extension: '' }
}
