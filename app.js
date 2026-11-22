
const connectBtn = document.getElementById("connectBtn");
const balanceEl = document.getElementById("balance");
const connectionNote = document.getElementById("connectionNote");

connectBtn.addEventListener("click", () => {
  window.location.href = "/api/auth/deriv/login";
});

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

    balanceEl.textContent =
      data.balance !== null
        ? `${data.currency} ${Number(data.balance).toFixed(2)}`
        : "Balance unavailable";

    connectionNote.textContent =
      `Connected successfully • Account: ${data.loginid}`;

    connectBtn.textContent = "Deriv account connected";

    document.querySelector(".status").innerHTML =
      "<i></i> DERIV CONNECTED";

  } catch (error) {
    connectionNote.textContent =
      "Connection check failed. Please try again.";
  }
}

checkDerivConnection();
