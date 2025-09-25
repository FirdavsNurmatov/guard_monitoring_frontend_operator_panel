import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

export default function MainLayout() {
  const location = useLocation();

  const selectedKey = (() => {
    if (location.pathname.startsWith("/admin/object")) return "1";
    if (location.pathname.startsWith("/admin/users")) return "2";
    return "";
  })();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: "1",
              icon: <TagsOutlined />,
              label: <Link to="/admin/object">Change map image</Link>,
            },
            {
              key: "2",
              icon: <UserOutlined />,
              label: <Link to="/admin/users">Users</Link>,
            },
            {
              key: "3",
              icon: <DashboardOutlined />,
              label: <Link to="/monitoring">Monitoring</Link>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: "16px" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
