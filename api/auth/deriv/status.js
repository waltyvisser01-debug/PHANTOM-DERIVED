
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
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
        connected: false,
        error: "Deriv account not connected"
      });
    }

    const response = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result.errors?.[0]?.message ||
        result.error ||
        "Unable to retrieve Deriv accounts";

      return res.status(response.status).json({
        connected: false,
        error: message
      });
    }

    const accounts = Array.isArray(result.data)
      ? result.data
      : [];

    const account =
      accounts.find(item =>
        item.account_type === "demo" &&
        item.status === "active"
      ) ||
      accounts.find(item => item.status === "active") ||
      accounts[0];

    if (!account) {
      return res.status(404).json({
        connected: false,
        error: "No Deriv trading accounts found"
      });
    }

    return res.status(200).json({
      connected: true,
      loginid: account.account_id,
      account_id: account.account_id,
      currency: account.currency,
      balance: account.balance,
      account_type: account.account_type,
      accounts: accounts.map(item => ({
        account_id: item.account_id,
        currency: item.currency,
        balance: item.balance,
        account_type: item.account_type,
        status: item.status
      }))
    });

  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error.message || "Deriv connection failed"
    });
  }
}
