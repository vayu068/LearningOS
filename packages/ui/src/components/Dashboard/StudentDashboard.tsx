import React from "react";

export interface LearningProgress {
  subject: string;
  progress: number;
  totalTopics: number;
  completedTopics: number;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate?: string;
  icon?: string;
}

export interface StudentDashboardProps {
  studentName: string;
  learningPaths?: LearningProgress[];
  upcomingAssignments?: Assignment[];
  achievements?: Achievement[];
  overallProgress?: number;
  streakDays?: number;
  onStartTutor?: () => void;
  onViewPath?: () => void;
}

export function StudentDashboard({
  studentName,
  learningPaths = [],
  upcomingAssignments = [],
  achievements = [],
  overallProgress = 0,
  streakDays = 0,
  onStartTutor,
  onViewPath,
}: StudentDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Welcome back, {studentName}!</h2>
        <p className="mt-1 text-primary-100 text-sm">Continue your learning journey</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-primary-100">Overall Progress</p>
            <p className="text-lg font-bold">{overallProgress}%</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-primary-100">Learning Streak</p>
            <p className="text-lg font-bold">{streakDays} days</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onStartTutor}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI Tutor</h3>
            <p className="text-sm text-gray-500">Get personalized help</p>
          </div>
        </button>
        <button
          onClick={onViewPath}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Learning Path</h3>
            <p className="text-sm text-gray-500">View your roadmap</p>
          </div>
        </button>
      </div>

      {/* Learning Progress */}
      {learningPaths.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
          <div className="space-y-4">
            {learningPaths.map((path) => (
              <div key={path.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{path.subject}</span>
                  <span className="text-sm text-gray-500">
                    {path.completedTopics}/{path.totalTopics} topics
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all"
                    style={{ width: `${path.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
          <div className="space-y-3">
            {upcomingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                  <p className="text-xs text-gray-500">{assignment.subject}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Due: {assignment.dueDate}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                      assignment.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : assignment.status === "in-progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl mb-1">{a.icon || "🏆"}</div>
                <p className="text-xs font-medium text-gray-900">{a.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
