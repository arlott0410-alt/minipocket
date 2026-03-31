import Button from "./Button";

export default function EmptyState({ icon = "📭", title, desc, action }) {
  return (
    <div className="surface-card p-6 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="font-semibold mb-1 text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
