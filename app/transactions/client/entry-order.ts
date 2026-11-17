type Entry = {
  entryCreatedAt?: string | null;
};

export function sortEntriesNewestFirst<T extends Entry>(
  entries: readonly T[],
  dateField: keyof T,
  numberField: keyof T,
): T[] {
  return [...entries].sort((left, right) => {
    const leftTimestamp = Date.parse(left.entryCreatedAt ?? "");
    const rightTimestamp = Date.parse(right.entryCreatedAt ?? "");
    const leftHasTimestamp = Number.isFinite(leftTimestamp);
    const rightHasTimestamp = Number.isFinite(rightTimestamp);

    if (leftHasTimestamp !== rightHasTimestamp) return rightHasTimestamp ? 1 : -1;
    if (leftHasTimestamp && rightHasTimestamp && leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    const leftDate = String(left[dateField] ?? "");
    const rightDate = String(right[dateField] ?? "");
    const byDate = rightDate.localeCompare(leftDate);
    if (byDate) return byDate;
    return String(right[numberField] ?? "").localeCompare(String(left[numberField] ?? ""));
  });
}
