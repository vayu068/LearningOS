"use client";

import { useState } from "react";
import { TutorChat } from "@learning-os/ui";
import type { ChatMessage } from "@learning-os/ui";

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString(),
      language,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, language, history: messages }),
      });

      if (response.ok) {
        const data = await response.json();
        const tutorMessage: ChatMessage = {
          id: `tutor-${Date.now()}`,
          role: "tutor",
          content: data.response || "I understand your question. Let me help you with that.",
          timestamp: new Date().toLocaleTimeString(),
          language,
        };
        setMessages((prev) => [...prev, tutorMessage]);
      } else {
        const tutorMessage: ChatMessage = {
          id: `tutor-${Date.now()}`,
          role: "tutor",
          content: "I apologize, but I encountered an issue. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, tutorMessage]);
      }
    } catch {
      const tutorMessage: ChatMessage = {
        id: `tutor-${Date.now()}`,
        role: "tutor",
        content: "It seems you are offline. Your message has been queued and will be processed when you reconnect.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, tutorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-6rem)]">
      <TutorChat
        messages={messages}
        onSendMessage={handleSendMessage}
        onLanguageChange={setLanguage}
        onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        currentLanguage={language}
        voiceEnabled={voiceEnabled}
        loading={loading}
        tutorName="AI Tutor"
        subject="Mathematics"
      />
    </div>
  );
}
