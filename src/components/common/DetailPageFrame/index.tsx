import { Card, Tabs } from "@arco-design/web-react";
import { useMemo, useState, type ReactNode } from "react";
import { useBreadcrumbNavigation } from "@/components/layouts/AppLayout/BreadcrumbNavigation/useBreadcrumbNavigation";
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
}: DetailPageFrameProps) {
  const [activeTabKey, setActiveTabKey] = useState(defaultTabKey ?? tabs?.[0]?.key ?? "");
  const breadcrumbNavigation = useMemo(
    () => ({ items: breadcrumbs, onBack }),
    [breadcrumbs, onBack],
  );

  useBreadcrumbNavigation(breadcrumbNavigation);

  return (
    <div className={styles.page}>
      <section className={styles.headerCard}>
        <div className={styles.identity}>
          {icon ? <div className={styles.identityIcon}>{icon}</div> : null}
          <div className={styles.identityText}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{title}</h1>
              {status ? <div className={styles.status}>{status}</div> : null}
            </div>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        </div>

        <div className={styles.headerItems} aria-label="关键字段">
          {headerItems.map((item, index) => (
            <div key={index} className={styles.headerItem}>
              <span className={styles.headerItemLabel}>{item.label}</span>
              <span className={styles.headerItemValue}>{item.value ?? "-"}</span>
            </div>
          ))}
        </div>

        {actions ? <div className={styles.headerActions}>{actions}</div> : null}
      </section>

      <div
        className={`${styles.workspace} ${
          tabs?.length ? styles.workspaceSplit : styles.workspaceSingle
        }`}
      >
        <aside className={styles.leftPane} aria-label="详情信息">
          {cards.map((card) => (
            <Card key={card.key} title={card.title} className={styles.infoCard}>
              {card.content}
            </Card>
          ))}
        </aside>

        {tabs?.length ? (
          <section className={styles.rightPane}>
            <Tabs
              defaultActiveTab={defaultTabKey ?? tabs[0].key}
              extra={typeof tabExtra === "function" ? tabExtra(activeTabKey) : tabExtra}
              onChange={setActiveTabKey}
              className={styles.tabs}
              type="line"
              headerPadding={false}
              inkBarSize={{ width: 16 }}
            >
              {tabs.map((tab) => (
                <Tabs.TabPane key={tab.key} title={tab.title}>
                  {tab.content}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </section>
        ) : null}
      </div>
    </div>
  );
}
