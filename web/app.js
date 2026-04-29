const form = document.querySelector("#download-form");
const statusNode = document.querySelector("#status");
const submitButton = document.querySelector("#submit-button");

const setStatus = (message, isError = false) => {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getFilenameFromHeaders = (headers) => {
  const disposition = headers.get("content-disposition");
  if (!disposition) {
    return "ytmini-download";
  }

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? "ytmini-download";
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    url: String(formData.get("url") ?? "").trim(),
    format: String(formData.get("format") ?? "mp3").trim().toLowerCase(),
  };

  setStatus("Procesando...");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = "No se pudo procesar la descarga.";
      try {
        const errorBody = await response.json();
        detail = errorBody?.detail ?? detail;
      } catch (_error) {}
      throw new Error(detail);
    }

    const blob = await response.blob();
    const filename = getFilenameFromHeaders(response.headers);
    triggerDownload(blob, filename);
    setStatus("Archivo listo. Descarga iniciada.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    setStatus(message, true);
  } finally {
    submitButton.disabled = false;
  }
});
