export async function adminMiddleware(request) {
  const { data } = await request.supabase
    .from("admins")
    .select("telegram_id")
    .eq("telegram_id", request.user.telegram_id)
    .single();

  if (!data) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
