export interface GpuAccess {
  can: (permission: string) => boolean;
  pending: boolean;
}
