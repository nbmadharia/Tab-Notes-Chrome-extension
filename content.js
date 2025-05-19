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

injectStickyNote();
window.addEventListener('popstate', injectStickyNote);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') injectStickyNote();
});
