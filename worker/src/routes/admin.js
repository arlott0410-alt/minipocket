import { Router } from "itty-router";

const router = Router({ base: "/api/admin" });

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

router.patch("/payments/:id", async (req) => {
  return Response.json({ error: "payment_request_disabled_contact_admin" }, { status: 410 });
});

export default router;
