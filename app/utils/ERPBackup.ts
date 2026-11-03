
"use client";

const BACKUP_KEYS = [
  "uk-exim-products",
  "uk-exim-customers",
  "uk-exim-suppliers",
  "uk-exim-purchases",
  "uk-exim-sales",
  "uk-exim-stock",
  "uk-exim-company-settings",
  "uk-exim-invoice-settings",
  "uk-exim-bank-settings",
  "uk-exim-export-customers",
  "uk-exim-export-enquiries",
  "uk-exim-export-quotations",
  "uk-exim-export-proforma-invoices",
  "uk-exim-export-orders",
  "uk-exim-export-purchases",
  "uk-exim-international-export-stock",
  "uk-exim-export-reservations",
  "uk-exim-export-packings",
  "uk-exim-export-shipments",
  "uk-exim-export-commercial-invoices",
  "uk-exim-international-settings",
  "uk-exim-sales-numbering-v2",
] as const;

const BACKUP_VERSION = "UK-EXIM-ERP-1.0";

export type ERPBackupData = {
  version: string;
  backupDate: string;
  data: Record<string, unknown>;
};

export function createERPBackup(): ERPBackupData {
  const data: Record<string, unknown> = {};

  BACKUP_KEYS.forEach((key) => {
    const stored = localStorage.getItem(key);

    // Save only keys that actually exist.
    // Never replace missing data with an empty array.
    if (stored !== null) {
      try {
        data[key] = JSON.parse(stored);
      } catch {
        data[key] = stored;
      }
    }
  });

  return {
    version: BACKUP_VERSION,
    backupDate: new Date().toISOString(),
    data,
  };
}

export async function downloadERPBackup(): Promise<void> {
  try {
    const backup = createERPBackup();

    const json = JSON.stringify(backup, null, 2);

    const fileName = "UK-EXIM-ERP-Latest-Backup.json";

    const blob = new Blob([json], {
      type: "application/json",
    });

    const win = window as Window & {
      showSaveFilePicker?: (options: unknown) => Promise<{
        createWritable: () => Promise<{
          write: (data: string) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };

    if (win.showSaveFilePicker) {
      const handle = await win.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "UK EXIM ERP Backup",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });

      const writable = await handle.createWritable();

      await writable.write(json);
      await writable.close();

      alert("ERP Backup saved successfully!");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert("ERP Backup downloaded successfully!");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    console.error("ERP Backup Error:", error);

    alert("ERP Backup failed. Please try again.");
  }
}

export function restoreERPBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const previousData: Record<string, string | null> = {};
      const keysToRestore: [string, unknown][] = [];

      try {
        const backup = JSON.parse(reader.result as string);

        if (
          !backup ||
          typeof backup !== "object" ||
          !backup.data ||
          typeof backup.data !== "object" ||
          Array.isArray(backup.data)
        ) {
          throw new Error("Invalid ERP backup file.");
        }

        // Restore only recognized ERP keys.
        Object.entries(backup.data).forEach(([key, value]) => {
          if (
            (BACKUP_KEYS as readonly string[]).includes(key)
          ) {
            keysToRestore.push([key, value]);
          }
        });

        if (keysToRestore.length === 0) {
          throw new Error(
            "No recognized ERP data found in backup."
          );
        }

        // Take a safety snapshot before changing anything.
        keysToRestore.forEach(([key]) => {
          previousData[key] = localStorage.getItem(key);
        });

        try {
          keysToRestore.forEach(([key, value]) => {
            const serialized = JSON.stringify(value);

            if (serialized === undefined) {
              throw new Error(
                `Invalid data for storage key: ${key}`
              );
            }

            localStorage.setItem(key, serialized);
          });
        } catch (restoreError) {
          // Roll back changes if restoration fails.
          Object.entries(previousData).forEach(([key, value]) => {
            if (value === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, value);
            }
          });

          throw restoreError;
        }

        alert(
          `ERP data restored successfully! (${keysToRestore.length} records groups)`
        );

        resolve();

        window.location.reload();
      } catch (error) {
        console.error("ERP Restore Error:", error);

        alert(
          error instanceof Error
            ? error.message
            : "Invalid or corrupted ERP backup file."
        );

        reject(error);
      }
    };

    reader.onerror = () => {
      alert("Unable to read backup file.");

      reject(new Error("Unable to read backup file."));
    };

    reader.readAsText(file);
  });
}
