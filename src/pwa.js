if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    } catch (error) {
      // Offline support is progressive enhancement; gameplay must remain available.
      console.warn("Service worker registration failed", error);
    }
  }, { once: true });
}
