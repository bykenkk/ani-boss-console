import { Empty, Spin } from "@arco-design/web-react";
import styles from "./index.module.less";
import { IconSafe } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPlatformAdministratorRoles,
  platformAdministratorQueryKeys,
  type PlatformAdministratorRole,
} from "@/api/platform-admins";
import { ResourcePageFrame } from "@/components/common";
import { platformAdministratorRoleLabels } from "../model";

const platformRoleDescriptions: Record<PlatformAdministratorRole, string> = {
  "platform-admin":
    "拥有 BOSS 全部管理权限，可开通租户、配置资源池、管理平台账号，并处理计量与审计相关操作。",
  "platform-ops":
    "负责日常租户开通、冻结与资源池运维；不可管理平台账号，计量仅可查看，不能导出审计。",
  "platform-readonly":
    "以只读方式查看租户、资源池与计量数据，不可修改配置或管理账号；可导出审计，便于核查与留档。",
};

export function PlatformRolesPage() {
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrator-roles",
        action: "平台角色加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.roles,
    queryFn: fetchPlatformAdministratorRoles,
  });

  return (
    <ResourcePageFrame
      header={{
        title: "平台角色",
        subtitle: "内置超级管理、运维、只读三类角色，分配给平台管理员使用。",
      }}
    >
      <Spin loading={rolesQuery.isPending}>
        <div className={styles.grid}>
          {(rolesQuery.data || []).map((role) => (
            <article className={styles.card} key={role.id}>
              <div className={styles.head}>
                <span className={styles.icon}>
                  <IconSafe />
                </span>
                <div>
                  <h3>{platformAdministratorRoleLabels[role.name]}</h3>
                  <span className={styles.subtitle}>{role.name}</span>
                </div>
              </div>
              <p>{platformRoleDescriptions[role.name]}</p>
              <div className={styles.chips}>
                {(role.name === "platform-admin"
                  ? ["租户管理", "资源池", "平台账号", "计量", "审计"]
                  : role.name === "platform-ops"
                    ? ["租户开通/冻结", "资源池运维", "计量（只读）"]
                    : ["全部数据（只读）", "审计导出"]
                ).map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <details className={styles.details}>
                <summary>查看权限说明</summary>
                <dl className={styles.permissions}>
                  <dt>租户开通 / 冻结</dt>
                  <dd>{role.name === "platform-readonly" ? "只读" : "允许"}</dd>
                  <dt>平台资源池</dt>
                  <dd>{role.name === "platform-readonly" ? "只读" : "允许"}</dd>
                  <dt>平台账号</dt>
                  <dd>{role.name === "platform-admin" ? "允许" : "不可管理"}</dd>
                  <dt>计量结算</dt>
                  <dd>{role.name === "platform-admin" ? "允许" : "只读"}</dd>
                  <dt>审计导出</dt>
                  <dd>{role.name === "platform-ops" ? "不可导出" : "允许"}</dd>
                </dl>
              </details>
            </article>
          ))}
        </div>
        {!rolesQuery.isPending && !rolesQuery.data?.length && <Empty description="暂无平台角色" />}
      </Spin>
    </ResourcePageFrame>
  );
}
