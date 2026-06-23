// MSW request handlers for tests. Add app endpoints here as the suite grows.
import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("/api/public/whatsapp-agent", () =>
    HttpResponse.json({ reply: "مرحباً! كيف يمكنني مساعدتك؟", intent: "help", escalated: false }),
  ),
  http.post("/api/public/hooks/run-reactivation", () =>
    HttpResponse.json({ success: true, sent: 5 }),
  ),
  http.get("/api/public/health", () =>
    HttpResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      summary: { passed: 8, failed: 0, warnings: 0, total: 8 },
    }),
  ),
];
