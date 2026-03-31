import { Router, cors } from "itty-router";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { adminMiddleware } from "./middleware/adminMiddleware.js";
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
    allowHeaders: ["Content-Type", "X-Telegram-Init-Data"],
  });
  return preflight(req);
});

router.post("/api/auth/login", async (req, env) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
  return Response.json({ user: req.user });
});

router.all("/api/*", async (req, env) => {
  const guard = await authMiddleware(req, env);
  if (guard) return guard;
});

router.all("/api/wallets*", walletsRouter.fetch);
router.all("/api/transactions*", transactionsRouter.fetch);
router.all("/api/transfers*", transfersRouter.fetch);
router.all("/api/reports*", reportsRouter.fetch);
router.all("/api/users*", usersRouter.fetch);

router.all("/api/admin/*", async (req) => {
  const guard = await adminMiddleware(req);
  if (guard) return guard;
});
router.all("/api/admin/*", adminRouter.fetch);

router.all("*", () => new Response("Not Found", { status: 404 }));

export default {
  fetch: (req, env, ctx) => {
    const { corsify } = cors({
      origin: env.FRONTEND_URL || "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Telegram-Init-Data"],
    });
    return router.fetch(req, env, ctx).then(corsify);
  },
};
