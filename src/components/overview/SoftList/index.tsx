import { List } from "@arco-design/web-react";
import type { ReactNode } from "react";

export function SoftList({ children }: { children: ReactNode }) {
  return (
    <List bordered={false} split>
      {children}
    </List>
  );
}
