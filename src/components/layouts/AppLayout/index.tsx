import { Layout } from "@arco-design/web-react";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PlatformOverviewProvider } from "@/components/overview/PlatformOverviewProvider";
import { TenantManagementProvider } from "@/components/tenant/TenantManagementProvider";
import type { AppBreadcrumbItem, AppBreadcrumbNavigation } from "@/lib/navigation";
import "./index.css";
import { BreadcrumbNavigationProvider } from "./BreadcrumbNavigation";
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./Sidebar";
import { TopNav } from "./TopNav";
import { appNavigation, isNavigationGroup, type NavigationItem } from "./navigation";

const { Content } = Layout;

const CONTENT_STYLE = {
  background: "linear-gradient(135deg, #f2f5fb 0%, #f7f9fc 100%)",
  boxSizing: "border-box",
  minWidth: 0,
  paddingInline: "var(--app-content-padding-inline)",
  paddingTop: "var(--app-content-padding-top)",
  paddingBottom: "var(--app-content-padding-bottom)",
  "--app-content-padding-inline": "24px",
  "--app-content-padding-top": "16px",
  "--app-content-padding-bottom": "24px",
  "--app-content-available-height":
    "calc(100vh - var(--topnav-height) - var(--app-content-padding-top) - var(--app-content-padding-bottom))",
} as CSSProperties;

interface AppLayoutProps {
  children: ReactNode;
}

function findNavigationTrail(
  items: readonly NavigationItem[],
  pathname: string,
  parents: AppBreadcrumbItem[] = [],
): AppBreadcrumbItem[] | null {
  for (const item of items) {
    if (isNavigationGroup(item)) {
      const trail = findNavigationTrail(item.children, pathname, [
        ...parents,
        { label: item.label },
      ]);
      if (trail) return trail;
      continue;
    }

    if (item.to === pathname || (item.to !== "/" && pathname.startsWith(`${item.to}/`))) {
      return [...parents, { label: item.to === "/" ? "平台概览" : item.label, to: item.to }];
    }
  }

  return null;
}

function routeBreadcrumbs(pathname: string): AppBreadcrumbItem[] {
  const trail = findNavigationTrail(appNavigation, pathname) ?? [];
  return trail;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailNavigation, setDetailNavigation] = useState<AppBreadcrumbNavigation | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const breadcrumbs = useMemo(() => routeBreadcrumbs(pathname), [pathname]);
  const topNavBreadcrumbs = detailNavigation?.items ?? breadcrumbs;

  return (
    <PlatformOverviewProvider>
      <TenantManagementProvider>
        <BreadcrumbNavigationProvider onChange={setDetailNavigation}>
          <Layout className="app-layout">
            <div
              className="app-layout-sidebar-slot"
              style={{
                width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              }}
            >
              <Sidebar
                items={appNavigation}
                activePathname={pathname}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
              />
            </div>
            <Layout className="app-layout-main">
              <TopNav breadcrumbs={topNavBreadcrumbs} onBack={detailNavigation?.onBack} />
              <Content
                data-component="page-scroll-region"
                className="app-layout-content"
                style={CONTENT_STYLE}
              >
                {children}
              </Content>
            </Layout>
          </Layout>
        </BreadcrumbNavigationProvider>
      </TenantManagementProvider>
    </PlatformOverviewProvider>
  );
}

export { SIDEBAR_WIDTH };
