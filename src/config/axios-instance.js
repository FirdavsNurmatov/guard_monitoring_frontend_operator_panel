import axios from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "../store/useAuthStore";
import createAuthRefreshInterceptor from "axios-auth-refresh";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

instance.interceptors.request.use(async (config) => {
  if (config.url !== "/auth/refresh") {
    const data = JSON.parse(localStorage.getItem("auth") || "{}");
    const token = data?.state?.token;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

const refreshAuthLogic = async (failedRequest) => {
  const { setToken } = useAuthStore.getState();
  try {
    const response = await instance.post("/auth/refresh", null, {
      withCredentials: true,
    });

    const newAccessToken = response.data?.data?.access_token;
    Cookies.set("accessToken", newAccessToken);
    setToken(newAccessToken);

    failedRequest.response.config.headers[
      "Authorization"
    ] = `Bearer ${newAccessToken}`;

    return Promise.resolve();
  } catch (err) {
    Cookies.remove("accessToken");
    localStorage.removeItem("auth");
    window.location.href = "/";
    return Promise.reject(err);
  }
};

createAuthRefreshInterceptor(instance, refreshAuthLogic, {
  statusCodes: [401],
});
