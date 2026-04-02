import { useTranslation } from "react-i18next";
import Select from "../ui/Select";

export default function TransactionTypeSelect({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <Select value={value} onChange={onChange}>
      <option value="income">{t("transaction.type_income")}</option>
      <option value="expense">{t("transaction.type_expense")}</option>
      <option value="transfer_in">{t("transaction.type_transfer_in")}</option>
      <option value="transfer_out">{t("transaction.type_transfer_out")}</option>
    </Select>
  );
}
