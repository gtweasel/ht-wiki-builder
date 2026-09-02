export const HTWB_VERSIONS = Object.freeze({
  app: "0.1.1",
  team: "0.1.1",
  lineup: "0.2.1",
  roster: "0.2.1",
  jersey: "0.1.0",
  manager: "0.3.0"
});

function htwbApplyVersions() {
  if (typeof document === "undefined") {
    return;
  }

  for (const htwbVersionElement of document.querySelectorAll("[data-htwb-version]")) {
    const htwbVersionKey = htwbVersionElement.getAttribute("data-htwb-version");
    const htwbVersionValue = HTWB_VERSIONS[htwbVersionKey];

    if (htwbVersionValue) {
      htwbVersionElement.textContent = `v${htwbVersionValue}`;
    }
  }
}

if (typeof window !== "undefined") {
  window.HTWB_VERSIONS = HTWB_VERSIONS;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", htwbApplyVersions, { once: true });
  } else {
    htwbApplyVersions();
  }
}
