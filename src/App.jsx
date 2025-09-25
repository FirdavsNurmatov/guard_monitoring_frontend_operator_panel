import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import RoleChecker from "./components/RoleChecker";
import Dashboard from "./pages/Dashboard";
import Objects from "./pages/objects/Objects";
import User from "./pages/users/Users";
import MainLayout from "./components/MainLayout";

function App() {
  return (
    <Routes>
      <Route index element={<Login />} />
      <Route
        path="monitoring"
        element={
          <RoleChecker roles={["ADMIN", "OPERATOR"]}>
            <Dashboard />
          </RoleChecker>
        }
      ></Route>
      <Route path="admin" element={<MainLayout />}>
        <Route index element={<Navigate to="object" replace />} />
        <Route
          key={2}
          path="object"
          element={
            <RoleChecker roles={["ADMIN"]}>
              <Objects />
            </RoleChecker>
          }
        />
        <Route
          key={3}
          path="users"
          element={
            <RoleChecker roles={["ADMIN"]}>
              <User />
            </RoleChecker>
          }
        />
      </Route>

      <Route
        path="/*"
        element={
          <h1 className="text-[red] text-3xl text-center">Page not found!</h1>
        }
      ></Route>
    </Routes>
  );
}

export default App;
