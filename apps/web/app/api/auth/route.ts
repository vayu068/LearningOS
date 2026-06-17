import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/login - BFF handler for authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // In production, this proxies to the Lambda auth service
    // For now, return a mock successful response
    return NextResponse.json({
      success: true,
      token: "mock-jwt-token",
      user: {
        id: "user-1",
        email,
        role: "student",
        tenantId: tenantId || "default",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
