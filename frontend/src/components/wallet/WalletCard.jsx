export default function WalletCard({ wallet, onClick }) {
  return (
    <button
      onClick={onClick}
      className="surface-card w-full p-4 text-left transition hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-amber-50">{wallet.icon} {wallet.name}</p>
        <p className="text-xs font-medium text-amber-200/80">{wallet.currency}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: wallet.color }}>
        {Number(wallet.balance || 0).toLocaleString()}
      </p>
    </button>
  );
}
