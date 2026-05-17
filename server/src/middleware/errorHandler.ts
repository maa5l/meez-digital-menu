import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === "number" ? err.status : 500;
  const message = status === 500 ? "Internal server error" : err.message;
  console.error(JSON.stringify({ event: "api.error", status, message: err.message }));
  res.status(status).json({ error: message, code: err.code ?? "INTERNAL_ERROR" });
};
