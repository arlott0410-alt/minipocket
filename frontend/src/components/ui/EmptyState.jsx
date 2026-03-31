export default function EmptyState({ icon = "📭", title, desc, action }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-500">{desc}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}
