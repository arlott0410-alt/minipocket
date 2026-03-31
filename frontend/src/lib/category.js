export function getCategoryDisplayName(category, lang) {
  if (!category) return "General";
  if (lang === "th") return category.name_th || category.name_en || category.name_lo || "General";
  if (lang === "lo") return category.name_lo || category.name_en || category.name_th || "General";
  return category.name_en || category.name_th || category.name_lo || "General";
}
