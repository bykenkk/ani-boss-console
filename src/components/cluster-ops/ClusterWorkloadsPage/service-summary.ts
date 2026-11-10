import { array, field, text } from "../model";

export function serviceSummary(object: Record<string, unknown>) {
  const clusterIPs = array(field(object, "spec", "clusterIPs"));
  const external = [
    ...array(field(object, "spec", "externalIPs")),
    ...array(field(object, "status", "loadBalancer", "ingress")).map(
      (ingress) => field(ingress, "ip") || field(ingress, "hostname"),
    ),
  ].filter((value) => typeof value === "string" && value);
  return {
    type: text(field(object, "spec", "type")),
    clusterIP: clusterIPs.length
      ? clusterIPs.map(text).join(", ")
      : text(field(object, "spec", "clusterIP")),
    externalAddress:
      field(object, "spec", "type") === "ExternalName"
        ? text(field(object, "spec", "externalName"))
        : [...new Set(external)].join(", "),
    ports: array(field(object, "spec", "ports"))
      .map((port) => {
        const nodePort = field(port, "nodePort");
        return `${text(field(port, "port"))}${nodePort ? `:${text(nodePort)}` : ""}/${text(field(port, "protocol"))}`;
      })
      .join(", "),
  };
}
