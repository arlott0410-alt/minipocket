import { Router } from "itty-router";

const router = Router({ base: "/api/transactions" });

const TX_TYPES = new Set(["income", "expense", "transfer_in", "transfer_out"]);

/** Positive delta increases wallet balance (income-like); negative decreases (expense-like). */
function balanceDeltaForType(type, amount) {
  const a = Number(amount);
  if (type === "income" || type === "transfer_in") return a;
  if (type === "expense" || type === "transfer_out") return -a;
  return 0;
}

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

function txAuditSnapshot(row) {
  if (!row) return null;
  return {
    type: row.type,
    amount: row.amount,
    note: row.note ?? null,
    transaction_date: row.transaction_date,
  };
}

/** Owner sees this in share UI when a member (non-owner) edits or deletes a transaction. */
async function logShareMemberTxActivity(supabase, { walletOwnerId, actorId, walletId, action, transactionId, payload }) {
  if (!walletOwnerId || walletOwnerId === actorId) return;
  const { error } = await supabase.from("wallet_share_activity_log").insert({
    wallet_id: walletId,
    actor_user_id: actorId,
    action,
    transaction_id: transactionId || null,
    payload: payload || {},
  });
  if (error) console.error("wallet_share_activity_log insert failed", error);
}

router.get("/", async (req) => {
  const { supabase, user } = req;
  const u = new URL(req.url);
  const wallet_id = u.searchParams.get("wallet_id");
  const type = u.searchParams.get("type");
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const category_id = u.searchParams.get("category_id");
  const requestedLimit = Number(u.searchParams.get("limit") || 50);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
  const offset = Number(u.searchParams.get("offset") || 0);
  const walletIds = await getAccessibleWalletIds(supabase, user.id);
  if (!walletIds.length) return Response.json({ transactions: [], total: 0 });
  if (wallet_id && !walletIds.includes(wallet_id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let q = supabase
    .from("transactions")
    .select("*, category:categories(name_lo,name_en,name_th,emoji), wallet:wallets(name,currency,color)", { count: "exact" })
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
  if (!TX_TYPES.has(body.type)) return Response.json({ error: "invalid_type" }, { status: 400 });
  const amount = normalizeAmount(body.amount, wallet.currency);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "invalid_amount" }, { status: 400 });
  const isTransfer = body.type === "transfer_in" || body.type === "transfer_out";
  const category_id = isTransfer ? null : body.category_id || null;
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      wallet_id: body.wallet_id,
      user_id: user.id,
      type: body.type,
      amount,
      category_id,
      note: body.note || null,
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const delta = balanceDeltaForType(body.type, amount);
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
  if (!TX_TYPES.has(nextType)) return Response.json({ error: "invalid_type" }, { status: 400 });
  const nextDate = body.transaction_date || old.transaction_date;
  const amount = normalizeAmount(body.amount ?? old.amount, old.wallet?.currency);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "invalid_amount" }, { status: 400 });
  const nextIsTransfer = nextType === "transfer_in" || nextType === "transfer_out";
  const nextCategory =
    nextIsTransfer ? null : body.category_id !== undefined ? body.category_id : old.category_id ?? null;

  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: nextType,
      amount,
      category_id: nextCategory,
      note: body.note ?? old.note ?? null,
      transaction_date: nextDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const oldDelta = -balanceDeltaForType(old.type, old.amount);
  const newDelta = balanceDeltaForType(nextType, amount);
  await supabase.rpc("increment_balance", { wallet_id: old.wallet_id, delta: oldDelta });
  await supabase.rpc("increment_balance", { wallet_id: old.wallet_id, delta: newDelta });
  await logShareMemberTxActivity(supabase, {
    walletOwnerId: old.wallet?.owner_id,
    actorId: user.id,
    walletId: old.wallet_id,
    action: "transaction_updated",
    transactionId: params.id,
    payload: { before: txAuditSnapshot(old), after: txAuditSnapshot(data) },
  });
  return Response.json({ transaction: data });
});

router.delete("/:id", async (req) => {
  const { supabase, user, params } = req;
  const { data: tx } = await supabase.from("transactions").select("*, wallet:wallets(owner_id)").eq("id", params.id).single();
  if (!tx) return Response.json({ error: "Not found" }, { status: 404 });
  const canEdit = await canEditWallet(supabase, tx.wallet_id, user.id);
  if (!canEdit) return Response.json({ error: "Forbidden" }, { status: 403 });
  await logShareMemberTxActivity(supabase, {
    walletOwnerId: tx.wallet?.owner_id,
    actorId: user.id,
    walletId: tx.wallet_id,
    action: "transaction_deleted",
    transactionId: tx.id,
    payload: { transaction: txAuditSnapshot(tx) },
  });
  const delta = -balanceDeltaForType(tx.type, tx.amount);
  await supabase.rpc("increment_balance", { wallet_id: tx.wallet_id, delta });
  await supabase.from("transactions").delete().eq("id", params.id);
  return Response.json({ success: true });
});

export default router;
