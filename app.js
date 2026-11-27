// PHANTOM HUNTER - PHANTOM DERIVED

const connectBtn = document.getElementById("connectBtn");
const balanceEl = document.getElementById("balance");
const connectionNote = document.getElementById("connectionNote");
const modeDescription = document.getElementById("modeDescription");

const modeButtons = document.querySelectorAll(".mode");
const marketSelect = document.getElementById("market");
const strategySelect = document.getElementById("strategy");

let derivAccounts = [];
let selectedAccount = null;
let currentMode = "manual";

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

// UPDATE MODE
function updateMode() {
  if (!modeDescription) return;

  if (currentMode === "manual") {
    modeDescription.textContent =
      "Manual mode selected. Review your market and strategy settings.";
  } else {
    modeDescription.textContent =
      "Automatic mode selected. Trading engine is not activated.";
  }
}

// DISPLAY ACCOUNT
function displayAccount(account) {
  if (!account) return;

  selectedAccount = account;

  if (balanceEl) {
    balanceEl.textContent =
      `${account.currency} ${Number(account.balance || 0).toFixed(2)}`;
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
        account.account_type === "demo"
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

// INITIALIZE
updateMode();
checkDerivConnection();