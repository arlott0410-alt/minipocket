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

export default router;
