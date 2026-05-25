import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

export type AuthedRequest = Request & { userId?: string };

export async function requireSupabaseAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "missing_token" });
      return;
    }

    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch {
    res.status(401).json({ error: "auth_failed" });
  }
}
