import { Router } from "express";

const router = Router();

router.all("/proxy", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing or invalid ?url= parameter" });
    return;
  }

  let target: URL;
  try {
    target = new URL(decodeURIComponent(url));
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  const forwardHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  const auth = req.headers["authorization"];
  if (auth) forwardHeaders["Authorization"] = auth;

  const contentType = req.headers["content-type"];
  if (contentType) forwardHeaders["Content-Type"] = contentType;

  const fetchOpts: RequestInit = {
    method: req.method,
    headers: forwardHeaders,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = JSON.stringify(req.body);
    if (raw && raw !== "{}") fetchOpts.body = raw;
  }

  try {
    const upstream = await fetch(target.toString(), fetchOpts);
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json",
    );
    res.send(body);
  } catch (err) {
    req.log.error({ err, target: target.toString() }, "proxy fetch failed");
    res.status(502).json({ error: "Failed to reach upstream" });
  }
});

export default router;
