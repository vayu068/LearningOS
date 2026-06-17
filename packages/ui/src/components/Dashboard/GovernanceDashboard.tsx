import React from "react";

export interface TenantMetric {
  tenantId: string;
  tenantName: string;
  enrollment: number;
  activeUsers: number;
  avgLearningOutcome: number;
  complianceScore: number;
}

export interface PolicyCompliance {
  policy: string;
  compliantTenants: number;
  totalTenants: number;
  status: "compliant" | "warning" | "non-compliant";
}

export interface GovernanceDashboardProps {
  totalTenants?: number;
  totalEnrollment?: number;
  avgOutcomeScore?: number;
  tenantMetrics?: TenantMetric[];
  policyCompliance?: PolicyCompliance[];
  enrollmentTrend?: { month: string; count: number }[];
  onViewTenantDetail?: (tenantId: string) => void;
}

export function GovernanceDashboard({
  totalTenants = 0,
  totalEnrollment = 0,
  avgOutcomeScore = 0,
  tenantMetrics = [],
  policyCompliance = [],
  onViewTenantDetail,
}: GovernanceDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Governance Dashboard</h2>
        <p className="mt-1 text-amber-100 text-sm">National education metrics overview</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-amber-100">Total Tenants</p>
            <p className="text-lg font-bold">{totalTenants}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-amber-100">Total Enrollment</p>
            <p className="text-lg font-bold">{totalEnrollment.toLocaleString()}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-amber-100">Avg Outcome Score</p>
            <p className="text-lg font-bold">{avgOutcomeScore}%</p>
          </div>
        </div>
      </div>

      {/* Policy Compliance */}
      {policyCompliance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy Compliance</h3>
          <div className="space-y-3">
            {policyCompliance.map((policy) => (
              <div key={policy.policy} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{policy.policy}</p>
                  <p className="text-xs text-gray-500">
                    {policy.compliantTenants}/{policy.totalTenants} tenants compliant
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    policy.status === "compliant"
                      ? "bg-green-100 text-green-700"
                      : policy.status === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenant Metrics Table */}
      {tenantMetrics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Institution</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Enrollment</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Active</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Outcome</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {tenantMetrics.map((metric) => (
                  <tr
                    key={metric.tenantId}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onViewTenantDetail?.(metric.tenantId)}
                  >
                    <td className="py-2 px-3 font-medium text-gray-900">{metric.tenantName}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{metric.enrollment.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{metric.activeUsers.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{metric.avgLearningOutcome}%</td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                          metric.complianceScore >= 90
                            ? "bg-green-100 text-green-700"
                            : metric.complianceScore >= 70
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {metric.complianceScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
