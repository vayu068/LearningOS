import React from "react";

export interface SystemHealth {
  cpu: number;
  memory: number;
  storage: number;
  status: "healthy" | "warning" | "critical";
}

export interface UsageStat {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "stable";
}

export interface AdminDashboardProps {
  tenantName: string;
  totalUsers?: number;
  activeUsers?: number;
  systemHealth?: SystemHealth;
  usageStats?: UsageStat[];
  recentActivities?: { id: string; description: string; timestamp: string; type: string }[];
  onManageUsers?: () => void;
  onManageTenant?: () => void;
  onViewLogs?: () => void;
}

export function AdminDashboard({
  tenantName,
  totalUsers = 0,
  activeUsers = 0,
  systemHealth,
  usageStats = [],
  recentActivities = [],
  onManageUsers,
  onManageTenant,
  onViewLogs,
}: AdminDashboardProps) {
  const healthColor = systemHealth?.status === "healthy"
    ? "text-green-600"
    : systemHealth?.status === "warning"
    ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Admin Dashboard</h2>
        <p className="mt-1 text-purple-100 text-sm">Managing: {tenantName}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-purple-100">Total Users</p>
            <p className="text-lg font-bold">{totalUsers}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-purple-100">Active Now</p>
            <p className="text-lg font-bold">{activeUsers}</p>
          </div>
          {systemHealth && (
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-xs text-purple-100">System</p>
              <p className="text-lg font-bold capitalize">{systemHealth.status}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onManageUsers}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-medium text-gray-900">Manage Users</h3>
          <p className="text-sm text-gray-500 mt-1">Add, edit, or remove users</p>
        </button>
        <button
          onClick={onManageTenant}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-medium text-gray-900">Tenant Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Configure institution</p>
        </button>
        <button
          onClick={onViewLogs}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-medium text-gray-900">System Logs</h3>
          <p className="text-sm text-gray-500 mt-1">View activity and errors</p>
        </button>
      </div>

      {/* Usage Stats */}
      {usageStats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {usageStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              {stat.change !== undefined && (
                <p
                  className={`text-xs mt-1 ${
                    stat.trend === "up" ? "text-green-600" : stat.trend === "down" ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {stat.trend === "up" ? "+" : stat.trend === "down" ? "-" : ""}
                  {Math.abs(stat.change)}% vs last week
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* System Health */}
      {systemHealth && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            System Health{" "}
            <span className={`text-sm ${healthColor}`}>({systemHealth.status})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "CPU", value: systemHealth.cpu },
              { label: "Memory", value: systemHealth.memory },
              { label: "Storage", value: systemHealth.storage },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{metric.label}</span>
                  <span className="font-medium">{metric.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      metric.value > 90 ? "bg-red-500" : metric.value > 70 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.timestamp}</p>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  {activity.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
