import { Router } from "itty-router";

const router = Router({ base: "/api/admin" });

router.get("/settings", async (req) => {
  const { data } = await req.supabase.from("settings").select("*").order("key");
  return Response.json({ settings: data || [] });
});
router.post("/settings", async (req) => {
  const body = await req.json();
  const updates = Object.entries(body).map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }));
  const { error } = await req.supabase.from("settings").upsert(updates);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
});
router.get("/users", async (req) => {
  const { data } = await req.supabase.from("users").select("*").order("created_at", { ascending: false });
  return Response.json({ users: data || [] });
});
router.patch("/users/:id", async (req) => {
  const body = await req.json();
  const { error } = await req.supabase
    .from("users")
    .update({ is_paid: body.is_paid, paid_until: body.paid_until || null })
    .eq("id", req.params.id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
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
  return Response.json({ category: data }, { status: 201 });
});
router.patch("/categories/:id", async (req) => {
  const body = await req.json();
  const { data, error } = await req.supabase.from("categories").update(body).eq("id", req.params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ category: data });
});

router.get("/payments", async (req) => {
  const u = new URL(req.url);
  const status = u.searchParams.get("status");
  let query = req.supabase
    .from("payment_requests")
    .select("*, user:users(id,telegram_id,first_name,last_name,username)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ payments: data || [] });
});

router.patch("/payments/:id", async (req) => {
  const body = await req.json();
  const nextStatus = body?.status;
  if (!["approved", "rejected", "pending"].includes(nextStatus)) {
    return Response.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: payment, error: readError } = await req.supabase
    .from("payment_requests")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (readError || !payment) return Response.json({ error: "not_found" }, { status: 404 });

  const { data: updated, error } = await req.supabase
    .from("payment_requests")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.admin.email,
      admin_note: body?.admin_note || null,
    })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (nextStatus === "approved") {
    const { data: settings } = await req.supabase.from("settings").select("key,value").eq("key", "free_trial_days").single();
    const paidDays = Number(settings?.value || 30);
    const paidUntil = new Date(Date.now() + paidDays * 24 * 60 * 60 * 1000).toISOString();
    await req.supabase.from("users").update({ is_paid: true, paid_until: paidUntil }).eq("id", payment.user_id);
  }

  return Response.json({ payment: updated });
});

export default router;
