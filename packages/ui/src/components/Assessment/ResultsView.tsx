import React from "react";

export interface QuestionResult {
  id: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  competency?: string;
}

export interface CompetencyScore {
  name: string;
  score: number;
  maxScore: number;
  level: "mastery" | "proficient" | "developing" | "beginning";
}

export interface ResultsViewProps {
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken?: string;
  questionResults?: QuestionResult[];
  competencyScores?: CompetencyScore[];
  feedback?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onBackToDashboard?: () => void;
}

export function ResultsView({
  title,
  score,
  totalPoints,
  percentage,
  timeTaken,
  questionResults = [],
  competencyScores = [],
  feedback,
  suggestions = [],
  onRetry,
  onBackToDashboard,
}: ResultsViewProps) {
  const gradeColor = percentage >= 80
    ? "text-green-600"
    : percentage >= 60
    ? "text-amber-600"
    : "text-red-600";

  const levelColors = {
    mastery: "bg-green-100 text-green-700",
    proficient: "bg-blue-100 text-blue-700",
    developing: "bg-amber-100 text-amber-700",
    beginning: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="mt-4">
          <div className={`text-5xl font-bold ${gradeColor}`}>{percentage}%</div>
          <p className="mt-2 text-sm text-gray-500">
            {score} / {totalPoints} points
          </p>
          {timeTaken && (
            <p className="text-xs text-gray-400 mt-1">Time taken: {timeTaken}</p>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Retry Quiz
            </button>
          )}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* AI Feedback */}
      {feedback && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Feedback</h3>
          <p className="text-sm text-gray-700">{feedback}</p>
        </div>
      )}

      {/* Competency scores */}
      {competencyScores.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Competency Breakdown</h3>
          <div className="space-y-3">
            {competencyScores.map((comp) => (
              <div key={comp.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-40 truncate">{comp.name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full"
                    style={{ width: `${(comp.score / comp.maxScore) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[comp.level]}`}>
                  {comp.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Improvement Suggestions</h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-primary-600 mt-0.5">&#x2022;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question details */}
      {questionResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h3>
          <div className="space-y-4">
            {questionResults.map((qr, i) => (
              <div
                key={qr.id}
                className={`p-4 rounded-lg border ${
                  qr.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900">Q{i + 1}: {qr.question}</p>
                  <span className={`text-xs font-medium ${qr.isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {qr.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <p className="text-gray-600">Your answer: <span className="font-medium">{qr.userAnswer}</span></p>
                  {!qr.isCorrect && (
                    <p className="text-green-700">Correct answer: <span className="font-medium">{qr.correctAnswer}</span></p>
                  )}
                  {qr.explanation && (
                    <p className="text-gray-500 mt-1">{qr.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
