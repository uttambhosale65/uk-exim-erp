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
] as const;

export type ERPBackupData = {
  version: string;
  backupDate: string;
  data: Record<string, unknown>;
};

export function createERPBackup(): ERPBackupData {
  const data: Record<string, unknown> = {};

  BACKUP_KEYS.forEach((key) => {
    const stored = localStorage.getItem(key);

    if (stored !== null) {
      try {
        data[key] = JSON.parse(stored);
      } catch {
        data[key] = stored;
      }
    } else {
      data[key] = [];
    }
  });

  return {
    version: "UK-EXIM-ERP-1.0",
    backupDate: new Date().toISOString(),
    data,
  };
}

export async function downloadERPBackup(): Promise<void> {
  const backup = createERPBackup();

  const json = JSON.stringify(
    backup,
    null,
    2
  );

  const fileName =
    "UK-EXIM-ERP-Latest-Backup.json";

  try {
    const win = window as any;

    if (win.showSaveFilePicker) {
      const handle =
        await win.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description:
                "UK EXIM ERP Backup",
              accept: {
                "application/json": [
                  ".json",
                ],
              },
            },
          ],
        });

      const writable =
        await handle.createWritable();

      await writable.write(json);

      await writable.close();

      alert(
        "✅ ERP Backup saved successfully!"
      );

      return;
    }

    // Fallback
    const blob = new Blob(
      [json],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      fileName;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert(
      "✅ ERP Backup downloaded successfully!"
    );
  } catch (error) {
    console.error(
      "ERP Backup Error:",
      error
    );

    alert(
      "❌ Backup cancelled or failed."
    );
  }
}
export function restoreERPBackup(
  file: File
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backup = JSON.parse(
          reader.result as string
        );

        if (
          !backup ||
          !backup.data ||
          typeof backup.data !== "object"
        ) {
          throw new Error(
            "Invalid ERP backup file"
          );
        }

        Object.entries(
          backup.data
        ).forEach(([key, value]) => {
          localStorage.setItem(
            key,
            JSON.stringify(value)
          );
        });

        alert(
          "✅ ERP data restored successfully!"
        );

        window.location.reload();

        resolve();
      } catch (error) {
        console.error(
          "ERP Restore Error:",
          error
        );

        alert(
          "❌ Invalid or corrupted ERP backup file."
        );

        reject(error);
      }
    };

    reader.onerror = () => {
      alert(
        "❌ Unable to read backup file."
      );

      reject(
        new Error(
          "Unable to read backup file"
        )
      );
    };

    reader.readAsText(file);
  });
}