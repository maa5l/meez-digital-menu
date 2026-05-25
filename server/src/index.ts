import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { billingRouter } from "./routes/billing.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const corsOrigin = process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:8080"];

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_webhook_requests" },
});

app.use(
  "/api/v1/webhooks",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "64kb" }),
  (req, _res, next) => {
    const raw = req.body as Buffer;
    const rawText = raw?.length ? raw.toString("utf8") : "";
    (req as express.Request & { rawBody?: string }).rawBody = rawText;
    try {
      req.body = rawText ? JSON.parse(rawText) : {};
    } catch {
      req.body = {};
    }
    next();
  },
  webhooksRouter,
);

app.use(express.json({ limit: "100kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/billing", billingRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(JSON.stringify({ event: "server.started", port }));
});
