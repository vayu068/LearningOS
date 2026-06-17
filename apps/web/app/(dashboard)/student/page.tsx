"use client";

import { StudentDashboard } from "@learning-os/ui";
import { useRouter } from "next/navigation";

const mockLearningPaths = [
  { subject: "Mathematics", progress: 72, totalTopics: 20, completedTopics: 14 },
  { subject: "Science", progress: 58, totalTopics: 15, completedTopics: 9 },
  { subject: "English", progress: 85, totalTopics: 12, completedTopics: 10 },
  { subject: "Social Studies", progress: 40, totalTopics: 18, completedTopics: 7 },
];

const mockAssignments = [
  { id: "1", title: "Quadratic Equations Practice", subject: "Mathematics", dueDate: "Tomorrow", status: "pending" as const },
  { id: "2", title: "Photosynthesis Lab Report", subject: "Science", dueDate: "In 3 days", status: "in-progress" as const },
  { id: "3", title: "Essay: Climate Change", subject: "English", dueDate: "Next week", status: "pending" as const },
];

const mockAchievements = [
  { id: "1", title: "Quick Learner", description: "Complete 5 topics in one day", icon: "🚀" },
  { id: "2", title: "Math Wizard", description: "Score 90%+ in math", icon: "🧮" },
  { id: "3", title: "Bookworm", description: "Read 10 resources", icon: "📚" },
  { id: "4", title: "Streak Master", description: "7-day learning streak", icon: "🔥" },
];

export default function StudentPage() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto">
      <StudentDashboard
        studentName="Aarav Sharma"
        learningPaths={mockLearningPaths}
        upcomingAssignments={mockAssignments}
        achievements={mockAchievements}
        overallProgress={65}
        streakDays={12}
        onStartTutor={() => router.push("/tutor")}
        onViewPath={() => router.push("/path")}
      />
    </div>
  );
}
