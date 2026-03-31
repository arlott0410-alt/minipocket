import { Router } from "itty-router";

const router = Router({ base: "/api/reports" });

async function getAccessibleWalletIds(supabase, userId) {
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("wallets").select("id").eq("owner_id", userId).eq("is_archived", false),
    supabase.from("wallet_members").select("wallet_id").eq("user_id", userId),
  ]);
  const owned = (ownedRes.data || []).map((x) => x.id);
  const sharedIds = (memberRes.data || []).map((x) => x.wallet_id).filter(Boolean);
  let shared = [];
  if (sharedIds.length) {
    const { data: sharedWallets } = await supabase
      .from("wallets")
      .select("id")
      .in("id", sharedIds)
      .eq("is_archived", false);
    shared = (sharedWallets || []).map((x) => x.id);
  }
  return [...new Set([...owned, ...shared])];
}

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
  const walletIds = await getAccessibleWalletIds(supabase, user.id);
  if (!walletIds.length) return Response.json({ period: range.period, label: range.label, income: 0, expense: 0, net: 0, currency_summaries: [] });
  if (walletId && !walletIds.includes(walletId)) return Response.json({ error: "Forbidden" }, { status: 403 });
  let q = supabase
    .from("transactions")
    .select("type, amount, wallet:wallets(currency)")
    .in("wallet_id", walletIds)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
  const grouped = {};
  for (const t of txs || []) {
    const currency = t.wallet?.currency || "N/A";
    if (!grouped[currency]) grouped[currency] = { currency, income: 0, expense: 0, net: 0 };
    if (t.type === "income") grouped[currency].income += Number(t.amount);
    if (t.type === "expense") grouped[currency].expense += Number(t.amount);
    grouped[currency].net = grouped[currency].income - grouped[currency].expense;
  }
  const currency_summaries = Object.values(grouped).sort((a, b) => a.currency.localeCompare(b.currency));
  const base = currency_summaries[0] || { income: 0, expense: 0, net: 0 };
  return Response.json({
    period: range.period,
    label: range.label,
    income: walletId ? base.income : 0,
    expense: walletId ? base.expense : 0,
    net: walletId ? base.net : 0,
    currency_summaries,
  });
});

router.get("/chart", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const range = getRangeFromQuery(u.searchParams);
  const walletId = u.searchParams.get("wallet_id");
  const walletIds = await getAccessibleWalletIds(supabase, user.id);
  if (!walletIds.length) return Response.json({ chart: [], chart_by_currency: {}, currencies: [], period: range.period, label: range.label });
  if (walletId && !walletIds.includes(walletId)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let q = supabase
    .from("transactions")
    .select("type, amount, transaction_date, wallet:wallets(currency)")
    .in("wallet_id", walletIds)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
  const byCurrency = {};
  for (const t of txs || []) {
    const currency = t.wallet?.currency || "N/A";
    if (!byCurrency[currency]) byCurrency[currency] = [];
    byCurrency[currency].push(t);
  }
  const chart_by_currency = Object.fromEntries(
    Object.entries(byCurrency).map(([currency, rows]) => [currency, groupTransactions(rows, range.period, range.label)]),
  );
  const currencies = Object.keys(chart_by_currency).sort();
  const chart = walletId && currencies[0] ? chart_by_currency[currencies[0]] : [];
  return Response.json({ chart, chart_by_currency, currencies, period: range.period, label: range.label });
});

router.get("/by-category", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const range = getRangeFromQuery(u.searchParams);
  const type = u.searchParams.get("type") || "expense";
  const walletId = u.searchParams.get("wallet_id");
  const walletIds = await getAccessibleWalletIds(supabase, user.id);
  if (!walletIds.length) return Response.json({ categories: [], categories_by_currency: {} });
  if (walletId && !walletIds.includes(walletId)) return Response.json({ error: "Forbidden" }, { status: 403 });
  let q = supabase
    .from("transactions")
    .select("amount, category:categories(name_lo,name_en,name_th,emoji), wallet:wallets(currency)")
    .in("wallet_id", walletIds)
    .eq("type", type)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);
  if (walletId) q = q.eq("wallet_id", walletId);
  const { data: txs } = await q;
  const grouped = {};
  const groupedByCurrency = {};
  for (const t of txs || []) {
    const key = t.category?.name_en || "Other";
    const currency = t.wallet?.currency || "N/A";
    if (!grouped[key]) {
      grouped[key] = {
        name_en: key,
        name_lo: t.category?.name_lo || "ອື່ນໆ",
        name_th: t.category?.name_th || t.category?.name_en || "Other",
        emoji: t.category?.emoji || "📝",
        total: 0,
      };
    }
    grouped[key].total += Number(t.amount);
    if (!groupedByCurrency[currency]) groupedByCurrency[currency] = {};
    if (!groupedByCurrency[currency][key]) {
      groupedByCurrency[currency][key] = {
        name_en: key,
        name_lo: t.category?.name_lo || "ອື່ນໆ",
        name_th: t.category?.name_th || t.category?.name_en || "Other",
        emoji: t.category?.emoji || "📝",
        total: 0,
      };
    }
    groupedByCurrency[currency][key].total += Number(t.amount);
  }
  const categories_by_currency = Object.fromEntries(
    Object.entries(groupedByCurrency).map(([currency, rows]) => [currency, Object.values(rows).sort((a, b) => b.total - a.total)]),
  );
  return Response.json({
    categories: Object.values(grouped).sort((a, b) => b.total - a.total),
    categories_by_currency,
  });
});

export default router;
