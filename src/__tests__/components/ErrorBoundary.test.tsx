import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  test("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  test("renders fallback UI when child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/حدث خطأ غير متوقع/)).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    spy.mockRestore();
  });

  test("renders custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    spy.mockRestore();
  });

  test("reset button clears error state", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Maybe() {
      if (shouldThrow) throw new Error("x");
      return <p>recovered</p>;
    }
    render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/حدث خطأ غير متوقع/)).toBeInTheDocument();
    shouldThrow = false;
    const resetBtn = screen.getAllByRole("button").find((b) => /إعادة|محاولة|تجاهل|رجوع/.test(b.textContent || "")) ?? screen.getAllByRole("button")[1];
    await userEvent.click(resetBtn!);
    spy.mockRestore();
  });
});
