import { Modal } from "@arco-design/web-react";
import type { ReactNode, Ref } from "react";
import clsx from "clsx";
import WizardSteps from "../WizardSteps";
import styles from "./index.module.css";

type WizardModalProps = {
  title: string;
  description?: ReactNode;
  context?: ReactNode;
  className?: string;
  width?: number;
  current: number;
  steps: readonly string[];
  busy?: boolean;
  onCancel: () => void;
  onStepChange?: (step: number) => void;
  scrollRef?: Ref<HTMLDivElement>;
  footer: ReactNode;
  children: ReactNode;
};

export default function WizardModal({
  title,
  description,
  context,
  className,
  width = 720,
  current,
  steps,
  busy = false,
  onCancel,
  onStepChange,
  scrollRef,
  footer,
  children,
}: WizardModalProps) {
  return (
    <Modal
      visible
      title={
        description ? (
          <div className="pr-6 text-left">
            <div className="text-xl font-medium">{title}</div>
            <div className="mt-1 text-xs font-normal text-(--color-text-3)">{description}</div>
          </div>
        ) : (
          title
        )
      }
      style={{ width, maxWidth: "calc(100vw - 48px)" }}
      className={clsx(styles.modal, className)}
      closable={!busy}
      escToExit={!busy}
      onCancel={onCancel}
      footer={footer}
    >
      {context ? <div className="shrink-0 pb-5">{context}</div> : null}
      <div className="shrink-0 pb-5">
        <WizardSteps
          current={current}
          items={steps}
          className={styles.steps}
          onChange={onStepChange}
        />
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {children}
      </div>
    </Modal>
  );
}
