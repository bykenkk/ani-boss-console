import "./index.css";

export function KaiwuEntryButton() {
  // TODO(api-migration): 原开物 Services 入口接口已废弃；待替代接口契约确认后接入入口查询与新窗口导航，再启用按钮。
  return (
    <button
      type="button"
      className="topnav-kaiwu"
      aria-label="进入开物（新窗口）"
      title="开物入口待迁移"
      disabled
    >
      <span className="topnav-kaiwu-switch" aria-hidden="true">
        <span className="topnav-kaiwu-knob" />
      </span>
      <span>开物</span>
    </button>
  );
}
