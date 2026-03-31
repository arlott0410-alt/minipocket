import WalletCard from "./WalletCard";

export default function WalletList({ wallets, onSelect }) {
  return (
    <div className="space-y-3">
      {wallets.map((w) => <WalletCard key={w.id} wallet={w} onClick={() => onSelect?.(w)} />)}
    </div>
  );
}
