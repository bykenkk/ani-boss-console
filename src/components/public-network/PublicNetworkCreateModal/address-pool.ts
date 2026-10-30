import { parseCidr, parseIpv4 } from "../../network/validation.ts";

export interface PublicAddressPoolInput {
  cidr: string;
  allocationStart: string;
  allocationEnd: string;
  ovnGatewayIp: string;
  upstreamGatewayIp: string;
}

type AddressPoolField = keyof PublicAddressPoolInput;

export class AddressPoolValidationError extends Error {
  readonly field: AddressPoolField;

  constructor(field: AddressPoolField, message: string) {
    super(message);
    this.name = "AddressPoolValidationError";
    this.field = field;
  }
}

function formatIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
}

export function buildAddressPool(values: PublicAddressPoolInput): {
  excludedIps: string[];
  allocatableCount: number;
} {
  const subnet = parseCidr(values.cidr);
  if (!subnet || subnet.end - subnet.start < 3) {
    throw new AddressPoolValidationError(
      "cidr",
      "请输入有效的 IPv4 网络 CIDR，前缀长度不能大于 30",
    );
  }

  const addresses = {} as Record<Exclude<AddressPoolField, "cidr">, number>;
  const labels = {
    allocationStart: "起始 IP",
    allocationEnd: "结束 IP",
    ovnGatewayIp: "云平台网关",
    upstreamGatewayIp: "上游网关",
  };
  for (const field of Object.keys(labels) as Array<keyof typeof labels>) {
    const address = parseIpv4(values[field]);
    if (address === undefined) {
      throw new AddressPoolValidationError(field, `请输入有效的${labels[field]} IPv4 地址`);
    }
    if (address <= subnet.start || address >= subnet.end) {
      throw new AddressPoolValidationError(field, `${labels[field]}必须是 CIDR 内的可用主机地址`);
    }
    addresses[field] = address;
  }

  const { allocationStart, allocationEnd, ovnGatewayIp, upstreamGatewayIp } = addresses;
  if (allocationEnd < allocationStart) {
    throw new AddressPoolValidationError("allocationEnd", "结束 IP 不得小于起始 IP");
  }
  if (ovnGatewayIp === upstreamGatewayIp) {
    throw new AddressPoolValidationError("ovnGatewayIp", "云平台网关不能与上游网关相同");
  }
  const gatewayCount =
    Number(ovnGatewayIp >= allocationStart && ovnGatewayIp <= allocationEnd) +
    Number(upstreamGatewayIp >= allocationStart && upstreamGatewayIp <= allocationEnd);
  const allocatableCount = allocationEnd - allocationStart + 1 - gatewayCount;
  if (allocatableCount === 0) {
    throw new AddressPoolValidationError("allocationEnd", "预留网关后，至少需要一个可分配 IP");
  }

  // Express the complement as intervals so a large CIDR never expands into individual IPs.
  // Including the network and broadcast addresses also keeps the requested window explicit.
  const excluded = [
    { start: subnet.start, end: allocationStart - 1 },
    { start: allocationEnd + 1, end: subnet.end },
    { start: ovnGatewayIp, end: ovnGatewayIp },
    { start: upstreamGatewayIp, end: upstreamGatewayIp },
  ].sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of excluded) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return {
    excludedIps: merged.map(({ start, end }) =>
      start === end ? formatIpv4(start) : `${formatIpv4(start)}..${formatIpv4(end)}`,
    ),
    allocatableCount,
  };
}
