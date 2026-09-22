import { logoutPlatform } from "@/api/auth";
import { clearAuthSession, useAuthState } from "@/components/auth/store";
import { formatDateTime } from "@/lib/date";
import { Dropdown, Modal } from "@arco-design/web-react";
import { IconCalendar, IconExport, IconTag, IconUser } from "@arco-design/web-react/icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function TopNav() {
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const username = authState.username || (authState.developmentBypass ? "admin" : "平台管理员");
  const sessionIssuedAt = authState.tokens?.issued_at;

  const logout = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "logout",
        action: "退出登录",
        errorFallback: "服务端退出失败，本地登录状态已清除",
      },
    },
    mutationFn: logoutPlatform,
    onSettled: () => {
      clearAuthSession();
      queryClient.clear();
      window.location.assign("/login");
    },
  });

  const confirmLogout = () => {
    setUserMenuVisible(false);
    Modal.confirm({
      title: "确认退出登录",
      content: "退出后需重新登录。",
      maskClosable: false,
      okButtonProps: { status: "danger" },
      onOk: () => logout.mutateAsync(),
    });
  };

  const userMenu = (
    <div className="topnav-user-card" role="menu" aria-label="个人中心">
      <div className="topnav-user-card-header">
        <span className="topnav-user-card-avatar" aria-hidden="true">
          <IconUser />
        </span>
        <div className="topnav-user-card-profile">
          <strong>{username}</strong>
          <span className="topnav-user-card-meta">
            <IconTag />
            <span>boss</span>
          </span>
          <span className="topnav-user-card-meta">
            <IconCalendar />
            <span>{formatDateTime(sessionIssuedAt)}</span>
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
          <Link to="/" className="topnav-brand" aria-label="ANI BOSS">
            <span className="topnav-brand-mark">A</span>
            <span className="topnav-brand-name">ANI BOSS</span>
          </Link>
        </div>
        <div className="topnav-right">
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
              <span className="topnav-user-avatar">
                <IconUser />
              </span>
              <span className="topnav-user-name">{username}</span>
            </button>
          </Dropdown>
        </div>
      </header>
    </>
  );
}
