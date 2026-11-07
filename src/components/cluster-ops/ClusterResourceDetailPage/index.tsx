import { useRef, useState } from "react";
import { Button, Descriptions, Dropdown, Menu, Modal } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  deleteResource,
  getResource,
  listResourceTypes,
  restartWorkload,
  type ClusterOpsResourceRef,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { DetailPageFrame, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import {
  canResourceAction,
  field,
  nativeObject,
  readOnlyMessage,
  resourceDetailSearch,
  resourceFacts,
  resourceState,
  sameResourceType,
} from "../model";
import { ResourceManifest } from "../ResourceManifest";
import { ResourceEvents } from "../ResourceEvents";
import { RelatedResources } from "../RelatedResources";
import { ResourceEditModal } from "../ResourceEditModal";
import { SecretContentModal } from "../SecretContentModal";
import { WorkloadScaleModal } from "../WorkloadScaleModal";
import { PodLogs } from "../PodLogs";

interface ClusterResourceDetailPageProps {
  resourceRef: ClusterOpsResourceRef;
}
export function ClusterResourceDetailPage({ resourceRef }: ClusterResourceDetailPageProps) {
  const navigate = useNavigate(),
    client = useQueryClient();
  const [edit, setEdit] = useState(false),
    [secret, setSecret] = useState(false),
    [scale, setScale] = useState(false);
  const deletionMessage = useRef("已提交删除");
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef),
    queryFn: ({ signal }) => getResource(resourceRef, { signal }),
    meta: { errorNotification: { id: "cluster-resource", action: "读取资源详情" } },
  });
  const types = useQuery({
    queryKey: clusterOpsKeys.resourceTypes(resourceRef.cluster_id),
    queryFn: ({ signal }) => listResourceTypes(resourceRef.cluster_id, signal),
    meta: { errorNotification: { id: "cluster-resource-types", action: "发现资源类型" } },
  });
  const doc = query.data?.resource;
  const descriptor = types.data?.items.find((item) =>
    sameResourceType(item.type, resourceRef.type),
  );
  const can = (action: "update" | "delete" | "scale" | "restart" | "logs") =>
    Boolean(doc && descriptor && canResourceAction(descriptor, doc, action));
  const back = () =>
    navigate({
      to: "/cluster-operations/resources",
      search: { ...resourceDetailSearch(resourceRef), name: undefined },
    });
  const remove = useMutation({
    mutationFn: async (expected_uid: string) => {
      const result = await deleteResource(resourceRef, { expected_uid });
      deletionMessage.current = result.already_absent
        ? "资源已不存在"
        : result.deletion_requested
          ? "已提交删除"
          : "删除结果尚未确认，请刷新资源查看";
      return result;
    },
    meta: {
      feedback: () => ({
        channel: "notification",
        id: "cluster-resource-delete",
        action: "删除资源",
        successText: deletionMessage.current,
      }),
    },
    onSuccess: async (result) => {
      if (result.already_absent) {
        await back();
      }
      await client.invalidateQueries({ queryKey: clusterOpsKeys.all });
    },
  });
  const restart = useMutation({
    mutationFn: async (expected: { uid: string; rv: string }) =>
      restartWorkload(resourceRef, {
        expected_uid: expected.uid,
        expected_resource_version: expected.rv,
      }),
    meta: {
      feedback: {
        channel: "notification",
        id: "cluster-workload-restart",
        action: "重启工作负载",
        successText: "已提交重启",
        successDescription: "工作负载模板变更已提交，Pod 是否就绪请查看实际资源。",
      },
    },
    onSuccess: () => client.invalidateQueries({ queryKey: clusterOpsKeys.all }),
  });
  const confirmDelete = () => {
    const uid = doc!.uid;
    return Modal.confirm({
      title: `删除 ${resourceRef.name}？`,
      content:
        resourceRef.type.resource === "customresourcedefinitions"
          ? "删除此测试定义可能同时删除该类型的实例。请确认对象与影响。"
          : "删除请求提交后，对象可能进入 Terminating。不会自动重放删除或清除 finalizers。",
      onOk: () => remove.mutateAsync(uid),
    });
  };
  const confirmRestart = () => {
    const expected = { uid: doc!.uid, rv: doc!.resource_version };
    return Modal.confirm({
      title: `重启 ${resourceRef.name}？`,
      content: "此操作提交工作负载模板变更，不代表所有 Pod 已就绪。",
      onOk: () => restart.mutateAsync(expected),
    });
  };
  const menu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "edit") {
          if (doc?.secret_data_redacted) setSecret(true);
          else setEdit(true);
        } else if (key === "scale") setScale(true);
        else if (key === "restart") confirmRestart();
        else if (key === "delete") confirmDelete();
      }}
    >
      {can("update") ? <Menu.Item key="edit">编辑 YAML</Menu.Item> : null}
      {can("scale") ? <Menu.Item key="scale">扩缩容</Menu.Item> : null}
      {can("restart") ? (
        <Menu.Item key="restart" disabled={restart.isPending}>
          重启
        </Menu.Item>
      ) : null}
      {can("delete") ? (
        <Menu.Item key="delete" disabled={remove.isPending}>
          删除
        </Menu.Item>
      ) : null}
    </Menu>
  );
  const info = doc
    ? [
        { label: "UID", value: doc.uid },
        { label: "resourceVersion", value: doc.resource_version },
        {
          label: "创建时间",
          value: formatDateTime(
            String(field(nativeObject(doc), "metadata", "creationTimestamp") ?? ""),
          ),
        },
        {
          label: "只读状态",
          value: doc.read_only
            ? readOnlyMessage(doc.read_only_reason) || "当前资源只读"
            : "可按允许动作操作",
        },
        ...resourceFacts(doc),
      ]
    : [];
  const tabs =
    query.data && doc
      ? [
          {
            key: "manifest",
            title: "配置",
            content: <ResourceManifest value={query.data} onRevealSecret={() => setSecret(true)} />,
          },
          {
            key: "json",
            title: "原始对象",
            content: (
              <ResourceManifest value={query.data} raw onRevealSecret={() => setSecret(true)} />
            ),
          },
          ...(types.data?.items.some(
            (item) =>
              item.type.group === "" &&
              item.type.resource === "events" &&
              item.actions.includes("list"),
          )
            ? [{ key: "events", title: "事件", content: <ResourceEvents resource={doc} /> }]
            : []),
          {
            key: "related",
            title: "关联资源",
            content: <RelatedResources resource={doc} descriptors={types.data?.items ?? []} />,
          },
          ...(resourceRef.type.resource === "pods" && can("logs")
            ? [
                {
                  key: "logs",
                  title: "日志",
                  destroyOnHide: true,
                  content: <PodLogs key={JSON.stringify([doc.ref, doc.uid])} resource={doc} />,
                },
              ]
            : []),
        ]
      : [];
  return (
    <>
      <DetailPageFrame
        title={resourceRef.name}
        status={doc ? <StatusBadge value={resourceState(doc)} /> : undefined}
        breadcrumbs={[{ label: "资源管理", onClick: back }, { label: resourceRef.name }]}
        onBack={back}
        headerItems={[
          { label: "集群", value: resourceRef.cluster_id },
          {
            label: "类型",
            value: `${resourceRef.type.group || "core"}/${resourceRef.type.version}/${resourceRef.type.resource}`,
          },
          { label: "Namespace", value: resourceRef.namespace || "-" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button onClick={() => query.refetch()} loading={query.isFetching}>
              刷新
            </Button>
            {["update", "delete", "scale", "restart"].some((action) => can(action as "update")) ? (
              <Dropdown droplist={menu} trigger="click" position="br">
                <Button aria-label="更多操作" title="更多操作" icon={<IconMoreVertical />} />
              </Dropdown>
            ) : null}
          </div>
        }
        cards={[
          { key: "identity", title: "资源信息", content: <Descriptions column={1} data={info} /> },
        ]}
        tabs={tabs}
      />
      {edit ? (
        <ResourceEditModal resourceRef={resourceRef} onCancel={() => setEdit(false)} />
      ) : null}
      {secret ? (
        <SecretContentModal
          resourceRef={resourceRef}
          editable={can("update")}
          onCancel={() => setSecret(false)}
          onEdit={() => {
            setSecret(false);
            setEdit(true);
          }}
        />
      ) : null}
      {scale && doc ? <WorkloadScaleModal resource={doc} onCancel={() => setScale(false)} /> : null}
    </>
  );
}
