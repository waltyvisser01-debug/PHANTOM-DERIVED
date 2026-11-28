
// PHANTOM HUNTER - PHANTOM DERIVED
// DEMO-SAFE TRADING DASHBOARD

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

let derivAccounts = [];
let selectedAccount = null;
let currentMode = "manual";
let selectedBot = null;
let engineReady = false;
let engineBusy = false;

// BOT CONFIGURATION
const botConfigurations = {
  "PHANTOM DIGITS HUNTER": {
    strategy: "Digit Matches / Differs",
    description: "Digit-focused trading system selected."
  },

  "PHANTOM VOLATILITY HUNTER": {
    strategy: "Rise / Fall",
    description: "Volatility trading system selected."
  },

  "PHANTOM OVER UNDER": {
    strategy: "Digit Over / Under",
    description: "Digit Over/Under system selected."
  }
};

// STATUS MESSAGE
function setStatus(message) {
  if (modeDescription) {
    modeDescription.textContent = message;
  }
}

// DERIV CONNECTION
if (connectBtn) {
  connectBtn.addEventListener("click", () => {
    window.location.href = "/api/auth/deriv/login";
  });
}

// MODE CONTROL
modeButtons.forEach(button => {
  button.addEventListener("click", async () => {
    const mode = button.dataset.mode;

    if (!["manual", "automatic"].includes(mode)) return;

    if (mode === "automatic") {
      if (!selectedBot) {
        setStatus("Please select a PHANTOM bot first.");
        return;
      }

      if (!selectedAccount ||
          String(selectedAccount.account_type).toLowerCase() !== "demo") {
        setStatus("Automatic mode requires a connected DEMO account.");
        return;
      }

      if (!validateSettings()) {
        setStatus("Please correct your trading settings.");
        return;
      }

      await activateAutomaticMode();
    } else {
      currentMode = "manual";
      updateMode();
    }

    modeButtons.forEach(item => {
      item.classList.toggle("active", item === button);
    });
  });
});

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

// BOT LIBRARY
botButtons.forEach(button => {
  button.addEventListener("click", () => {
    const botName = button.dataset.bot;

    if (!botConfigurations[botName]) return;

    selectedBot = botName;

    const config = botConfigurations[botName];

    if (strategySelect) {
      let option = Array.from(strategySelect.options).find(
        item => item.text.trim() === config.strategy
      );

      if (!option) {
        option = document.createElement("option");
        option.text = config.strategy;
        option.value = config.strategy;
        strategySelect.appendChild(option);
      }

      strategySelect.value = option.value;
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

    updateMode();
  });
});

// ACCOUNT DISPLAY
function displayAccount(account) {
  if (!account) return;

  selectedAccount = account;

  if (balanceEl) {
    balanceEl.textContent =
      `${account.currency || "USD"} ${Number(account.balance || 0).toFixed(2)}`;
  }

  if (connectionNote) {
    connectionNote.textContent =
      `Connected • ${account.account_id} • ${String(account.account_type || "").toUpperCase()}`;
  }

  let selector = document.getElementById("derivAccountSelector");

  if (!selector && connectionNote) {
    selector = document.createElement("select");
    selector.id = "derivAccountSelector";

    selector.style.cssText =
      "width:100%;padding:12px;margin-top:12px;border-radius:8px;background:#071629;color:white;border:1px solid #168cff;";

    connectionNote.insertAdjacentElement("afterend", selector);

    selector.addEventListener("change", () => {
      const account = derivAccounts.find(
        item => item.account_id === selector.value
      );

      displayAccount(account);

      if (currentMode === "automatic" &&
          String(account?.account_type).toLowerCase() !== "demo") {
        stopAutomaticMode("REAL account selected. Automatic mode stopped.");
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

      if (balanceEl) balanceEl.textContent = "—";

      if (connectionNote) {
        connectionNote.textContent =
          data.error || "Not connected to Deriv.";
      }

      if (connectBtn) {
        connectBtn.textContent = "Connect Deriv account";
      }

      return;
    }

    derivAccounts = data.accounts || [];

    const preferredAccount =
      derivAccounts.find(account =>
        account.account_id === selectedAccount?.account_id
      ) ||
      derivAccounts.find(account =>
        String(account.account_type).toLowerCase() === "demo"
      ) ||
      derivAccounts[0];

    displayAccount(preferredAccount);

  } catch (error) {
    if (connectionNote) {
      connectionNote.textContent = "Connection check failed.";
    }

    console.error("PHANTOM:", error);
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
    stake > 0 &&
    stake <= 10 &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    duration <= 1000 &&
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

// AUTOMATIC MODE
async function activateAutomaticMode() {
  if (engineBusy) return;

  if (!selectedAccount ||
      String(selectedAccount.account_type).toLowerCase() !== "demo") {
    setStatus("DEMO account required.");
    return;
  }

  engineBusy = true;

  setStatus("Checking PHANTOM trading engine...");

  try {
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
        market: marketSelect?.value || "Volatility 10 Index",
        strategy: strategySelect?.value || "",
        stake: Number(stakeInput?.value),
        duration: Number(durationInput?.value),
        daily_loss: Number(dailyLossInput?.value),
        daily_profit: Number(dailyProfitInput?.value)
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Engine request failed.");
    }

    engineReady = true;
    currentMode = "automatic";

    setStatus(
      data.message ||
      "Engine endpoint responding. Trade execution is not enabled."
    );

    // This endpoint currently does not execute trades.
    engineReady = false;

  } catch (error) {
    currentMode = "manual";
    engineReady = false;

    setStatus(`Automatic mode unavailable: ${error.message}`);

    console.error("PHANTOM ENGINE:", error);

  } finally {
    engineBusy = false;
  }
}

// STOP AUTOMATIC MODE
function stopAutomaticMode(message) {
  currentMode = "manual";
  engineReady = false;

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
