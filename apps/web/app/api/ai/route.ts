import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai - BFF handler for AI tutor interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, language, history: _history } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // In production, this proxies to the AI Lambda service
    // Mock responses based on language
    const responses: Record<string, string> = {
      en: `I can help you with that! Based on your question "${message.slice(0, 50)}...", let me explain step by step.`,
      hi: `मैं इसमें आपकी मदद कर सकता हूं! आपके प्रश्न के आधार पर, मैं चरण दर चरण समझाता हूं।`,
      ta: `நான் இதில் உங்களுக்கு உதவ முடியும்! உங்கள் கேள்வியின் அடிப்படையில், படிப்படியாக விளக்குகிறேன்.`,
    };

    const response = responses[language || "en"] || responses.en;

    return NextResponse.json({
      response,
      sessionId: `session-${Date.now()}`,
      suggestedFollowUps: [
        "Can you explain further?",
        "Show me an example",
        "What are the key concepts?",
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
