export function createBannerNotifier({ mountId = "monitor-banner" } = {}) {
  const active = new Map(); // key -> message

  function ensureMount() {
    let el = document.getElementById(mountId);
    if (!el) {
      el = document.createElement("div");
      el.id = mountId;
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.right = "0";
      el.style.zIndex = 9999;
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.gap = ".25rem";
      el.style.padding = ".5rem";
      el.style.background = "#fff3cd";
      el.style.borderBottom = "2px solid #ffe08a";
      el.style.color = "#5f4a00";
      el.style.fontWeight = "600";
      el.style.textAlign = "center";
      document.body.prepend(el);
    }
    return el;
  }

  function render() {
    const el = ensureMount();
    el.innerHTML = "";
    for (const msg of active.values()) {
      const item = document.createElement("div");
      item.textContent = msg;
      el.appendChild(item);
    }
  }

  function keyFor(event) {
    const cid = event.meta?.cellId ?? "";
    const series = event.meta?.series ?? "";
    switch (event.type) {
      case "DATA_STALL_SERIES":
      case "DATA_RESUMED_SERIES":
        return `DATA_STALL_SERIES-${cid}-${series}`; // same key so RESUMED removes STALL
      case "DATA_STALL":
      case "DATA_RESUMED":
        return `DATA_STALL-${cid}`;
      case "LATEST_ZERO":
      case "LATEST_ZERO_RESOLVED":
        return `LATEST_ZERO-${cid}`;
      default:
        return `${event.type}-${cid}-${series}`;
    }
  }

  return {
    handle(event) {
      const key = keyFor(event);
      if (event.type.endsWith("_RESUMED")) {
        active.delete(key);
      } else {
        active.set(key, event.message);
      }
      render();
    },
  };
}
