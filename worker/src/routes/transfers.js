import { Router } from "itty-router";

const router = Router({ base: "/api/transfers" });

function precisionByCurrency(currency) {
  return currency === "LAK" ? 0 : 2;
}

function normalizeAmount(amount, currency) {
  const n = Number(amount);
  const precision = precisionByCurrency(currency);
  return Number.isFinite(n) ? Number(n.toFixed(precision)) : NaN;
}

async function canEditWallet(supabase, walletId, userId) {
  const { data: wallet } = await supabase.from("wallets").select("owner_id,currency,balance").eq("id", walletId).single();
  if (!wallet) return { allowed: false, wallet: null };
  if (wallet.owner_id === userId) return { allowed: true, wallet };
  const { data: member } = await supabase
    .from("wallet_members")
    .select("permission")
    .eq("wallet_id", walletId)
    .eq("user_id", userId)
    .single();
  return { allowed: !!member && member.permission === "editor", wallet };
}

router.get("/", async (req) => {
  const { supabase, user } = req;
  const { data } = await supabase
    .from("transfers")
    .select("*, from_wallet:wallets!from_wallet_id(name,currency,color), to_wallet:wallets!to_wallet_id(name,currency,color)")
    .eq("user_id", user.id)
    .order("transferred_at", { ascending: false })
    .limit(100);
  return Response.json({ transfers: data || [] });
});

router.post("/", async (req) => {
  const body = await req.json();
  const { supabase, user } = req;
  if (!body.from_wallet_id || !body.to_wallet_id) return Response.json({ error: "wallet_required" }, { status: 400 });
  if (body.from_wallet_id === body.to_wallet_id) {
    return Response.json({ error: "cannot_transfer_same_wallet" }, { status: 400 });
  }
  const [fromAccess, toAccess] = await Promise.all([
    canEditWallet(supabase, body.from_wallet_id, user.id),
    canEditWallet(supabase, body.to_wallet_id, user.id),
  ]);
  if (!fromAccess.wallet) return Response.json({ error: "from_wallet_not_found" }, { status: 404 });
  if (!toAccess.wallet) return Response.json({ error: "to_wallet_not_found" }, { status: 404 });
  if (!fromAccess.allowed || !toAccess.allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

  const fromAmount = normalizeAmount(body.from_amount, fromAccess.wallet.currency);
  const toAmount = normalizeAmount(body.to_amount, toAccess.wallet.currency);
  const fee = normalizeAmount(body.fee || 0, fromAccess.wallet.currency);
  if (!Number.isFinite(fromAmount) || !Number.isFinite(toAmount) || !Number.isFinite(fee)) {
    return Response.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (fromAmount <= 0 || toAmount <= 0 || fee < 0) return Response.json({ error: "invalid_amount" }, { status: 400 });
  if (Number(fromAccess.wallet.balance) < fromAmount) return Response.json({ error: "insufficient_balance" }, { status: 400 });
  const { data: transfer, error } = await supabase
    .from("transfers")
    .insert({
      from_wallet_id: body.from_wallet_id,
      to_wallet_id: body.to_wallet_id,
      from_amount: fromAmount,
      to_amount: toAmount,
      exchange_rate: body.exchange_rate || null,
      fee,
      note: body.note || null,
      user_id: user.id,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.rpc("increment_balance", { wallet_id: body.from_wallet_id, delta: -fromAmount });
  await supabase.rpc("increment_balance", { wallet_id: body.to_wallet_id, delta: toAmount });
  return Response.json({ transfer }, { status: 201 });
});

export default router;
