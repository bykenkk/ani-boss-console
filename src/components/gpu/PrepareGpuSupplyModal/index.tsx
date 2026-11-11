import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Form, Modal, Radio } from "@arco-design/web-react";
import { v4 as uuidv4 } from "uuid";
import type { GpuCluster, GpuDiscoveredNode, GpuSupplyPreparationDraft } from "@/api/accelerator";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
import { GpuInitializationContext } from "../GpuInitializationContext";
import { GpuSupplyPreparationFields } from "./GpuSupplyPreparationFields";
import { GpuSupplyPreparationNodes } from "./GpuSupplyPreparationNodes";
import { GpuSupplyPreparationHandoff } from "./GpuSupplyPreparationHandoff";
import { generateGpuSupplyPreparation, gpuSupplyNodeCanPrepare } from "./preparation";
import styles from "../initialization.module.less";

interface PrepareGpuSupplyModalProps {
  cluster: GpuCluster;
  nodes: GpuDiscoveredNode[];
  discoveryRevision: string;
  onCancel: () => void;
}

const initialValues: GpuSupplyPreparationDraft = {
  allocation_type: "PHYSICAL",
  node_uids: [],
  model_source: "observation",
  model_key: "",
  evidence: "",
  ref: "",
  display_name: "海光整卡供给",
  resource_key: "hygon.com/hcu",
  max_devices_per_replica: "1",
  memory_capacity_bytes: "",
  compute_units_per_device: "",
  runtime_class_name: "",
};

export function PrepareGpuSupplyModal({
  cluster,
  nodes,
  discoveryRevision,
  onCancel,
}: PrepareGpuSupplyModalProps) {
  const [form] = Form.useForm<GpuSupplyPreparationDraft>();
  const [fixed, setFixed] = useState(false);
  const [verifiedModel, setVerifiedModel] = useState(false);
  const [review, setReview] = useState(false);
  const [generated, setGenerated] = useState<{
    config: string;
    handoff: string;
    baselineId: string;
  }>();
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  useEffect(() => {
    if (scrollRef.current?.parentElement) scrollRef.current.parentElement.scrollTop = 0;
  }, [review]);
  const generate = async () => {
    if (lock.current) return;
    lock.current = true;
    setGenerating(true);
    try {
      let values: GpuSupplyPreparationDraft;
      try {
        values = await validateForm<GpuSupplyPreparationDraft>(form);
      } catch {
        return;
      }
      const baselineId = generated?.baselineId ?? uuidv4();
      setGenerated({
        ...generateGpuSupplyPreparation(values, baselineId, cluster, nodes, discoveryRevision),
        baselineId,
      });
      setReview(true);
    } catch {
      showMessage({ type: "error", content: "交接单生成失败，请保留参数后重试" });
    } finally {
      lock.current = false;
      setGenerating(false);
    }
  };
  return (
    <Modal
      visible
      title={
        <div className="pr-6 text-left">
          <div className="text-xl font-medium">准备 GPU 供给</div>
          <div className="mt-1 text-xs font-normal text-(--color-text-3)">
            生成供给配置与运维交接单，应用后返回初始化。
          </div>
        </div>
      }
      className={clsx(styles.modal, styles.task)}
      style={{ width: 1040, maxWidth: "calc(100vw - 48px)" }}
      onCancel={onCancel}
      closable={!generating}
      escToExit={!generating}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-(--color-text-3)">
            {review ? "待运维应用，返回后重新检查" : "仅生成配置，不修改集群资源"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {review ? (
              <Button disabled={generating} onClick={() => setReview(false)}>
                返回修改
              </Button>
            ) : null}
            <Button
              disabled={generating}
              type={review ? "primary" : "secondary"}
              onClick={onCancel}
            >
              返回初始化检查
            </Button>
            {!review ? (
              <Button type="primary" loading={generating} onClick={generate}>
                生成配置交接单
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div ref={scrollRef}>
        <div className="mb-5">
          <GpuInitializationContext cluster={cluster} />
        </div>
        <div hidden={review}>
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            disabled={generating}
            onChange={(changed) => {
              if ("allocation_type" in changed) {
                const nextFixed = changed.allocation_type === "FIXED_PARTITION";
                setFixed(nextFixed);
                form.setFieldsValue({
                  node_uids: [],
                  display_name: nextFixed ? "海光固定分区供给" : "海光整卡供给",
                  resource_key: nextFixed ? "" : "hygon.com/hcu",
                  memory_capacity_bytes: "",
                  compute_units_per_device: "",
                  max_devices_per_replica: "1",
                });
              }
              if ("model_source" in changed) {
                setVerifiedModel(changed.model_source === "verified");
                form.setFieldValue("model_key", "");
              }
            }}
          >
            <Form.Item field="allocation_type" label="供给类型">
              <Radio.Group
                type="button"
                options={[
                  { value: "PHYSICAL", label: "海光整卡" },
                  { value: "FIXED_PARTITION", label: "海光固定分区（已有）" },
                ]}
              />
            </Form.Item>
            <Form.Item
              field="node_uids"
              rules={[
                {
                  validator: (value: string[] | undefined, callback) =>
                    callback(
                      value?.length &&
                        value.every((uid) =>
                          nodes.some(
                            (node) =>
                              node.node?.uid === uid && gpuSupplyNodeCanPrepare(node, fixed),
                          ),
                        )
                        ? undefined
                        : "请选择目标节点",
                    ),
                },
              ]}
            >
              <GpuSupplyPreparationNodes nodes={nodes} fixed={fixed} />
            </Form.Item>
            <GpuSupplyPreparationFields fixed={fixed} verifiedModel={verifiedModel} />
          </Form>
        </div>
        {review && generated ? <GpuSupplyPreparationHandoff {...generated} /> : null}
      </div>
    </Modal>
  );
}
