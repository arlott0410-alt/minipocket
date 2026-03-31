import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function Settings() {
  const { i18n } = useTranslation();
  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <Card className="space-y-3">
        <p className="label">Language</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={i18n.language === "lo" ? "primary" : "secondary"} onClick={() => setLang("lo")} className="w-full">ພາສາລາວ</Button>
          <Button variant={i18n.language === "en" ? "primary" : "secondary"} onClick={() => setLang("en")} className="w-full">English</Button>
        </div>
      </Card>
    </div>
  );
}
