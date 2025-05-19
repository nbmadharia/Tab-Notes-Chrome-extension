function injectStickyNote() {
  const urlKey = location.href;
  chrome.storage.local.get([urlKey], (result) => {
    const note = result[urlKey];
    let sticky = document.getElementById("tab-note-preview");

    if (!sticky && note) {
      sticky = document.createElement("div");
      sticky.id = "tab-note-preview";
      sticky.contentEditable = "true";
      sticky.innerHTML = note;
      document.body.appendChild(sticky);

      sticky.addEventListener("input", () => {
        chrome.storage.local.set({ [urlKey]: sticky.innerHTML });
      });
    }
  });
}

// Reinject sticky note on load and on history navigation
injectStickyNote();
window.addEventListener('popstate', injectStickyNote);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') injectStickyNote();
});

// Keyboard shortcut for bullet list
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
    e.preventDefault();
    document.execCommand("insertUnorderedList");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const noteEl = document.getElementById("note");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");
  const backupBtn = document.getElementById("backupBtn");
  const themeToggle = document.getElementById("themeToggle");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.storage.local.get([tab.url], function (result) {
    noteEl.innerHTML = result[tab.url] || "";
  });

  noteEl.addEventListener("input", () => {
    const note = noteEl.innerHTML;
    chrome.storage.local.set({ [tab.url]: note });
    statusEl.textContent = "Auto-saved";
    setTimeout(() => statusEl.textContent = "", 1000);
  });

  backupBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (items) => {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tab_notes_backup.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    chrome.storage.local.set({ theme: document.body.classList.contains("dark") ? "dark" : "light" });
  });

  chrome.storage.local.get("theme", (data) => {
    if (data.theme === "dark") {
      document.body.classList.add("dark");
    }
  });

  document.querySelectorAll(".format-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
    });
  });

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";
    if (keyword.trim().length === 0) return;

    chrome.storage.local.get(null, (items) => {
      Object.entries(items).forEach(([key, value]) => {
        if (typeof value === "string" && key.startsWith("http") && value.toLowerCase().includes(keyword)) {
          const li = document.createElement("li");
          li.textContent = value.replace(/<[^>]*>?/gm, "").slice(0, 80);

          // Enhanced tab handling with injection
          li.onclick = () => {
            chrome.storage.local.get([key], (noteResult) => {
              const savedNote = noteResult[key] || "";
              chrome.tabs.query({}, (tabs) => {
                const existingTab = tabs.find(t => t.url && t.url.includes(key));
                if (existingTab) {
                  chrome.tabs.update(existingTab.id, { active: true });
                  chrome.windows.update(existingTab.windowId, { focused: true });
                } else {
                  chrome.tabs.create({ url: key }, (newTab) => {
                    chrome.scripting.executeScript({
                      target: { tabId: newTab.id },
                      func: (noteContent) => {
                        const inject = () => {
                          let sticky = document.getElementById("tab-note-preview");
                          if (!sticky) {
                            sticky = document.createElement("div");
                            sticky.id = "tab-note-preview";
                            sticky.contentEditable = "true";
                            sticky.innerHTML = noteContent;
                            document.body.appendChild(sticky);
                            sticky.addEventListener("input", () => {
                              chrome.storage.local.set({ [location.href]: sticky.innerHTML });
                            });
                          }
                        };

                        if (document.readyState === "loading") {
                          document.addEventListener("DOMContentLoaded", inject);
                        } else {
                          inject();
                        }
                      },
                      args: [savedNote]
                    });
                  });
                }
              });
            });
          };

          searchResults.appendChild(li);
        }
      });
    });
  });
});
