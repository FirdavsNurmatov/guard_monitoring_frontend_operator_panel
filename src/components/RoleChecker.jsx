import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const RoleChecker = ({ children }) => {
  const { user } = useAuthStore((store) => store);

  if (!user) return <Navigate to="/" />;
  if (!user.role) return <Navigate to="/" />;
  if (!["ADMIN", "OPERATOR"].includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

export default RoleChecker;
