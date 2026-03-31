export function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

export function toFixed4(value) {
  return Number(Number(value || 0).toFixed(4));
}
