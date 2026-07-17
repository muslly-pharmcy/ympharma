import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";

const TrackInput = z.object({
  visitorToken: z.string().min(8),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
});

function detectDevice(ua: string): { device: string; browser: string } {
  const uaL = ua.toLowerCase();
  let device = "desktop";
  if (/mobi|iphone|android/.test(uaL) && !/ipad|tablet/.test(uaL)) device = "mobile";
  else if (/ipad|tablet/.test(uaL)) device = "tablet";
  let browser = "unknown";
  if (uaL.includes("edg/")) browser = "edge";
  else if (uaL.includes("chrome/")) browser = "chrome";
  else if (uaL.includes("firefox/")) browser = "firefox";
  else if (uaL.includes("safari/")) browser = "safari";
  return { device, browser };
}

export const trackVisitor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrackInput.parse(input))
  .handler(async ({ data }) => {
    const req = getRequest();
    const headers = req.headers;
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "0.0.0.0";
    const country =
      headers.get("cf-ipcountry") ||
      headers.get("x-vercel-ip-country") ||
      headers.get("x-country-code") ||
      null;
    const acceptLang = headers.get("accept-language") || "";
    const language = acceptLang.split(",")[0]?.split("-")[0]?.toLowerCase() || null;
    const ua = headers.get("user-agent") || "";
    const { device, browser } = detectDevice(ua);
    const ipHash = createHash("sha256").update(ip + (process.env.SUPABASE_URL || "")).digest("hex").slice(0, 32);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("visitor_sessions")
      .select("id, pages_viewed")
      .eq("visitor_token", data.visitorToken)
      .maybeSingle();

    if (existing) {
      const pages = Array.isArray(existing.pages_viewed) ? existing.pages_viewed : [];
      if (data.path) pages.push({ p: data.path, t: Date.now() });
      await supabaseAdmin
        .from("visitor_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          pages_viewed: pages.slice(-50) as never,
          first_visit: false,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("visitor_sessions").insert({
        visitor_token: data.visitorToken,
        ip_hash: ipHash,
        country,
        language,
        device,
        browser,
        pages_viewed: (data.path ? [{ p: data.path, t: Date.now() }] : []) as never,
      });
    }

    return { ok: true, country, language, device };
  });

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY || "" };
});
