import TransactionItem from "./TransactionItem";

export default function TransactionList({ transactions, renderActions }) {
  return (
    <div className="surface-card divide-y divide-amber-500/10">
      {transactions.map((t) => (
        <TransactionItem key={t.id} transaction={t} actions={renderActions ? renderActions(t) : null} />
      ))}
    </div>
  );
}
