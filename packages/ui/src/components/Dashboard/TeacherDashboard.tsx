import React from "react";

export interface ClassOverview {
  id: string;
  name: string;
  studentCount: number;
  averageProgress: number;
  lastActivity: string;
}

export interface StudentProgress {
  id: string;
  name: string;
  progress: number;
  status: "on-track" | "at-risk" | "ahead";
}

export interface TeacherDashboardProps {
  teacherName: string;
  classes?: ClassOverview[];
  recentStudents?: StudentProgress[];
  totalStudents?: number;
  averageClassProgress?: number;
  pendingAssessments?: number;
  onOpenCopilot?: () => void;
  onCreateContent?: () => void;
  onViewClass?: (classId: string) => void;
}

export function TeacherDashboard({
  teacherName,
  classes = [],
  recentStudents = [],
  totalStudents = 0,
  averageClassProgress = 0,
  pendingAssessments = 0,
  onOpenCopilot,
  onCreateContent,
  onViewClass,
}: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Hello, {teacherName}!</h2>
        <p className="mt-1 text-green-100 text-sm">Manage your classes and students</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-green-100">Total Students</p>
            <p className="text-lg font-bold">{totalStudents}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-green-100">Avg. Progress</p>
            <p className="text-lg font-bold">{averageClassProgress}%</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-xs text-green-100">Pending Reviews</p>
            <p className="text-lg font-bold">{pendingAssessments}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI Co-pilot</h3>
            <p className="text-sm text-gray-500">Lesson planning assistant</p>
          </div>
        </button>
        <button
          onClick={onCreateContent}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Create Content</h3>
            <p className="text-sm text-gray-500">Build lessons and quizzes</p>
          </div>
        </button>
      </div>

      {/* Class Overview */}
      {classes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Classes</h3>
          <div className="space-y-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => onViewClass?.(cls.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">{cls.name}</p>
                  <p className="text-sm text-gray-500">{cls.studentCount} students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{cls.averageProgress}%</p>
                  <p className="text-xs text-gray-500">{cls.lastActivity}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student Progress Heatmap */}
      {recentStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Progress</h3>
          <div className="space-y-2">
            {recentStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-32 truncate">{student.name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      student.status === "ahead"
                        ? "bg-green-500"
                        : student.status === "at-risk"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${student.progress}%` }}
                  />
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    student.status === "ahead"
                      ? "bg-green-100 text-green-700"
                      : student.status === "at-risk"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {student.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
