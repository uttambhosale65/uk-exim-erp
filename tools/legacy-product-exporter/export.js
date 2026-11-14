import {
  createFullErpBackup,
  serializeFullErpBackup,
} from "./export-core.mjs";

const EXPECTED_ORIGIN = "http://localhost:3000";
const elements = {
  status: document.querySelector("#status"),
  summary: document.querySelector("#summary"),
  keys: document.querySelector("#keys"),
  download: document.querySelector("#download"),
};

let backup;

function setText(element, text) {
  element.textContent = text;
}

function renderInventory(snapshot) {
  const rows = Object.entries(snapshot.keys);
  const missing = rows.filter(([, value]) => !value.exists).length;
  const invalid = rows.filter(([, value]) => value.exists && !value.parseSucceeded).length;
  setText(elements.summary, `${rows.length} identified keys; ${missing} missing; ${invalid} invalid JSON.`);

  const rowsFragment = document.createDocumentFragment();
  for (const [key, value] of rows) {
    const row = document.createElement("tr");
    const cells = [
      key,
      value.exists ? "Present" : "Missing",
      value.exists ? (value.parseSucceeded ? "Valid JSON" : "Invalid JSON") : "Not available",
      value.recordCount === null ? "Not an array / unavailable" : String(value.recordCount),
      value.sha256 ?? "Not available",
    ];
    for (const text of cells) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    }
    rowsFragment.appendChild(row);
  }
  elements.keys.replaceChildren(rowsFragment);
}

async function initialize() {
  if (window.location.origin !== EXPECTED_ORIGIN) {
    setText(elements.status, `Stopped: open this utility only at ${EXPECTED_ORIGIN}. No browser storage was read.`);
    return;
  }

  try {
    // createFullErpBackup reads only the 24 explicitly listed keys with getItem.
    backup = await createFullErpBackup(window.localStorage, {
      origin: window.location.origin,
    });
    renderInventory(backup);
    const missing = Object.values(backup.keys).filter((item) => !item.exists).length;
    const invalid = Object.values(backup.keys).filter((item) => item.exists && !item.parseSucceeded).length;
    setText(
      elements.status,
      missing || invalid
        ? "Review the missing/invalid entries. They will be explicitly represented in the backup; no stored value was changed."
        : "All identified keys were read. Review the inventory, then explicitly download the raw backup.",
    );
    elements.download.disabled = false;
  } catch {
    setText(elements.status, "Backup preparation failed. No file was downloaded and no storage value was changed.");
  }
}

elements.download.addEventListener("click", () => {
  if (!backup) return;
  const rawBackup = serializeFullErpBackup(backup);
  const blob = new Blob([rawBackup], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  anchor.href = url;
  anchor.download = `uk-exim-erp-full-backup-${timestamp}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setText(elements.status, "Backup download requested. Original raw values were preserved; browser storage was not changed.");
});

void initialize();
