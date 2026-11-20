
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  res.setHeader("Cache-Control", "no-store");

  res.setHeader("Set-Cookie", [
    "phantom_deriv_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    "phantom_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    "phantom_oauth_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  ]);

  return res.status(200).json({
    success: true,
    message: "Disconnected from PHANTOM DERIVED"
  });
}
