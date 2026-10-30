import { Steps } from "@arco-design/web-react";

interface ModalStepsProps {
  current: number;
  titles: string[];
}

export function ModalSteps({ current, titles }: ModalStepsProps) {
  return (
    // 仅抵消正文左右内边距，保留顶部占位，避免吸附时覆盖首个表单项。
    <div className="sticky top-0 z-10 -mx-5 bg-[var(--color-bg-3)] px-5 py-6">
      <Steps current={current} size="small">
        {titles.map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
    </div>
  );
}
