
// PHANTOM HUNTER - PHANTOM DERIVED
// LIVE MARKET DATA - DEMO PROPOSAL MODE ONLY

"use strict";

// ELEMENTS
const connectBtn = document.getElementById("connectBtn");
const balanceEl = document.getElementById("balance");
const connectionNote = document.getElementById("connectionNote");
const modeDescription = document.getElementById("modeDescription");

const modeButtons = document.querySelectorAll(".mode");
const marketSelect = document.getElementById("market");
const strategySelect = document.getElementById("strategy");

const botButtons = document.querySelectorAll(".bot-select");
const selectedBotName = document.getElementById("selectedBotName");
const selectedBotMessage = document.getElementById("selectedBotMessage");

const stakeInput = document.getElementById("stake");
const durationInput = document.getElementById("duration");
const dailyLossInput = document.getElementById("dailyLoss");
const dailyProfitInput = document.getElementById("dailyProfit");

const tradeActivity = document.getElementById("tradeActivity");

// STATE
let derivAccounts = [];
let selectedAccount = null;
let currentMode = "manual";
let selectedBot = null;
let engineBusy = false;

let marketTimer = null;
let marketBusy = false;

// BOT CONFIGURATION
const botConfigurations = {
  "PHANTOM DIGITS HUNTER": {
    strategy: "Digit Matches / Differs",
    strategyValue: "matches_differs",
    description: "Digit-focused trading system selected."
  },

  "PHANTOM VOLATILITY HUNTER": {
    strategy: "Rise / Fall",
    strategyValue: "rise_fall",
    description: "Volatility Rise/Fall proposal system selected."
  },

  "PHANTOM OVER UNDER": {
    strategy: "Digit Over / Under",
    strategyValue: "over_under",
    description: "Digit Over/Under system selected."
  }
};

// STATUS
function setStatus(message) {
  if (modeDescription) {
    modeDescription.textContent = message;
  }
}

// ACTIVITY DISPLAY
function showActivity(message) {
  if (tradeActivity) {
    tradeActivity.textContent = message;
  }
}

// MARKET SYMBOL
function getMarketSymbol() {
  const market = marketSelect?.value || "R_10";

  const symbols = {
    "Volatility 10 Index": "R_10",
    "Volatility 25 Index": "R_25",
    "Volatility 50 Index": "R_50",
    "Volatility 75 Index": "R_75",
    "Volatility 100 Index": "R_100",
    "R_10": "R_10",
    "R_25": "R_25",
    "R_50": "R_50",
    "R_75": "R_75",
    "R_100": "R_100"
  };

  return symbols[market] || "R_10";
}

// LIVE MARKET DISPLAY
function createMarketDisplay() {
  let display = document.getElementById("phantomMarketPrice");

  if (!display && marketSelect) {
    display = document.createElement("div");
    display.id = "phantomMarketPrice";

    display.style.cssText = `
      margin-top:12px;
      padding:15px;
      background:#071629;
      border:1px solid #168cff;
      border-radius:10px;
      color:white;
      font-size:16px;
      font-weight:bold;
      text-align:center;
    `;

    marketSelect.insertAdjacentElement("afterend", display);
  }

  return display;
}

// FETCH LIVE PRICE
async function updateLiveMarket() {
  if (marketBusy) return;

  marketBusy = true;

  const display = createMarketDisplay();

  try {
    const symbol = getMarketSymbol();

    const response = await fetch(
      `/api/market?symbol=${encodeURIComponent(symbol)}`,
      {
        cache: "no-store",
        credentials: "same-origin"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.tick) {
      throw new Error(data.error || "Market data unavailable.");
    }

    if (display) {
      const price = Number(data.tick.price);

      display.textContent =
        `LIVE ${data.tick.symbol} | ${
          Number.isFinite(price)
            ? price.toLocaleString("en-US")
            : "Unavailable"
        } | ${new Date(
          Number(data.tick.epoch) * 1000
        ).toLocaleTimeString()}`;
    }

  } catch (error) {
    if (display) {
      display.textContent = "Market connection: " + error.message;
    }

    console.error("PHANTOM MARKET:", error);

  } finally {
    marketBusy = false;
  }
}

// START MARKET UPDATES
function startMarketUpdates() {
  stopMarketUpdates();
  updateLiveMarket();

  marketTimer = setInterval(updateLiveMarket, 3000);
}

// STOP MARKET UPDATES
function stopMarketUpdates() {
  if (marketTimer) {
    clearInterval(marketTimer);
    marketTimer = null;
  }
}

// MARKET SELECTION
if (marketSelect) {
  marketSelect.addEventListener("change", updateLiveMarket);
}

// DERIV LOGIN
if (connectBtn) {
  connectBtn.addEventListener("click", () => {
    window.location.href = "/api/auth/deriv/login";
  });
}

// MODE DISPLAY
function updateMode() {
  if (currentMode === "manual") {
    setStatus(
      selectedBot
        ? `${selectedBot} selected. Manual mode is active.`
        : "Manual mode selected. Select a PHANTOM bot."
    );
  }
}

// MODE CONTROL
modeButtons.forEach(button => {
  button.addEventListener("click", async () => {
    const mode = button.dataset.mode;

    if (!["manual", "automatic"].includes(mode)) {
      return;
    }

    if (mode === "manual") {
      currentMode = "manual";

      modeButtons.forEach(item => {
        item.classList.toggle(
          "active",
          item.dataset.mode === "manual"
        );
      });

      updateMode();
      return;
    }

    if (engineBusy) return;

    if (!selectedBot) {
      setStatus("Please select a PHANTOM bot first.");
      return;
    }

    if (
      !selectedAccount ||
      String(selectedAccount.account_type).toLowerCase() !== "demo"
    ) {
      setStatus("A connected DEMO account is required.");
      return;
    }

    if (!validateSettings()) {
      setStatus("Please correct your trading settings.");
      return;
    }

    if (
      selectedBot !== "PHANTOM VOLATILITY HUNTER" ||
      strategySelect?.value !== "rise_fall"
    ) {
      setStatus(
        "Only PHANTOM VOLATILITY HUNTER Rise/Fall quotes are currently supported."
      );
      return;
    }

    await activateAutomaticMode();
  });
});

// BOT LIBRARY
botButtons.forEach(button => {
  button.addEventListener("click", () => {
    const botName = button.dataset.bot;
    const config = botConfigurations[botName];

    if (!config) return;

    selectedBot = botName;

    if (strategySelect) {
      const option = Array.from(strategySelect.options).find(
        item =>
          item.value === config.strategyValue ||
          item.text.trim() === config.strategy
      );

      if (option) {
        strategySelect.value = option.value;
      }
    }

    if (selectedBotName) {
      selectedBotName.textContent = botName;
    }

    if (selectedBotMessage) {
      selectedBotMessage.textContent = config.description;
    }

    botButtons.forEach(item => {
      item.classList.remove("selected");
      item.textContent = "Select Bot";
    });

    button.classList.add("selected");
    button.textContent = "Selected";

    showActivity("Selected bot: " + botName);

    updateMode();
  });
});

// ACCOUNT DISPLAY
function displayAccount(account) {
  if (!account) return;

  selectedAccount = account;

  if (balanceEl) {
    balanceEl.textContent =
      `${account.currency || "USD"} ${Number(
        account.balance || 0
      ).toFixed(2)}`;
  }

  if (connectionNote) {
    connectionNote.textContent =
      `Connected • ${account.account_id} • ${
        String(account.account_type || "").toUpperCase()
      }`;
  }

  let selector = document.getElementById("derivAccountSelector");

  if (!selector && connectionNote) {
    selector = document.createElement("select");
    selector.id = "derivAccountSelector";

    selector.style.cssText =
      "width:100%;padding:12px;margin-top:12px;border-radius:8px;background:#071629;color:white;border:1px solid #168cff;";

    connectionNote.insertAdjacentElement("afterend", selector);

    selector.addEventListener("change", () => {
      const selected = derivAccounts.find(
        item => item.account_id === selector.value
      );

      if (!selected) return;

      displayAccount(selected);

      if (
        String(selected.account_type).toLowerCase() !== "demo"
      ) {
        stopAutomaticMode(
          "REAL account selected. Demo proposal mode stopped."
        );
      }
    });
  }

  if (selector) {
    selector.innerHTML = "";

    derivAccounts.forEach(item => {
      const option = document.createElement("option");

      option.value = item.account_id;
      option.textContent =
        `${String(item.account_type || "").toUpperCase()} • ${item.account_id}`;

      option.selected = item.account_id === account.account_id;

      selector.appendChild(option);
    });
  }

  const status = document.querySelector(".status");

  if (status) {
    status.textContent = "DERIV CONNECTED";
  }

  if (connectBtn) {
    connectBtn.textContent = "Deriv account connected";
  }
}

// CHECK DERIV CONNECTION
async function checkDerivConnection() {
  try {
    const response = await fetch("/api/auth/deriv/status", {
      cache: "no-store",
      credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.connected) {
      selectedAccount = null;
      derivAccounts = [];

      if (balanceEl) {
        balanceEl.textContent = "—";
      }

      if (connectionNote) {
        connectionNote.textContent =
          data.error || "Not connected to Deriv.";
      }

      if (connectBtn) {
        connectBtn.textContent = "Connect Deriv account";
      }

      return;
    }

    derivAccounts = Array.isArray(data.accounts)
      ? data.accounts
      : [];

    const preferredAccount =
      derivAccounts.find(account =>
        account.account_id === selectedAccount?.account_id
      ) ||
      derivAccounts.find(account =>
        String(account.account_type).toLowerCase() === "demo"
      ) ||
      derivAccounts[0];

    if (preferredAccount) {
      displayAccount(preferredAccount);
    }

  } catch (error) {
    if (connectionNote) {
      connectionNote.textContent = "Connection check failed.";
    }

    console.error("PHANTOM CONNECTION:", error);
  }
}

// SETTINGS VALIDATION
function validateSettings() {
  const stake = Number(stakeInput?.value);
  const duration = Number(durationInput?.value);
  const dailyLoss = Number(dailyLossInput?.value);
  const dailyProfit = Number(dailyProfitInput?.value);

  return (
    Number.isFinite(stake) &&
    stake >= 0.35 &&
    stake <= 10 &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    duration <= 100 &&
    Number.isFinite(dailyLoss) &&
    dailyLoss > 0 &&
    Number.isFinite(dailyProfit) &&
    dailyProfit > 0
  );
}

// SETTINGS FEEDBACK
[
  stakeInput,
  durationInput,
  dailyLossInput,
  dailyProfitInput
].forEach(input => {
  if (!input) return;

  input.addEventListener("change", () => {
    input.style.borderColor =
      validateSettings() ? "" : "#ff4d4d";
  });
});

// FORMAT QUOTE VALUES
function formatQuote(value, currency) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Unavailable";
  }

  return `${currency || ""} ${number.toFixed(2)}`.trim();
}

// AUTOMATIC MODE
// DEMO PROPOSAL REQUESTS ONLY - NO PURCHASE
async function activateAutomaticMode() {
  if (engineBusy) return;

  if (
    !selectedAccount ||
    String(selectedAccount.account_type).toLowerCase() !== "demo"
  ) {
    setStatus("DEMO account required.");
    return;
  }

  engineBusy = true;
  currentMode = "manual";

  setStatus("PHANTOM is requesting Rise and Fall quotes...");

  showActivity("Connecting to Deriv proposal service...");

  try {
    const symbol = getMarketSymbol();

    const response = await fetch("/api/trade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        mode: "automatic",
        account_id: selectedAccount.account_id,
        bot: selectedBot,
        market: symbol,
        symbol: symbol,
        strategy: "rise_fall",
        stake: Number(stakeInput?.value),
        duration: Number(durationInput?.value),
        daily_loss: Number(dailyLossInput?.value),
        daily_profit: Number(dailyProfitInput?.value)
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Proposal request failed.");
    }

    const rise =
      data.proposals?.rise ||
      data.rise;

    const fall =
      data.proposals?.fall ||
      data.fall;

    if (!rise || !fall) {
      throw new Error("Deriv did not return both proposals.");
    }

    const currency = selectedAccount.currency || "USD";

    showActivity(
      "PHANTOM VOLATILITY HUNTER\n" +
      "DEMO PROPOSAL RESULTS\n\n" +
      "MARKET: " + symbol + "\n" +
      "STAKE: " + formatQuote(stakeInput?.value, currency) + "\n" +
      "DURATION: " + durationInput?.value + " ticks\n\n" +
      "RISE QUOTE\n" +
      "Price: " + formatQuote(rise.ask_price, currency) + "\n" +
      "Payout: " + formatQuote(rise.payout, currency) + "\n\n" +
      "FALL QUOTE\n" +
      "Price: " + formatQuote(fall.ask_price, currency) + "\n" +
      "Payout: " + formatQuote(fall.payout, currency) + "\n\n" +
      "STATUS: QUOTES RECEIVED\n" +
      "NO CONTRACT PURCHASED"
    );

    setStatus(
      "Rise and Fall quotes received. No trade was purchased."
    );

  } catch (error) {
    showActivity(
      "PROPOSAL REQUEST FAILED\n\n" + error.message
    );

    setStatus("Proposal check failed: " + error.message);

    console.error("PHANTOM PROPOSALS:", error);

  } finally {
    engineBusy = false;
    currentMode = "manual";

    modeButtons.forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.mode === "manual"
      );
    });
  }
}

// STOP AUTOMATIC MODE
function stopAutomaticMode(message) {
  currentMode = "manual";

  modeButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.mode === "manual"
    );
  });

  setStatus(message || "Automatic mode stopped.");
}

// INITIALIZE
updateMode();
checkDerivConnection();
startMarketUpdates();
