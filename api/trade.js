
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
    const body = req.body || {};

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
      throw new Error("Connect your Deriv account first.");
    }

    const accountId = String(body.account_id || "");
    const symbol = String(body.market || "");
    const stake = Number(body.stake);
    const duration = Number(body.duration);

    const allowedSymbols = [
      "R_10", "R_25", "R_50", "R_75", "R_100"
    ];

    if (!/^DOT[0-9]+$/.test(accountId)) {
      throw new Error("Invalid demo account.");
    }

    if (!allowedSymbols.includes(symbol)) {
      throw new Error("Invalid market.");
    }

    if (!Number.isFinite(stake) || stake < 0.35 || stake > 10) {
      throw new Error("Stake must be between 0.35 and 10.");
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 100
    ) {
      throw new Error("Duration must be between 1 and 100 ticks.");
    }

    if (
      body.bot !== "PHANTOM VOLATILITY HUNTER" ||
      body.strategy !== "rise_fall"
    ) {
      throw new Error(
        "Proposal testing currently supports PHANTOM VOLATILITY HUNTER only."
      );
    }

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
      : [];

    const account = accounts.find(item =>
      item.account_id === accountId &&
      item.account_type === "demo" &&
      item.status === "active"
    );

    if (!account) {
      throw new Error("An active DEMO account is required.");
    }

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
        "Unable to obtain demo connection."
      );
    }

    const wsUrl = new URL(otpResult.data.url);

    if (
      wsUrl.protocol !== "wss:" ||
      wsUrl.hostname !== "api.derivws.com" ||
      wsUrl.pathname !== "/trading/v1/options/ws/demo" ||
      !wsUrl.searchParams.has("otp")
    ) {
      throw new Error("Invalid demo connection address.");
    }

    const proposals = await new Promise((resolve, reject) => {
      let settled = false;
      const results = {};

      const timer = setTimeout(() => {
        finish(reject, new Error("Proposal request timed out."));
      }, 15000);

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
        const common = {
          proposal: 1,
          amount: stake,
          basis: "stake",
          currency: account.currency,
          duration,
          duration_unit: "t",
          underlying_symbol: symbol
        };

        socket.send(JSON.stringify({
          ...common,
          contract_type: "PUT",
          req_id: 101
        }));

        socket.send(JSON.stringify({
          ...common,
          contract_type: "CALL",
          req_id: 102
        }));
      });

      socket.on("message", message => {
        try {
          const data = JSON.parse(message.toString());

          if (data.error) {
            finish(
              reject,
              new Error(data.error.message || "Proposal rejected.")
            );
            return;
          }

          if (data.msg_type !== "proposal" || !data.proposal) {
            return;
          }

          if (data.req_id === 101) {
            results.rise = {
              contract_type: "PUT",
              proposal_id: data.proposal.id,
              ask_price: data.proposal.ask_price,
              payout: data.proposal.payout,
              description: data.proposal.longcode
            };
          }

          if (data.req_id === 102) {
            results.fall = {
              contract_type: "CALL",
              proposal_id: data.proposal.id,
              ask_price: data.proposal.ask_price,
              payout: data.proposal.payout,
              description: data.proposal.longcode
            };
          }

          if (results.rise && results.fall) {
            finish(resolve, results);
          }

        } catch {
          finish(reject, new Error("Invalid Deriv response."));
        }
      });

      socket.on("error", () => {
        finish(reject, new Error("Demo WebSocket connection failed."));
      });

      socket.on("close", () => {
        if (!settled) {
          finish(reject, new Error("Demo connection closed."));
        }
      });
    });

    return res.status(200).json({
      success: true,
      status: "PROPOSALS_READY",
      mode: "DEMO_ONLY",
      trading: false,
      account_id: accountId,
      market: symbol,
      stake,
      duration,
      currency: account.currency,
      proposals
    });

  } catch (error) {
    try {
      socket?.close();
    } catch {}

    return res.status(400).json({
      success: false,
      trading: false,
      error: error.message || "Proposal request failed."
    });
  }
}
