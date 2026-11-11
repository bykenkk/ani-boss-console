import clsx from "clsx";
import { Form, Input, Radio, Typography } from "@arco-design/web-react";
import { validGpuSupplyInteger, validGpuSupplyResourceKey } from "../preparation";

interface GpuSupplyPreparationFieldsProps {
  fixed: boolean;
  verifiedModel: boolean;
}

export function GpuSupplyPreparationFields({
  fixed,
  verifiedModel,
}: GpuSupplyPreparationFieldsProps) {
  return (
    <div className="flex flex-col">
      <section>
        <Typography.Title heading={6} className="mt-0! mb-4!">
          供给配置
        </Typography.Title>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Form.Item
            field="ref"
            label="配置引用（Config Ref）"
            tooltip="受管供给配置的唯一引用，用于后续节点纳管与供给组配置。"
            rules={[
              {
                required: true,
                match: /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,255}$/,
                message: "请输入合法的配置引用，最多 256 个字符",
              },
              {
                validator: (value: string | undefined, callback) =>
                  callback(
                    value?.includes("://") || value?.includes("..")
                      ? "配置引用不能包含 :// 或 .."
                      : undefined,
                  ),
              },
            ]}
          >
            <Input placeholder={fixed ? "例如：hcu-fixed" : "例如：hcu-physical"} maxLength={256} />
          </Form.Item>
          <Form.Item
            field="display_name"
            label="配置名称"
            rules={[{ required: true, match: /\S/, message: "请输入配置名称" }]}
          >
            <Input placeholder="请输入配置名称" />
          </Form.Item>
          <Form.Item
            field="resource_key"
            label="扩展资源名称（Resource Key）"
            tooltip={
              fixed
                ? "填写设备插件实际发布的固定分区资源名称，不能根据名称推算显存或 CU。"
                : "海光整卡使用 hygon.com/hcu，目标节点应已发布该扩展资源。"
            }
            rules={[
              { required: true, message: "请输入扩展资源名称" },
              {
                validator: (value: string | undefined, callback) =>
                  callback(
                    validGpuSupplyResourceKey(value) &&
                      (fixed
                        ? value !== "hygon.com/hcu" && value?.startsWith("hygon.com/")
                        : value === "hygon.com/hcu")
                      ? undefined
                      : "请输入有效的海光扩展资源名称，整卡使用 hygon.com/hcu",
                  ),
              },
            ]}
          >
            <Input readOnly={!fixed} placeholder="请输入实际发布的扩展资源名称" maxLength={317} />
          </Form.Item>
          <Form.Item
            field="runtime_class_name"
            label="RuntimeClass"
            tooltip="引用集群中已有的 RuntimeClass；海光允许留空，此处不会创建运行时配置。"
            rules={[
              {
                validator: (value: string | undefined, callback) =>
                  callback(
                    !value || (value.length <= 63 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(value))
                      ? undefined
                      : "请输入合法的 RuntimeClass 名称，最多 63 个字符",
                  ),
              },
            ]}
          >
            <Input placeholder="可选，引用已有 RuntimeClass" maxLength={63} />
          </Form.Item>
          {fixed ? (
            <>
              <Form.Item
                field="memory_capacity_bytes"
                label="固定分区显存（bytes）"
                tooltip="使用已部署分区的真实字节数，保持 uint64 精度，不根据资源名称或整卡比例换算。"
                rules={[
                  { required: true, message: "请输入固定分区显存" },
                  {
                    validator: (value: string | undefined, callback) =>
                      callback(
                        validGpuSupplyInteger(value, 18446744073709551615n)
                          ? undefined
                          : "请输入 uint64 范围内的正整数字节数",
                      ),
                  },
                ]}
              >
                <Input placeholder="请输入分区显存字节数" maxLength={20} />
              </Form.Item>
              <Form.Item
                field="compute_units_per_device"
                label="固定分区计算单元（CU）"
                tooltip="使用实际分区配置中的 CU；每副本最多使用 1 个固定分区，不调整现有分区布局。"
                rules={[
                  { required: true, message: "请输入固定分区计算单元" },
                  {
                    validator: (value: string | undefined, callback) =>
                      callback(
                        validGpuSupplyInteger(value, 4294967295n)
                          ? undefined
                          : "请输入 uint32 范围内的正整数 CU",
                      ),
                  },
                ]}
              >
                <Input placeholder="请输入分区 CU" maxLength={10} />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              field="max_devices_per_replica"
              label="每副本设备上限"
              tooltip="管理员批准的每副本最大设备数，与当前可分配或空闲数量无关。"
              rules={[
                { required: true, message: "请输入每副本设备上限" },
                {
                  validator: (value: string | undefined, callback) =>
                    callback(
                      validGpuSupplyInteger(value, 4294967295n)
                        ? undefined
                        : "请输入 uint32 范围内的正整数设备上限",
                    ),
                },
              ]}
            >
              <Input placeholder="请输入最大设备数" maxLength={10} />
            </Form.Item>
          )}
        </div>
      </section>
      <section>
        <Typography.Title heading={6} className="mt-0! mb-4!">
          型号与参数来源
        </Typography.Title>
        <Form.Item
          field="model_source"
          label="型号识别方式"
          tooltip="优先使用设备观测返回的唯一规范型号；无法识别时，再依据设备资料补充型号标签。"
        >
          <Radio.Group
            type="button"
            options={[
              { value: "observation", label: "设备观测识别" },
              { value: "verified", label: "手动指定型号" },
            ]}
          />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {verifiedModel ? (
            <Form.Item
              field="model_key"
              label="型号标识（Model Key）"
              tooltip="使用已核实的规范化型号，与设备观测保持一致。"
              rules={[
                {
                  required: true,
                  maxLength: 63,
                  match: /^[A-Za-z0-9]([-_.A-Za-z0-9]*[A-Za-z0-9])?$/,
                  message: "请输入 1–63 个合法标签字符组成的型号标识",
                },
              ]}
            >
              <Input placeholder="请输入规范化型号标识" maxLength={63} />
            </Form.Item>
          ) : null}
          <Form.Item
            className={clsx(!verifiedModel && "sm:col-span-2")}
            field="evidence"
            label="参数来源"
            tooltip="填写设备清单或设备插件配置的位置，用于运维核对型号、资源名称与固定分区参数。"
            rules={[{ required: true, match: /\S/, message: "请输入设备清单或插件配置等参数来源" }]}
          >
            <Input placeholder="设备清单、插件配置位置或相关文档引用" />
          </Form.Item>
        </div>
        {!verifiedModel ? (
          <p className="text-xs text-(--color-text-3)">
            供给配置应用后，由设备观测识别型号并在初始化时复检。
          </p>
        ) : null}
      </section>
    </div>
  );
}
