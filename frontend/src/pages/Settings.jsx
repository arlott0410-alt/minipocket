import { useTranslation } from "react-i18next";

export default function Settings() {
  const { i18n } = useTranslation();
  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };
  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-2">
        <button className="w-full border rounded-xl py-2" onClick={() => setLang("lo")}>ພາສາລາວ</button>
        <button className="w-full border rounded-xl py-2" onClick={() => setLang("en")}>English</button>
      </div>
    </div>
  );
}
