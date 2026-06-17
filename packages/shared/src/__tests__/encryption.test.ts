/**
 * Tests for encryption utilities.
 */

import { describe, it, expect } from "vitest";
import { encryptPII, decryptPII, hashForIndex, maskPII } from "../utils/encryption";

describe("Encryption Utilities", () => {
  describe("encryptPII / decryptPII", () => {
    it("should encrypt and decrypt data correctly", () => {
      const plaintext = "John Doe, DOB: 1990-05-15";
      const key = "my-secure-key-material-for-tests";

      const encrypted = encryptPII(plaintext, key);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.algorithm).toBe("aes-256-gcm");

      const decrypted = decryptPII(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for same plaintext", () => {
      const plaintext = "Same text";
      const key = "test-key";

      const enc1 = encryptPII(plaintext, key);
      const enc2 = encryptPII(plaintext, key);

      // Different IVs should produce different ciphertexts
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it("should fail decryption with wrong key", () => {
      const plaintext = "Secret data";
      const encrypted = encryptPII(plaintext, "correct-key");

      expect(() => decryptPII(encrypted, "wrong-key")).toThrow();
    });

    it("should fail decryption with tampered ciphertext", () => {
      const plaintext = "Sensitive info";
      const key = "test-key";
      const encrypted = encryptPII(plaintext, key);

      // Tamper with ciphertext
      const tampered = { ...encrypted, ciphertext: "tampered" + encrypted.ciphertext };
      expect(() => decryptPII(tampered, key)).toThrow();
    });

    it("should include key ID in encrypted data", () => {
      const encrypted = encryptPII("test", "key", "kms-key-123");
      expect(encrypted.keyId).toBe("kms-key-123");
    });

    it("should use default key ID when not specified", () => {
      const encrypted = encryptPII("test", "key");
      expect(encrypted.keyId).toBe("local-dev-key");
    });
  });

  describe("hashForIndex", () => {
    it("should produce consistent hash for same input", () => {
      const hash1 = hashForIndex("test@example.com", "tenant-salt");
      const hash2 = hashForIndex("test@example.com", "tenant-salt");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different salts", () => {
      const hash1 = hashForIndex("test@example.com", "salt-1");
      const hash2 = hashForIndex("test@example.com", "salt-2");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different values", () => {
      const hash1 = hashForIndex("user1@example.com", "salt");
      const hash2 = hashForIndex("user2@example.com", "salt");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce a 64-character hex string", () => {
      const hash = hashForIndex("input", "salt");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("maskPII", () => {
    it("should mask email addresses", () => {
      expect(maskPII("john.doe@example.com", "email")).toBe("j******e@example.com");
    });

    it("should mask short email local parts", () => {
      expect(maskPII("ab@test.com", "email")).toBe("a*@test.com");
    });

    it("should handle invalid email format", () => {
      expect(maskPII("not-an-email", "email")).toBe("***@***.***");
    });

    it("should mask phone numbers showing last 4 digits", () => {
      expect(maskPII("+919876543210", "phone")).toBe("*********3210");
    });

    it("should mask aadhaar numbers showing last 4 digits", () => {
      expect(maskPII("123456789012", "aadhaar")).toBe("********9012");
    });

    it("should mask names showing only first character", () => {
      expect(maskPII("John", "name")).toBe("J***");
    });

    it("should handle single character name", () => {
      expect(maskPII("J", "name")).toBe("*");
    });

    it("should handle short phone numbers", () => {
      expect(maskPII("12", "phone")).toBe("****");
    });
  });
});
