(() => {
  "use strict";

  const POLL_INTERVAL = 1000;
  const MAX_POLL = 30000;

  let overlay = null;
  let dragCounter = 0;

  function findTextarea() {
    const app = document.querySelector("openclaw-app");
    if (!app) return null;
    // openclaw-app uses createRenderRoot(){return this} — no Shadow DOM
    return app.querySelector(".chat-compose textarea") || null;
  }

  function setNativeValue(textarea, value) {
    const proto = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    );
    if (proto?.set) {
      proto.set.call(textarea, value);
    } else {
      textarea.value = value;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    let insert = text;
    if (
      start > 0 &&
      current[start - 1] !== " " &&
      current[start - 1] !== "\n"
    ) {
      insert = " " + insert;
    }

    const newValue = current.slice(0, start) + insert + current.slice(end);
    setNativeValue(textarea, newValue);

    const newCursor = start + insert.length;
    textarea.setSelectionRange(newCursor, newCursor);
    textarea.focus();
  }

  function getDroppedFilenames(dataTransfer) {
    const names = [];
    if (dataTransfer.items) {
      for (const item of dataTransfer.items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file?.name) names.push(file.name);
        }
      }
    } else if (dataTransfer.files) {
      for (const file of dataTransfer.files) {
        if (file.name) names.push(file.name);
      }
    }
    return names;
  }

  async function resolvePaths(filenames) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "resolve-paths", filenames },
        (response) => {
          if (response?.paths) {
            resolve(response.paths);
          } else {
            resolve(filenames);
          }
        }
      );
    });
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "oc-drop-overlay";
    overlay.innerHTML =
      '<div class="oc-drop-overlay__label">松开以插入文件路径</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay() {
    ensureOverlay().classList.add("active");
  }

  function hideOverlay() {
    if (overlay) overlay.classList.remove("active");
  }

  function setupDragDrop() {
    document.addEventListener(
      "dragenter",
      (e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          dragCounter++;
          showOverlay();
        }
      },
      true
    );

    document.addEventListener(
      "dragover",
      (e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      },
      true
    );

    document.addEventListener(
      "dragleave",
      () => {
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          hideOverlay();
        }
      },
      true
    );

    document.addEventListener(
      "drop",
      async (e) => {
        dragCounter = 0;
        hideOverlay();

        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();

        const filenames = getDroppedFilenames(e.dataTransfer);
        if (filenames.length === 0) return;

        const textarea = findTextarea();
        if (!textarea) {
          console.warn("[OC Enhancer] textarea not found");
          return;
        }

        const paths = await resolvePaths(filenames);
        const combined = paths.join("\n");
        insertAtCursor(textarea, combined);
      },
      true
    );
  }

  function init() {
    const start = Date.now();
    const timer = setInterval(() => {
      const textarea = findTextarea();
      if (textarea || Date.now() - start > MAX_POLL) {
        clearInterval(timer);
        if (textarea) {
          console.log("[OC Enhancer] Ready — drag files to insert paths");
        }
      }
    }, POLL_INTERVAL);

    setupDragDrop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
