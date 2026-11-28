export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  return res.status(200).json({
    success: true,
    status: "READY",
    mode: "DEMO_ONLY",
    trading: false,
    message: "PHANTOM trade endpoint is responding."
  });
}