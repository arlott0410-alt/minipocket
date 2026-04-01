import { Router } from "itty-router";

const router = Router({ base: "/api/wallets" });

function precisionByCurrency(currency) {
  return currency === "LAK" ? 0 : 2;
}

function normalizeAmount(amount, currency) {
  const n = Number(amount || 0);
  const precision = precisionByCurrency(currency);
  return Number.isFinite(n) ? Number(n.toFixed(precision)) : NaN;
}

function hasActiveSubscription(user) {
  if (!user?.is_paid || !user?.paid_until) return false;
  return new Date(user.paid_until).getTime() > Date.now();
}

async function getUserById(supabase, id) {
  const { data } = await supabase.from("users").select("id,is_paid,paid_until").eq("id", id).single();
  return data || null;
}

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
  const initialBalance = normalizeAmount(body.initial_balance || 0, body.currency);
  if (!Number.isFinite(initialBalance) || initialBalance < 0) {
    return Response.json({ error: "invalid_amount" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("wallets")
    .insert({
      owner_id: user.id,
      name: body.name,
      currency: body.currency,
      balance: initialBalance,
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
  const { data: target } = await supabase.from("users").select("id,is_paid,paid_until").eq("telegram_id", telegram_id).single();
  if (!target) return Response.json({ error: "user_not_found" }, { status: 404 });
  if (!hasActiveSubscription(user) || !hasActiveSubscription(target)) {
    return Response.json({ error: "subscription_required_for_both_users" }, { status: 403 });
  }
  const { error } = await supabase
    .from("wallet_members")
    .upsert({ wallet_id: params.id, user_id: target.id, permission: permission || "viewer" });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
});

router.get("/:id/shares", async (req) => {
  const { supabase, user, params } = req;
  const { data: wallet } = await supabase.from("wallets").select("id,owner_id,name").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [membersRes, pendingRes, linksRes] = await Promise.all([
    supabase
      .from("wallet_members")
      .select("permission,user:users(id,telegram_id,first_name,last_name,username)")
      .eq("wallet_id", params.id),
    supabase
      .from("wallet_share_invites")
      .select("id,permission,status,created_at,target_user:users!target_user_id(id,telegram_id,first_name,last_name,username)")
      .eq("wallet_id", params.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("wallet_share_links")
      .select("id,token,permission,is_active,max_uses,used_count,expires_at,created_at")
      .eq("wallet_id", params.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);
  if (membersRes.error) return Response.json({ error: membersRes.error.message }, { status: 400 });
  if (pendingRes.error) return Response.json({ error: pendingRes.error.message }, { status: 400 });
  if (linksRes.error) return Response.json({ error: linksRes.error.message }, { status: 400 });

  return Response.json({
    wallet,
    members: membersRes.data || [],
    pending_invites: pendingRes.data || [],
    share_links: linksRes.data || [],
  });
});

router.post("/:id/share-invites", async (req) => {
  const { telegram_id, permission } = await req.json();
  const { supabase, user, params } = req;
  const normalizedPermission = permission === "editor" ? "editor" : "viewer";
  if (!telegram_id) return Response.json({ error: "telegram_id_required" }, { status: 400 });

  const [{ data: wallet }, { data: target }] = await Promise.all([
    supabase.from("wallets").select("id,owner_id,name").eq("id", params.id).single(),
    supabase.from("users").select("id,telegram_id,is_paid,paid_until").eq("telegram_id", telegram_id).single(),
  ]);
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!target) return Response.json({ error: "user_not_found" }, { status: 404 });
  if (target.id === user.id) return Response.json({ error: "cannot_share_with_self" }, { status: 400 });
  if (!hasActiveSubscription(user) || !hasActiveSubscription(target)) {
    return Response.json({ error: "subscription_required_for_both_users" }, { status: 403 });
  }

  const { data: member } = await supabase
    .from("wallet_members")
    .select("wallet_id")
    .eq("wallet_id", params.id)
    .eq("user_id", target.id)
    .maybeSingle();
  if (member) return Response.json({ error: "already_shared" }, { status: 409 });

  const { data: invite, error } = await supabase
    .from("wallet_share_invites")
    .upsert(
      {
        wallet_id: params.id,
        owner_user_id: user.id,
        target_user_id: target.id,
        permission: normalizedPermission,
        status: "pending",
      },
      { onConflict: "wallet_id,target_user_id" },
    )
    .select("id,permission,status,created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ invite }, { status: 201 });
});

router.get("/share-invites/incoming", async (req) => {
  const { supabase, user } = req;
  const { data, error } = await supabase
    .from("wallet_share_invites")
    .select("id,permission,status,created_at,wallet:wallets(id,name,currency,icon),owner:users!owner_user_id(id,telegram_id,first_name,last_name,username)")
    .eq("target_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ invites: data || [] });
});

router.post("/share-invites/:inviteId/respond", async (req) => {
  const { action } = await req.json();
  const { supabase, user, params } = req;
  if (!["accept", "reject"].includes(action)) return Response.json({ error: "invalid_action" }, { status: 400 });

  const { data: invite } = await supabase
    .from("wallet_share_invites")
    .select("id,wallet_id,owner_user_id,target_user_id,permission,status")
    .eq("id", params.inviteId)
    .eq("target_user_id", user.id)
    .single();
  if (!invite || invite.status !== "pending") return Response.json({ error: "invite_not_found" }, { status: 404 });

  const [{ data: owner }, { data: target }] = await Promise.all([
    supabase.from("users").select("id,is_paid,paid_until").eq("id", invite.owner_user_id).single(),
    supabase.from("users").select("id,is_paid,paid_until").eq("id", invite.target_user_id).single(),
  ]);
  if (!owner || !target) return Response.json({ error: "invite_not_found" }, { status: 404 });
  if (!hasActiveSubscription(owner) || !hasActiveSubscription(target)) {
    return Response.json({ error: "subscription_required_for_both_users" }, { status: 403 });
  }

  if (action === "accept") {
    const { error: memberError } = await supabase
      .from("wallet_members")
      .upsert({ wallet_id: invite.wallet_id, user_id: user.id, permission: invite.permission || "viewer" });
    if (memberError) return Response.json({ error: memberError.message }, { status: 400 });
  }

  const { error: inviteError } = await supabase
    .from("wallet_share_invites")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      responded_at: new Date().toISOString(),
    })
    .eq("id", params.inviteId);
  if (inviteError) return Response.json({ error: inviteError.message }, { status: 400 });

  return Response.json({ success: true });
});

router.delete("/:id/share-invites/:inviteId", async (req) => {
  const { supabase, user, params } = req;
  const { data: wallet } = await supabase.from("wallets").select("owner_id").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("wallet_share_invites")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", params.inviteId)
    .eq("wallet_id", params.id)
    .eq("status", "pending");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
});

router.post("/:id/share-links", async (req) => {
  const { permission, max_uses, expires_in_hours } = await req.json().catch(() => ({}));
  const { supabase, user, params } = req;
  const normalizedPermission = permission === "editor" ? "editor" : "viewer";
  const maxUses = Number(max_uses || 1);
  const expiresInHours = expires_in_hours ? Number(expires_in_hours) : null;

  const { data: wallet } = await supabase.from("wallets").select("id,owner_id").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!hasActiveSubscription(user)) return Response.json({ error: "subscription_required_for_both_users" }, { status: 403 });

  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : null;
  const { data, error } = await supabase
    .from("wallet_share_links")
    .insert({
      wallet_id: params.id,
      owner_user_id: user.id,
      permission: normalizedPermission,
      max_uses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 1,
      expires_at: expiresAt,
    })
    .select("id,token,permission,is_active,max_uses,used_count,expires_at,created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ link: data }, { status: 201 });
});

router.get("/share-links/:token", async (req) => {
  const { supabase, params } = req;
  const { data, error } = await supabase
    .from("wallet_share_links")
    .select("id,token,permission,is_active,max_uses,used_count,expires_at,wallet:wallets(id,name,currency,icon),owner:users!owner_user_id(id,telegram_id,first_name,last_name,username)")
    .eq("token", params.token)
    .single();
  if (error || !data) return Response.json({ error: "link_not_found" }, { status: 404 });
  return Response.json({ link: data });
});

router.post("/share-links/:token/join", async (req) => {
  const { supabase, user, params } = req;
  const { data: link } = await supabase
    .from("wallet_share_links")
    .select("id,wallet_id,owner_user_id,permission,is_active,max_uses,used_count,expires_at")
    .eq("token", params.token)
    .single();
  if (!link || !link.is_active) return Response.json({ error: "link_not_found" }, { status: 404 });
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return Response.json({ error: "link_expired" }, { status: 410 });
  }
  if (Number(link.used_count || 0) >= Number(link.max_uses || 1)) {
    return Response.json({ error: "link_maxed_out" }, { status: 410 });
  }
  if (link.owner_user_id === user.id) return Response.json({ error: "cannot_join_own_link" }, { status: 400 });

  const owner = await getUserById(supabase, link.owner_user_id);
  if (!owner || !hasActiveSubscription(owner) || !hasActiveSubscription(user)) {
    return Response.json({ error: "subscription_required_for_both_users" }, { status: 403 });
  }

  const { data: member } = await supabase
    .from("wallet_members")
    .select("wallet_id")
    .eq("wallet_id", link.wallet_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    const { error: memberError } = await supabase
      .from("wallet_members")
      .upsert({ wallet_id: link.wallet_id, user_id: user.id, permission: link.permission || "viewer" });
    if (memberError) return Response.json({ error: memberError.message }, { status: 400 });
  }

  const nextUsedCount = Number(link.used_count || 0) + 1;
  const nextActive = nextUsedCount < Number(link.max_uses || 1);
  await supabase
    .from("wallet_share_links")
    .update({ used_count: nextUsedCount, is_active: nextActive })
    .eq("id", link.id);

  return Response.json({ success: true });
});

router.delete("/:id/share-links/:linkId", async (req) => {
  const { supabase, user, params } = req;
  const { data: wallet } = await supabase.from("wallets").select("owner_id").eq("id", params.id).single();
  if (!wallet || wallet.owner_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("wallet_share_links")
    .update({ is_active: false })
    .eq("id", params.linkId)
    .eq("wallet_id", params.id);
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
