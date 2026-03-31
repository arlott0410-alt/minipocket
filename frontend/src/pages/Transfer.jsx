import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import WalletCard from "../components/wallet/WalletCard";
import Modal from "../components/ui/Modal";

export default function Transfer() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [ownedWallets, setOwnedWallets] = useState([]);
  const [form, setForm] = useState({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [shareWalletId, setShareWalletId] = useState("");
  const [sharePermission, setSharePermission] = useState("viewer");
  const [shareMaxUses, setShareMaxUses] = useState("1");
  const [shareDetail, setShareDetail] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [linkPreview, setLinkPreview] = useState(null);
  const [error, setError] = useState("");
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoadingWallets(true);
    try {
      const [d, invites] = await Promise.all([api.getWallets(), api.getIncomingShareInvites()]);
      const owned = d.owned || [];
      setOwnedWallets(owned);
      setWallets([...(d.owned || []), ...(d.shared || [])]);
      setIncomingInvites(invites.invites || []);
      setShareWalletId((prev) => prev || owned[0]?.id || "");

      const params = new URLSearchParams(window.location.search);
      const token = params.get("share_token");
      if (token) {
        try {
          const preview = await api.getShareLinkInfo(token);
          setLinkPreview({ token, ...preview.link });
        } catch {
          setLinkPreview(null);
        }
      }
    } finally {
      setLoadingWallets(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const fromWallet = wallets.find((w) => w.id === form.from_wallet_id);
  const toWallet = wallets.find((w) => w.id === form.to_wallet_id);
  const isCrossCurrency = fromWallet && toWallet && fromWallet.currency !== toWallet.currency;
  const toAmount = isCrossCurrency ? Number(Number(form.from_amount || 0) * Number(form.exchange_rate || 1)).toFixed(4) : Number(form.from_amount || 0).toFixed(4);

  const openShareDetail = async (walletId) => {
    setSaving(true);
    setError("");
    try {
      const data = await api.getWalletShares(walletId);
      setShareDetail(data);
      setShareModalOpen(true);
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!form.from_wallet_id || !form.to_wallet_id || !form.from_amount) {
      setError(t("common.fill_all"));
      return;
    }
    if (form.from_wallet_id === form.to_wallet_id) {
      setError(t("transfer.same_wallet_error"));
      return;
    }
    try {
      setSaving(true);
      await api.createTransfer({ ...form, from_amount: Number(form.from_amount), to_amount: Number(toAmount), exchange_rate: isCrossCurrency ? Number(form.exchange_rate) : null, fee: Number(form.fee || 0) });
      setForm({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
      await loadAll();
    } catch (e) {
      setError(e.error === "insufficient_balance" ? t("transfer.insufficient") : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async () => {
    if (!shareWalletId) {
      setError(t("common.fill_all"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.createShareLink(shareWalletId, {
        permission: sharePermission,
        max_uses: Number(shareMaxUses || 1),
      });
      const generated = `${window.location.origin}${window.location.pathname}?share_token=${res.link.token}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generated);
      } else {
        window.prompt("Copy this link", generated);
      }
      await openShareDetail(shareWalletId);
      await loadAll();
    } catch (e) {
      if (e.error === "subscription_required_for_both_users") setError(t("transfer.subscription_required"));
      else setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const joinLink = async () => {
    if (!linkPreview?.token) return;
    setSaving(true);
    setError("");
    try {
      await api.joinShareLink(linkPreview.token);
      await loadAll();
      setLinkPreview(null);
      const u = new URL(window.location.href);
      u.searchParams.delete("share_token");
      window.history.replaceState({}, "", u.toString());
    } catch (e) {
      if (e.error === "subscription_required_for_both_users") setError(t("transfer.subscription_required"));
      else setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const respondInvite = async (inviteId, action) => {
    setSaving(true);
    setError("");
    try {
      await api.respondShareInvite(inviteId, action);
      await loadAll();
    } catch (e) {
      if (e.error === "subscription_required_for_both_users") setError(t("transfer.subscription_required"));
      else setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (walletId, userId) => {
    if (!window.confirm("Remove this member?")) return;
    setSaving(true);
    try {
      await api.revokeAccess(walletId, userId);
      await openShareDetail(walletId);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (walletId, inviteId) => {
    if (!window.confirm("Cancel this invite?")) return;
    setSaving(true);
    try {
      await api.cancelShareInvite(walletId, inviteId);
      await openShareDetail(walletId);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const disableLink = async (walletId, linkId) => {
    if (!window.confirm("Disable this link?")) return;
    setSaving(true);
    try {
      await api.revokeShareLink(walletId, linkId);
      await openShareDetail(walletId);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-amber-100">{t("transfer.title")}</h1>
      {!loadingWallets && (
        <div className="space-y-2">
          <h2 className="section-title">{t("transfer.my_wallets")}</h2>
          <div className="space-y-2">
            {wallets.map((w) => (
              <div key={w.id} className="space-y-2">
                <WalletCard wallet={w} />
                {ownedWallets.some((x) => x.id === w.id) ? (
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => openShareDetail(w.id)}>
                    {t("transfer.share_wallet")}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
      {loadingWallets ? (
        <Skeleton className="h-56" />
      ) : (
        <>
          <Card className="space-y-3">
            <Select value={form.from_wallet_id} onChange={(e) => setForm((s) => ({ ...s, from_wallet_id: e.target.value }))}>
              <option value="">{t("transfer.from")}</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
            </Select>
            <Input type="number" value={form.from_amount} onChange={(e) => setForm((s) => ({ ...s, from_amount: e.target.value }))} placeholder={t("transfer.amount")} />
            <Select value={form.to_wallet_id} onChange={(e) => setForm((s) => ({ ...s, to_wallet_id: e.target.value }))}>
              <option value="">{t("transfer.to")}</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
            </Select>
            {isCrossCurrency && <Input type="number" value={form.exchange_rate} onChange={(e) => setForm((s) => ({ ...s, exchange_rate: e.target.value }))} placeholder={t("transfer.rate")} />}
            <Input type="number" value={form.fee} onChange={(e) => setForm((s) => ({ ...s, fee: e.target.value }))} placeholder={t("transfer.fee")} />
            <Input value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} placeholder={t("common.note")} />
            <p className="surface-muted p-3 text-sm text-slate-600 dark:text-slate-300">{t("transfer.you_receive")}: <span className="font-semibold">{Number(toAmount).toLocaleString()} {toWallet?.currency || ""}</span></p>
            <Button onClick={submit} className="w-full" disabled={saving}>{saving ? t("common.loading") : t("transfer.confirm")}</Button>
          </Card>

          <Card className="space-y-3">
            <p className="section-title">{t("transfer.share_title")}</p>
            <p className="text-xs text-amber-200/70">{t("transfer.share_hint")}</p>
            <Select value={shareWalletId} onChange={(e) => setShareWalletId(e.target.value)}>
              <option value="">{t("transfer.select_wallet")}</option>
              {ownedWallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
            </Select>
            <Select value={sharePermission} onChange={(e) => setSharePermission(e.target.value)}>
              <option value="viewer">{t("transfer.permission_viewer")}</option>
              <option value="editor">{t("transfer.permission_editor")}</option>
            </Select>
            <Input
              type="number"
              value={shareMaxUses}
              onChange={(e) => setShareMaxUses(e.target.value)}
              placeholder={t("transfer.max_uses")}
            />
            <Button onClick={sendInvite} disabled={saving}>{saving ? t("common.loading") : t("transfer.send_invite")}</Button>

            <div className="space-y-2">
              <p className="label">{t("transfer.incoming_invites")}</p>
              {incomingInvites.length === 0 ? (
                <p className="text-sm text-amber-200/70">{t("transfer.no_invites")}</p>
              ) : incomingInvites.map((invite) => (
                <div key={invite.id} className="surface-muted p-3">
                  <p className="text-sm text-amber-100">
                    {invite.wallet?.icon || "💼"} {invite.wallet?.name} - @{invite.owner?.username || invite.owner?.telegram_id}
                  </p>
                  <p className="text-xs text-amber-300/70">{invite.permission === "editor" ? t("transfer.permission_editor") : t("transfer.permission_viewer")}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => respondInvite(invite.id, "accept")}>{t("transfer.accept")}</Button>
                    <Button size="sm" variant="secondary" onClick={() => respondInvite(invite.id, "reject")}>{t("transfer.reject")}</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {linkPreview ? (
            <Card className="space-y-3 border border-amber-400/40">
              <p className="section-title">{t("transfer.join_link_title")}</p>
              <p className="text-sm text-amber-100">
                {linkPreview.wallet?.icon || "💼"} {linkPreview.wallet?.name}
              </p>
              <p className="text-xs text-amber-300/70">
                {linkPreview.permission === "editor" ? t("transfer.permission_editor") : t("transfer.permission_viewer")}
              </p>
              <Button onClick={joinLink} disabled={saving}>{saving ? t("common.loading") : t("transfer.join_link")}</Button>
            </Card>
          ) : null}
        </>
      )}

      <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} panelClassName="max-h-[80vh] overflow-y-auto p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-amber-100">{shareDetail?.wallet?.name || t("transfer.share_wallet")}</h3>
          <div>
            <p className="label">{t("transfer.members")}</p>
            <div className="space-y-2 mt-2">
              {(shareDetail?.members || []).length === 0 ? (
                <p className="text-sm text-amber-200/70">{t("transfer.no_invites")}</p>
              ) : (shareDetail?.members || []).map((m) => (
                <div key={m.user?.id} className="surface-muted p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-100">@{m.user?.username || m.user?.telegram_id}</p>
                    <p className="text-xs text-amber-300/70">{m.permission === "editor" ? t("transfer.permission_editor") : t("transfer.permission_viewer")}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => removeMember(shareDetail.wallet.id, m.user.id)}>
                    {t("transfer.remove_member")}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="label">{t("transfer.pending_invites")}</p>
            <div className="space-y-2 mt-2">
              {((shareDetail?.pending_invites || []).length === 0 && (shareDetail?.share_links || []).length === 0) ? (
                <p className="text-sm text-amber-200/70">{t("transfer.no_invites")}</p>
              ) : (
                <>
                  {(shareDetail?.pending_invites || []).map((inv) => (
                    <div key={inv.id} className="surface-muted p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-100">@{inv.target_user?.username || inv.target_user?.telegram_id}</p>
                        <p className="text-xs text-amber-300/70">{inv.permission === "editor" ? t("transfer.permission_editor") : t("transfer.permission_viewer")}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => cancelInvite(shareDetail.wallet.id, inv.id)}>
                        {t("transfer.cancel_invite")}
                      </Button>
                    </div>
                  ))}
                  {(shareDetail?.share_links || []).map((link) => (
                    <div key={link.id} className="surface-muted p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-100">{t("transfer.link_item")} #{link.token.slice(0, 8)}</p>
                        <p className="text-xs text-amber-300/70">
                          {link.permission === "editor" ? t("transfer.permission_editor") : t("transfer.permission_viewer")} | {link.used_count}/{link.max_uses}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            const url = `${window.location.origin}${window.location.pathname}?share_token=${link.token}`;
                            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
                          }}
                        >
                          {t("transfer.copy_link")}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => disableLink(shareDetail.wallet.id, link.id)}>
                          {t("transfer.disable_link")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
