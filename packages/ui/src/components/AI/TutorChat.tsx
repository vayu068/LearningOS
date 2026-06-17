import React, { useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "tutor";
  content: string;
  timestamp: string;
  language?: string;
}

export interface TutorChatProps {
  messages?: ChatMessage[];
  onSendMessage: (message: string) => void;
  onLanguageChange?: (language: string) => void;
  onVoiceToggle?: () => void;
  currentLanguage?: string;
  voiceEnabled?: boolean;
  loading?: boolean;
  tutorName?: string;
  subject?: string;
}

export function TutorChat({
  messages = [],
  onSendMessage,
  onLanguageChange,
  onVoiceToggle,
  currentLanguage = "en",
  voiceEnabled = false,
  loading = false,
  tutorName = "AI Tutor",
  subject,
}: TutorChatProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[700px] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <div>
          <h3 className="font-semibold text-gray-900">{tutorName}</h3>
          {subject && <p className="text-xs text-gray-500">Subject: {subject}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Language selector */}
          {onLanguageChange && (
            <select
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="bn">Bengali</option>
              <option value="mr">Marathi</option>
              <option value="kn">Kannada</option>
            </select>
          )}
          {/* Voice toggle */}
          {onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              className={`p-1.5 rounded-lg transition-colors ${
                voiceEnabled ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
              aria-label="Toggle voice"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👋</div>
            <p className="text-gray-500 text-sm">
              Hi! I&apos;m your AI tutor. Ask me anything about{" "}
              {subject || "your subjects"}!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-primary-600 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-900 rounded-bl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.role === "user" ? "text-primary-100" : "text-gray-400"
                }`}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
