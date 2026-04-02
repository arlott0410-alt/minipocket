export default function Modal({ open, onClose, children, panelClassName = "" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 lg:max-w-2xl ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
