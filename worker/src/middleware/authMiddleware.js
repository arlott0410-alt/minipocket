import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../auth.js";

export async function authMiddleware(request, env) {
  const initData = request.headers.get("X-Telegram-Init-Data");
  if (!initData) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const telegramUser = await validateTelegramInitData(initData, env.BOT_TOKEN);
  if (!telegramUser) return Response.json({ error: "Invalid initData" }, { status: 401 });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data: user, error } = await supabase
    .from("users")
    .upsert(
      {
        telegram_id: telegramUser.id,
        username: telegramUser.username || null,
        first_name: telegramUser.first_name || "",
        last_name: telegramUser.last_name || null,
        avatar_url: telegramUser.photo_url || null,
        last_active: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    )
    .select()
    .single();

  if (error) return Response.json({ error: "DB error" }, { status: 500 });
  request.user = user;
  request.supabase = supabase;
  return null;
}
