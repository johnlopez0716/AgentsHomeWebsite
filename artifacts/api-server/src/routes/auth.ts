import { Router } from "express";
import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

interface UserInfo {
  email: string;
  role: string;
  name: string;
  initials: string;
  title: string;
  sisuId: number;
}

const USERS: Record<string, { pass: string } & Omit<UserInfo, "email">> = {
  "adam.prather@enchantaz.com": {
    pass: "Lincoln10!",
    role: "agent",
    name: "Adam Prather",
    initials: "AP",
    title: "Agent / Broker",
    sisuId: 225028,
  },
  "admin@enchantaz.com": {
    pass: "leader123",
    role: "leadership",
    name: "Adam Prather",
    initials: "AP",
    title: "Broker / Owner",
    sisuId: 225028,
  },
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const key = email?.trim().toLowerCase() ?? "";
  const record = USERS[key];
  if (!record || record.pass !== password) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = crypto.randomUUID();
  const user: UserInfo = {
    email: key,
    role: record.role,
    name: record.name,
    initials: record.initials,
    title: record.title,
    sisuId: record.sisuId,
  };
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    token,
    email: key,
    role: user.role,
    name: user.name,
    initials: user.initials,
    title: user.title,
    sisuId: String(user.sisuId),
    expiresAt,
  });
  req.log.info({ email: key, role: record.role }, "login");
  res.json({ token, user });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers["authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));
  if (!session) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  if (new Date() > session.expiresAt) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const user: UserInfo = {
    email: session.email,
    role: session.role,
    name: session.name,
    initials: session.initials,
    title: session.title,
    sisuId: Number(session.sisuId),
  };
  res.json({ user });
});

router.post("/auth/logout", async (req, res) => {
  const auth = req.headers["authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ ok: true });
});

export default router;
