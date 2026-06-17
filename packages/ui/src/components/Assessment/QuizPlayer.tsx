import React, { useState } from "react";

export interface QuizQuestion {
  id: string;
  type: "mcq" | "short-answer" | "matching" | "true-false";
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  points?: number;
}

export interface QuizPlayerProps {
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  currentQuestionIndex?: number;
  onAnswer: (questionId: string, answer: string | number) => void;
  onSubmit: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  submitted?: boolean;
}

export function QuizPlayer({
  title,
  questions,
  timeLimit,
  currentQuestionIndex = 0,
  onAnswer,
  onSubmit,
  onNext,
  onPrevious,
  submitted = false,
}: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  const handleAnswer = (answer: string | number) => {
    if (submitted || !currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
    onAnswer(currentQuestion.id, answer);
  };

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {timeLimit && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeLimit} min
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <div className="mb-6">
          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
            Question {currentQuestionIndex + 1}
          </span>
          {currentQuestion.points && (
            <span className="ml-2 text-xs text-gray-500">{currentQuestion.points} points</span>
          )}
          <p className="mt-3 text-gray-900 font-medium">{currentQuestion.question}</p>
        </div>

        {/* Answer options based on type */}
        {currentQuestion.type === "mcq" && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={submitted}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  answers[currentQuestion.id] === idx
                    ? "border-primary-500 bg-primary-50 text-primary-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                } ${submitted ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm">{option}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "true-false" && (
          <div className="grid grid-cols-2 gap-3">
            {["True", "False"].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={submitted}
                className={`p-3 rounded-lg border text-center font-medium transition-colors ${
                  answers[currentQuestion.id] === option
                    ? "border-primary-500 bg-primary-50 text-primary-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                } ${submitted ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "short-answer" && (
          <textarea
            value={(answers[currentQuestion.id] as string) || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            disabled={submitted}
            placeholder="Type your answer..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">{answeredCount} of {questions.length} answered</span>
        {currentQuestionIndex < questions.length - 1 ? (
          <button
            onClick={onNext}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={submitted}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
