import React from "react";

export interface PathNode {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "locked" | "available";
  type: "topic" | "assessment" | "project";
  prerequisites?: string[];
  estimatedMinutes?: number;
}

export interface LearningPathProps {
  title: string;
  description?: string;
  nodes?: PathNode[];
  overallProgress?: number;
  onNodeClick?: (nodeId: string) => void;
}

export function LearningPath({
  title,
  description,
  nodes = [],
  overallProgress = 0,
  onNodeClick,
}: LearningPathProps) {
  const statusColors = {
    completed: "bg-green-500 border-green-500 text-white",
    current: "bg-primary-500 border-primary-500 text-white",
    available: "bg-white border-primary-300 text-primary-700",
    locked: "bg-gray-100 border-gray-300 text-gray-400",
  };

  const statusIcons = {
    completed: "✓",
    current: "▶",
    available: "○",
    locked: "🔒",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium text-gray-900">{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Path nodes */}
      <div className="space-y-0">
        {nodes.map((node, index) => (
          <div key={node.id} className="relative">
            {/* Connector line */}
            {index < nodes.length - 1 && (
              <div
                className={`absolute left-5 top-10 w-0.5 h-8 ${
                  node.status === "completed" ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
            {/* Node */}
            <button
              onClick={() => node.status !== "locked" && onNodeClick?.(node.id)}
              disabled={node.status === "locked"}
              className={`w-full flex items-start gap-4 p-3 rounded-lg text-left transition-colors ${
                node.status === "locked"
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-gray-50 cursor-pointer"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-sm font-medium ${statusColors[node.status]}`}
              >
                {statusIcons[node.status]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${node.status === "locked" ? "text-gray-400" : "text-gray-900"}`}>
                  {node.title}
                </p>
                {node.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{node.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    node.type === "assessment"
                      ? "bg-purple-100 text-purple-700"
                      : node.type === "project"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {node.type}
                  </span>
                  {node.estimatedMinutes && (
                    <span className="text-xs text-gray-400">{node.estimatedMinutes} min</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
