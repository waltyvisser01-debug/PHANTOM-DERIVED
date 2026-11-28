
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const symbol = String(req.query?.symbol || "R_10");

  const allowedSymbols = [
    "R_10",
    "R_25",
    "R_50",
    "R_75",
    "R_100"
  ];

  if (!allowedSymbols.includes(symbol)) {
    return res.status(400).json({
      success: false,
      error: "Invalid market symbol"
    });
  }

  const appId =
    process.env.DERIV_CLIENT_ID ||
    process.env.DERIV_APP_ID;

  if (!appId) {
    return res.status(500).json({
      success: false,
      error: "Deriv App ID is missing"
    });
  }

  if (typeof WebSocket === "undefined") {
    return res.status(500).json({
      success: false,
      error: "WebSocket unavailable"
    });
  }

  let socket;

  try {
    const tick = await new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        finish(reject, new Error("Market data timed out"));
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

      socket = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`
      );

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({
          ticks: symbol,
          subscribe: 0
        }));
      });

      socket.addEventListener("message", event => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            finish(reject, new Error(data.error.message));
            return;
          }

          if (data.tick) {
            finish(resolve, {
              symbol: data.tick.symbol,
              price: data.tick.quote,
              epoch: data.tick.epoch
            });
          }
        } catch {
          finish(reject, new Error("Invalid response"));
        }
      });

      socket.addEventListener("error", () => {
        finish(reject, new Error("WebSocket connection failed"));
      });

      socket.addEventListener("close", () => {
        if (!settled) {
          finish(reject, new Error("Connection closed"));
        }
      });
    });

    return res.status(200).json({
      success: true,
      mode: "MARKET_DATA_ONLY",
      tick
    });

  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message
    });
  }
}
