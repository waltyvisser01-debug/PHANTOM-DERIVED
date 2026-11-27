
 // PHANTOM HUNTER - PHANTOM DERIVED

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

// BOT CONFIGURATION
const botConfigurations = {
  "PHANTOM DIGITS HUNTER": {
    strategy: "Digit Matches / Differs",
    description: "Digit-focused system selected. Review settings before trading."
  },

  "PHANTOM VOLATILITY HUNTER": {
    strategy: "Rise / Fall",
    description: "Volatility system selected. Review settings before trading."
  },

  "PHANTOM OVER UNDER": {
    strategy: "Digit Over / Under",
    description: "Over/Under system selected. Review settings before trading."
  }
};

// DERIV CONNECTION
if (connectBtn) {
  connectBtn.addEventListener("click", () => {
    window.location.href = "/api/auth/deriv/login";
  });
}

// MODE CONTROL
modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentMode = button.dataset.mode;

    modeButtons.forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    updateMode();
  });
});

// MODE DISPLAY
function updateMode() {
  if (!modeDescription) return;

  if (currentMode === "manual") {
    modeDescription.textContent =
      selectedBot
        ? `${selectedBot} selected. Manual mode is active.`
        : "Manual mode selected. Review your market and strategy settings.";
  } else {
    modeDescription.textContent =
      "Automatic mode selected. Trading engine is not activated.";
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
      const matchingOption = Array.from(strategySelect.options).find(
        option => option.text.trim() === config.strategy
      );

      if (matchingOption) {
        strategySelect.value = matchingOption.value;
      } else {
        const option = document.createElement("option");

        option.text = config.strategy;
        option.value = config.strategy;

        strategySelect.appendChild(option);
        strategySelect.value = config.strategy;
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

    updateMode();
  });
});

// DISPLAY ACCOUNT
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
      const selected = derivAccounts.find(
        item => item.account_id === selector.value
      );

      displayAccount(selected);
    });
  }

  if (selector) {
    selector.innerHTML = "";

    derivAccounts.forEach(item => {
      const option = document.createElement("option");

      option.value = item.account_id;

      option.textContent =
        `${String(item.account_type || "").toUpperCase()} • ${item.account_id}`;

      option.selected =
        item.account_id === account.account_id;

      selector.appendChild(option);
    });
  }

  const status = document.querySelector(".status");

  if (status) {
    status.innerHTML = "<i></i> DERIV CONNECTED";
  }

  if (connectBtn) {
    connectBtn.textContent = "Deriv account connected";
  }
}

// CHECK DERIV CONNECTION
async function checkDerivConnection() {
  if (connectionNote) {
    connectionNote.textContent = "Checking Deriv connection...";
  }

  try {
    const response = await fetch("/api/auth/deriv/status", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.connected) {
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
    if (balanceEl) balanceEl.textContent = "—";

    if (connectionNote) {
      connectionNote.textContent =
        "Connection check failed. Please try again.";
    }

    if (connectBtn) {
      connectBtn.textContent = "Connect Deriv account";
    }

    console.error("PHANTOM HUNTER:", error);
  }
}

// SETTINGS VALIDATION
function validateSettings() {
  const stake = Number(stakeInput?.value);
  const duration = Number(durationInput?.value);
  const dailyLoss = Number(dailyLossInput?.value);
  const dailyProfit = Number(dailyProfitInput?.value);

  if (
    !Number.isFinite(stake) ||
    stake <= 0 ||
    !Number.isFinite(duration) ||
    duration < 1 ||
    !Number.isFinite(dailyLoss) ||
    dailyLoss <= 0 ||
    !Number.isFinite(dailyProfit) ||
    dailyProfit <= 0
  ) {
    return false;
  }

  return true;
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
    if (!validateSettings()) {
      input.style.borderColor = "#ff4d4d";
    } else {
      input.style.borderColor = "";
    }
  });
});

// INITIALIZE
updateMode();
checkDerivConnection();
