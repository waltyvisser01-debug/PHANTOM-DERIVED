
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map(item => {
        const index = item.indexOf("=");
        return [
          item.slice(0, index).trim(),
          decodeURIComponent(item.slice(index + 1).trim())
        ];
      })
  );

  const { code, state, error } = req.query || {};

  const savedState = cookies.phantom_oauth_state;
  const verifier = cookies.phantom_oauth_verifier;

  if (error) {
    return res.status(400).json({
      error: "Deriv login was cancelled or denied"
    });
  }

  if (!code || !state || !savedState || !verifier ||
      state !== savedState) {
    return res.status(403).json({
      error: "Invalid OAuth authentication state"
    });
  }

  const clientId = process.env.DERIV_CLIENT_ID;
  const redirectUri = process.env.DERIV_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Deriv configuration missing"
    });
  }

  try {
    const response = await fetch(
      "https://auth.deriv.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return res.status(401).json({
        error: "Deriv token exchange failed"
      });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", [
      `phantom_deriv_token=${encodeURIComponent(data.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in || 3600}`,
      "phantom_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      "phantom_oauth_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    ]);

    return res.redirect(302, "/");

  } catch (err) {
    return res.status(500).json({
      error: "Authentication service error"
    });
  }
}
