import TransactionItem from "./TransactionItem";

export default function TransactionList({ transactions }) {
  return <div className="bg-white dark:bg-gray-800 rounded-2xl divide-y">{transactions.map((t) => <TransactionItem key={t.id} transaction={t} />)}</div>;
}
