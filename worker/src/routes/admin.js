import { Router } from "itty-router";

const router = Router({ base: "/api/admin" });
const TELEGRAM_API_BASE = "https://api.telegram.org";

async function logAdminAction(req, action, payload = {}) {
  try {
    await req.supabase.from("admin_audit_logs").insert({
      admin_email: req.admin?.email || "unknown",
      action,
      payload,
    });
  } catch {
    // Keep admin operations non-blocking even if audit table migration is pending.
  }
}

function safeText(value) {
  return String(value || "").trim();
}

async function sendTelegramBroadcast(env, telegramId, { message, imageUrl }) {
  const token = env.BOT_TOKEN;
  if (!token) throw new Error("missing_bot_token");
  const chatId = String(telegramId);
  if (imageUrl) {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: message || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.description || "send_photo_failed");
    return;
  }

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.description || "send_message_failed");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.get("/settings", async (req) => {
  const { data } = await req.supabase.from("settings").select("*").order("key");
  return Response.json({ settings: data || [] });
});
router.post("/settings", async (req) => {
  const body = await req.json();
  const updates = Object.entries(body).map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }));
  const { error } = await req.supabase.from("settings").upsert(updates);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAdminAction(req, "settings.bulk_update", { keys: Object.keys(body) });
  return Response.json({ success: true });
});
router.get("/users", async (req) => {
  const { data } = await req.supabase.from("users").select("*").order("created_at", { ascending: false });
  return Response.json({ users: data || [] });
});
router.patch("/users/:id", async (req) => {
  const body = await req.json();
  let nextPaidUntil = body.paid_until || null;
  let nextIsPaid = body.is_paid;

  if (body.plan_duration_days) {
    const days = Number(body.plan_duration_days);
    if (![30, 180, 365].includes(days)) {
      return Response.json({ error: "invalid_plan_duration_days" }, { status: 400 });
    }

    const { data: existingUser } = await req.supabase
      .from("users")
      .select("paid_until")
      .eq("id", req.params.id)
      .single();
    const base = existingUser?.paid_until && new Date(existingUser.paid_until).getTime() > Date.now()
      ? new Date(existingUser.paid_until)
      : new Date();
    base.setDate(base.getDate() + days);
    nextPaidUntil = base.toISOString();
    nextIsPaid = true;
  }

  const { error } = await req.supabase
    .from("users")
    .update({ is_paid: nextIsPaid, paid_until: nextPaidUntil })
    .eq("id", req.params.id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAdminAction(req, "users.subscription_update", {
    user_id: req.params.id,
    is_paid: nextIsPaid,
    paid_until: nextPaidUntil,
    plan_duration_days: body.plan_duration_days || null,
  });
  return Response.json({ success: true });
});
router.get("/currencies", async (req) => {
  const { data } = await req.supabase.from("currencies").select("*").order("sort_order");
  return Response.json({ currencies: data || [] });
});
router.post("/currencies", async (req) => {
  const body = await req.json();
  const { data, error } = await req.supabase.from("currencies").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAdminAction(req, "currencies.create", { code: data.code });
  return Response.json({ currency: data }, { status: 201 });
});
router.get("/categories", async (req) => {
  const { data } = await req.supabase.from("categories").select("*").order("sort_order");
  return Response.json({ categories: data || [] });
});
router.post("/categories", async (req) => {
  const body = await req.json();
  const { data, error } = await req.supabase.from("categories").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAdminAction(req, "categories.create", { id: data.id, name_en: data.name_en });
  return Response.json({ category: data }, { status: 201 });
});
router.patch("/categories/:id", async (req) => {
  const body = await req.json();
  const { data, error } = await req.supabase.from("categories").update(body).eq("id", req.params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logAdminAction(req, "categories.update", { id: req.params.id, fields: Object.keys(body || {}) });
  return Response.json({ category: data });
});

router.get("/payments", async (req) => {
  return Response.json({ error: "payment_request_disabled_contact_admin" }, { status: 410 });
});

router.get("/audit-logs", async (req) => {
  const { data, error } = await req.supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ logs: data || [] });
});

router.get("/broadcast-logs", async (req) => {
  const { data, error } = await req.supabase
    .from("admin_broadcast_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ logs: data || [] });
});

router.post("/broadcast", async (req, env) => {
  const body = await req.json().catch(() => ({}));
  const target = ["all", "paid", "free"].includes(body.target) ? body.target : "all";
  const message = safeText(body.message);
  const imageUrl = safeText(body.image_url);
  if (!message) return Response.json({ error: "message_required" }, { status: 400 });

  let query = req.supabase.from("users").select("telegram_id,is_paid").not("telegram_id", "is", null);
  if (target === "paid") query = query.eq("is_paid", true);
  if (target === "free") query = query.eq("is_paid", false);
  const { data: users, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const rows = (users || []).filter((u) => u.telegram_id);
  let sentCount = 0;
  let failedCount = 0;
  const failedSamples = [];
  const BATCH_SIZE = 20;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (u) => {
        try {
          await sendTelegramBroadcast(env, u.telegram_id, { message, imageUrl });
          return { ok: true };
        } catch (e) {
          return { ok: false, reason: e?.message || "send_failed", telegram_id: String(u.telegram_id) };
        }
      }),
    );
    for (const r of results) {
      if (r.ok) sentCount += 1;
      else {
        failedCount += 1;
        if (failedSamples.length < 10) failedSamples.push({ telegram_id: r.telegram_id, reason: r.reason });
      }
    }
    if (i + BATCH_SIZE < rows.length) await sleep(150);
  }

  await req.supabase.from("admin_broadcast_logs").insert({
    admin_email: req.admin?.email || "unknown",
    target,
    message,
    image_url: imageUrl || null,
    total_users: rows.length,
    sent_count: sentCount,
    failed_count: failedCount,
    failed_samples: failedSamples,
  });
  await logAdminAction(req, "broadcast.send", {
    target,
    total_users: rows.length,
    sent_count: sentCount,
    failed_count: failedCount,
  });

  return Response.json({
    success: true,
    total_users: rows.length,
    sent_count: sentCount,
    failed_count: failedCount,
    failed_samples: failedSamples,
  });
});

router.patch("/payments/:id", async (req) => {
  return Response.json({ error: "payment_request_disabled_contact_admin" }, { status: 410 });
});

export default router;
