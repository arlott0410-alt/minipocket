import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { formatAmountInput, formatDisplayAmount, parseAmountInput, precisionByCurrency } from "../lib/amount";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import WalletCard from "../components/wallet/WalletCard";
import CreateWalletForm from "../components/wallet/CreateWalletForm";
import Modal from "../components/ui/Modal";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

function extractShareToken() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get("share_token");
  if (queryToken) return queryToken;

  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (startParam?.startsWith("share_")) return startParam.slice(6);
  return "";
}

function buildShareUrl(token) {
  if (BOT_USERNAME) return `https://t.me/${BOT_USERNAME}?startapp=share_${token}`;
  return `${window.location.origin}${window.location.pathname}?share_token=${token}`;
}

export default function Transfer() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [ownedWallets, setOwnedWallets] = useState([]);
  const [form, setForm] = useState({ from_wallet_id: "", to_wallet_id: "", from_amount: "", to_amount: "", fee: "0", note: "" });
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
  const [showCreateWallet, setShowCreateWallet] = useState(false);

  const loadAll = async () => {
    setLoadingWallets(true);
    try {
      const [d, invites] = await Promise.all([api.getWallets(), api.getIncomingShareInvites()]);
      const owned = d.owned || [];
      setOwnedWallets(owned);
      setWallets([...(d.owned || []), ...(d.shared || [])]);
      setIncomingInvites(invites.invites || []);
      setShareWalletId((prev) => prev || owned[0]?.id || "");

      const token = extractShareToken();
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
  const destinationWallets = useMemo(
    () => wallets.filter((w) => w.id !== form.from_wallet_id),
    [wallets, form.from_wallet_id],
  );
  const isCrossCurrency = fromWallet && toWallet && fromWallet.currency !== toWallet.currency;
  const fromAmountNumber = parseAmountInput(form.from_amount);
  const toAmountNumber = parseAmountInput(form.to_amount);
  const feeNumber = parseAmountInput(form.fee);
  const computedRate = fromAmountNumber > 0 && toAmountNumber > 0
    ? toAmountNumber / fromAmountNumber
    : 0;
  const invalidSameWallet = !!form.from_wallet_id && !!form.to_wallet_id && form.from_wallet_id === form.to_wallet_id;
  const transferDisabled = saving || !form.from_wallet_id || !form.to_wallet_id || fromAmountNumber <= 0 || toAmountNumber <= 0 || invalidSameWallet;

  useEffect(() => {
    if (form.from_wallet_id && form.to_wallet_id && form.from_wallet_id === form.to_wallet_id) {
      setForm((s) => ({ ...s, to_wallet_id: "" }));
    }
  }, [form.from_wallet_id, form.to_wallet_id]);

  useEffect(() => {
    if (!fromWallet || !toWallet) return;
    if (fromWallet.currency === toWallet.currency) {
      setForm((s) => ({ ...s, to_amount: s.from_amount }));
    }
  }, [fromWallet?.currency, toWallet?.currency, form.from_amount]);

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
    if (!form.from_wallet_id || !form.to_wallet_id || fromAmountNumber <= 0 || toAmountNumber <= 0) {
      setError(t("common.fill_all"));
      return;
    }
    if (form.from_wallet_id === form.to_wallet_id) {
      setError(t("transfer.same_wallet_error"));
      return;
    }
    try {
      setSaving(true);
      await api.createTransfer({
        ...form,
        from_amount: fromAmountNumber,
        to_amount: toAmountNumber,
        exchange_rate: isCrossCurrency ? Number(computedRate.toFixed(8)) : 1,
        fee: feeNumber,
      });
      setForm({ from_wallet_id: "", to_wallet_id: "", from_amount: "", to_amount: "", fee: "0", note: "" });
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
      const generated = buildShareUrl(res.link.token);
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
          <div className="flex items-center justify-between">
            <h2 className="section-title">{t("transfer.my_wallets")}</h2>
            <Button onClick={() => setShowCreateWallet(true)} size="sm" className="flex items-center gap-1">
              <Plus size={15} /> {t("wallet.add")}
            </Button>
          </div>
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
            <p className="label">{t("transfer.from")}</p>
            <Select value={form.from_wallet_id} onChange={(e) => setForm((s) => ({ ...s, from_wallet_id: e.target.value }))}>
              <option value="">{t("transfer.from")}</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
            </Select>
            <p className="label">{t("transfer.source_amount")} ({fromWallet?.currency || "-"})</p>
            <Input
              type="text"
              inputMode="decimal"
              value={form.from_amount}
              onChange={(e) => setForm((s) => ({ ...s, from_amount: formatAmountInput(e.target.value, precisionByCurrency(fromWallet?.currency)) }))}
              placeholder={t("transfer.source_amount")}
            />
            <p className="label">{t("transfer.to")}</p>
            <Select value={form.to_wallet_id} onChange={(e) => setForm((s) => ({ ...s, to_wallet_id: e.target.value }))}>
              <option value="">{t("transfer.to")}</option>
              {destinationWallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
            </Select>
            <p className="label">{t("transfer.destination_amount")} ({toWallet?.currency || "-"})</p>
            <Input
              type="text"
              inputMode="decimal"
              value={form.to_amount}
              onChange={(e) => setForm((s) => ({ ...s, to_amount: formatAmountInput(e.target.value, precisionByCurrency(toWallet?.currency)) }))}
              placeholder={t("transfer.destination_amount")}
              disabled={!!fromWallet && !!toWallet && fromWallet.currency === toWallet.currency}
            />
            {invalidSameWallet ? (
              <p className="rounded-xl border border-rose-500/40 bg-rose-900/20 p-2 text-xs text-rose-200">{t("transfer.same_wallet_error")}</p>
            ) : null}
            {isCrossCurrency ? (
              <p className="surface-muted p-3 text-sm text-slate-900 dark:text-slate-200">
                {t("transfer.rate")}: 1 {fromWallet?.currency || ""} = {computedRate ? computedRate.toFixed(6) : "0"} {toWallet?.currency || ""}
              </p>
            ) : null}
            <Input
              type="text"
              inputMode="decimal"
              value={form.fee}
              onChange={(e) => setForm((s) => ({ ...s, fee: formatAmountInput(e.target.value, 2) }))}
              placeholder={t("transfer.fee")}
            />
            <Input value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} placeholder={t("common.note")} />
            <p className="surface-muted p-3 text-sm text-slate-900 dark:text-slate-200">{t("transfer.you_receive")}: <span className="font-semibold">{formatDisplayAmount(toAmountNumber, toWallet?.currency)} {toWallet?.currency || ""}</span></p>
            <Button onClick={submit} className="w-full" disabled={transferDisabled}>{saving ? t("common.loading") : t("transfer.confirm")}</Button>
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

      <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} panelClassName="max-h-[80vh] overflow-y-auto border border-amber-500/30 bg-neutral-950 p-4 text-amber-100">
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
                            const url = buildShareUrl(link.token);
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
      {showCreateWallet && (
        <CreateWalletForm
          onClose={() => setShowCreateWallet(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  );
}
