
import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.DERIV_CLIENT_ID;
  const redirectUri = process.env.DERIV_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Deriv configuration missing"
    });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const verifier = crypto.randomBytes(32).toString("base64url");

  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  const url = new URL("https://auth.deriv.com/oauth2/auth");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "trade");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", [
    `phantom_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    `phantom_oauth_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  ]);

  return res.redirect(302, url.toString());
}
