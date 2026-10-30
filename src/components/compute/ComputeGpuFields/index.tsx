import { useState } from "react";
import { Form, InputNumber, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuClusterOptions, type GpuProfile } from "@/api/accelerator";
import {
  listComputeGpuProfileOptions,
  type ComputeGpuReference,
  type ComputePresetInput,
} from "@/api/compute-presets";
import { withId } from "@/lib/id";
export function ComputeGpuFields() {
  const { form } = Form.useFormContext();
  const [clusterId, setClusterId] = useState<string>();
  const [profile, setProfile] = useState<GpuProfile>();
  const clusters = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", "options"],
    queryFn: ({ signal }) => listGpuClusterOptions(signal),
    meta: { errorNotification: { id: "gpu-cluster-options", action: "GPU 集群选项加载" } },
  });
  const currentClusterId = clusterId ?? clusters.data?.items?.[0]?.cluster_id;
  const profiles = useQuery({
    queryKey: [...acceleratorKeys.all, "profiles", "options", currentClusterId],
    queryFn: ({ signal }) => listComputeGpuProfileOptions(currentClusterId!, signal),
    enabled: Boolean(currentClusterId),
    meta: {
      errorNotification: {
        id: withId("compute-gpu-profile-options", currentClusterId ?? ""),
        action: "GPU 规格选项加载",
      },
    },
  });
  const maxDevices =
    profile?.spec.mode === "SHARED_FIXED" ? 1 : profile?.spec.max_devices_per_replica;
  return (
    <>
      <Form.Item label="GPU 集群">
        <Select
          aria-label="GPU 集群"
          placeholder="请选择集群"
          value={currentClusterId}
          loading={clusters.isFetching}
          filterOption={false}
          options={(clusters.data?.items ?? []).map((item) => ({
            label: item.display_name,
            value: item.cluster_id,
          }))}
          onChange={(id: string) => {
            setClusterId(id);
            setProfile(undefined);
            form.setFieldValue("gpu", undefined);
          }}
        />
      </Form.Item>
      <Form.Item<ComputePresetInput, ComputeGpuReference | undefined>
        field="gpu"
        label="GPU 规格"
        rules={[
          {
            required: true,
            type: "object",
            hasKeys: ["profile_id", "profile_version"],
            message: "请选择 GPU 规格",
          },
        ]}
        formatter={(value?: ComputeGpuReference) =>
          value?.profile_id ? value.profile_id + "/" + value.profile_version : undefined
        }
        getValueFromEvent={(key: string) => {
          const selected = profiles.data?.items?.find(
            (item) => item.profile_id + "/" + item.profile_version === key,
          );
          setProfile(selected);
          return selected
            ? {
                profile_id: selected.profile_id,
                profile_version: selected.profile_version,
                devices_per_instance: 1,
              }
            : undefined;
        }}
      >
        <Select
          aria-label="GPU 规格"
          placeholder="请选择 GPU 规格"
          loading={profiles.isFetching}
          disabled={!currentClusterId}
          filterOption={false}
          options={(profiles.data?.items ?? []).map((item) => ({
            label:
              item.display_name +
              " · v" +
              item.profile_version +
              (item.state === "PROFILE_ACTIVE" ? "" : "（不可选）"),
            value: item.profile_id + "/" + item.profile_version,
            disabled: item.state !== "PROFILE_ACTIVE" || item.spec.max_devices_per_replica < 1,
          }))}
        />
      </Form.Item>
      <Form.Item
        field="gpu.devices_per_instance"
        label="每实例 GPU 数量"
        rules={[
          { required: true, message: "请输入每实例 GPU 数量" },
          { type: "number", min: 1, max: maxDevices },
        ]}
        extra={
          profile?.spec.mode === "SHARED_FIXED"
            ? "共享规格固定为 1"
            : maxDevices
              ? "最多 " + maxDevices + " 张"
              : undefined
        }
      >
        <InputNumber
          aria-label="每实例 GPU 数量"
          min={1}
          max={maxDevices}
          precision={0}
          disabled={!profile || profile.spec.mode === "SHARED_FIXED"}
        />
      </Form.Item>
      {clusters.data?.next_page_token || profiles.data?.next_page_token ? (
        <p>选项暂显示前 100 项。</p>
      ) : null}
    </>
  );
}
