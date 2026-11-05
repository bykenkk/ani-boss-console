import { encryptAesCbcBase64 } from "@/lib/crypto";

// 与 ani-governance 的 crypto.DefaultAESKey / AesDecrypt 保持一致。
// 这是协议公开的传输兼容常量，不是认证凭证；传输仍依赖 HTTPS。
const transportKey = "f51d66a73d8a0927";
export async function encryptManagementPassword(password: string): Promise<string> {
  return encryptAesCbcBase64(password, transportKey, transportKey);
}
