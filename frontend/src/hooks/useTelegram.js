import { useEffect } from "react";

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);
  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    themeParams: tg?.themeParams || {},
    colorScheme: tg?.colorScheme || "light",
    haptic: tg?.HapticFeedback,
  };
}
