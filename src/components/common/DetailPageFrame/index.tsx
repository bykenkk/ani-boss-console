import { Card, Skeleton, Tabs } from "@arco-design/web-react";
import clsx from "clsx";
import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import styles from "./index.module.less";

export interface DetailBreadcrumbItem {
  label: ReactNode;
  onClick?: () => void;
}

export interface DetailHeaderItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailInfoCard {
  key: string;
  title: ReactNode;
  content: ReactNode;
}

export interface DetailTab {
  key: string;
  title: ReactNode;
  content: ReactNode;
  destroyOnHide?: boolean;
}

interface DetailPageFrameProps {
  breadcrumbs: DetailBreadcrumbItem[];
  title: ReactNode;
  status?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  headerItems: DetailHeaderItem[];
  actions?: ReactNode;
  cards: DetailInfoCard[];
  tabs?: DetailTab[];
  tabExtra?: ReactNode | ((activeTabKey: string) => ReactNode);
  defaultTabKey?: string;
  onBack?: () => void;
  loading?: boolean;
}

export function DetailPageFrame({
  breadcrumbs,
  title,
  status,
  subtitle,
  icon,
  headerItems,
  actions,
  cards,
  tabs,
  tabExtra,
  defaultTabKey,
  onBack,
  loading = false,
}: DetailPageFrameProps) {
  const [activeTabKey, setActiveTabKey] = useState(defaultTabKey ?? tabs?.[0]?.key ?? "");
  const breadcrumbNavigation = useMemo(
    () => ({ items: breadcrumbs, onBack }),
    [breadcrumbs, onBack],
  );

  const setNavigation = useNavigationContext();
  useLayoutEffect(() => {
    if (!setNavigation) return undefined;
    setNavigation(breadcrumbNavigation);
    return () => setNavigation(null);
  }, [breadcrumbNavigation, setNavigation]);

  return (
    <div className={styles.page} aria-busy={loading}>
      <section className={styles.headerCard}>
        {loading ? (
          <div
            className="grid w-full grid-cols-[minmax(0,240px)_minmax(0,1fr)_32px] items-center gap-8"
            role="status"
            aria-label="正在加载详情"
          >
            <Skeleton loading animation text={{ rows: 1, width: "80%" }} />
            <Skeleton loading animation text={{ rows: 1, width: "60%" }} />
            <Skeleton loading animation text={{ rows: 1, width: 32 }} />
          </div>
        ) : (
          <>
            <div className={styles.identity}>
              {icon ? <div className={styles.identityIcon}>{icon}</div> : null}
              <div className={styles.identityText}>
                <div className={styles.titleRow}>
                  <h1
                    className={styles.title}
                    title={typeof title === "string" ? title : undefined}
                  >
                    {title}
                  </h1>
                  {status ? <div className={styles.status}>{status}</div> : null}
                </div>
                {subtitle ? (
                  <p
                    className={styles.subtitle}
                    title={typeof subtitle === "string" ? subtitle : undefined}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={styles.headerItems} aria-label="关键字段">
              {headerItems.map((item, index) => (
                <div key={index} className={styles.headerItem}>
                  <span className={styles.headerItemLabel}>{item.label}</span>
                  <span
                    className={styles.headerItemValue}
                    title={
                      typeof item.value === "string" || typeof item.value === "number"
                        ? String(item.value)
                        : undefined
                    }
                  >
                    {item.value ?? "-"}
                  </span>
                </div>
              ))}
            </div>

            {actions ? <div className={styles.headerActions}>{actions}</div> : null}
          </>
        )}
      </section>

      <div
        className={clsx(styles.workspace, tabs ? styles.workspaceSplit : styles.workspaceSingle)}
      >
        <aside className={styles.leftPane} aria-label="详情信息">
          {cards.map((card) => (
            <Card key={card.key} title={card.title} className={styles.infoCard}>
              {loading ? (
                <Skeleton
                  loading
                  animation
                  text={{ rows: 6, width: ["100%", "82%", "94%", "76%", "88%", "80%"] }}
                />
              ) : (
                card.content
              )}
            </Card>
          ))}
        </aside>

        {tabs ? (
          <section className={styles.rightPane}>
            {loading ? (
              <div className="flex min-h-0 flex-1 flex-col" aria-hidden="true">
                <div className="border-b border-(--color-border-2) p-4">
                  <Skeleton loading animation text={{ rows: 1, width: "36%" }} />
                </div>
                <div className="p-4">
                  <Skeleton
                    loading
                    animation
                    text={{ rows: 6, width: ["28%", "72%", "66%", "84%", "76%", "56%"] }}
                  />
                </div>
              </div>
            ) : tabs.length > 0 ? (
              <Tabs
                defaultActiveTab={defaultTabKey ?? tabs[0].key}
                extra={typeof tabExtra === "function" ? tabExtra(activeTabKey) : tabExtra}
                onChange={setActiveTabKey}
                className={styles.tabs}
                type="line"
              >
                {tabs.map((tab) => (
                  <Tabs.TabPane key={tab.key} title={tab.title} destroyOnHide={tab.destroyOnHide}>
                    {tab.content}
                  </Tabs.TabPane>
                ))}
              </Tabs>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
