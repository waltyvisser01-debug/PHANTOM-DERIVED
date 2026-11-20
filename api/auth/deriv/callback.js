
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      code,
      state,
      expectedState,
      codeVerifier
    } = req.body || {};

    if (!code || !state || !expectedState || !codeVerifier) {
      return res.status(400).json({
        error: "Missing authentication details"
      });
    }

    if (state !== expectedState) {
      return res.status(403).json({
        error: "Invalid OAuth state"
      });
    }

    const clientId = process.env.DERIV_CLIENT_ID;
    const redirectUri = process.env.DERIV_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: "Deriv configuration missing"
      });
    }

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
          code_verifier: codeVerifier,
          redirect_uri: redirectUri
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return res.status(401).json({
        error: "Deriv authentication failed"
      });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", [
      `phantom_deriv_token=${data.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in || 3600}`
    ]);

    return res.status(200).json({
      success: true,
      message: "PHANTOM DERIVED connected successfully"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Authentication service error"
    });
  }
}
