import crypto from "crypto";
import { ENV } from "./env";

/**
 * Criptografia simétrica (AES-256-GCM) para segredos armazenados no banco (ex: credenciais
 * Z-API por tenant). Reaproveita o JWT_SECRET já existente como material de chave — evita
 * exigir uma nova variável de ambiente em produção.
 *
 * Formato armazenado: "v1:<iv hex>:<authTag hex>:<ciphertext hex>". Valores que não seguem
 * esse formato (segredos legados gravados em texto plano antes desta mudança) são retornados
 * como estão por decryptSecret — não quebra credenciais já configuradas.
 */

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1:";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(ENV.cookieSecret || "kafka-rank-fallback-key").digest();
}

export function encryptSecret(plainText: string): string {
  if (!plainText) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(storedValue: string | null | undefined): string {
  if (!storedValue) return "";
  if (!storedValue.startsWith(PREFIX)) return storedValue; // valor legado em texto plano

  try {
    const [, ivHex, authTagHex, cipherHex] = storedValue.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(cipherHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[SecretCrypto] Falha ao descriptografar segredo, retornando vazio:", err);
    return "";
  }
}
