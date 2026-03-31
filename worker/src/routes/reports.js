import { Router } from "itty-router";

const router = Router({ base: "/api/reports" });

router.get("/summary", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const month = u.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", from)
    .lte("transaction_date", to);
  const income = (txs || []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (txs || []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return Response.json({ month, income, expense, net: income - expense });
});

router.get("/chart", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const months = Number(u.searchParams.get("months") || 6);
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  const from = start.toISOString().slice(0, 10);
  const end = new Date();
  const to = new Date(end.getFullYear(), end.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .gte("transaction_date", from)
    .lte("transaction_date", to);

  const monthMap = {};
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toISOString().slice(0, 7);
    monthMap[month] = { month, income: 0, expense: 0 };
  }

  for (const tx of txs || []) {
    const month = String(tx.transaction_date).slice(0, 7);
    if (!monthMap[month]) continue;
    if (tx.type === "income") monthMap[month].income += Number(tx.amount);
    if (tx.type === "expense") monthMap[month].expense += Number(tx.amount);
  }

  const chart = Object.values(monthMap);
  return Response.json({ chart });
});

router.get("/by-category", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const month = u.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const type = u.searchParams.get("type") || "expense";
  const from = `${month}-01`;
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, category:categories(name_lo,name_en,emoji)")
    .eq("user_id", user.id)
    .eq("type", type)
    .gte("transaction_date", from)
    .lte("transaction_date", to);
  const grouped = {};
  for (const t of txs || []) {
    const key = t.category?.name_en || "Other";
    if (!grouped[key]) {
      grouped[key] = { name_en: key, name_lo: t.category?.name_lo || "ອື່ນໆ", emoji: t.category?.emoji || "📝", total: 0 };
    }
    grouped[key].total += Number(t.amount);
  }
  return Response.json({ categories: Object.values(grouped).sort((a, b) => b.total - a.total) });
});

export default router;
