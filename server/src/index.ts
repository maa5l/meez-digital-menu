import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health.js";
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
    methods: ["GET", "POST"],
  }),
);

app.use(express.json({ limit: "32kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/api/v1/health", healthRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(JSON.stringify({ event: "server.started", port }));
});
