"use client";

import { TeacherDashboard } from "@learning-os/ui";

const mockClasses = [
  { id: "1", name: "Class 10-A Mathematics", studentCount: 42, averageProgress: 68, lastActivity: "2 hours ago" },
  { id: "2", name: "Class 9-B Mathematics", studentCount: 38, averageProgress: 72, lastActivity: "Yesterday" },
  { id: "3", name: "Class 11-A Advanced Math", studentCount: 30, averageProgress: 55, lastActivity: "3 hours ago" },
];

const mockStudents = [
  { id: "1", name: "Aarav Sharma", progress: 85, status: "ahead" as const },
  { id: "2", name: "Priya Patel", progress: 72, status: "on-track" as const },
  { id: "3", name: "Rahul Singh", progress: 45, status: "at-risk" as const },
  { id: "4", name: "Sneha Gupta", progress: 90, status: "ahead" as const },
  { id: "5", name: "Arjun Kumar", progress: 38, status: "at-risk" as const },
];

export default function TeacherPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <TeacherDashboard
        teacherName="Dr. Meera Joshi"
        classes={mockClasses}
        recentStudents={mockStudents}
        totalStudents={110}
        averageClassProgress={65}
        pendingAssessments={8}
        onOpenCopilot={() => console.log("Open copilot")}
        onCreateContent={() => console.log("Create content")}
        onViewClass={(id) => console.log("View class:", id)}
      />
    </div>
  );
}
