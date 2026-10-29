const modeButtons = document.querySelectorAll(".mode");
const modeDescription = document.getElementById("modeDescription");
modeButtons.forEach(button => button.addEventListener("click", () => {
  modeButtons.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  modeDescription.textContent = button.dataset.mode === "auto"
    ? "Automatic mode selected in the preview. Live execution is not enabled."
    : "Review signals and choose whether to trade.";
}));
document.getElementById("connectBtn").addEventListener("click", () => {
  document.getElementById("connectionNote").textContent =
    "Integration not configured yet. Add Deriv OAuth/API credentials and a secure backend before connecting accounts.";
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
