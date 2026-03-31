import { createClient } from "@supabase/supabase-js";

export async function adminAuthMiddleware(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data: authUser, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser?.user?.email) return Response.json({ error: "Forbidden" }, { status: 403 });

  const email = authUser.user.email;
  const { data: adminRow, error: adminErr } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", email)
    .single();

  if (adminErr || !adminRow) return Response.json({ error: "Forbidden" }, { status: 403 });

  request.supabase = supabase;
  request.admin = authUser.user;
  return null;
}

