function addThousands(intPart) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function precisionByCurrency(currency) {
  return currency === "LAK" ? 0 : 2;
}

export function formatAmountInput(raw, precision = 2) {
  if (raw == null) return "";
  const cleaned = String(raw).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const hasDot = cleaned.includes(".");
  const [intRaw, decRaw = ""] = cleaned.split(".");
  const intPart = addThousands((intRaw || "0").replace(/^0+(?=\d)/, "") || "0");

  if (precision <= 0) return intPart;
  if (!hasDot) return intPart;
  return `${intPart}.${decRaw.slice(0, precision)}`;
}

export function parseAmountInput(raw) {
  const n = Number(String(raw || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatDisplayAmount(value, currency) {
  const precision = precisionByCurrency(currency);
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}
