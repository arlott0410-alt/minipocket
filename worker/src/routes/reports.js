import { Router } from "itty-router";

const router = Router({ base: "/api/reports" });

function getRangeFromQuery(query) {
  const period = query.get("period") || "month"; // day | month | year
  const dateInput = query.get("date") || new Date().toISOString().slice(0, 10);
  const base = new Date(dateInput);
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    return {
      period: "month",
      from: `${now.toISOString().slice(0, 7)}-01`,
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      label: now.toISOString().slice(0, 7),
    };
  }

  if (period === "day") {
    const d = base.toISOString().slice(0, 10);
    return { period, from: d, to: d, label: d };
  }

  if (period === "year") {
    const y = base.getFullYear();
    return { period, from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  }

  const month = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
  return {
    period: "month",
    from: `${month}-01`,
    to: new Date(base.getFullYear(), base.getMonth() + 1, 0).toISOString().slice(0, 10),
    label: month,
  };
}

function groupTransactions(txs, period, dateLabel) {
  if (period === "day") {
    const map = {};
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(dateLabel);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      map[key] = { key, income: 0, expense: 0 };
    }
    for (const tx of txs || []) {
      const key = String(tx.transaction_date).slice(5, 10);
      if (!map[key]) continue;
      if (tx.type === "income") map[key].income += Number(tx.amount);
      if (tx.type === "expense") map[key].expense += Number(tx.amount);
    }
    return Object.values(map).map((x) => ({ period: x.key, income: x.income, expense: x.expense }));
  }

  if (period === "year") {
    const year = Number(dateLabel);
    const map = {};
    for (let m = 1; m <= 12; m += 1) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      map[key] = { key: String(m).padStart(2, "0"), income: 0, expense: 0 };
    }
    for (const tx of txs || []) {
      const month = String(tx.transaction_date).slice(5, 7);
      if (!map[`${year}-${month}`]) continue;
      if (tx.type === "income") map[`${year}-${month}`].income += Number(tx.amount);
      if (tx.type === "expense") map[`${year}-${month}`].expense += Number(tx.amount);
    }
    return Object.values(map).map((x) => ({ period: x.key, income: x.income, expense: x.expense }));
  }

  const map = {};
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(`${dateLabel}-01`);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    map[key] = { key, income: 0, expense: 0 };
  }
  for (const tx of txs || []) {
    const key = String(tx.transaction_date).slice(0, 7);
    if (!map[key]) continue;
    if (tx.type === "income") map[key].income += Number(tx.amount);
    if (tx.type === "expense") map[key].expense += Number(tx.amount);
  }
  return Object.values(map).map((x) => ({ period: x.key, income: x.income, expense: x.expense }));
}

router.get("/summary", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const range = getRangeFromQuery(u.searchParams);
  const walletId = u.searchParams.get("wallet_id");
  let q = supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
  const income = (txs || []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (txs || []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return Response.json({ period: range.period, label: range.label, income, expense, net: income - expense });
});

router.get("/chart", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const range = getRangeFromQuery(u.searchParams);
  const walletId = u.searchParams.get("wallet_id");

  let q = supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
  const chart = groupTransactions(txs, range.period, range.label);
  return Response.json({ chart, period: range.period, label: range.label });
});

router.get("/by-category", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const range = getRangeFromQuery(u.searchParams);
  const type = u.searchParams.get("type") || "expense";
  const walletId = u.searchParams.get("wallet_id");
  let q = supabase
    .from("transactions")
    .select("amount, category:categories(name_lo,name_en,emoji)")
    .eq("user_id", user.id)
    .eq("type", type)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
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
