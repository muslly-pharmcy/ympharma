import { describe, it, expect } from "vitest";
import { decide } from "@/modules/ai-brain/services/SuperBrainSovereign";
import type { BrainAdapter } from "@/modules/ai-brain/domain/types";

const stubAdapter: BrainAdapter = {
  async findNearbyPharmacy(_hint, _lat, _lng, district) {
    return { id: "phx-1", name: `صيدلية المصلي فرع ${district}`, distanceKm: 3.2 };
  },
  async suggestAlternative() {
    return "بندول عادي";
  },
};

describe("SuperBrainSovereign.decide", () => {
  it("flags unsafe medicine for hypertension patient", async () => {
    const r = await decide(
      {
        userId: "u1",
        userInput: "أحتاج ديكلوفيناك للألم",
        district: "عدن",
        patient: { chronicConditions: ["hypertension"] },
      },
      stubAdapter,
    );
    expect(r.isSafe).toBe(false);
    expect(r.alternativeSuggested).toBe("بندول عادي");
    expect(r.dispatchedTools).toContain("MED_ALT_SUGGEST");
  });

  it("routes to nearby pharmacy in Aden", async () => {
    const r = await decide(
      { userId: "u1", userInput: "بندول", district: "عدن" },
      stubAdapter,
    );
    expect(r.logisticAction?.pharmacyId).toBe("phx-1");
    expect(r.logisticAction?.targetBranch).toContain("عدن");
    expect(r.isSafe).toBe(true);
  });

  it("triggers maternal campaign on keyword", async () => {
    const r = await decide(
      { userId: "u1", userInput: "أبحث عن حليب أطفال", district: "صنعاء" },
      stubAdapter,
    );
    expect(r.marketingAction?.isTriggered).toBe(true);
    expect(r.marketingAction?.channel).toBe("whatsapp");
  });

  it("no marketing action without maternal keyword", async () => {
    const r = await decide(
      { userId: "u1", userInput: "أحتاج مضاد حيوي", district: "تعز" },
      stubAdapter,
    );
    expect(r.marketingAction).toBeNull();
  });
});
