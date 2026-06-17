"use client";

import { useState } from "react";
import { RegisterForm } from "@learning-os/ui";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleRegister = async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    tenantId?: string;
    consent: boolean;
  }) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error || "Registration failed");
        return;
      }
      window.location.href = "/login?registered=true";
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
            Join the learning platform
          </p>
        </div>
        <RegisterForm
          onSubmit={handleRegister}
          tenants={[
            { id: "demo-school", name: "Demo School" },
            { id: "nit-trichy", name: "NIT Trichy" },
            { id: "iit-delhi", name: "IIT Delhi" },
          ]}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
