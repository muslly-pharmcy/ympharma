import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                slug: "trust",
                title: "عنوان تجريبي",
                intro: "مقدمة تجريبية",
                data_collection: "محتوى جمع البيانات التجريبي",
                retention: "محتوى الاحتفاظ",
                encryption: "محتوى التشفير",
                cookies: "محتوى الكوكيز",
                incident_reporting: "محتوى الإبلاغ",
                contact: "محتوى التواصل",
              },
              error: null,
            }),
        }),
      }),
    }),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (cfg: unknown) => cfg,
  Link: ({ children, ...p }: { children: React.ReactNode }) => <a {...p}>{children}</a>,
}));

import { Route } from "@/routes/trust";

describe("/trust page", () => {
  it("renders with dir=rtl and shows all policy sections", async () => {
    const cfg = Route as unknown as { component: () => React.ReactElement };
    render(<cfg.component />);

    await waitFor(() => expect(screen.getByText("عنوان تجريبي")).toBeTruthy());

    const root = screen.getByTestId("trust-page");
    expect(root.getAttribute("dir")).toBe("rtl");

    expect(screen.getByText("جمع البيانات")).toBeTruthy();
    expect(screen.getByText("الاحتفاظ بالبيانات والحذف")).toBeTruthy();
    expect(screen.getByText("التشفير وحماية البيانات")).toBeTruthy();
    expect(screen.getByText("الكوكيز والتخزين المحلي")).toBeTruthy();
    expect(screen.getByText("الإبلاغ عن مشكلة أمنية")).toBeTruthy();
    expect(screen.getByText("تواصل معنا")).toBeTruthy();
  });
});
