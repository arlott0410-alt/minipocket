export default function WalletCard({ wallet, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{wallet.icon} {wallet.name}</p>
        <p className="text-sm text-gray-500">{wallet.currency}</p>
      </div>
      <p className="mt-2 text-xl font-bold" style={{ color: wallet.color }}>{Number(wallet.balance || 0).toLocaleString()}</p>
    </button>
  );
}
