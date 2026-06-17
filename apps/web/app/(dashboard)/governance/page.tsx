"use client";

import { GovernanceDashboard } from "@learning-os/ui";

const mockTenantMetrics = [
  { tenantId: "1", tenantName: "Delhi Public School", enrollment: 15000, activeUsers: 8500, avgLearningOutcome: 78, complianceScore: 95 },
  { tenantId: "2", tenantName: "NIT Trichy", enrollment: 8000, activeUsers: 6200, avgLearningOutcome: 82, complianceScore: 92 },
  { tenantId: "3", tenantName: "Kendriya Vidyalaya Chain", enrollment: 120000, activeUsers: 85000, avgLearningOutcome: 71, complianceScore: 88 },
  { tenantId: "4", tenantName: "State Board Tamil Nadu", enrollment: 250000, activeUsers: 145000, avgLearningOutcome: 68, complianceScore: 76 },
];

const mockPolicies = [
  { policy: "NEP 2020 Curriculum Alignment", compliantTenants: 45, totalTenants: 50, status: "compliant" as const },
  { policy: "DPDP Data Protection", compliantTenants: 42, totalTenants: 50, status: "warning" as const },
  { policy: "Accessibility Standards (WCAG 2.1)", compliantTenants: 38, totalTenants: 50, status: "warning" as const },
  { policy: "Multi-language Support", compliantTenants: 50, totalTenants: 50, status: "compliant" as const },
];

export default function GovernancePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <GovernanceDashboard
        totalTenants={50}
        totalEnrollment={1250000}
        avgOutcomeScore={74}
        tenantMetrics={mockTenantMetrics}
        policyCompliance={mockPolicies}
        onViewTenantDetail={(id) => console.log("View tenant:", id)}
      />
    </div>
  );
}
