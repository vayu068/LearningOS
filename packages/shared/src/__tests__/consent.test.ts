/**
 * Tests for consent management utilities.
 */

import { describe, it, expect } from "vitest";
import {
  createConsentArtifact,
  verifyConsent,
  withdrawConsent,
  hasConsentForProcessing,
  getActiveConsents,
  validateConsentRequest,
} from "../utils/consent";
import type { ConsentArtifact, ConsentCollectionRequest } from "../types/dpi";

describe("Consent Management Utilities", () => {
  describe("createConsentArtifact", () => {
    it("should create an active consent artifact for adult user", () => {
      const request: ConsentCollectionRequest = {
        userId: "user-1",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records", "learning_activity"],
        noticeVersion: "1.0",
        isMinor: false,
      };

      const artifact = createConsentArtifact(request, "consent-1");

      expect(artifact.consentId).toBe("consent-1");
      expect(artifact.userId).toBe("user-1");
      expect(artifact.tenantId).toBe("tenant-1");
      expect(artifact.status).toBe("active");
      expect(artifact.purpose).toBe("education_delivery");
      expect(artifact.dataCategories).toEqual(["academic_records", "learning_activity"]);
      expect(artifact.isMinor).toBe(false);
      expect(artifact.guardianConsent).toBeUndefined();
      expect(artifact.collectedAt).toBeDefined();
    });

    it("should create pending consent for minor without guardian", () => {
      const request: ConsentCollectionRequest = {
        userId: "child-1",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: true,
      };

      const artifact = createConsentArtifact(request, "consent-2");

      expect(artifact.status).toBe("pending_verification");
      expect(artifact.isMinor).toBe(true);
    });

    it("should create active consent for minor with guardian", () => {
      const request: ConsentCollectionRequest = {
        userId: "child-1",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: true,
        guardianUserId: "parent-1",
      };

      const artifact = createConsentArtifact(request, "consent-3");

      expect(artifact.status).toBe("active");
      expect(artifact.guardianConsent).toBeDefined();
      expect(artifact.guardianConsent?.guardianUserId).toBe("parent-1");
      expect(artifact.guardianConsent?.relationship).toBe("parent");
    });
  });

  describe("verifyConsent", () => {
    it("should verify active consent as valid", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      const result = verifyConsent(consent);
      expect(result.isValid).toBe(true);
    });

    it("should detect withdrawn consent as invalid", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "withdrawn",
        collectedAt: "2024-01-01T00:00:00Z",
        withdrawnAt: "2024-06-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      const result = verifyConsent(consent);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("withdrawn");
    });

    it("should detect expired consent as invalid", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2023-01-01T00:00:00Z",
        expiresAt: "2023-06-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      const result = verifyConsent(consent);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should detect pending verification as invalid", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "child-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "pending_verification",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: true,
        processingMode: "automatic",
      };

      const result = verifyConsent(consent);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("pending");
    });
  });

  describe("withdrawConsent", () => {
    it("should withdraw active consent", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      const result = withdrawConsent(consent, {
        consentId: "consent-1",
        userId: "user-1",
        requestDataDeletion: true,
      });

      expect(result.status).toBe("withdrawn");
      expect(result.withdrawnAt).toBeDefined();
    });

    it("should throw if consent already withdrawn", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "withdrawn",
        collectedAt: "2024-01-01T00:00:00Z",
        withdrawnAt: "2024-06-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      expect(() =>
        withdrawConsent(consent, {
          consentId: "consent-1",
          userId: "user-1",
          requestDataDeletion: false,
        })
      ).toThrow("already been withdrawn");
    });

    it("should throw if wrong user tries to withdraw", () => {
      const consent: ConsentArtifact = {
        consentId: "consent-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      };

      expect(() =>
        withdrawConsent(consent, {
          consentId: "consent-1",
          userId: "user-2",
          requestDataDeletion: false,
        })
      ).toThrow("Only the consent owner");
    });
  });

  describe("hasConsentForProcessing", () => {
    const activeConsent: ConsentArtifact = {
      consentId: "consent-1",
      userId: "user-1",
      tenantId: "tenant-1",
      purpose: "education_delivery",
      dataCategories: ["academic_records", "learning_activity"],
      status: "active",
      collectedAt: "2024-01-01T00:00:00Z",
      noticeVersion: "1.0",
      isMinor: false,
      processingMode: "automatic",
    };

    it("should return true when consent covers purpose and category", () => {
      const result = hasConsentForProcessing(
        [activeConsent],
        "education_delivery",
        "academic_records"
      );
      expect(result).toBe(true);
    });

    it("should return false for uncovered purpose", () => {
      const result = hasConsentForProcessing(
        [activeConsent],
        "ai_personalization",
        "academic_records"
      );
      expect(result).toBe(false);
    });

    it("should return false for uncovered data category", () => {
      const result = hasConsentForProcessing(
        [activeConsent],
        "education_delivery",
        "health_data"
      );
      expect(result).toBe(false);
    });
  });

  describe("getActiveConsents", () => {
    const consents: ConsentArtifact[] = [
      {
        consentId: "c-1",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      },
      {
        consentId: "c-2",
        userId: "user-1",
        tenantId: "tenant-1",
        purpose: "analytics",
        dataCategories: ["behavioral_data"],
        status: "withdrawn",
        collectedAt: "2024-01-01T00:00:00Z",
        withdrawnAt: "2024-03-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      },
      {
        consentId: "c-3",
        userId: "user-2",
        tenantId: "tenant-1",
        purpose: "education_delivery",
        dataCategories: ["academic_records"],
        status: "active",
        collectedAt: "2024-01-01T00:00:00Z",
        noticeVersion: "1.0",
        isMinor: false,
        processingMode: "automatic",
      },
    ];

    it("should return only active consents for the user and tenant", () => {
      const result = getActiveConsents(consents, "user-1", "tenant-1");
      expect(result).toHaveLength(1);
      expect(result[0].consentId).toBe("c-1");
    });

    it("should return empty for user with no active consents", () => {
      const result = getActiveConsents(consents, "user-1", "tenant-2");
      expect(result).toHaveLength(0);
    });
  });

  describe("validateConsentRequest", () => {
    it("should return no errors for valid request", () => {
      const request: ConsentCollectionRequest = {
        userId: "user-1",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: false,
      };

      const errors = validateConsentRequest(request);
      expect(errors).toHaveLength(0);
    });

    it("should return error for missing userId", () => {
      const request = {
        userId: "",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: false,
      } as ConsentCollectionRequest;

      const errors = validateConsentRequest(request);
      expect(errors).toContain("userId is required");
    });

    it("should return error for empty purposes", () => {
      const request: ConsentCollectionRequest = {
        userId: "user-1",
        tenantId: "tenant-1",
        purposes: [],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: false,
      };

      const errors = validateConsentRequest(request);
      expect(errors).toContain("At least one purpose must be specified");
    });

    it("should require guardian for minors", () => {
      const request: ConsentCollectionRequest = {
        userId: "child-1",
        tenantId: "tenant-1",
        purposes: ["education_delivery"],
        dataCategories: ["academic_records"],
        noticeVersion: "1.0",
        isMinor: true,
      };

      const errors = validateConsentRequest(request);
      expect(errors).toContain("Guardian consent is required for minors");
    });
  });
});
