import { Router } from "itty-router";

const router = Router({ base: "/api/transfers" });

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
  const { data: fromW } = await supabase.from("wallets").select("owner_id, balance").eq("id", body.from_wallet_id).single();
  const { data: toW } = await supabase.from("wallets").select("owner_id").eq("id", body.to_wallet_id).single();
  if (!fromW || fromW.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!toW) return Response.json({ error: "to_wallet_not_found" }, { status: 404 });
  const fromAmount = Number(Number(body.from_amount).toFixed(4));
  const toAmount = Number(Number(body.to_amount).toFixed(4));
  if (Number(fromW.balance) < fromAmount) return Response.json({ error: "insufficient_balance" }, { status: 400 });
  const { data: transfer, error } = await supabase
    .from("transfers")
    .insert({
      from_wallet_id: body.from_wallet_id,
      to_wallet_id: body.to_wallet_id,
      from_amount: fromAmount,
      to_amount: toAmount,
      exchange_rate: body.exchange_rate || null,
      fee: Number(Number(body.fee || 0).toFixed(4)),
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
