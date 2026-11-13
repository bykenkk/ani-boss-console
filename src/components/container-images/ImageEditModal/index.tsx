import { Form, Modal, Skeleton } from "@arco-design/web-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/request";
import {
  imageKeys,
  type ImageTarget,
  type ImagePurpose,
  type ImageAccelerator,
  type ImageRegistration,
} from "@/api/container-images";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { imageQueryOptions, metadataChanges } from "../model";
import { ImageFields } from "../ImageFields";
import { VersionConflictNotice } from "../VersionConflictNotice";
interface ImageEditModalProps {
  target: ImageTarget;
  imageId?: string;
  onCancel: () => void;
  onSuccess: () => Promise<unknown>;
}
interface ImageEditFormValues {
  imageReference: string;
  displayName: string;
  description: string;
  purposes: ImagePurpose[];
  accelerator: ImageAccelerator;
}
export function ImageEditModal({ target, imageId, onCancel, onSuccess }: ImageEditModalProps) {
  const [form] = Form.useForm<ImageEditFormValues>();
  const [base, setBase] = useState<ImageRegistration>();
  const [latest, setLatest] = useState<ImageRegistration>();
  const [conflict, setConflict] = useState(false);
  const initialized = useRef(false);
  const api = imageOperations(target);
  const detail = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.detail(target, imageId ?? ""),
    enabled: !!imageId,
    queryFn: ({ signal }) => api.detail(imageId!, signal),
    meta: {
      errorNotification: {
        id: withId("image-detail", ...imageKeys.target(target), imageId),
        action: "镜像详情加载",
      },
    },
  });
  useEffect(() => {
    if (!detail.data || initialized.current) return;
    initialized.current = true;
    setBase(detail.data);
    form.setFieldsValue(detail.data);
  }, [detail.data, form]);
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (values: ImageEditFormValues) => {
      const metadata = {
        displayName: values.displayName.trim(),
        description: values.description ?? "",
        purposes: values.purposes,
        accelerator: values.accelerator,
      };
      if (imageId && base) {
        const changes = metadataChanges(base, metadata);
        await api.update(imageId, { ...changes, expectedVersion: base.version });
      } else {
        await api.register({ ...metadata, imageReference: values.imageReference.trim() });
      }
      await onSuccess();
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.reason === "VERSION_CONFLICT") {
        setConflict(true);
        const refreshed = await detail.refetch();
        setLatest(refreshed.isSuccess ? refreshed.data : undefined);
      }
    },
    meta: {
      feedback: {
        channel: "message",
        action: imageId ? "编辑镜像" : "添加镜像",
        successText: imageId ? "镜像信息已保存" : "镜像已添加",
      },
    },
  });
  const adopt = () => {
    if (!base || !latest) return;
    const values = form.getFieldsValue();
    const edited = metadataChanges(base, {
      displayName: values.displayName ?? base.displayName,
      description: values.description ?? "",
      purposes: values.purposes ?? base.purposes,
      accelerator: values.accelerator ?? base.accelerator,
    });
    form.setFieldsValue({ ...latest, ...edited });
    setBase(latest);
    setLatest(undefined);
    setConflict(false);
  };
  const submit = async () => {
    try {
      const values = await validateForm<ImageEditFormValues>(form);
      if (
        base &&
        !Object.keys(
          metadataChanges(base, {
            ...values,
            displayName: values.displayName.trim(),
            description: values.description ?? "",
          }),
        ).length
      ) {
        showMessage({ type: "info", content: "没有需要保存的修改" });
        return;
      }
      await mutation.mutateAsync(values);
    } catch {
      /* 统一表单与 mutation 反馈。 */
    }
  };
  return (
    <Modal
      visible
      title={imageId ? "编辑镜像" : "添加镜像"}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: conflict || (!!imageId && !base) }}
    >
      {conflict && <VersionConflictNotice disabled={!latest} onAdopt={adopt} />}
      <Skeleton loading={!!imageId && detail.isPending}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ description: "", purposes: ["container"], accelerator: "undeclared" }}
        >
          <ImageFields registering={!imageId} />
        </Form>
      </Skeleton>
    </Modal>
  );
}
