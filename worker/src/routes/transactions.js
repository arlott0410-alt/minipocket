import { Router } from "itty-router";

const router = Router({ base: "/api/transactions" });

function precisionByCurrency(currency) {
  return currency === "LAK" ? 0 : 2;
}

function normalizeAmount(amount, currency) {
  const n = Number(amount);
  const precision = precisionByCurrency(currency);
  return Number.isFinite(n) ? Number(n.toFixed(precision)) : NaN;
}

async function getAccessibleWalletIds(supabase, userId) {
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("wallets").select("id").eq("owner_id", userId).eq("is_archived", false),
    supabase.from("wallet_members").select("wallet_id").eq("user_id", userId),
  ]);
  const owned = (ownedRes.data || []).map((x) => x.id);
  const shared = (memberRes.data || []).map((x) => x.wallet_id).filter(Boolean);
  return [...new Set([...owned, ...shared])];
}

async function canEditWallet(supabase, walletId, userId) {
  const { data: wallet } = await supabase.from("wallets").select("owner_id").eq("id", walletId).single();
  if (!wallet) return false;
  if (wallet.owner_id === userId) return true;
  const { data: member } = await supabase
    .from("wallet_members")
    .select("permission")
    .eq("wallet_id", walletId)
    .eq("user_id", userId)
    .single();
  return !!member && member.permission === "editor";
}

router.get("/", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const wallet_id = u.searchParams.get("wallet_id");
  const type = u.searchParams.get("type");
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const category_id = u.searchParams.get("category_id");
  const limit = Number(u.searchParams.get("limit") || 50);
  const offset = Number(u.searchParams.get("offset") || 0);
  const walletIds = await getAccessibleWalletIds(supabase, user.id);
  if (!walletIds.length) return Response.json({ transactions: [], total: 0 });
  if (wallet_id && !walletIds.includes(wallet_id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let q = supabase
    .from("transactions")
    .select("*, category:categories(name_lo,name_en,emoji), wallet:wallets(name,currency,color)", { count: "exact" })
    .in("wallet_id", walletIds)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (wallet_id) q = q.eq("wallet_id", wallet_id);
  if (type) q = q.eq("type", type);
  if (from) q = q.gte("transaction_date", from);
  if (to) q = q.lte("transaction_date", to);
  if (category_id) q = q.eq("category_id", category_id);
  const { data, count, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ transactions: data || [], total: count || 0 });
});

router.post("/", async (req) => {
  const body = await req.json();
  const { supabase, user } = req;
  const { data: wallet } = await supabase.from("wallets").select("owner_id,currency").eq("id", body.wallet_id).single();
  if (!wallet) return Response.json({ error: "wallet_not_found" }, { status: 404 });
  if (wallet.owner_id !== user.id) {
    const { data: member } = await supabase
      .from("wallet_members")
      .select("permission")
      .eq("wallet_id", body.wallet_id)
      .eq("user_id", user.id)
      .single();
    if (!member || member.permission !== "editor") return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const amount = normalizeAmount(body.amount, wallet.currency);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "invalid_amount" }, { status: 400 });
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      wallet_id: body.wallet_id,
      user_id: user.id,
      type: body.type,
      amount,
      category_id: body.category_id || null,
      note: body.note || null,
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const delta = body.type === "income" ? amount : -amount;
  await supabase.rpc("increment_balance", { wallet_id: body.wallet_id, delta });
  return Response.json({ transaction: tx }, { status: 201 });
});

router.patch("/:id", async (req) => {
  const body = await req.json();
  const { supabase, user, params } = req;
  const { data: old } = await supabase.from("transactions").select("*, wallet:wallets(owner_id,currency)").eq("id", params.id).single();
  if (!old) return Response.json({ error: "Not found" }, { status: 404 });
  const canEdit = await canEditWallet(supabase, old.wallet_id, user.id);
  if (!canEdit) return Response.json({ error: "Forbidden" }, { status: 403 });
  const nextType = body.type || old.type;
  const nextDate = body.transaction_date || old.transaction_date;
  const amount = normalizeAmount(body.amount ?? old.amount, old.wallet?.currency);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "invalid_amount" }, { status: 400 });

  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: nextType,
      amount,
      category_id: body.category_id ?? old.category_id ?? null,
      note: body.note ?? old.note ?? null,
      transaction_date: nextDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const oldDelta = old.type === "income" ? -Number(old.amount) : Number(old.amount);
  const newDelta = nextType === "income" ? amount : -amount;
  await supabase.rpc("increment_balance", { wallet_id: old.wallet_id, delta: oldDelta });
  await supabase.rpc("increment_balance", { wallet_id: old.wallet_id, delta: newDelta });
  return Response.json({ transaction: data });
});

router.delete("/:id", async (req) => {
  const { supabase, user, params } = req;
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!tx) return Response.json({ error: "Not found" }, { status: 404 });
  const canEdit = await canEditWallet(supabase, tx.wallet_id, user.id);
  if (!canEdit) return Response.json({ error: "Forbidden" }, { status: 403 });
  const delta = tx.type === "income" ? -Number(tx.amount) : Number(tx.amount);
  await supabase.rpc("increment_balance", { wallet_id: tx.wallet_id, delta });
  await supabase.from("transactions").delete().eq("id", params.id);
  return Response.json({ success: true });
});

export default router;
