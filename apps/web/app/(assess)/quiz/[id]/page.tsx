"use client";

import { useState } from "react";
import { QuizPlayer } from "@learning-os/ui";
import type { QuizQuestion } from "@learning-os/ui";

const mockQuestions: QuizQuestion[] = [
  {
    id: "q1",
    type: "mcq",
    question: "What is the value of x in the equation 2x + 6 = 14?",
    options: ["x = 2", "x = 4", "x = 6", "x = 8"],
    correctAnswer: 1,
    points: 2,
  },
  {
    id: "q2",
    type: "mcq",
    question: "Which of the following is a quadratic equation?",
    options: ["2x + 3 = 0", "x^2 + 2x + 1 = 0", "x^3 = 8", "1/x = 5"],
    correctAnswer: 1,
    points: 2,
  },
  {
    id: "q3",
    type: "true-false",
    question: "The sum of interior angles of a triangle is always 180 degrees.",
    correctAnswer: "True",
    points: 1,
  },
  {
    id: "q4",
    type: "short-answer",
    question: "Explain the difference between a linear and a quadratic equation. Give one example of each.",
    points: 5,
  },
  {
    id: "q5",
    type: "mcq",
    question: "What is the discriminant of the equation x^2 - 4x + 4 = 0?",
    options: ["0", "4", "8", "-4"],
    correctAnswer: 0,
    points: 2,
  },
];

export default function QuizPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionId: string, answer: string | number) => {
    console.log(`Answer for ${questionId}:`, answer);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    console.log("Quiz submitted");
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <QuizPlayer
        title="Mathematics Quiz: Algebra Basics"
        questions={mockQuestions}
        timeLimit={30}
        currentQuestionIndex={currentIndex}
        onAnswer={handleAnswer}
        onSubmit={handleSubmit}
        onNext={() => setCurrentIndex((i) => Math.min(i + 1, mockQuestions.length - 1))}
        onPrevious={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
        submitted={submitted}
      />
    </div>
  );
}
