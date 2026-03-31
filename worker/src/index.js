import { Router, cors } from "itty-router";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { adminAuthMiddleware } from "./middleware/adminAuthMiddleware.js";
import { rateLimitMiddleware } from "./middleware/rateLimitMiddleware.js";
import { createClient } from "@supabase/supabase-js";
import walletsRouter from "./routes/wallets.js";
import transactionsRouter from "./routes/transactions.js";
import transfersRouter from "./routes/transfers.js";
import reportsRouter from "./routes/reports.js";
import usersRouter from "./routes/users.js";
import adminRouter from "./routes/admin.js";

const router = Router();
router.all("*", (req, env) => {
  const { preflight } = cors({
    origin: env.FRONTEND_URL || "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Telegram-Init-Data", "Authorization"],
  });
  return preflight(req);
});

router.post("/api/auth/login", async (req, env) => {
  const limit = rateLimitMiddleware(req, env, { scope: "auth_login", max: 30, windowMs: 60_000 });
  if (limit) return limit;
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return Response.json({ user: req.user });
});

router.post("/api/admin/login", async (req, env) => {
  const limit = rateLimitMiddleware(req, env, { scope: "admin_login", max: 10, windowMs: 60_000 });
  if (limit) return limit;
  const body = await req.json().catch(() => ({}));
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) return Response.json({ error: "Bad Request" }, { status: 400 });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data: adminEmail } = await service.from("admin_emails").select("email").eq("email", email).single();
  if (!adminEmail) return Response.json({ error: "Forbidden" }, { status: 403 });

  return Response.json({ access_token: data.session.access_token });
});

router.all("/api/admin/*", async (req, env) => {
  const limit = rateLimitMiddleware(req, env, { scope: "admin_api", max: 300, windowMs: 60_000 });
  if (limit) return limit;
  const guard = await adminAuthMiddleware(req, env);
  if (guard) return guard;
});
router.all("/api/admin/*", adminRouter.fetch);

router.all("/api/wallets*", async (req, env, ctx) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return walletsRouter.fetch(req, env, ctx);
});
router.all("/api/transactions*", async (req, env, ctx) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return transactionsRouter.fetch(req, env, ctx);
});
router.all("/api/transfers*", async (req, env, ctx) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return transfersRouter.fetch(req, env, ctx);
});
router.all("/api/reports*", async (req, env, ctx) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return reportsRouter.fetch(req, env, ctx);
});
router.all("/api/users*", async (req, env, ctx) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return usersRouter.fetch(req, env, ctx);
});

router.all("*", () => new Response("Not Found", { status: 404 }));

export default {
  fetch: (req, env, ctx) => {
    const { corsify } = cors({
      origin: env.FRONTEND_URL || "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Telegram-Init-Data", "Authorization"],
    });
    return router.fetch(req, env, ctx).then(corsify);
  },
};
