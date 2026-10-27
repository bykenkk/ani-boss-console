import { Steps } from "@arco-design/web-react";

interface ModalStepsProps {
  current: number;
  titles: string[];
}

export function ModalSteps({ current, titles }: ModalStepsProps) {
  return (
    // 抵消 Modal 正文默认的上下 24px、左右 20px 内边距，滚动时保持步骤条及背景完整。
    <div className="sticky top-0 z-10 -mx-5 -mt-6 bg-[var(--color-bg-3)] px-5 py-6">
      <Steps current={current} size="small">
        {titles.map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
    </div>
  );
}
