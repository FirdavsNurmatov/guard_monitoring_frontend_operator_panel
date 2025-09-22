import { useState } from "react";
import { Form, Input, Button, Typography } from "antd";
import { instance } from "../config/axios-instance";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export default function Login() {
  const { setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await instance.post("/auth/login", {
        username: values.username,
        password: values.password,
      });
      const token = res.data?.data?.access_token;
      if (token) {
        setToken(token);
        localStorage.setItem("auth", JSON.stringify({ state: { token } }));
        // window.location.href = "/dashboard";
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setApiError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen ">
      <Form
        name="login"
        onFinish={onFinish}
        className=" p-10 rounded-xl  w-full max-w-sm"
        layout="vertical"
      >
        <Title level={2} className="text-center mb-8 !text-3xl">
          Login
        </Title>

        <Form.Item
          label={<span className="text-lg font-medium">Username</span>}
          name="username"
          rules={[
            { required: true, message: "Please input your username!" },
            { min: 2, message: "Username must be minimum 2 characters" },
          ]}
        >
          <Input size="large" placeholder="Username" className="text-base" />
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
