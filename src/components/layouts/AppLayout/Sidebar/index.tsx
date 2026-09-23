import { Menu, Tooltip, Trigger } from "@arco-design/web-react";
import { IconMenuFold, IconMenuUnfold, IconRight } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo, useState } from "react";
import wordmarkUrl from "@/assets/brand/wordmark.png";
import {
  isNavigationGroup,
  type NavigationGroup,
  type NavigationItem,
  type NavigationLeaf,
} from "../navigation";

export const SIDEBAR_WIDTH = 200;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

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

function navigationItemContainsPath(item: NavigationItem, pathname: string): boolean {
  if (isNavigationGroup(item)) {
    return item.children.some((child) => navigationItemContainsPath(child, pathname));
  }
  return item.to === pathname || (item.to !== "/" && pathname.startsWith(`${item.to}/`));
}

function renderMenuLabel(item: NavigationItem, showIcon: boolean) {
  return (
    <span className="sidebar-menu-label">
      {showIcon ? (
        <span className="sidebar-menu-label-icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="sidebar-menu-label-text">{item.label}</span>
    </span>
  );
}

function renderLeaf(item: NavigationLeaf, depth: number, collapsed: boolean) {
  return (
    <Menu.Item
      key={item.to}
      className={clsx("sidebar-menu-leaf", `sidebar-menu-leaf--depth-${depth}`)}
    >
      <Link to={item.to} className="sidebar-menu-link">
        {renderMenuLabel(item, depth === 0 || collapsed)}
      </Link>
    </Menu.Item>
  );
}

function renderFlyoutItems(items: readonly NavigationItem[], onNavigate: () => void) {
  return items.map((item) => {
    if (isNavigationGroup(item)) {
      return (
        <Menu.ItemGroup key={item.key} title={item.label}>
          {renderFlyoutItems(item.children, onNavigate)}
        </Menu.ItemGroup>
      );
    }

    return (
      <Menu.Item key={item.to} className="sidebar-menu-flyout-item">
        <Link to={item.to} className="sidebar-menu-link" onClick={onNavigate}>
          {renderMenuLabel(item, Boolean(item.icon))}
        </Link>
      </Menu.Item>
    );
  });
}

interface SidebarFlyoutItemProps {
  item: NavigationGroup;
  activePathname: string;
  selectedKeys: string[];
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}

function SidebarFlyoutItem({
  item,
  activePathname,
  selectedKeys,
  visible,
  onVisibleChange,
}: SidebarFlyoutItemProps) {
  const active = navigationItemContainsPath(item, activePathname);
  const closeFlyout = () => onVisibleChange(false);

  return (
    <Menu.Item
      key={`flyout-${item.key}`}
      className={clsx("sidebar-menu-flyout-row", active && "is-active", visible && "is-open")}
    >
      <Trigger
        className="sidebar-menu-flyout-trigger"
        trigger="hover"
        position="rt"
        popupAlign={{ right: 26 }}
        popupVisible={visible}
        onVisibleChange={onVisibleChange}
        onClickOutside={closeFlyout}
        popup={() => (
          <div className="sidebar-menu-flyout">
            <div className="sidebar-menu-flyout-title">{item.label}</div>
            <Menu
              className="sidebar-menu-flyout-list"
              selectedKeys={selectedKeys}
              onClickMenuItem={closeFlyout}
            >
              {renderFlyoutItems(item.children, closeFlyout)}
            </Menu>
          </div>
        )}
      >
        <button
          type="button"
          className="sidebar-menu-flyout-button"
          aria-haspopup="menu"
          aria-expanded={visible}
          onClick={(event) => event.stopPropagation()}
        >
          {renderMenuLabel(item, false)}
          <IconRight className="sidebar-menu-flyout-arrow" />
        </button>
      </Trigger>
    </Menu.Item>
  );
}

interface RenderItemsOptions {
  collapsed: boolean;
  activePathname: string;
  selectedKeys: string[];
  flyoutKey: string | null;
  onFlyoutChange: (key: string, visible: boolean) => void;
}

function renderItems(items: readonly NavigationItem[], options: RenderItemsOptions, depth = 0) {
  const { collapsed, activePathname, selectedKeys, flyoutKey, onFlyoutChange } = options;

  return items.map((item) => {
    if (!isNavigationGroup(item)) return renderLeaf(item, depth, collapsed);

    if (!collapsed && depth === 1) {
      return (
        <SidebarFlyoutItem
          key={item.key}
          item={item}
          activePathname={activePathname}
          selectedKeys={selectedKeys}
          visible={flyoutKey === item.key}
          onVisibleChange={(visible) => onFlyoutChange(item.key, visible)}
        />
      );
    }

    const children = renderItems(item.children, options, depth + 1);
    return (
      <Menu.SubMenu
        key={item.key}
        title={renderMenuLabel(item, depth === 0 || collapsed)}
        selectable={false}
        className={clsx(
          "sidebar-menu-group",
          depth === 0 ? "sidebar-menu-group--root" : "sidebar-menu-group--nested",
        )}
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
  const [menuState, setMenuState] = useState(() => ({
    pathname: activePathname,
    openKeys: Array.from(
      new Set([...items.filter(isNavigationGroup).map((item) => item.key), ...activeAncestors]),
    ),
  }));
  const [flyoutState, setFlyoutState] = useState<{
    key: string;
    pathname: string;
    collapsed: boolean;
  } | null>(null);
  const openKeys =
    menuState.pathname === activePathname
      ? menuState.openKeys
      : Array.from(new Set([...menuState.openKeys, ...activeAncestors]));
  const flyoutKey =
    flyoutState?.pathname === activePathname && flyoutState.collapsed === collapsed
      ? flyoutState.key
      : null;
  const collapseLabel = collapsed ? "展开侧栏" : "收起侧栏";

  return (
    <aside
      className={clsx("sidebar", collapsed && "is-collapsed")}
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
      <Link to="/" className="sidebar-brand" aria-label="常青云">
        <img className="sidebar-brand-logo" src={wordmarkUrl} alt="" />
        <img className="sidebar-brand-icon" src="/favicon.png" alt="" />
      </Link>
      <div className="sidebar-menu-region">
        <Menu
          id="sidebar-navigation-menu"
          collapse={collapsed}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onClickSubMenu={(_key, keys) => {
            setFlyoutState(null);
            setMenuState({ pathname: activePathname, openKeys: keys });
          }}
          triggerProps={{
            className: "sidebar-menu-popup-trigger",
            trigger: "hover",
          }}
          className={clsx("sidebar-menu", collapsed && "sidebar-menu--collapsed")}
        >
          {renderItems(items, {
            collapsed,
            activePathname,
            selectedKeys,
            flyoutKey,
            onFlyoutChange: (key, visible) =>
              setFlyoutState(visible ? { key, pathname: activePathname, collapsed } : null),
          })}
        </Menu>
      </div>
      <div className="sidebar-bottom">
        <Tooltip content={collapseLabel} position="right" triggerProps={{ showArrow: false }}>
          <button
            type="button"
            className="sidebar-collapse-button"
            aria-label={collapseLabel}
            aria-controls="sidebar-navigation-menu"
            aria-expanded={!collapsed}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
            <span>{collapseLabel}</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
