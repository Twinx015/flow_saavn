/* One-time dismissible notice banner. */

export function initNotice() {
  if (localStorage.getItem("notice-dismissed")) return;
  const banner = document.getElementById("notice-banner");
  const dismiss = document.getElementById("dismiss-notice");
  if (!banner || !dismiss) return;
  banner.classList.remove("hidden");
  dismiss.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem("notice-dismissed", "1");
  });
}
