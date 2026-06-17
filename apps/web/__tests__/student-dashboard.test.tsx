import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { StudentDashboard } from "@learning-os/ui";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("StudentDashboard", () => {
  it("renders the welcome message with student name", () => {
    render(<StudentDashboard studentName="Test Student" />);
    expect(screen.getByText("Welcome back, Test Student!")).toBeDefined();
  });

  it("displays overall progress", () => {
    render(<StudentDashboard studentName="Test" overallProgress={65} />);
    expect(screen.getByText("65%")).toBeDefined();
  });

  it("displays learning streak", () => {
    render(<StudentDashboard studentName="Test" streakDays={7} />);
    expect(screen.getByText("7 days")).toBeDefined();
  });

  it("renders learning paths", () => {
    const paths = [
      { subject: "Math", progress: 70, totalTopics: 10, completedTopics: 7 },
    ];
    render(<StudentDashboard studentName="Test" learningPaths={paths} />);
    expect(screen.getByText("Math")).toBeDefined();
    expect(screen.getByText("7/10 topics")).toBeDefined();
  });

  it("renders upcoming assignments", () => {
    const assignments = [
      { id: "1", title: "Homework 1", subject: "Math", dueDate: "Tomorrow", status: "pending" as const },
    ];
    render(<StudentDashboard studentName="Test" upcomingAssignments={assignments} />);
    expect(screen.getByText("Homework 1")).toBeDefined();
  });

  it("renders AI Tutor button", () => {
    render(<StudentDashboard studentName="Test" onStartTutor={vi.fn()} />);
    expect(screen.getByText("AI Tutor")).toBeDefined();
  });

  it("renders Learning Path button", () => {
    render(<StudentDashboard studentName="Test" onViewPath={vi.fn()} />);
    expect(screen.getByText("Learning Path")).toBeDefined();
  });
});
