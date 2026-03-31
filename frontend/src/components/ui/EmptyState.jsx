import Button from "./Button";

export default function EmptyState({ icon = "📭", title, desc, action }) {
  return (
    <div className="surface-card p-6 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="font-semibold mb-1 text-amber-100">{title}</p>
      <p className="text-sm text-amber-200/65">{desc}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
