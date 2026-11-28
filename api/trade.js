export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    status: "ready",
    mode: "DEMO_ONLY",
    trading: false,
    message: "Trade engine endpoint created. Execution is not enabled."
  });
}