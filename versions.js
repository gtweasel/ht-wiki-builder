export const HTWB_VERSIONS = Object.freeze({
  app: "0.2.0",
  team: "0.1.1",
  lineup: "0.2.0",
  roster: "0.2.0",
  jersey: "0.1.0"
});

function htwbRenderVersions() {
  document.querySelectorAll("[data-htwb-version]").forEach(element => {
    const key = element.getAttribute("data-htwb-version");
    const version = HTWB_VERSIONS[key];
    element.textContent = version ? `v${version}` : "";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", htwbRenderVersions, { once: true });
} else {
  htwbRenderVersions();
}
