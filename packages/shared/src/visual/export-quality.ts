/** Lossless frame capture avoids JPEG artifacts around lyrics before H.264 encoding. */
export const lyricVideoEncoding = {
  codec: 'h264', pixelFormat: 'yuv420p', imageFormat: 'png', crf: 16, muted: true,
} as const;
