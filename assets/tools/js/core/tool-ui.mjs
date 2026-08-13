export function bindFileDropZone({ dropZone, input, chooseButton, onFile }) {
  if (!dropZone || !input || typeof onFile !== "function") throw new Error("A drop zone, file input and handler are required.");

  input.hidden = true;
  const choose = () => input.click();
  const handleFile = (file) => { if (file) onFile(file); };

  chooseButton?.addEventListener("click", choose);
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragging"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
    handleFile(event.dataTransfer?.files?.[0]);
  });
  input.addEventListener("change", () => handleFile(input.files?.[0]));
}

export function setDropZoneBusy(dropZone, busy) {
  dropZone?.setAttribute("aria-busy", String(Boolean(busy)));
}

export function revealResults(node) {
  node.hidden = false;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
