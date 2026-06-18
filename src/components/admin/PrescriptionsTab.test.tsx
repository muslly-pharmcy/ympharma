import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrescriptionsTab } from "@/components/admin/PrescriptionsTab";
import type { Rx } from "@/components/admin/shared";
import { clearActivityLog, getActivityLog } from "@/lib/rx-activity-log";

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
    // Pre-seed preference: only id + name
    localStorage.setItem("rx-csv-cols-v1", JSON.stringify(["id", "customer_name"]));

    const blobSpy = vi.fn();
    const origBlob = global.Blob;
    // @ts-expect-error spy on constructor
    global.Blob = vi.fn((parts: any, opts: any) => { blobSpy(parts, opts); return new origBlob(parts, opts); });

    render(<PrescriptionsTab rxs={[mkRx(1), mkRx(2)]} onStatus={vi.fn()} />);
    await userEvent.click(screen.getByTestId("export-csv-btn"));

    expect(blobSpy).toHaveBeenCalled();
    const csv = String(blobSpy.mock.calls[0][0][1]); // [BOM, csvBody]
    expect(csv).toContain("رقم");
    expect(csv).toContain("الاسم");
    expect(csv).not.toContain("الجوال");
    expect(csv).toContain("RX-0001");

    global.Blob = origBlob;
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
