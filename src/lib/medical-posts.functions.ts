import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// Public: list approved posts
export const listApprovedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("medical_posts")
    .select("id, title, slug, summary, category, tags, published_at, publish_date, cover_image_url")
    .eq("approved", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);
  return { posts: data ?? [] };
});

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row } = await client
      .from("medical_posts")
      .select("*")
      .eq("approved", true)
      .eq("slug", data.slug)
      .maybeSingle();
    return { post: row };
  });

// Admin: list all posts (pending + approved)
export const adminListPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data } = await context.supabase
      .from("medical_posts")
      .select("id, title, slug, category, approved, publish_date, ai_generated, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { posts: data ?? [] };
  });

const ApproveInput = z.object({ postId: z.string().uuid(), approve: z.boolean() });
export const adminApprovePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("medical_posts")
      .update({
        approved: data.approve,
        approved_at: data.approve ? new Date().toISOString() : null,
        approved_by: data.approve ? context.userId : null,
        published_at: data.approve ? new Date().toISOString() : null,
      })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row } = await context.supabase
      .from("medical_posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    return { post: row };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  summary: z.string().max(500),
  content: z.string().min(1),
});
export const adminUpdatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("medical_posts")
      .update({ title: data.title, summary: data.summary, content: data.content })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
