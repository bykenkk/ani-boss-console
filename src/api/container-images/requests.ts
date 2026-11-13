import { adminRequest, ApiError, type ApiRequestOptions } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { runIdempotentOperation } from "@/api/idempotency";
import type { UpdateImageInput } from "./types";
const messages: Record<string, string> = {
  VERSION_CONFLICT: "数据已被修改，请刷新并确认最新版本后重试",
  IMAGE_ALREADY_REGISTERED: "该镜像已添加，请刷新列表查看",
  SPACE_NOT_READY: "镜像空间尚未就绪",
  IMAGE_MODULE_REQUIRED: "该租户的套餐未包含容器镜像模块",
  REQUEST_IN_PROGRESS: "有操作正在进行，请稍后再试",
  CREDENTIAL_DELIVERY_EXPIRED: "原凭证密码已无法再次获取，请刷新状态后重新确认重置凭证",
  DEPENDENCY_UNAVAILABLE: "镜像仓库暂不可用，请稍后重试",
  IMAGE_MANAGEMENT_UNAVAILABLE: "镜像管理服务尚未配置",
  IMAGE_PROJECT_DENIED: "镜像地址不属于当前镜像空间",
  IMAGE_PLATFORM_DENIED: "当前账号无此镜像操作权限",
  IMAGE_SPACE_BINDING_MISMATCH: "镜像空间绑定与平台配置不一致",
  SPACE_OWNERSHIP_UNCONFIRMED: "镜像空间归属尚未确认",
  IMAGE_NOT_FOUND: "镜像记录不存在，请刷新列表",
  IMAGE_TENANT_NOT_FOUND: "目标租户不存在，请重新选择",
  INVALID_REFERENCE: "镜像地址无效，请检查仓库路径、标签（Tag）或摘要（Digest）",
  UNSUPPORTED_ARTIFACT: "制品格式不受支持，请使用 OCI 容器镜像",
  CREDENTIAL_ALREADY_ACTIVE: "推送凭证已生效，请刷新后选择重置凭证",
  CREDENTIAL_NOT_ISSUED: "尚未签发推送凭证，请先签发凭证",
  IDEMPOTENCY_CONFLICT: "操作内容与原提交不一致，请重新确认提交内容",
  CANDIDATE_RECOVERY_COMPLETED: "推送凭证已恢复，请刷新状态后重新确认操作",
  IMAGE_UNAVAILABLE: "镜像服务暂时不可用",
};
export async function imageRequest<T, B = never>(url: string, options: ApiRequestOptions<B> = {}) {
  try {
    return await adminRequest<T, B>(url, options);
  } catch (error) {
    if (error instanceof ApiError && error.reason && messages[error.reason])
      error.message = messages[error.reason];
    throw error;
  }
}
export function tenantImageBase(tenantId: number) {
  if (!Number.isInteger(tenantId) || tenantId < 1 || tenantId > 4294967295)
    throw new Error("请选择有效租户");
  return `/tenants/${tenantId}/images`;
}
export function createImageWrite(operation: string, method: "POST" | "PATCH" = "POST") {
  const scope = createIdempotencyScope(`container-images-${operation}`, [method]);
  return async function write<T = void>(
    base: string,
    suffix: string,
    data: object,
    signal?: AbortSignal,
    updateMask?: string,
  ): Promise<T> {
    return runIdempotentOperation(
      scope,
      { ...data, ...(updateMask ? { update_mask: updateMask } : {}) },
      (idempotencyKey) =>
        imageRequest<T, object>(`${base}${suffix}`, {
          method,
          signal,
          data: {
            data: { ...data, idempotencyKey },
            ...(updateMask ? { update_mask: updateMask } : {}),
          },
        }),
      [base, suffix, method],
    );
  };
}
export function imagePatch(input: UpdateImageInput) {
  const fields = ["displayName", "description", "purposes", "accelerator"] as const;
  const updateMask = fields.filter((field) => input[field] !== undefined);
  if (!updateMask.length) throw new Error("没有需要保存的修改");
  return { data: input, updateMask: updateMask.join(",") };
}
