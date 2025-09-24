import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RoleChecker from "./components/RoleChecker";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RoleChecker>
            <Dashboard />
          </RoleChecker>
        }
      />

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
