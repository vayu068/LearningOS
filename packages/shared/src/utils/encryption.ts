/**
 * Data encryption utilities for PII (DPDP compliance).
 * Uses AWS KMS patterns for encrypt/decrypt operations.
 * In production, these would integrate with AWS KMS.
 * For local/test use, a simulated symmetric encryption is provided.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption result with all components needed for decryption.
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  authTag: string;
  /** KMS key ID used for encryption (for key rotation tracking) */
  keyId: string;
  /** Encryption algorithm used */
  algorithm: string;
}

/**
 * Configuration for the encryption service.
 */
export interface EncryptionConfig {
  /** KMS Key ARN or alias */
  kmsKeyId: string;
  /** Region for KMS operations */
  region: string;
  /** Local encryption key for development/testing (32 bytes hex) */
  localKey?: string;
}

/**
 * Derives a 256-bit key from a string (for local/test encryption).
 */
function deriveKey(keyMaterial: string): Buffer {
  return createHash("sha256").update(keyMaterial).digest();
}

/**
 * Encrypts sensitive data (PII) using AES-256-GCM.
 * In production, the key would come from AWS KMS.
 *
 * @param plaintext - The data to encrypt
 * @param keyMaterial - The encryption key or key material
 * @param keyId - Identifier for the key (for rotation tracking)
 * @returns EncryptedData object with all components
 */
export function encryptPII(
  plaintext: string,
  keyMaterial: string,
  keyId: string = "local-dev-key"
): EncryptedData {
  const key = deriveKey(keyMaterial);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyId,
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypts data that was encrypted with encryptPII.
 *
 * @param encryptedData - The encrypted data object
 * @param keyMaterial - The encryption key or key material
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data)
 */
export function decryptPII(encryptedData: EncryptedData, keyMaterial: string): string {
  const key = deriveKey(keyMaterial);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hashes a value for indexing without exposing the original (e.g., for email lookups).
 * Uses SHA-256 with a tenant-scoped salt.
 *
 * @param value - Value to hash
 * @param salt - Tenant-specific salt
 * @returns Hex-encoded hash
 */
export function hashForIndex(value: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex");
}

/**
 * Masks PII for display purposes (e.g., showing partial email).
 *
 * @param value - The original value
 * @param type - Type of PII to determine masking strategy
 * @returns Masked string
 */
export function maskPII(value: string, type: "email" | "phone" | "aadhaar" | "name"): string {
  switch (type) {
    case "email": {
      const [local, domain] = value.split("@");
      if (!local || !domain) return "***@***.***";
      const masked = local.length > 2
        ? `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}`
        : `${local[0]}*`;
      return `${masked}@${domain}`;
    }
    case "phone": {
      if (value.length < 4) return "****";
      return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
    }
    case "aadhaar": {
      if (value.length < 4) return "****";
      return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
    }
    case "name": {
      if (value.length <= 1) return "*";
      return `${value[0]}${"*".repeat(value.length - 1)}`;
    }
    default:
      return "***";
  }
}
