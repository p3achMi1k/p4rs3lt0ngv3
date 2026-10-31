// @ts-nocheck
import BaseTransformer from "../BaseTransformer.js";

function checksum(text) {
  const bytes = new TextEncoder().encode(text);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export default new BaseTransformer({
  name: "CRC-32",
  priority: 20,
  canDecode: false,
  description: "CRC-32 of the text as 8 lowercase hex digits. A checksum, not a cipher, so it does not reverse.",
  func: function (text) {
    return checksum(text);
  },
});
