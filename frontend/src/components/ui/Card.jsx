const densityClasses = {
  compact: "p-3",
  md: "p-4",
  comfortable: "p-4 lg:p-5",
};

export default function Card({ className = "", children, density = "comfortable" }) {
  return <div className={`surface-card ${densityClasses[density] || densityClasses.comfortable} ${className}`}>{children}</div>;
}
