
const connectBtn = document.getElementById("connectBtn");
const balanceEl = document.getElementById("balance");
const connectionNote = document.getElementById("connectionNote");

let derivAccounts = [];
let selectedAccount = null;

connectBtn.addEventListener("click", () => {
  window.location.href = "/api/auth/deriv/login";
});

function displayAccount(account) {
  if (!account) return;

  selectedAccount = account;

  balanceEl.textContent =
    `${account.currency} ${Number(account.balance || 0).toFixed(2)}`;

  connectionNote.textContent =
    `Connected • ${account.account_id} • ${account.account_type.toUpperCase()}`;

  let selector = document.getElementById("derivAccountSelector");

  if (!selector) {
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
    });
  }

  selector.innerHTML = "";

  derivAccounts.forEach(item => {
    const option = document.createElement("option");

    option.value = item.account_id;
    option.textContent =
      `${item.account_type.toUpperCase()} • ${item.account_id}`;

    option.selected =
      item.account_id === account.account_id;

    selector.appendChild(option);
  });

  const status = document.querySelector(".status");

  if (status) {
    status.innerHTML = "<i></i> DERIV CONNECTED";
  }

  connectBtn.textContent = "Deriv account connected";
}

async function checkDerivConnection() {
  connectionNote.textContent = "Checking Deriv connection...";

  try {
    const response = await fetch("/api/auth/deriv/status", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.connected) {
      balanceEl.textContent = "—";
      connectionNote.textContent =
        data.error || "Not connected to Deriv.";

      connectBtn.textContent = "Connect Deriv account";
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
    balanceEl.textContent = "—";
    connectionNote.textContent =
      "Connection check failed. Please try again.";

    connectBtn.textContent = "Connect Deriv account";
  }
}

checkDerivConnection();
