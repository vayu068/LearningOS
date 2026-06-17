"use client";

import { LearningPath } from "@learning-os/ui";
import type { PathNode } from "@learning-os/ui";

const mockNodes: PathNode[] = [
  { id: "1", title: "Introduction to Algebra", description: "Variables, expressions, and basic operations", status: "completed", type: "topic", estimatedMinutes: 30 },
  { id: "2", title: "Linear Equations", description: "Solving equations with one variable", status: "completed", type: "topic", estimatedMinutes: 45 },
  { id: "3", title: "Assessment: Linear Algebra Basics", description: "Quiz covering algebra fundamentals", status: "completed", type: "assessment", estimatedMinutes: 20 },
  { id: "4", title: "Quadratic Equations", description: "Standard form, factoring, and the quadratic formula", status: "current", type: "topic", estimatedMinutes: 60, prerequisites: ["2"] },
  { id: "5", title: "Graphing Parabolas", description: "Plotting quadratic functions and finding key features", status: "available", type: "topic", estimatedMinutes: 45, prerequisites: ["4"] },
  { id: "6", title: "Project: Real-world Quadratics", description: "Apply quadratic equations to physics problems", status: "locked", type: "project", estimatedMinutes: 90, prerequisites: ["4", "5"] },
  { id: "7", title: "Polynomials", description: "Operations with polynomials, long division", status: "locked", type: "topic", estimatedMinutes: 60, prerequisites: ["4"] },
  { id: "8", title: "Final Assessment: Algebra", description: "Comprehensive test on all algebra topics", status: "locked", type: "assessment", estimatedMinutes: 45, prerequisites: ["6", "7"] },
];

export default function LearningPathPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <LearningPath
        title="Mathematics: Algebra"
        description="Master algebraic concepts from basics to advanced polynomial operations"
        nodes={mockNodes}
        overallProgress={38}
        onNodeClick={(nodeId) => console.log("Navigate to node:", nodeId)}
      />
    </div>
  );
}
