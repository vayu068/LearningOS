import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginForm } from "../components/Auth/LoginForm";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("renders sign in button", () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByText("Sign In")).toBeDefined();
  });

  it("shows loading state", () => {
    render(<LoginForm onSubmit={vi.fn()} loading={true} />);
    expect(screen.getByText("Signing in...")).toBeDefined();
  });

  it("shows error message", () => {
    render(<LoginForm onSubmit={vi.fn()} error="Invalid credentials" />);
    expect(screen.getByText("Invalid credentials")).toBeDefined();
  });

  it("shows tenant selector when tenants are provided and no detected tenant", () => {
    const tenants = [
      { id: "t1", name: "School A" },
      { id: "t2", name: "School B" },
    ];
    render(<LoginForm onSubmit={vi.fn()} tenants={tenants} />);
    expect(screen.getByLabelText("Organization")).toBeDefined();
  });

  it("hides tenant selector when tenant is detected", () => {
    const tenants = [{ id: "t1", name: "School A" }];
    render(
      <LoginForm onSubmit={vi.fn()} tenants={tenants} detectedTenant="t1" />
    );
    const select = screen.queryByLabelText("Organization");
    expect(select).toBeNull();
  });

  it("calls onSubmit with form data", () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Sign In"));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      tenantId: undefined,
      mfaCode: undefined,
    });
  });
});
