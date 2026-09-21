import { Menu, Tooltip } from "@arco-design/web-react";
import { IconMenuFold, IconMenuUnfold } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo, useState, type CSSProperties } from "react";
import { isNavigationGroup, type NavigationItem, type NavigationLeaf } from "../navigation";

export const SIDEBAR_WIDTH = 200;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

interface SidebarProps {
  items: readonly NavigationItem[];
  activePathname: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function collectLeafPaths(items: readonly NavigationItem[]): string[] {
  return items.flatMap((item) =>
    isNavigationGroup(item) ? collectLeafPaths(item.children) : [item.to],
  );
}

function findActiveAncestors(items: readonly NavigationItem[], pathname: string): string[] | null {
  for (const item of items) {
    if (!isNavigationGroup(item)) {
      if (item.to === pathname || (item.to !== "/" && pathname.startsWith(`${item.to}/`))) {
        return [];
      }
      continue;
    }

    const descendants = findActiveAncestors(item.children, pathname);
    if (descendants !== null) return [item.key, ...descendants];
  }
  return null;
}

function selectedMenuKeys(pathname: string, routeKeys: readonly string[]): string[] {
  const exact = routeKeys.find((key) => key === pathname);
  if (exact) return [exact];

  const prefix = routeKeys
    .filter((key) => key !== "/" && pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? [prefix] : [];
}

type SidebarRowStyle = CSSProperties & { "--sidebar-row-padding-left": string };

function rowStyle(depth: number): SidebarRowStyle {
  return {
    "--sidebar-row-padding-left": `${depth <= 1 ? 12 : 28 + (depth - 2) * 20}px`,
  };
}

function renderMenuLabel(item: NavigationItem, showIcon = Boolean(item.icon), showTooltip = true) {
  const label = <span className="sidebar-menu-label-text">{item.label}</span>;

  return (
    <span className="sidebar-menu-label">
      {showIcon ? (
        <span className="sidebar-menu-label-icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      {showTooltip ? (
        <Tooltip content={item.label} position="right" triggerProps={{ showArrow: false }}>
          {label}
        </Tooltip>
      ) : (
        label
      )}
    </span>
  );
}

function renderLeaf(item: NavigationLeaf, depth: number) {
  return (
    <Menu.Item
      key={item.to}
      className={clsx("sidebar-menu-leaf", `sidebar-menu-leaf--depth-${depth}`)}
      style={rowStyle(depth)}
      renderItemInTooltip={() => item.label}
    >
      <Link to={item.to} className="sidebar-menu-link">
        {renderMenuLabel(item)}
      </Link>
    </Menu.Item>
  );
}

function renderItems(items: readonly NavigationItem[], collapsed: boolean, depth = 0) {
  return items.map((item) => {
    if (!isNavigationGroup(item)) return renderLeaf(item, depth);

    const children = renderItems(item.children, collapsed, depth + 1);
    return (
      <Menu.SubMenu
        key={item.key}
        title={renderMenuLabel(item, depth > 0 || collapsed, depth > 0)}
        selectable={false}
        className={clsx(
          "sidebar-menu-group",
          depth === 0 ? "sidebar-menu-group--root" : "sidebar-menu-group--nested",
        )}
        style={rowStyle(depth)}
      >
        {collapsed && depth === 0 ? (
          <Menu.ItemGroup
            className="sidebar-menu-popup-group"
            title={<span className="sidebar-menu-popup-title">{item.label}</span>}
          >
            {children}
          </Menu.ItemGroup>
        ) : (
          children
        )}
      </Menu.SubMenu>
    );
  });
}

export function Sidebar({ items, activePathname, collapsed, onCollapsedChange }: SidebarProps) {
  const allLeafKeys = useMemo(() => collectLeafPaths(items), [items]);
  const activeAncestors = useMemo(
    () => findActiveAncestors(items, activePathname) ?? [],
    [activePathname, items],
  );
  const selectedKeys = useMemo(
    () => selectedMenuKeys(activePathname, allLeafKeys),
    [activePathname, allLeafKeys],
  );
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const menuCollapsed = collapsed && !hoverExpanded;
  const visibleOpenKeys = Array.from(new Set([...openKeys, ...activeAncestors]));
  const collapseLabel = collapsed ? "展开侧栏" : "收起侧栏";

  return (
    <aside
      className={clsx("sidebar", collapsed && "is-collapsed", hoverExpanded && "is-hover-expanded")}
      style={{ width: menuCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      onMouseEnter={() => {
        if (collapsed) setHoverExpanded(true);
      }}
      onMouseLeave={() => setHoverExpanded(false)}
    >
      <div className="sidebar-menu-region">
        <Menu
          id="sidebar-navigation-menu"
          collapse={menuCollapsed}
          selectedKeys={selectedKeys}
          openKeys={visibleOpenKeys}
          onClickSubMenu={(_key, keys) => setOpenKeys(keys)}
          triggerProps={{
            className: "sidebar-menu-popup-trigger",
            mouseEnterDelay: 50,
            mouseLeaveDelay: 80,
          }}
          tooltipProps={{
            className: "sidebar-menu-leaf-tooltip",
            position: "right",
            triggerProps: { showArrow: false },
          }}
          className={clsx("sidebar-menu", menuCollapsed && "sidebar-menu--collapsed")}
        >
          {renderItems(items, menuCollapsed)}
        </Menu>
      </div>
      <Tooltip content={collapseLabel} position="right" triggerProps={{ showArrow: false }}>
        <button
          type="button"
          className="sidebar-collapse-button"
          aria-label={collapseLabel}
          aria-controls="sidebar-navigation-menu"
          aria-expanded={!collapsed}
          onClick={() => {
            setHoverExpanded(false);
            onCollapsedChange(!collapsed);
          }}
        >
          {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
          <span>{collapseLabel}</span>
        </button>
      </Tooltip>
    </aside>
  );
}
