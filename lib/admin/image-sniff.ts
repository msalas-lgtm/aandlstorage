// Checks the first bytes of an uploaded file to see what it really is, instead of trusting the type the browser claims.
// Returns the file extension for PNG, JPEG, GIF and WebP, or null for anything else.
export function sniffImageExtension(bytes: Uint8Array): ".png" | ".jpg" | ".gif" | ".webp" | null {
  const at = (i: number) => bytes[i];
  const ascii = (start: number, text: string) => [...text].every((ch, i) => at(start + i) === ch.charCodeAt(0));
  if (bytes.length >= 8 && at(0) === 0x89 && ascii(1, "PNG") && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return ".png";
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return ".jpg";
  if (bytes.length >= 6 && (ascii(0, "GIF87a") || ascii(0, "GIF89a"))) return ".gif";
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return ".webp";
  return null;
}
