import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/assessment - List assessments for current user
 */
export async function GET() {
  return NextResponse.json({
    assessments: [
      {
        id: "quiz-1",
        title: "Mathematics: Algebra Basics",
        subject: "Mathematics",
        questionCount: 5,
        timeLimit: 30,
        status: "available",
      },
      {
        id: "quiz-2",
        title: "Science: Photosynthesis",
        subject: "Science",
        questionCount: 10,
        timeLimit: 45,
        status: "completed",
        score: 85,
      },
    ],
  });
}

/**
 * POST /api/assessment - Submit assessment answers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, answers } = body;

    if (!assessmentId || !answers) {
      return NextResponse.json(
        { error: "Assessment ID and answers are required" },
        { status: 400 }
      );
    }

    // In production, this proxies to the assessment Lambda service
    return NextResponse.json({
      success: true,
      result: {
        assessmentId,
        score: 8,
        totalPoints: 12,
        percentage: 67,
        feedback: "Good attempt! Focus on quadratic equations for improvement.",
        competencies: [
          { name: "Linear Algebra", score: 4, maxScore: 4, level: "mastery" },
          { name: "Quadratic Equations", score: 2, maxScore: 4, level: "developing" },
          { name: "Problem Solving", score: 2, maxScore: 4, level: "proficient" },
        ],
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
