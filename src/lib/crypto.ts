import { cbc } from "@noble/ciphers/aes.js";
import { utf8ToBytes } from "@noble/ciphers/utils.js";

// key 和 iv 按 UTF-8 原始字节解释；仅用于兼容已明确要求 AES-CBC 的接口。
export function encryptAesCbcBase64(plaintext: string, key: string, iv: string): string {
  if (typeof TextEncoder !== "function" || typeof btoa !== "function") {
    throw new Error("当前浏览器不支持数据编码，请升级浏览器后重试");
  }

  try {
    const encrypted = cbc(utf8ToBytes(key), utf8ToBytes(iv)).encrypt(utf8ToBytes(plaintext));
    return btoa(Array.from(encrypted, (byte) => String.fromCharCode(byte)).join(""));
  } catch {
    throw new Error("数据加密失败，请重试");
  }
}
