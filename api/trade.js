
import WebSocket from "ws";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  let socket;

  try {
    // Read saved Deriv token
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

    const token = cookies.phantom_deriv_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Connect your Deriv account first."
      });
    }

    const accountId = String(req.body?.account_id || "");

    if (!/^DOT[0-9]+$/.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid demo account ID."
      });
    }

    // Verify account ownership and demo status
    const accountsResponse = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    const accountsResult = await accountsResponse.json();

    if (!accountsResponse.ok) {
      throw new Error(
        accountsResult.errors?.[0]?.message ||
        "Unable to verify Deriv account."
      );
    }

    const accounts = Array.isArray(accountsResult.data)
      ? accountsResult.data
      : accountsResult.data
        ? [accountsResult.data]
        : [];

    const account = accounts.find(item =>
      item.account_id === accountId &&
      item.account_type === "demo" &&
      item.status === "active"
    );

    if (!account) {
      return res.status(403).json({
        success: false,
        error: "An active DEMO account is required."
      });
    }

    // Request one-time demo WebSocket URL
    const otpResponse = await fetch(
      `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    const otpResult = await otpResponse.json();

    if (!otpResponse.ok || !otpResult.data?.url) {
      throw new Error(
        otpResult.errors?.[0]?.message ||
        "Could not obtain demo connection."
      );
    }

    // Only permit the authenticated DEMO endpoint
    const wsUrl = new URL(otpResult.data.url);

    if (
      wsUrl.protocol !== "wss:" ||
      wsUrl.hostname !== "api.derivws.com" ||
      wsUrl.pathname !== "/trading/v1/options/ws/demo" ||
      !wsUrl.searchParams.has("otp")
    ) {
      throw new Error("Invalid demo WebSocket address.");
    }

    // Test authenticated WebSocket connection
    await new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        finish(reject, new Error("Demo connection timed out."));
      }, 12000);

      function finish(callback, value) {
        if (settled) return;

        settled = true;
        clearTimeout(timer);

        try {
          socket?.close();
        } catch {}

        callback(value);
      }

      socket = new WebSocket(wsUrl.toString());

      socket.on("open", () => {
        finish(resolve, true);
      });

      socket.on("error", () => {
        finish(
          reject,
          new Error("Demo WebSocket connection failed.")
        );
      });

      socket.on("close", () => {
        if (!settled) {
          finish(
            reject,
            new Error("Demo connection closed unexpectedly.")
          );
        }
      });
    });

    return res.status(200).json({
      success: true,
      status: "DEMO_CONNECTED",
      mode: "DEMO_ONLY",
      trading: false,
      account_id: accountId,
      message: "PHANTOM authenticated demo connection successful."
    });

  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message || "Demo connection failed."
    });
  }
}
