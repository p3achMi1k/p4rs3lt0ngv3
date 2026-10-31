// @ts-nocheck
// Letter shifts follow the Fibonacci sequence modulo 26: 1, 1, 2, 3, 5, …
import BaseTransformer from "../BaseTransformer.js";

function apply(text, sign) {
    let a = 1;
    let b = 1;
    let out = "";
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        const upper = code >= 65 && code <= 90;
        const lower = code >= 97 && code <= 122;
        if (!upper && !lower) {
            out += ch;
            continue;
        }
        const base = upper ? 65 : 97;
        const shift = a % 26;
        out += String.fromCharCode(base + ((code - base + sign * shift + 26) % 26));
        const next = (a + b) % 26;
        a = b;
        b = next;
    }
    return out;
}

export default new BaseTransformer({
    name: "Fibonacci Cipher",
    priority: 55,
    category: "cipher",
    description:
        "Each letter is shifted by the next Fibonacci number modulo 26, starting 1, 1, 2, 3, 5. Spaces and punctuation stay put and do not advance the sequence.",
    func: function (text) {
        return apply(text, 1);
    },
    reverse: function (text) {
        return apply(text, -1);
    },
});
