import { Router } from "itty-router";

const router = Router({ base: "/api/users" });

router.get("/me", async (req) => {
  return Response.json({ user: req.user });
});

router.get("/meta", async (req) => {
  const [settingsRes, currenciesRes, categoriesRes] = await Promise.all([
    req.supabase.from("settings").select("key,value"),
    req.supabase.from("currencies").select("*").eq("is_active", true).order("sort_order"),
    req.supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const settings = Object.fromEntries((settingsRes.data || []).map((s) => [s.key, s.value]));
  return Response.json({
    settings,
    currencies: currenciesRes.data || [],
    categories: categoriesRes.data || [],
  });
});

router.get("/settings", async (req) => {
  const { data } = await req.supabase.from("settings").select("key,value");
  return Response.json({
    settings: Object.fromEntries((data || []).map((s) => [s.key, s.value])),
  });
});

router.get("/payments", async (req) => {
  const { data, error } = await req.supabase
    .from("payment_requests")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ payments: data || [] });
});

router.post("/payments", async (req) => {
  const body = await req.json();
  if (!body?.amount_lak) return Response.json({ error: "amount_required" }, { status: 400 });

  const { data, error } = await req.supabase
    .from("payment_requests")
    .insert({
      user_id: req.user.id,
      amount_lak: Number(body.amount_lak),
      transfer_ref: body.transfer_ref || null,
      note: body.note || null,
      slip_url: body.slip_url || null,
      status: "pending",
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ payment: data }, { status: 201 });
});

export default router;
