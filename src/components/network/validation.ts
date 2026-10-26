export type NetworkAddressMode = "range" | "cidr";

export interface NetworkSegmentValues {
  addressMode: NetworkAddressMode;
  startIp?: string;
  endIp?: string;
  netmask?: string;
  cidr?: string;
  switchGateway?: string;
  platformGateway?: string;
  reservedIps?: string;
}

export function parseIpv4(value: string): number | undefined {
  const parts = value.trim().split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
  )
    return undefined;
  return parts.reduce((result, part) => result * 256 + Number(part), 0);
}

export function parseCidr(value: string) {
  const parts = value.trim().split("/");
  if (parts.length !== 2 || !/^(0|[1-9]|[12]\d|3[0-2])$/.test(parts[1])) return undefined;
  const address = parseIpv4(parts[0]);
  if (address === undefined) return undefined;
  const size = 2 ** (32 - Number(parts[1]));
  if (address % size !== 0) return undefined;
  return { start: address, end: address + size - 1 };
}

export function parseNetmask(value: string): number | undefined {
  const mask = parseIpv4(value);
  if (mask === undefined) return undefined;
  const size = 2 ** 32 - mask;
  return Number.isInteger(Math.log2(size)) ? size : undefined;
}

export function getNetworkSegmentErrors(values: NetworkSegmentValues) {
  const errors: Partial<Record<keyof NetworkSegmentValues, string>> = {};
  let subnet: { start: number; end: number } | undefined;
  let pool: { start: number; end: number } | undefined;
  if (values.addressMode === "cidr") {
    subnet = parseCidr(values.cidr ?? "");
    if (!subnet) errors.cidr = "请输入有效的 IPv4 网络 CIDR，例如 192.168.1.0/24";
    pool = subnet;
  } else {
    const start = parseIpv4(values.startIp ?? "");
    const end = parseIpv4(values.endIp ?? "");
    const size = parseNetmask(values.netmask ?? "");
    if (start === undefined) errors.startIp = "请输入有效的起始 IPv4 地址";
    if (end === undefined) errors.endIp = "请输入有效的结束 IPv4 地址";
    if (size === undefined) errors.netmask = "请输入连续的 IPv4 子网掩码";
    if (start !== undefined && size !== undefined) {
      const first = Math.floor(start / size) * size;
      subnet = { start: first, end: first + size - 1 };
      if (end !== undefined) {
        if (end < start) errors.endIp = "结束 IP 不得小于起始 IP";
        else if (end > subnet.end) errors.endIp = "起始 IP 与结束 IP 必须位于同一子网";
        else pool = { start, end };
      }
    }
  }
  for (const field of ["switchGateway", "platformGateway"] as const) {
    const address = parseIpv4(values[field] ?? "");
    if (address === undefined) errors[field] = "请输入有效的 IPv4 网关地址";
    else if (subnet && (address < subnet.start || address > subnet.end))
      errors[field] = "网关必须位于所配置的子网内";
  }
  if (values.reservedIps?.trim()) {
    const intervals: Array<{ start: number; end: number }> = [];
    for (const entry of values.reservedIps.trim().split(",")) {
      const parts = entry.trim().split("-");
      const start = parseIpv4(parts[0]);
      const end = parts.length === 1 ? start : parseIpv4(parts[1]);
      if (parts.length > 2 || start === undefined || end === undefined || end < start) {
        errors.reservedIps = "预留 IP 请填写有效地址或起止范围，多个条目用英文逗号分隔";
        break;
      }
      if (pool && (start < pool.start || end > pool.end)) {
        errors.reservedIps = "预留 IP 必须位于所配置的 IP 范围或 CIDR 内";
        break;
      }
      if (intervals.some((interval) => start <= interval.end && end >= interval.start)) {
        errors.reservedIps = "预留 IP 不得重复或互相重叠";
        break;
      }
      intervals.push({ start, end });
    }
  }
  return errors;
}

export function getDnsError(addresses: string[]): string | undefined {
  if (addresses.some((address) => parseIpv4(address) === undefined))
    return "请填写有效的 IPv4 DNS 地址，或移除空白项";
  if (new Set(addresses.map((address) => address.trim())).size !== addresses.length)
    return "DNS 地址不能重复";
  return undefined;
}
