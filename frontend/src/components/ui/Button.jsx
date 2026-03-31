export default function Button({ className = "", ...props }) {
  return <button className={`rounded-xl px-4 py-2 font-medium bg-indigo-600 text-white disabled:opacity-50 ${className}`} {...props} />;
}
