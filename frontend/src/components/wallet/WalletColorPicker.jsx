export default function WalletColorPicker({ value, onChange }) {
  return <input type="color" value={value} onChange={onChange} className="h-10 w-16 border rounded" />;
}
