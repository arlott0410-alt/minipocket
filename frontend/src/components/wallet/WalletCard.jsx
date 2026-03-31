export default function WalletCard({ wallet, onClick }) {
  return (
    <button
      onClick={onClick}
      className="surface-card w-full p-4 text-left transition hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-black/20"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{wallet.icon} {wallet.name}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{wallet.currency}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: wallet.color }}>
        {Number(wallet.balance || 0).toLocaleString()}
      </p>
    </button>
  );
}
