export default function TransferItem({ transfer }) {
  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
      <p className="text-sm">{transfer.from_wallet?.name} → {transfer.to_wallet?.name}</p>
    </div>
  );
}
