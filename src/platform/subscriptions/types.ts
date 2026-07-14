type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface OrganizationSubscription {
  organization_id: string;
  plan: string;
  features: { [key: string]: JsonValue };
  limits: { [key: string]: JsonValue };
  usage: { [key: string]: JsonValue };
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
