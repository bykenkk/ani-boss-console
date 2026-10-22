const jsonFields = new Set(["beforeData", "afterData", "requestHeader", "requestBody", "response"]);

export function formatDetailValue(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") {
    // 仅解析契约明确声明的 JSON 字段，资源 ID 等字符串保持原样。
    if (!jsonFields.has(field)) return value;
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}
