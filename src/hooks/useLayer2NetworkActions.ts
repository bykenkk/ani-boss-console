import { usePlatformNetworkDelete } from "./usePlatformNetworkDelete";
export function useLayer2NetworkActions(onDeleted: () => void) {
  const remove = usePlatformNetworkDelete("vlan-networks", onDeleted);
  return { actions: [remove] };
}
