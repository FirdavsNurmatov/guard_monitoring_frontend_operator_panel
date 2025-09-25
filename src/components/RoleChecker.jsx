import { Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

const RoleChecker = ({ roles, children }) => {
  const { user } = useAuthStore((store) => store);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role && !roles.includes(user.role)) {
      navigate(-1);
    }
  }, [user, roles, navigate]);

  if (!user) return <Navigate to="/" />;
  if (!user.role) return <Navigate to="/" />;

  return <>{children}</>;
};

export default RoleChecker;
