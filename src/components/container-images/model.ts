import type {
  ImagePurpose,
  ImageAccelerator,
  ImageRegistration,
  UpdateImageInput,
} from "@/api/container-images";
import { formatDateTime, compareDateValuesDesc, getCurrentTimestamp } from "@/lib/date";
export const purposeLabels: Record<ImagePurpose, string> = {
  container: "容器",
  development: "开发",
  inference: "推理",
  finetuning: "微调",
  training: "训练",
};
export const acceleratorLabels: Record<ImageAccelerator, string> = {
  undeclared: "未声明",
  none: "无加速器",
  nvidia: "NVIDIA",
  amd: "AMD",
  ascend: "昇腾",
  other: "其他",
};
export const imageQueryOptions = { staleTime: 0, gcTime: 0, retry: false } as const;
export function imageTime(value?: string | null) {
  return !value || value.startsWith("0001-") ? "-" : formatDateTime(value);
}
export function credentialExpired(expiresAt: string | null) {
  return !!expiresAt && compareDateValuesDesc(expiresAt, getCurrentTimestamp()) >= 0;
}
export function metadataChanges(
  base: ImageRegistration,
  values: {
    displayName: string;
    description: string;
    purposes: ImagePurpose[];
    accelerator: ImageAccelerator;
  },
): Omit<UpdateImageInput, "expectedVersion"> {
  const result: Omit<UpdateImageInput, "expectedVersion"> = {};
  if (values.displayName !== base.displayName) result.displayName = values.displayName;
  if (values.description !== base.description) result.description = values.description;
  if ([...values.purposes].sort().join(",") !== [...base.purposes].sort().join(","))
    result.purposes = values.purposes;
  if (values.accelerator !== base.accelerator) result.accelerator = values.accelerator;
  return result;
}
