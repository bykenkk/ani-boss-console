import { KaiwuEntryButton } from "@/components/kaiwu/KaiwuEntryButton";
import { logoutPlatform } from "@/api/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDateTime } from "@/lib/date";
import type { AppBreadcrumbItem } from "@/lib/navigation";
import { Breadcrumb, Button, Dropdown, Input, Modal, Tooltip } from "@arco-design/web-react";
import {
  IconCalendar,
  IconExport,
  IconLeft,
  IconSearch,
  IconTag,
  IconUser,
} from "@arco-design/web-react/icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

interface TopNavProps {
  breadcrumbs: AppBreadcrumbItem[];
  onBack?: () => void;
}

export function TopNav({ breadcrumbs, onBack }: TopNavProps) {
  const queryClient = useQueryClient();
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const { data: user } = useCurrentUser();
  const username = user?.username || "-";
  const roles = (user?.roleNames?.length ? user.roleNames : user?.roles)?.join("、") || "-";
  const avatar = user?.avatar ? (
    <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    <IconUser />
  );

  const logout = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "logout",
        action: "退出登录",
        errorFallback: "退出失败，请稍后重试",
      },
    },
    mutationFn: logoutPlatform,
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/login");
    },
  });

  const confirmLogout = () => {
    setUserMenuVisible(false);
    Modal.confirm({
      title: "确认退出登录",
      content: "退出将结束当前登录会话，之后需重新登录。",
      maskClosable: false,
      okButtonProps: { status: "danger" },
      onOk: () => logout.mutateAsync(),
    });
  };

  const userMenu = (
    <div className="topnav-user-card" role="menu" aria-label="个人中心">
      <div className="topnav-user-card-header">
        <span className="topnav-user-card-avatar" aria-hidden="true">
          {avatar}
        </span>
        <div className="topnav-user-card-profile">
          <strong>{username}</strong>
          <span className="topnav-user-card-meta">
            <IconTag />
            <span>{roles}</span>
          </span>
          <span className="topnav-user-card-meta">
            <IconCalendar />
            <span>{formatDateTime(user?.lastLoginAt)}</span>
          </span>
        </div>
      </div>
      <div className="topnav-user-card-menu">
        <span className="topnav-user-card-divider" aria-hidden="true" />
      </div>
      <div className="topnav-user-card-footer">
        <button
          type="button"
          role="menuitem"
          className="topnav-user-card-logout"
          onClick={confirmLogout}
        >
          <IconExport />
          <span>安全退出</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="top-nav">
        <div className="topnav-left">
          {onBack ? (
            <Tooltip content="返回上一级">
              <Button
                type="text"
                shape="circle"
                className="topnav-back"
                icon={<IconLeft />}
                aria-label="返回上一级"
                onClick={onBack}
              />
            </Tooltip>
          ) : null}
          <Breadcrumb className="topnav-breadcrumbs" aria-label="页面面包屑">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Breadcrumb.Item key={index}>
                  {item.to && !isLast ? (
                    <Link to={item.to} className="topnav-breadcrumb-link">
                      {item.label}
                    </Link>
                  ) : item.onClick && !isLast ? (
                    <button type="button" className="topnav-breadcrumb-link" onClick={item.onClick}>
                      {item.label}
                    </button>
                  ) : (
                    <span className={isLast ? "topnav-breadcrumb-current" : undefined}>
                      {item.label}
                    </span>
                  )}
                </Breadcrumb.Item>
              );
            })}
          </Breadcrumb>
        </div>
        <div className="topnav-right">
          <Input
            className="topnav-search"
            prefix={<IconSearch />}
            placeholder="请输入内容"
            aria-label="全局搜索"
          />
          <KaiwuEntryButton />
          <span className="topnav-user-divider" aria-hidden="true" />
          <Dropdown
            droplist={userMenu}
            trigger="hover"
            position="br"
            popupVisible={userMenuVisible}
            onVisibleChange={setUserMenuVisible}
            triggerProps={{ mouseEnterDelay: 0, mouseLeaveDelay: 200 }}
          >
            <button
              type="button"
              className="topnav-user"
              aria-label={`打开 ${username} 用户菜单`}
              aria-haspopup="menu"
              aria-expanded={userMenuVisible}
            >
              <span className="topnav-user-avatar">{avatar}</span>
              <span className="topnav-user-name">{username}</span>
            </button>
          </Dropdown>
        </div>
      </header>
    </>
  );
}
