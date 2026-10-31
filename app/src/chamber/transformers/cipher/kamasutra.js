// @ts-nocheck
// Reciprocal pairing: the first 13 letters of a mixed alphabet swap with the last 13.
import BaseTransformer from "../BaseTransformer.js";

function mixed(key) {
    const seen = new Set();
    let alphabet = "";
    for (const ch of `${key || "KAMASUTRA"}ABCDEFGHIJKLMNOPQRSTUVWXYZ`.toUpperCase()) {
        if (ch >= "A" && ch <= "Z" && !seen.has(ch)) {
            seen.add(ch);
            alphabet += ch;
        }
    }
    return alphabet;
}

function pairs(key) {
    const alphabet = mixed(key);
    const map = {};
    for (let i = 0; i < 13; i++) {
        map[alphabet[i]] = alphabet[i + 13];
        map[alphabet[i + 13]] = alphabet[i];
    }
    return map;
}

function swap(text, key) {
    const map = pairs(key);
    let out = "";
    for (const ch of text) {
        const upper = ch.toUpperCase();
        const next = map[upper];
        if (!next) {
            out += ch;
            continue;
        }
        out += ch === upper ? next : next.toLowerCase();
    }
    return out;
}

export default new BaseTransformer({
    name: "Kamasutra Cipher",
    priority: 55,
    category: "cipher",
    description:
        "The keyword builds a 26-letter alphabet. The first half swaps with the second half, so Encrypt and Decrypt are the same step. With no keyword this is not ROT13 unless the plain alphabet is used.",
    configurableOptions: [
        { id: "key", label: "Keyword", type: "text", default: "KAMASUTRA" },
    ],
    func: function (text, options) {
        return swap(text, options && options.key);
    },
    reverse: function (text, options) {
        return swap(text, options && options.key);
    },
});
