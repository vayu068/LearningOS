import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TeacherDashboard } from "@learning-os/ui";

describe("TeacherDashboard", () => {
  it("renders the welcome message with teacher name", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" />);
    expect(screen.getByText("Hello, Dr. Smith!")).toBeDefined();
  });

  it("displays total students count", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" totalStudents={45} />);
    expect(screen.getByText("45")).toBeDefined();
  });

  it("displays average class progress", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" averageClassProgress={72} />);
    expect(screen.getByText("72%")).toBeDefined();
  });

  it("displays pending assessments", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" pendingAssessments={5} />);
    expect(screen.getByText("5")).toBeDefined();
  });

  it("renders AI Co-pilot button", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" onOpenCopilot={vi.fn()} />);
    expect(screen.getByText("AI Co-pilot")).toBeDefined();
  });

  it("renders Create Content button", () => {
    render(<TeacherDashboard teacherName="Dr. Smith" onCreateContent={vi.fn()} />);
    expect(screen.getByText("Create Content")).toBeDefined();
  });

  it("renders class list", () => {
    const classes = [
      { id: "1", name: "Class 10-A", studentCount: 30, averageProgress: 68, lastActivity: "Today" },
    ];
    render(<TeacherDashboard teacherName="Dr. Smith" classes={classes} />);
    expect(screen.getByText("Class 10-A")).toBeDefined();
    expect(screen.getByText("30 students")).toBeDefined();
  });

  it("renders student progress", () => {
    const students = [
      { id: "1", name: "Alice", progress: 85, status: "ahead" as const },
      { id: "2", name: "Bob", progress: 40, status: "at-risk" as const },
    ];
    render(<TeacherDashboard teacherName="Dr. Smith" recentStudents={students} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("ahead")).toBeDefined();
    expect(screen.getByText("at-risk")).toBeDefined();
  });
});
