export default function Card({ className = "", children }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 ${className}`}>{children}</div>;
}
