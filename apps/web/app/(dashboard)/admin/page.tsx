"use client";

import { AdminDashboard } from "@learning-os/ui";

const mockUsageStats = [
  { label: "Daily Logins", value: "1,234", change: 12, trend: "up" as const },
  { label: "Courses Active", value: 47, change: 3, trend: "up" as const },
  { label: "Assessments Taken", value: "856", change: -5, trend: "down" as const },
  { label: "AI Sessions", value: "2,109", change: 28, trend: "up" as const },
];

const mockActivities = [
  { id: "1", description: "New teacher registered: Dr. Ramesh Kumar", timestamp: "5 min ago", type: "user" },
  { id: "2", description: "System update deployed v2.1.4", timestamp: "1 hour ago", type: "system" },
  { id: "3", description: "Bulk student import completed (150 users)", timestamp: "3 hours ago", type: "import" },
  { id: "4", description: "Storage usage alert: 78% capacity", timestamp: "5 hours ago", type: "alert" },
];

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <AdminDashboard
        tenantName="Demo School"
        totalUsers={2450}
        activeUsers={187}
        systemHealth={{
          cpu: 45,
          memory: 62,
          storage: 78,
          status: "healthy",
        }}
        usageStats={mockUsageStats}
        recentActivities={mockActivities}
        onManageUsers={() => console.log("Manage users")}
        onManageTenant={() => console.log("Manage tenant")}
        onViewLogs={() => console.log("View logs")}
      />
    </div>
  );
}
