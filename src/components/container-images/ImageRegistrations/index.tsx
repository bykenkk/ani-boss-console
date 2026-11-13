import { Button, Input, Select } from "@arco-design/web-react";
import { useState } from "react";
import clsx from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  imageKeys,
  type ImageTarget,
  type ImagePurpose,
  type ImageAccelerator,
  type ImageRegistration,
} from "@/api/container-images";
import {
  ListDataTable,
  ResourceIdentity,
  ToolbarIconButton,
  DataTableRowActions,
  DataTableRowActionButton,
  type ListColumn,
} from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { imageQueryOptions, purposeLabels, acceleratorLabels, imageTime } from "../model";
import { ImageDetailDrawer } from "../ImageDetailDrawer";
import { ImageEditModal } from "../ImageEditModal";
import { UnregisterImageModal } from "../UnregisterImageModal";
interface ImageRegistrationsProps {
  target: ImageTarget;
  enabled: boolean;
  writable: boolean;
  onManage: () => void;
}
export function ImageRegistrations({
  target,
  enabled,
  writable,
  onManage,
}: ImageRegistrationsProps) {
  const [search, setSearch] = useState("");
  const [purposes, setPurposes] = useState<ImagePurpose[]>([]);
  const [accelerator, setAccelerator] = useState<ImageAccelerator>();
  const [viewing, setViewing] = useState<string>();
  const [editing, setEditing] = useState<string>();
  const [unregistering, setUnregistering] = useState<ImageRegistration>();
  const paging = useListPagination(JSON.stringify([target, search, purposes, accelerator]));
  const api = imageOperations(target);
  const client = useQueryClient();
  const input = {
    page: paging.page,
    pageSize: paging.pageSize,
    ...(search ? { search } : {}),
    ...(purposes.length ? { purposes } : {}),
    ...(accelerator ? { accelerator } : {}),
  };
  const query = useQuery({
    ...imageQueryOptions,
    queryKey: [...imageKeys.target(target), "list", input],
    enabled,
    queryFn: ({ signal }) => api.list(input, signal),
    meta: {
      errorNotification: {
        id: withId("image-list", ...imageKeys.target(target)),
        action: "镜像列表加载",
      },
    },
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: imageKeys.target(target) });
  };
  const columns: ListColumn<ImageRegistration>[] = [
    {
      key: "name",
      title: "名称 / ID",
      width: 200,
      fixed: "left",
      ellipsis: true,
      render: (_, image) => (
        <ResourceIdentity
          name={image.displayName}
          id={image.image_id}
          idLabel="镜像 ID"
          onOpen={() => setViewing(image.image_id)}
        />
      ),
    },
    { dataIndex: "resolvedReference", title: "镜像地址", width: 300, ellipsis: true },
    {
      dataIndex: "purposes",
      title: "用途",
      width: 180,
      render: (values: ImagePurpose[]) => values.map((value) => purposeLabels[value]).join("、"),
    },
    {
      dataIndex: "accelerator",
      title: "加速器",
      width: 140,
      render: (value: ImageAccelerator) => acceleratorLabels[value],
    },
    {
      dataIndex: "platforms",
      title: "平台架构",
      width: 180,
      render: (values: ImageRegistration["platforms"]) =>
        values
          .map((value) => [value.os, value.architecture, value.variant].filter(Boolean).join("/"))
          .join("、"),
    },
    { dataIndex: "updatedAt", title: "更新时间", width: 180, render: imageTime },
    {
      key: "actions",
      title: "操作",
      width: 120,
      fixed: "right",
      render: (_, image) => (
        <DataTableRowActions>
          <DataTableRowActionButton disabled={!writable} onClick={() => setEditing(image.image_id)}>
            编辑
          </DataTableRowActionButton>
          <DataTableRowActionButton status="danger" onClick={() => setUnregistering(image)}>
            移除
          </DataTableRowActionButton>
        </DataTableRowActions>
      ),
    },
  ];
  return (
    <>
      <div
        className={clsx(
          "@container flex min-w-0 flex-col gap-4",
          target.scope === "platform" && "rounded-lg bg-[var(--color-bg-2)] p-4",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onManage}>仓库管理</Button>
            <Button type="primary" disabled={!writable} onClick={() => setEditing("create")}>
              添加镜像
            </Button>
          </div>
          <ToolbarIconButton
            label="刷新"
            className="ml-auto"
            onClick={refresh}
            spinning={query.isFetching}
            disabled={!enabled}
          />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 @min-[480px]:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
          <div className="min-w-0">
            <Input.Search
              aria-label="搜索镜像"
              placeholder="搜索名称、描述或仓库"
              allowClear
              onSearch={(value) => setSearch(value.trim())}
              onClear={() => setSearch("")}
            />
          </div>
          <div className="min-w-0">
            <Select
              aria-label="用途筛选"
              placeholder="全部用途"
              mode="multiple"
              allowClear
              value={purposes}
              onChange={(value) => setPurposes(value ?? [])}
              options={Object.entries(purposeLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <div className="min-w-0">
            <Select
              aria-label="加速器筛选"
              placeholder="全部加速器"
              allowClear
              value={accelerator}
              onChange={setAccelerator}
              options={Object.entries(acceleratorLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
        </div>
        <ListDataTable
          tableLabel="容器镜像"
          scroll={{ y: false }}
          data={query.data?.items ?? []}
          columns={columns}
          rowKey="image_id"
          loading={enabled && query.isPending}
          pagination={{
            ...paging,
            total: Number(query.data?.total ?? "0"),
            onPageChange: paging.setPage,
            onPageSizeChange: paging.setPageSize,
          }}
        />
      </div>
      {viewing && (
        <ImageDetailDrawer
          target={target}
          imageId={viewing}
          onClose={() => setViewing(undefined)}
        />
      )}
      {editing && (
        <ImageEditModal
          target={target}
          imageId={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={async () => {
            await refresh();
            setEditing(undefined);
          }}
        />
      )}
      {unregistering && (
        <UnregisterImageModal
          target={target}
          image={unregistering}
          onCancel={() => setUnregistering(undefined)}
          onSuccess={async () => {
            await refresh();
            setUnregistering(undefined);
          }}
        />
      )}
    </>
  );
}
