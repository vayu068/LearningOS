import React, { useState } from "react";

export interface LoginFormProps {
  onSubmit: (data: { email: string; password: string; tenantId?: string; mfaCode?: string }) => void;
  tenants?: { id: string; name: string }[];
  detectedTenant?: string;
  showMFA?: boolean;
  ssoProviders?: { id: string; name: string; icon?: string }[];
  onSSOLogin?: (providerId: string) => void;
  loading?: boolean;
  error?: string;
}

export function LoginForm({
  onSubmit,
  tenants = [],
  detectedTenant,
  showMFA = false,
  ssoProviders = [],
  onSSOLogin,
  loading = false,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState(detectedTenant || "");
  const [mfaCode, setMfaCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password, tenantId: tenantId || undefined, mfaCode: mfaCode || undefined });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-500">Sign in to your learning account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SSO Options */}
        {ssoProviders.length > 0 && (
          <div className="space-y-2 mb-6">
            {ssoProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onSSOLogin?.(provider.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                type="button"
              >
                {provider.icon && <span>{provider.icon}</span>}
                Continue with {provider.name}
              </button>
            ))}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant selector (when not auto-detected) */}
          {!detectedTenant && tenants.length > 0 && (
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="">Select organization...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="Enter your password"
              required
            />
          </div>

          {showMFA && (
            <div>
              <label htmlFor="mfa" className="block text-sm font-medium text-gray-700 mb-1">
                MFA Code
              </label>
              <input
                id="mfa"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary-600 font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
