import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import lo from "./lo.json";
import en from "./en.json";
import th from "./th.json";

i18n.use(initReactI18next).init({
  resources: { lo: { translation: lo }, en: { translation: en }, th: { translation: th } },
  lng: localStorage.getItem("lang") || "lo",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
