
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout"
// import ExecutiveLayout from "./layouts/ExecutiveLayout";


// import ExecutiveDashboard from "./pages/executive/Dashboard";

import ProtectedRoute from "./middleware/ProtectedRoute";

import "./App.css";
import AllLeads from "./pages/admin/AllLeads";
import SalesExecutives from "./pages/admin/SalesExecutive";
import CallHistory from "./pages/admin/CallHistory";
import SalesLayout from "./pages/sales_executive/SalesExceutivelayout";
import ExecutiveDashboard from "./pages/sales_executive/ExecutiveDashboard";
import MyLeads from "./pages/sales_executive/MyLeads";
import LeadDetails from "./pages/sales_executive/LeadDetails";
import MyFollowUps from "./pages/sales_executive/FollowUps";
import CallHistoryForExecutive from "./pages/sales_executive/CallHistoryForExecutive";
import FollowUpsContainer from "./pages/admin/FollowUpsContainer";

import UnassignedLeads from "./pages/admin/UnAssignedLeads";
import DashboardContainer from "./pages/admin/DashboardContainer";
import Reports from "./pages/admin/Reports";


function App() {
  return (
    
      <Routes>

        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public route */}
        <Route path="/login" element={<Login />} />


        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={["ADMIN"]} />}
        >
          <Route element={<AdminLayout />}>
            <Route
              path="dashboard"
              element={<DashboardContainer/>}
            />

            <Route path="leads/unassigned" element={<UnassignedLeads />} />
            <Route
      path="leads"
      element={<AllLeads/>}
    />
    <Route
      path="executives"
      element={<SalesExecutives/>}
    />
    <Route
      path="calls"
      element={<CallHistory/>}
    />
    <Route
      path="follow-ups"
      element={<FollowUpsContainer/>}
    />
    <Route
      path="reports"
      element={<Reports/>}
    />
          </Route>
        </Route>


        {/* Executive protected routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["SALES_EXECUTIVE"]} />
          }
        >
          <Route path="/executive" element={<SalesLayout/>}>
            <Route path="dashboard" element={<ExecutiveDashboard/>} />
            <Route path="leads" element={<MyLeads/>} />
            <Route path="leads/:id" element={<LeadDetails/>} />
            <Route path="follow-ups" element={<MyFollowUps/>} />
            <Route path="calls" element={<CallHistoryForExecutive/>} />
          </Route>
        </Route>

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
   
  );
}

export default App;
