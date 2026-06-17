import React, { useState } from "react";

export interface ContentCreatorProps {
  onGenerate: (params: {
    type: string;
    subject: string;
    topic: string;
    gradeLevel: string;
    instructions?: string;
  }) => void;
  loading?: boolean;
  generatedContent?: string;
  contentTypes?: { id: string; label: string }[];
}

const defaultContentTypes = [
  { id: "lesson-plan", label: "Lesson Plan" },
  { id: "quiz", label: "Quiz / Assessment" },
  { id: "explanation", label: "Topic Explanation" },
  { id: "worksheet", label: "Worksheet" },
  { id: "activity", label: "Classroom Activity" },
];

export function ContentCreator({
  onGenerate,
  loading = false,
  generatedContent,
  contentTypes = defaultContentTypes,
}: ContentCreatorProps) {
  const [type, setType] = useState(contentTypes[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ type, subject, topic, gradeLevel, instructions: instructions || undefined });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
        <h2 className="text-lg font-bold text-gray-900">AI Content Creator</h2>
        <p className="text-sm text-gray-500 mt-1">Generate lesson plans, quizzes, and more</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="content-type" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                id="content-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {contentTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="grade-level" className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                id="grade-level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select grade...</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Grade {i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, Science, English"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Quadratic equations, Photosynthesis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Instructions (optional)
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any specific requirements or focus areas..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !subject || !topic}
            className="w-full py-2.5 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Generating..." : "Generate Content"}
          </button>
        </form>

        {/* Generated content display */}
        {generatedContent && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Content</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {generatedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
