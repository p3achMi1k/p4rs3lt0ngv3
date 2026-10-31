// @ts-nocheck
import BaseTransformer from "../BaseTransformer.js";

function checksum(text) {
  const bytes = new TextEncoder().encode(text);
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return (((b << 16) | a) >>> 0).toString(16).padStart(8, "0");
}

export default new BaseTransformer({
  name: "Adler-32",
  priority: 20,
  canDecode: false,
  description: "Adler-32 checksum as 8 lowercase hex digits. Fast integrity check used by zlib. It does not reverse.",
  func: function (text) {
    return checksum(text);
  },
});
