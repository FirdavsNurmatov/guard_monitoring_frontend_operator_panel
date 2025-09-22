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
    </Routes>
  );
}

export default App;
