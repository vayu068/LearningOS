import React, { useState } from "react";

export interface RegisterFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    tenantId?: string;
    consent: boolean;
  }) => void;
  tenants?: { id: string; name: string }[];
  detectedTenant?: string;
  roles?: { id: string; label: string; description?: string }[];
  loading?: boolean;
  error?: string;
}

const defaultRoles = [
  { id: "student", label: "Student", description: "Access courses and learning materials" },
  { id: "teacher", label: "Teacher", description: "Create and manage courses" },
  { id: "admin", label: "Administrator", description: "Manage institution settings" },
];

export function RegisterForm({
  onSubmit,
  tenants = [],
  detectedTenant,
  roles = defaultRoles,
  loading = false,
  error,
}: RegisterFormProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [tenantId, setTenantId] = useState(detectedTenant || "");
  const [consent, setConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    onSubmit({ name, email, password, role, tenantId: tenantId || undefined, consent });
  };

  const canProceed = () => {
    if (step === 1) return name && email && password && password === confirmPassword;
    if (step === 2) return role;
    if (step === 3) return consent;
    return false;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-500">Join the learning platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s <= step ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${s < step ? "bg-primary-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Create a password"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Confirm your password"
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Role & tenant */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Your Role
                </label>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <label
                      key={r.id}
                      className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                        role === r.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.id}
                        checked={role === r.id}
                        onChange={(e) => setRole(e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm text-gray-900">{r.label}</span>
                      {r.description && (
                        <span className="block text-xs text-gray-500 mt-0.5">{r.description}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {!detectedTenant && tenants.length > 0 && (
                <div>
                  <label htmlFor="reg-tenant" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <select
                    id="reg-tenant"
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
            </>
          )}

          {/* Step 3: Consent (DPDP compliance) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-2">
                <h3 className="font-medium text-gray-900">Data Protection Consent</h3>
                <p>
                  In accordance with the Digital Personal Data Protection (DPDP) Act, 2023, we
                  collect and process your personal data to provide educational services.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your data will be used for personalized learning experiences</li>
                  <li>Academic records may be synced with APAAR and DigiLocker</li>
                  <li>You can request data deletion at any time</li>
                  <li>Your data will not be shared with third parties without consent</li>
                </ul>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  I agree to the processing of my personal data as described above and consent
                  to the Terms of Service and Privacy Policy.
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !canProceed()}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : step < 3 ? "Continue" : "Create Account"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-primary-600 font-medium hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
