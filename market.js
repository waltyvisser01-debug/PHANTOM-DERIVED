
// PHANTOM HUNTER - LIVE DERIV MARKET DATA

(() => {
  const WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";

  let socket = null;
  let selectedSymbol = null;

  const panel = document.createElement("section");
  panel.id = "phantomMarketPanel";
  panel.style.cssText = `
    background:#071629;
    border:1px solid #168cff;
    border-radius:12px;
    padding:16px;
    margin:16px 0;
    color:white;
  `;

  panel.innerHTML = `
    <h3 style="color:#168cff;margin-top:0">
      PHANTOM LIVE MARKET
    </h3>
    <div id="marketStatus">Connecting to Deriv market...</div>
    <select id="marketSelector"
      style="width:100%;padding:12px;margin:12px 0;
      background:#071629;color:white;border:1px solid #168cff;
      border-radius:8px">
      <option>Loading synthetic markets...</option>
    </select>
    <div style="font-size:13px;color:#9bb4d0">
      LIVE PRICE
    </div>
    <div id="marketPrice"
      style="font-size:28px;font-weight:bold;margin-top:6px">
      —
    </div>
    <div id="marketTime"
      style="font-size:12px;color:#9bb4d0;margin-top:6px">
      Waiting for price data
    </div>
  `;

  const anchor = document.getElementById("connectionNote");

  if (anchor) {
    anchor.insertAdjacentElement("afterend", panel);
  } else {
    document.body.appendChild(panel);
  }

  const statusEl = document.getElementById("marketStatus");
  const selector = document.getElementById("marketSelector");
  const priceEl = document.getElementById("marketPrice");
  const timeEl = document.getElementById("marketTime");

  function connectMarket() {
    if (socket) socket.close();

    statusEl.textContent = "Connecting to Deriv...";

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      statusEl.textContent = "Connected • Loading markets";

      socket.send(JSON.stringify({
        active_symbols: "brief",
        req_id: 1
      }));
    };

    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.error) {
        statusEl.textContent = data.error.message;
        return;
      }

      if (data.msg_type === "active_symbols") {
        const markets = (data.active_symbols || []).filter(item => {
          const description = [
            item.display_name,
            item.market,
            item.submarket
          ].join(" ").toLowerCase();

          return (
            description.includes("synthetic") ||
            description.includes("volatility") ||
            description.includes("crash") ||
            description.includes("boom") ||
            description.includes("step") ||
            description.includes("range break")
          );
        });

        selector.innerHTML = "";

        if (!markets.length) {
          statusEl.textContent = "No synthetic markets returned.";
          return;
        }

        markets.forEach(market => {
          const option = document.createElement("option");
          option.value = market.symbol;
          option.textContent =
            `${market.display_name} (${market.symbol})`;
          selector.appendChild(option);
        });

        selectedSymbol = markets[0].symbol;
        selector.value = selectedSymbol;

        subscribeToMarket(selectedSymbol);
      }

      if (data.msg_type === "tick" && data.tick) {
        const tick = data.tick;

        if (tick.symbol !== selectedSymbol) return;

        priceEl.textContent =
          Number(tick.quote).toFixed(tick.pip_size);

        timeEl.textContent =
          "Last update: " +
          new Date(tick.epoch * 1000).toLocaleTimeString();

        statusEl.textContent =
          "LIVE • " + selectedSymbol;
      }
    };

    socket.onerror = () => {
      statusEl.textContent = "Market connection error.";
    };

    socket.onclose = () => {
      statusEl.textContent = "Market disconnected.";
    };
  }

  function subscribeToMarket(symbol) {
    selectedSymbol = symbol;
    priceEl.textContent = "Waiting...";
    timeEl.textContent = "Receiving market prices";

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        ticks: symbol,
        subscribe: 1,
        req_id: 2
      }));
    }
  }

  selector.addEventListener("change", () => {
    subscribeToMarket(selector.value);
  });

  connectMarket();
})();
