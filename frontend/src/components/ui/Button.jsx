const variants = {
  primary: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-neutral-900 hover:brightness-110 active:brightness-95 shadow-md shadow-amber-500/25",
  secondary: "bg-neutral-900 text-amber-100 border border-amber-500/35 hover:bg-neutral-800",
  danger: "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm shadow-rose-500/25",
};

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
  xl: "px-5 py-3 text-base",
};

export default function Button({ className = "", variant = "primary", size = "md", ...props }) {
  return (
    <button
      className={`rounded-xl font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
