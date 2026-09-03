export const HTWB_VERSIONS = Object.freeze({
  app: "0.2.1",
  team: "0.2.1",
  manager: "0.1.0",
  season: "0.1.3",
  lineup: "0.2.1",
  roster: "0.1.1",
  jersey: "0.1.0"
});

function htwbApplyVersions() {
  if (typeof document === "undefined") return;
  for (const element of document.querySelectorAll("[data-htwb-version]")) {
    const value = HTWB_VERSIONS[element.getAttribute("data-htwb-version")];
    if (value) element.textContent = `v${value}`;
  }
}

if (typeof window !== "undefined") {
  window.HTWB_VERSIONS = HTWB_VERSIONS;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", htwbApplyVersions, { once: true });
  } else htwbApplyVersions();
}
