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

export default router;
