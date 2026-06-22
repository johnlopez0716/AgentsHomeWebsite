import { Router } from "express";
import crypto from "crypto";

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

const sessions = new Map<string, UserInfo>();

router.post("/auth/login", (req, res) => {
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
  sessions.set(token, user);
  req.log.info({ email: key, role: record.role }, "login");
  res.json({ token, user });
});

router.get("/auth/me", (req, res) => {
  const auth = req.headers["authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const user = sessions.get(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  res.json({ user });
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers["authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

export default router;
