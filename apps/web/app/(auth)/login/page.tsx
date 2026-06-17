"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@learning-os/ui";

function detectTenantFromSubdomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  // Pattern: {tenant}.learningos.in
  if (parts.length >= 3 && parts[1] === "learningos") {
    return parts[0];
  }
  return undefined;
}

export default function LoginPage() {
  const [detectedTenant, setDetectedTenant] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setDetectedTenant(detectTenantFromSubdomain());
  }, []);

  const handleLogin = async (data: {
    email: string;
    password: string;
    tenantId?: string;
    mfaCode?: string;
  }) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error || "Login failed");
        return;
      }
      // Redirect to dashboard on success
      window.location.href = "/student";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">LearningOS</h1>
          <p className="text-sm text-gray-600 mt-1">
            AI-enabled National Learning Platform
          </p>
        </div>
        <LoginForm
          onSubmit={handleLogin}
          detectedTenant={detectedTenant}
          tenants={[
            { id: "demo-school", name: "Demo School" },
            { id: "nit-trichy", name: "NIT Trichy" },
            { id: "iit-delhi", name: "IIT Delhi" },
          ]}
          ssoProviders={[
            { id: "google", name: "Google", icon: "G" },
            { id: "digilocker", name: "DigiLocker", icon: "DL" },
          ]}
          onSSOLogin={(providerId) => {
            window.location.href = `/api/auth/sso/${providerId}`;
          }}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
