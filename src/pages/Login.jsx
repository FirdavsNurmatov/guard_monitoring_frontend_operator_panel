import { useState } from "react";
import { Form, Input, Button, Typography } from "antd";
import { instance } from "../config/axios-instance";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const { Title } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore((store) => store);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await instance.post("/auth/login", {
        login: values.login,
        password: values.password,
      });
      const accessToken = res.data?.data?.access_token;
      const role = res?.data?.data?.role;

      if (!["ADMIN", "OPERATOR"].includes(role)) {
        throw new Error("Access Denied for " + role);
      }

      setUser({
        username: res.data?.data?.username,
        role: role,
      });
      setToken(accessToken);

      Cookies.set("accessToken", accessToken);

      return navigate("/monitoring", { replace: true });
    } catch (error) {
      if (!error.message.startsWith("Access Denied"))
        setApiError("Username yoki parol noto'g'ri! Qayta urinib ko'ring!");
      else if (!error.message.includes("not found")) {
        setApiError("Bunday user mavjud emas");
      } else setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Form
        name="login"
        onFinish={onFinish}
        layout="vertical"
        style={{
          backgroundColor: "white",
          width: "100%",
          boxShadow: "initial",
          padding: "2rem",
          borderRadius: "12px",
          maxWidth: "28rem",
        }}
      >
        <Title level={2} className="text-center mb-8 !text-3xl">
          Login
        </Title>

        <Form.Item
          label={<span className="text-lg font-medium">Login</span>}
          name="login"
          rules={[
            { required: true, message: "Please input your username!" },
            { min: 2, message: "Login must be minimum 2 characters" },
          ]}
        >
          <Input size="large" placeholder="Login" className="text-base" />
        </Form.Item>

        <Form.Item
          label={<span className="text-lg font-medium">Password</span>}
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            size="large"
            placeholder="Password"
            className="text-base"
          />
        </Form.Item>

        {apiError && (
          <p className="text-center text-red-500 text-[18px]">{apiError}</p>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            className="h-12 text-lg font-semibold"
          >
            Login
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
