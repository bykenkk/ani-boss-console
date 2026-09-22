import { Layout } from "@arco-design/web-react";
import { useRouterState } from "@tanstack/react-router";
import { useState, type CSSProperties, type ReactNode } from "react";
import { PlatformOverviewProvider } from "@/components/overview/PlatformOverviewProvider";
import { TenantManagementProvider } from "@/components/tenant/TenantManagementProvider";
import "./index.css";
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./Sidebar";
import { TopNav } from "./TopNav";
import { appNavigation } from "./navigation";

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

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <PlatformOverviewProvider>
      <TenantManagementProvider>
        <Layout className="app-layout">
          <TopNav />
          <Layout className="app-layout-main">
            <div className="app-layout-body">
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
              <Content
                data-component="page-scroll-region"
                className="app-layout-content"
                style={CONTENT_STYLE}
              >
                {children}
              </Content>
            </div>
          </Layout>
        </Layout>
      </TenantManagementProvider>
    </PlatformOverviewProvider>
  );
}

export { SIDEBAR_WIDTH };
