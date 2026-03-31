import { Router } from "itty-router";

const router = Router({ base: "/api/wallets" });

router.get("/", async (req) => {
  const { supabase, user } = req;
  const { data: owned, error: ownedError } = await supabase
    .from("wallets")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_archived", false)
    .order("created_at");
  if (ownedError) return Response.json({ error: ownedError.message }, { status: 400 });

  const { data: memberRows, error: membersError } = await supabase
    .from("wallet_members")
    .select("permission, wallet_id")
    .eq("user_id", user.id);
  if (membersError) return Response.json({ error: membersError.message }, { status: 400 });

  const sharedWalletIds = [...new Set((memberRows || []).map((m) => m.wallet_id).filter(Boolean))];
  let shared = [];
  if (sharedWalletIds.length) {
    const { data: sharedWallets, error: sharedError } = await supabase
      .from("wallets")
      .select("*")
      .in("id", sharedWalletIds)
      .eq("is_archived", false);
    if (sharedError) return Response.json({ error: sharedError.message }, { status: 400 });

    const memberMap = Object.fromEntries((memberRows || []).map((m) => [m.wallet_id, m.permission]));
    shared = (sharedWallets || []).map((w) => ({
      ...w,
      permission: memberMap[w.id] || "viewer",
      is_shared: true,
    }));
  }

  return Response.json({ owned: owned || [], shared });
});

router.post("/", async (req) => {
  const body = await req.json();
  const { supabase, user } = req;
  const { data: settings } = await supabase
    .from("settings")
    .select("key,value")
    .in("key", ["max_wallets_free", "max_wallets_paid"]);
  const m = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
  const maxWallets = user.is_paid ? Number(m.max_wallets_paid || 20) : Number(m.max_wallets_free || 2);
  const { count } = await supabase
    .from("wallets")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("is_archived", false);
  if ((count || 0) >= maxWallets) return Response.json({ error: "wallet_limit_reached", maxWallets }, { status: 403 });

  const { data: currency, error: currencyError } = await supabase
    .from("currencies")
    .select("code")
    .eq("code", body.currency)
    .eq("is_active", true)
    .single();
  if (currencyError || !currency) return Response.json({ error: "unsupported_currency" }, { status: 400 });

  const { data, error } = await supabase
    .from("wallets")
    .insert({
      owner_id: user.id,
      name: body.name,
      currency: body.currency,
      color: body.color || "#6366f1",
      icon: body.icon || "💰",
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ wallet: data }, { status: 201 });
});

router.patch("/:id", async (req) => {
  const body = await req.json();
  const { supabase, user, params } = req;
  const { data, error } = await supabase
    .from("wallets")
    .update({
      name: body.name,
      color: body.color,
      icon: body.icon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ wallet: data });
});

router.delete("/:id", async (req) => {
  const { supabase, user, params } = req;
  await supabase.from("wallets").update({ is_archived: true }).eq("id", params.id).eq("owner_id", user.id);
  return Response.json({ success: true });
});

router.post("/:id/share", async (req) => {
  const { telegram_id, permission } = await req.json();
  const { supabase, user, params } = req;
  const { data: wallet } = await supabase.from("wallets").select("owner_id").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { data: target } = await supabase.from("users").select("id").eq("telegram_id", telegram_id).single();
  if (!target) return Response.json({ error: "user_not_found" }, { status: 404 });
  const { error } = await supabase
    .from("wallet_members")
    .upsert({ wallet_id: params.id, user_id: target.id, permission: permission || "viewer" });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
});

router.delete("/:id/members/:userId", async (req) => {
  const { supabase, user, params } = req;
  const { data: wallet } = await supabase.from("wallets").select("owner_id").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  await supabase.from("wallet_members").delete().eq("wallet_id", params.id).eq("user_id", params.userId);
  return Response.json({ success: true });
});

export default router;
