// Types for the SuperBrain sovereign decision core.
export type ToolCategory =
  | "medical"
  | "logistic"
  | "commercial"
  | "maternal"
  | "code_dev"
  | "finance_exp"
  | "geo_expansion"
  | "attack_mkt";

export interface CognitiveTool {
  code: string;
  name: string;
  category: ToolCategory;
  isLocked: boolean;
  accuracyRate: number;
}

export interface LogisticAction {
  targetBranch: string;
  pharmacyId: string | null;
  distanceKm: number | null;
  timeMin: number;
}

export interface MarketingAction {
  isTriggered: boolean;
  message: string;
  channel: "whatsapp" | "sms" | "app";
}

export interface BrainDecisionMatrix {
  decisionId: string;
  isSafe: boolean;
  proposedAction: string;
  alternativeSuggested: string | null;
  logisticAction: LogisticAction | null;
  marketingAction: MarketingAction | null;
  dispatchedTools: string[];
  executionSpeedMs: number;
}

export interface PatientContext {
  chronicConditions?: string[]; // e.g. ["diabetes","hypertension"]
  ageBand?: "child" | "adult" | "elderly";
  pregnant?: boolean;
}

export interface BrainInput {
  userId: string;
  userInput: string;
  district: string;
  lat?: number;
  lng?: number;
  patient?: PatientContext;
}

// Adapter the pure core uses to fetch real data without depending on Supabase directly.
export interface BrainAdapter {
  findNearbyPharmacy(
    medicineHint: string,
    lat: number | undefined,
    lng: number | undefined,
    district: string,
  ): Promise<{ id: string; name: string; distanceKm: number | null } | null>;
  suggestAlternative(medicineHint: string): Promise<string | null>;
}
