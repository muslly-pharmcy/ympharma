import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub router-dependent chrome and TanStack route registration so we can render
// PrescriptionPage in isolation without booting the router.
vi.mock("@/components/site-chrome", () => ({
  SiteHeader: () => null,
  SiteFooter: () => null,
}));
vi.mock("@tanstack/react-router", async (orig) => {
  const actual = (await orig()) as any;
  return { ...actual, createFileRoute: () => (cfg: any) => ({ options: cfg }) };
});

// Mockable Supabase client used by the prescription page.
const supaUpload = vi.fn(async () => ({ data: { path: "p" }, error: null }));
const supaSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://signed/url.jpg" }, error: null }));
const supaInsert = vi.fn(async () => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ upload: supaUpload, createSignedUrl: supaSignedUrl }) },
    from: () => ({ insert: supaInsert }),
  },
}));
vi.mock("@/lib/whatsapp", async (orig) => {
  const actual = (await orig()) as any;
  return { ...actual, openWhatsApp: vi.fn() };
});


import { PrescriptionsTab } from "@/components/admin/PrescriptionsTab";
import type { Rx } from "@/components/admin/shared";
import { clearActivityLog, getActivityLog } from "@/lib/rx-activity-log";
import { dedupeProducts, productDedupeKey } from "@/lib/use-merged-products";

function mkRx(i: number, over: Partial<Rx> = {}): Rx {


  return {
    id: `RX-${String(i).padStart(4, "0")}`,
    customer_name: `عميل ${i}`,
    customer_phone: `7700000${String(i).padStart(2, "0")}`,
    customer_address: "عدن — المنصورة",
    notes: null,
    image_urls: [],
    status: "pending",
    created_at: new Date(2026, 0, 1, 10, i % 60).toISOString(),
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  clearActivityLog();
  // Mock window.URL.createObjectURL for CSV download
  if (!(window.URL as any).createObjectURL) {
    (window.URL as any).createObjectURL = vi.fn(() => "blob:mock");
    (window.URL as any).revokeObjectURL = vi.fn();
  }
});

describe("PrescriptionsTab — integration", () => {
  it("filters by search text and updates the count", async () => {
    const rxs = [mkRx(1, { customer_name: "أحمد علي" }), mkRx(2, { customer_name: "سارة" }), mkRx(3, { customer_name: "محمد" })];
    render(<PrescriptionsTab rxs={rxs} onStatus={vi.fn()} />);

    expect(screen.getByText(/عرض 3 من 3/)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/ابحث برقم الروشتة/);
    await userEvent.type(input, "سارة");

    await waitFor(() => expect(screen.getByText(/عرض 1 من 1/)).toBeInTheDocument());
    expect(screen.getByTestId("rx-card-RX-0002")).toBeInTheDocument();
    expect(screen.queryByTestId("rx-card-RX-0001")).not.toBeInTheDocument();
  });

  it("exports CSV with the persisted column preference", async () => {
    localStorage.setItem("rx-csv-cols-v1", JSON.stringify(["id", "customer_name"]));

    let captured: Blob | null = null;
    const spy = vi.spyOn(URL, "createObjectURL").mockImplementation(((b: Blob) => {
      captured = b;
      return "blob:mock";
    }) as any);

    render(<PrescriptionsTab rxs={[mkRx(1), mkRx(2)]} onStatus={vi.fn()} />);
    await userEvent.click(screen.getByTestId("export-csv-btn"));
    // Preview dialog appears first — confirm to actually export
    expect(screen.getByTestId("export-preview")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("export-confirm-btn"));

    expect(spy).toHaveBeenCalled();
    const csv = captured ? await (captured as Blob).text() : "";
    expect(csv).toContain("رقم");
    expect(csv).toContain("الاسم");
    expect(csv).not.toContain("الجوال");
    expect(csv).toContain("RX-0001");
    spy.mockRestore();
  });

  it("shows export preview reflecting search, status filter, and selected columns", async () => {
    localStorage.setItem("rx-csv-cols-v1", JSON.stringify(["id", "customer_name", "created_at", "updated_at"]));
    const rxs = [
      mkRx(1, { customer_name: "أحمد" }),
      mkRx(2, { customer_name: "سارة", status: "archived" }),
      mkRx(3, { customer_name: "أحمد ٢" }),
    ];
    render(<PrescriptionsTab rxs={rxs} onStatus={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/ابحث برقم الروشتة/), "أحمد");
    await userEvent.click(screen.getByTestId("export-pdf-btn"));

    await screen.findByTestId("export-preview");
    expect(screen.getByTestId("export-preview-count")).toHaveTextContent("2");
    expect(screen.getByTestId("export-preview-col-id")).toBeInTheDocument();
    expect(screen.getByTestId("export-preview-col-created_at")).toBeInTheDocument();
    expect(screen.getByTestId("export-preview-col-updated_at")).toBeInTheDocument();
    expect(screen.queryByTestId("export-preview-col-customer_phone")).toBeNull();
  });

  it("PDF export honors search + status filter + custom columns (window.open content)", async () => {
    localStorage.setItem("rx-csv-cols-v1", JSON.stringify(["id", "customer_name", "created_at", "updated_at"]));
    const writes: string[] = [];
    const fakeDoc = { open: vi.fn(), write: (s: string) => writes.push(s), close: vi.fn() };
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ document: fakeDoc } as any);

    const rxs = [
      mkRx(1, { customer_name: "أحمد", created_at: "2026-01-01T08:00:00Z" }),
      mkRx(2, { customer_name: "سارة", status: "archived" }),
      // updated_at missing → must fall back to created_at in the PDF
      mkRx(3, { customer_name: "أحمد ٢", created_at: "2026-02-02T09:00:00Z", updated_at: undefined as any }),
    ];
    render(<PrescriptionsTab rxs={rxs} onStatus={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/ابحث برقم الروشتة/), "أحمد");
    await userEvent.click(screen.getByTestId("export-pdf-btn"));
    await userEvent.click(screen.getByTestId("export-confirm-btn"));

    expect(openSpy).toHaveBeenCalled();
    const html = writes.join("");
    expect(html).toContain("نشطة");
    expect(html).toContain("أحمد");
    expect(html).toContain("RX-0001");
    expect(html).toContain("RX-0003");
    expect(html).not.toContain("RX-0002");
    expect(html).toContain("<th>الاسم</th>");
    expect(html).toContain("<th>تاريخ الإنشاء</th>");
    expect(html).toContain("<th>آخر تحديث</th>");
    expect(html).not.toContain("<th>الجوال</th>");
    openSpy.mockRestore();
  });


  it("confirms delete, calls onDelete, and writes an activity-log entry", async () => {
    const onDelete = vi.fn(async () => { /* ok */ });
    render(<PrescriptionsTab rxs={[mkRx(1)]} onStatus={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByTestId("delete-RX-0001"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("confirm-btn"));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("RX-0001"));
    await waitFor(() => {
      const log = getActivityLog();
      expect(log.some((e) => e.action === "delete" && e.rxId === "RX-0001" && e.status === "success")).toBe(true);
    });
  });

  it("archives an item and records the activity", async () => {
    const onArchive = vi.fn(async () => { /* ok */ });
    render(<PrescriptionsTab rxs={[mkRx(1)]} onStatus={vi.fn()} onArchive={onArchive} />);

    await userEvent.click(screen.getByTestId("archive-RX-0001"));
    await userEvent.click(screen.getByTestId("confirm-btn"));

    await waitFor(() => expect(onArchive).toHaveBeenCalledWith("RX-0001"));
    await waitFor(() => {
      expect(getActivityLog().some((e) => e.action === "archive")).toBe(true);
    });
  });

  it("renders virtualized list and avoids state errors with many items", async () => {
    // 30 items but pagination caps to PAGE_SIZE (10); 10 > 6 → virtualized
    const rxs = Array.from({ length: 30 }, (_, i) => mkRx(i + 1));
    render(<PrescriptionsTab rxs={rxs} onStatus={vi.fn()} />);

    expect(screen.getByTestId("rx-virtual-list")).toBeInTheDocument();
    expect(screen.getByText(/عرض 10 من 30/)).toBeInTheDocument();
  });

  it("bulk-selects multiple items and triggers bulk archive with progress", async () => {
    const onBulkArchive = vi.fn(async (ids: string[], onProgress?: any) => {
      for (let i = 0; i < ids.length; i++) onProgress?.(i + 1, ids.length, ids[i]);
    });
    const rxs = [mkRx(1), mkRx(2), mkRx(3)];
    render(<PrescriptionsTab rxs={rxs} onStatus={vi.fn()} onBulkArchive={onBulkArchive} />);

    await userEvent.click(screen.getByTestId("select-RX-0001"));
    await userEvent.click(screen.getByTestId("select-RX-0002"));
    await userEvent.click(screen.getByRole("button", { name: /^أرشفة \(2\)/ }));
    await userEvent.click(screen.getByTestId("confirm-btn"));

    await waitFor(() => expect(onBulkArchive).toHaveBeenCalled());
    const ids = onBulkArchive.mock.calls[0][0];
    expect(new Set(ids)).toEqual(new Set(["RX-0001", "RX-0002"]));
  });

  it("does not show virtualized list when items fit on a single small page", () => {
    render(<PrescriptionsTab rxs={[mkRx(1), mkRx(2)]} onStatus={vi.fn()} />);
    expect(screen.getByTestId("rx-flat-list")).toBeInTheDocument();
  });
});

describe("Imported products dedupe", () => {
  it("dedupes by internal code when present", () => {
    const a = { id: 1, name: "Cefix 500", brand: "x", price: 1, cat: "medicine", img: "", desc: "الكود: 0125618" } as any;
    const b = { id: 2, name: "CEFIX  500MG", brand: "y", price: 9, cat: "medicine", img: "", desc: "الكود: 0125618 · باكت" } as any;
    expect(productDedupeKey(a)).toBe(productDedupeKey(b));
    const out = dedupeProducts([a], [b]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
  });

  it("dedupes by normalized name when no code is present", () => {
    const a = { id: 1, name: "Paracetamol 500", brand: "x", price: 1, cat: "medicine", img: "", desc: "" } as any;
    const b = { id: 2, name: "paracetamol-500", brand: "y", price: 2, cat: "medicine", img: "", desc: "" } as any;
    const c = { id: 3, name: "Ibuprofen 200", brand: "z", price: 3, cat: "medicine", img: "", desc: "" } as any;
    const out = dedupeProducts([a], [b, c]);
    expect(out.map((p) => p.id)).toEqual([1, 3]);
  });
});

describe("Prescription submission (smoke, repeated)", () => {
  it("uploads → signs → inserts → opens WhatsApp across 3 consecutive runs", async () => {
    const whatsappMod = await import("@/lib/whatsapp");
    const openWa = whatsappMod.openWhatsApp as unknown as ReturnType<typeof vi.fn>;

    const mod: any = await import("@/routes/prescription");
    const PrescriptionPage = mod.Route.options.component;
    const file = new File([new Uint8Array([1, 2, 3])], "rx.jpg", { type: "image/jpeg" });

    for (let run = 1; run <= 3; run++) {
      supaUpload.mockClear(); supaSignedUrl.mockClear(); supaInsert.mockClear(); openWa.mockClear();
      const { unmount } = render(<PrescriptionPage />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);
      await userEvent.type(screen.getByPlaceholderText(/الاسم الكامل/), `عميل ${run}`);
      await userEvent.type(screen.getByPlaceholderText(/رقم الجوال/), "777000000");
      await userEvent.type(screen.getByPlaceholderText(/العنوان للتوصيل/), "عدن — المنصورة");
      await userEvent.click(screen.getByRole("button", { name: /إرسال الروشتة/ }));

      await waitFor(() => expect(supaInsert).toHaveBeenCalledTimes(1), { timeout: 8000 });
      expect(supaUpload).toHaveBeenCalledTimes(1);
      expect(supaSignedUrl).toHaveBeenCalledTimes(1);
      expect(openWa).toHaveBeenCalledTimes(1);
      const payload = (supaInsert.mock.calls[0] as any[])[0];
      expect(payload.image_urls).toEqual(["https://signed/url.jpg"]);
      expect(payload.status).toBe("pending");
      unmount();
    }
  }, 30000);
});

