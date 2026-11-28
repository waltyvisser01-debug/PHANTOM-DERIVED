
 // PHANTOM HUNTER - PHANTOM DERIVED
// LIVE MARKET DATA + ADVANCED SIGNAL FILTER + SIGNAL HISTORY
// DEMO PROPOSAL MODE ONLY - NO CONTRACT PURCHASES

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

// SIGNAL ENGINE STATE
let tickHistory = [];
let lastTickEpoch = null;

let currentSignal = "COLLECTING DATA";
let currentSignalReason = "Waiting for market ticks...";

const MAX_TICKS = 30;
const MIN_TICKS = 10;

// SIGNAL TRACKER
let signalHistory = [];
let pendingSignals = [];
let lastTrackedSignal = "WAIT";

const SIGNAL_HISTORY_LIMIT = 20;
const SIGNAL_CHECK_TICKS = 5;

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
    description: "Volatility Rise/Fall signal system selected."
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
    tradeActivity.style.whiteSpace = "pre-wrap";
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

// CREATE LIVE MARKET DISPLAY
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

// CREATE SIGNAL DISPLAY
function createSignalDisplay() {
  let display = document.getElementById("phantomSignal");

  if (!display) {
    const marketDisplay = createMarketDisplay();

    if (!marketDisplay) return null;

    display = document.createElement("div");
    display.id = "phantomSignal";

    display.style.cssText = `
      margin-top:10px;
      padding:16px;
      background:#071629;
      border:1px solid #168cff;
      border-radius:10px;
      color:white;
      text-align:center;
      font-weight:bold;
      line-height:1.7;
    `;

    marketDisplay.insertAdjacentElement("afterend", display);
  }

  return display;
}

// CREATE SIGNAL HISTORY DISPLAY
function createSignalHistoryDisplay() {
  let display = document.getElementById("phantomSignalHistory");

  if (!display) {
    const signalDisplay = createSignalDisplay();

    if (!signalDisplay) return null;

    display = document.createElement("div");
    display.id = "phantomSignalHistory";

    display.style.cssText = `
      margin-top:12px;
      padding:15px;
      background:#071629;
      border:1px solid #168cff;
      border-radius:10px;
      color:white;
      font-size:14px;
      line-height:1.7;
    `;

    signalDisplay.insertAdjacentElement("afterend", display);
  }

  return display;
}

// RESET SIGNAL DATA
function resetSignalData() {
  tickHistory = [];
  lastTickEpoch = null;

  currentSignal = "COLLECTING DATA";
  currentSignalReason = "Waiting for new market ticks...";

  lastTrackedSignal = "WAIT";
  pendingSignals = [];

  updateSignalDisplay();
  updateSignalHistoryDisplay();
}

// AVERAGE
function average(values) {
  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) /
    values.length;
}

// SIGNAL ENGINE
// TREND CONFIRMATION + NOISE FILTER
function calculateSignal() {
  if (tickHistory.length < MIN_TICKS) {
    currentSignal = "COLLECTING DATA";

    currentSignalReason =
      `${tickHistory.length}/${MIN_TICKS} different ticks collected`;

    lastTrackedSignal = "WAIT";

    updateSignalDisplay();
    updateSignalHistoryDisplay();
    return;
  }

  const prices = tickHistory.map(tick => tick.price);

  const recentFive = prices.slice(-5);
  const previousFive = prices.slice(-10, -5);

  const shortAverage = average(recentFive);
  const previousAverage = average(previousFive);

  const latestPrice = prices[prices.length - 1];

  // Four latest price changes
  const recentChanges = [];

  for (let i = prices.length - 4; i < prices.length; i++) {
    recentChanges.push(prices[i] - prices[i - 1]);
  }

  const upwardMoves = recentChanges.filter(
    change => change > 0
  ).length;

  const downwardMoves = recentChanges.filter(
    change => change < 0
  ).length;

  const averageMovement = average(
    recentChanges.map(change => Math.abs(change))
  );

  const movement = shortAverage - previousAverage;

  // Noise filter
  const noiseThreshold = averageMovement * 0.25;

  const risingTrend =
    shortAverage > previousAverage &&
    latestPrice > shortAverage &&
    upwardMoves >= 3 &&
    movement > noiseThreshold;

  const fallingTrend =
    shortAverage < previousAverage &&
    latestPrice < shortAverage &&
    downwardMoves >= 3 &&
    Math.abs(movement) > noiseThreshold;

  if (risingTrend) {
    currentSignal = "RISE";

    currentSignalReason =
      "Upward trend confirmed by recent price movements.";

  } else if (fallingTrend) {
    currentSignal = "FALL";

    currentSignalReason =
      "Downward trend confirmed by recent price movements.";

  } else {
    currentSignal = "WAIT";

    currentSignalReason =
      "Trend confirmation failed or price movement is too small.";
  }

  // RECORD NEW DIRECTIONAL SIGNAL
  trackDirectionalSignal(latestPrice);

  updateSignalDisplay({
    shortAverage,
    previousAverage,
    movement,
    upwardMoves,
    downwardMoves,
    noiseThreshold
  });

  updateSignalHistoryDisplay();
}

// RECORD DIRECTIONAL SIGNAL
// ONE PENDING COMPARISON AT A TIME
function trackDirectionalSignal(price) {
  if (currentSignal !== "RISE" && currentSignal !== "FALL") {
    lastTrackedSignal = "WAIT";
    return;
  }

  // Prevent overlapping signal evaluations
  if (pendingSignals.length > 0) {
    lastTrackedSignal = currentSignal;
    return;
  }

  // Record only a new signal transition
  if (currentSignal === lastTrackedSignal) {
    return;
  }

  const tick = tickHistory[tickHistory.length - 1];

  if (!tick) return;

  const record = {
    direction: currentSignal,
    entryPrice: price,
    entryEpoch: tick.epoch,
    ticksPassed: 0,
    status: "PENDING",
    exitPrice: null,
    result: null
  };

  pendingSignals.push(record);

  lastTrackedSignal = currentSignal;
}

// EVALUATE PENDING SIGNALS
function evaluatePendingSignals(tick) {
  for (let i = pendingSignals.length - 1; i >= 0; i--) {
    const signal = pendingSignals[i];

    // Ignore the entry tick
    if (tick.epoch <= signal.entryEpoch) {
      continue;
    }

    signal.ticksPassed++;

    if (signal.ticksPassed >= SIGNAL_CHECK_TICKS) {
      signal.exitPrice = tick.price;

      const difference =
        signal.exitPrice - signal.entryPrice;

      if (difference === 0) {
        signal.result = "FLAT";

      } else if (
        signal.direction === "RISE" &&
        difference > 0
      ) {
        signal.result = "WIN";

      } else if (
        signal.direction === "FALL" &&
        difference < 0
      ) {
        signal.result = "WIN";

      } else {
        signal.result = "LOSS";
      }

      signal.status = "COMPLETED";

      signalHistory.unshift(signal);

      if (signalHistory.length > SIGNAL_HISTORY_LIMIT) {
        signalHistory.pop();
      }

      pendingSignals.splice(i, 1);
    }
  }
}

// UPDATE SIGNAL HISTORY DISPLAY
function updateSignalHistoryDisplay() {
  const display = createSignalHistoryDisplay();

  if (!display) return;

  const wins = signalHistory.filter(
    item => item.result === "WIN"
  ).length;

  const losses = signalHistory.filter(
    item => item.result === "LOSS"
  ).length;

  const flats = signalHistory.filter(
    item => item.result === "FLAT"
  ).length;

  const completed = wins + losses + flats;

  const winRate = completed
    ? ((wins / completed) * 100).toFixed(1)
    : "0.0";

  let pendingHTML = "";

  if (pendingSignals.length) {
    pendingHTML = pendingSignals.map(signal => {
      return `
        <div style="
          padding:8px;
          margin-top:6px;
          border-bottom:1px solid #20344c;
        ">
          <span style="color:${
            signal.direction === "RISE"
              ? "#20d68b"
              : "#ff6262"
          }">
            ${signal.direction}
          </span>
          |
          Entry: ${signal.entryPrice}
          |
          ${signal.ticksPassed}/${SIGNAL_CHECK_TICKS} ticks
          |
          PENDING
        </div>
      `;
    }).join("");
  } else {
    pendingHTML = `
      <div style="margin-top:8px;color:#9fb4cc;">
        No pending signals.
      </div>
    `;
  }

  let historyHTML = "";

  if (signalHistory.length) {
    historyHTML = signalHistory.map(signal => {
      const resultColor =
        signal.result === "WIN"
          ? "#20d68b"
          : signal.result === "LOSS"
          ? "#ff6262"
          : "#ffc857";

      return `
        <div style="
          padding:9px;
          margin-top:7px;
          border-bottom:1px solid #20344c;
        ">
          <span style="color:${
            signal.direction === "RISE"
              ? "#20d68b"
              : "#ff6262"
          }">
            ${signal.direction}
          </span>
          |
          Entry: ${signal.entryPrice}
          |
          Exit: ${signal.exitPrice}
          |
          <span style="color:${resultColor}">
            ${signal.result}
          </span>
          <br>
          <small>
            ${new Date(signal.entryEpoch * 1000).toLocaleTimeString()}
          </small>
        </div>
      `;
    }).join("");
  } else {
    historyHTML = `
      <div style="margin-top:8px;color:#9fb4cc;">
        No completed signals yet.
      </div>
    `;
  }

  display.innerHTML = `
    <div style="
      font-size:17px;
      font-weight:bold;
      color:#168cff;
    ">
      PHANTOM SIGNAL HISTORY
    </div>

    <div style="margin-top:8px;">
      Completed: ${completed}
      | Wins: <span style="color:#20d68b">${wins}</span>
      | Losses: <span style="color:#ff6262">${losses}</span>
      | Flat: <span style="color:#ffc857">${flats}</span>
    </div>

    <div style="margin-top:5px;">
      Directional hit rate: ${winRate}%
    </div>

    <hr style="border-color:#20344c;">

    <div style="font-weight:bold;">
      PENDING SIGNALS
    </div>

    ${pendingHTML}

    <hr style="border-color:#20344c;">

    <div style="font-weight:bold;">
      RECENT RESULTS
    </div>

    ${historyHTML}

    <small style="
      display:block;
      margin-top:10px;
      color:#9fb4cc;
    ">
      Experimental tracker • One pending comparison at a time •
      5 sampled ticks • No contracts purchased
    </small>
  `;
}

// UPDATE SIGNAL DISPLAY
function updateSignalDisplay(details = null) {
  const display = createSignalDisplay();

  if (!display) return;

  let signalColor = "#ffffff";

  if (currentSignal === "RISE") {
    signalColor = "#20d68b";
  } else if (currentSignal === "FALL") {
    signalColor = "#ff6262";
  } else if (currentSignal === "WAIT") {
    signalColor = "#ffc857";
  }

  let extra = "";

  if (details) {
    extra =
      `<br>Recent average: ${details.shortAverage.toFixed(5)}` +
      `<br>Previous average: ${details.previousAverage.toFixed(5)}` +
      `<br>Upward movements: ${details.upwardMoves}/4` +
      `<br>Downward movements: ${details.downwardMoves}/4`;
  }

  display.innerHTML =
    `PHANTOM SIGNAL ENGINE<br>` +
    `<span style="color:${signalColor};font-size:23px;">${currentSignal}</span>` +
    `<br>${currentSignalReason}` +
    `<br>Ticks collected: ${tickHistory.length}/${MAX_TICKS}` +
    extra +
    `<br><small>Analysis only • No contract purchased</small>`;
}

// RECORD MARKET TICK
function recordMarketTick(tick) {
  const price = Number(tick.price);
  const epoch = Number(tick.epoch);

  if (!Number.isFinite(price) || !Number.isFinite(epoch)) {
    return;
  }

  // Prevent duplicate ticks
  if (epoch === lastTickEpoch) {
    return;
  }

  lastTickEpoch = epoch;

  // Evaluate previous signals using new ticks
  evaluatePendingSignals({
    price,
    epoch
  });

  tickHistory.push({
    price,
    epoch
  });

  if (tickHistory.length > MAX_TICKS) {
    tickHistory.shift();
  }

  calculateSignal();
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

    recordMarketTick(data.tick);

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
  marketSelect.addEventListener("change", () => {
    resetSignalData();
    updateLiveMarket();
  });
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
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }

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
      "SIGNAL: " + currentSignal + "\n" +
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
updateSignalDisplay();
updateSignalHistoryDisplay();
checkDerivConnection();
startMarketUpdates();
