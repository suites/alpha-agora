type Jsonish = null | boolean | number | string | Jsonish[] | { [key: string]: unknown };

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): Jsonish | undefined {
  if (value === null) return null;

  const type = typeof value;
  if (type === "string" || type === "boolean") return value as string | boolean;
  if (type === "number") return Number.isFinite(value as number) ? (value as number) : null;
  if (type === "bigint") return (value as bigint).toString();
  if (type === "undefined" || type === "function" || type === "symbol") return undefined;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item) ?? null);
  }

  if (type === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, Jsonish>>((accumulator, key) => {
        const normalized = normalize(record[key]);
        if (normalized !== undefined) accumulator[key] = normalized;
        return accumulator;
      }, {});
  }

  return String(value);
}
