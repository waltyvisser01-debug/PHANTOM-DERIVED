
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
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
      error: "Invalid market symbol"
    });
  }

  const appId = process.env.DERIV_APP_ID;

  if (!appId) {
    return res.status(500).json({
      error: "DERIV_APP_ID is not configured"
    });
  }

  if (typeof WebSocket === "undefined") {
    return res.status(500).json({
      error: "WebSocket is unavailable in this server runtime"
    });
  }

  res.setHeader("Cache-Control", "no-store");

  let socket;

  try {
    const tick = await new Promise((resolve, reject) => {
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        try {
          socket?.close();
        } catch {}

        callback(value);
      };

      const timer = setTimeout(() => {
        finish(reject, new Error("Market data request timed out"));
      }, 10000);

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
          finish(reject, new Error("Invalid market data response"));
        }
      });

      socket.addEventListener("error", () => {
        finish(reject, new Error("Market data connection failed"));
      });

      socket.addEventListener("close", () => {
        if (!settled) {
          finish(reject, new Error("Market data connection closed"));
        }
      });
    });

    return res.status(200).json({
      success: true,
      tick
    });

  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message || "Unable to retrieve market data"
    });
  }
}
