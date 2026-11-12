import { Alert, Descriptions, Form, Radio, Typography } from "@arco-design/web-react";
import { nvidiaFixedParts, type NvidiaFixedProfilePreview } from "../nvidia-fixed-profile";

interface NvidiaFixedProfileFieldsProps {
  preview: NvidiaFixedProfilePreview;
}

export function NvidiaFixedProfileFields({ preview }: NvidiaFixedProfileFieldsProps) {
  const { profile, issue, source, splitCount } = preview;
  return (
    <div className="flex flex-col gap-4">
      {!profile && issue && !source ? <Alert type="warning" content={issue} /> : null}
      <Form.Item
        field="nvidia_parts"
        label="固定切片方案"
        rules={[{ required: true, message: "请选择固定切片方案" }]}
        extra="每份显存和算力按下方数据来源自动生成，业务每副本申请一份。"
      >
        <Radio.Group
          type="button"
          options={nvidiaFixedParts.map((parts) => ({
            value: parts,
            label:
              parts +
              " 等分" +
              (splitCount !== undefined && splitCount < parts ? "（超过已配置共享份数）" : ""),
            disabled: splitCount !== undefined && splitCount < parts,
          }))}
        />
      </Form.Item>
      {profile ? (
        <section className="rounded-lg bg-(--color-fill-1) p-4">
          <Typography.Text bold>每份固定规格（自动生成）</Typography.Text>
          <Descriptions
            className="mt-3"
            column={1}
            data={[
              {
                label: "计算来源",
                value: source === "registration" ? "已登记供给配置" : "当前供给查询",
              },
              { label: "切片方案", value: "每张物理卡 " + profile.parts + " 等分" },
              { label: "每份显存", value: profile.memoryMiBPerDevice + " MiB" },
              { label: "每份算力限额", value: profile.coreLimitPercent + "%" },
              { label: "每副本申请", value: "1 份" },
              { label: "均分后显存余量", value: profile.unusedMemoryMiB + " MiB / 卡" },
              { label: "均分后算力余量", value: profile.unusedCorePercent + "% / 卡" },
            ]}
          />
        </section>
      ) : issue && source ? (
        <Typography.Text type="secondary">{issue}</Typography.Text>
      ) : null}
      <Typography.Text type="secondary" className="text-xs!">
        {source === "observation"
          ? "当前按真实供给查询生成规格预览，提交时由后端按已登记配置校验；本次不会修改插件配置。"
          : "按固定规格创建软件切片；本次不会修改插件配置。"}
      </Typography.Text>
    </div>
  );
}
