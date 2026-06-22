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

  const targetStr = target.toString();
  const forwardHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  // Inject server-side auth based on target API
  if (targetStr.includes("followupboss.com")) {
    const fubKey = process.env.FUB_API_KEY;
    if (fubKey) {
      forwardHeaders["Authorization"] =
        "Basic " + Buffer.from(fubKey + ":").toString("base64");
      forwardHeaders["X-System"] = "EnchantDashboard";
      forwardHeaders["X-System-Key"] = fubKey;
    }
  } else if (targetStr.includes("sisu.co")) {
    const sisuAuth = process.env.SISU_AUTH;
    if (sisuAuth) forwardHeaders["Authorization"] = sisuAuth;
  }

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
    const upstream = await fetch(targetStr, fetchOpts);
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json",
    );
    res.send(body);
  } catch (err) {
    req.log.error({ err, target: targetStr }, "proxy fetch failed");
    res.status(502).json({ error: "Failed to reach upstream" });
  }
});

export default router;
