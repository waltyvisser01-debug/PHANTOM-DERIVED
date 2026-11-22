
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  res.setHeader("Cache-Control", "no-store");

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
  const appId = process.env.DERIV_CLIENT_ID;

  if (!token || !appId) {
    return res.status(401).json({
      connected: false,
      error: "Deriv account not connected"
    });
  }

  if (typeof WebSocket === "undefined") {
    return res.status(503).json({
      connected: false,
      error: "WebSocket unavailable"
    });
  }

  const ws = new WebSocket(
    `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`
  );

  try {
    const account = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Deriv connection timed out"));
      }, 10000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ authorize: token }));
      };

      ws.onmessage = event => {
        const message = JSON.parse(event.data);

        if (message.error) {
          clearTimeout(timeout);
          reject(new Error("Deriv authorization failed"));
          ws.close();
          return;
        }

        if (message.msg_type === "authorize") {
          clearTimeout(timeout);
          resolve(message.authorize);
          ws.close();
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Deriv connection failed"));
      };
    });

    return res.status(200).json({
      connected: true,
      loginid: account.loginid,
      currency: account.currency,
      balance: account.balance ?? null
    });

  } catch (error) {
    return res.status(401).json({
      connected: false,
      error: error.message
    });
  }
}
