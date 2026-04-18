import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardHome from "../components/dashboard/DashboardHome";
import LoginPage from "../pages/LoginPage";
import RegistrationPage from "../pages/RegistrationPage";
import VerifyOTP from "../pages/VerifyOTP";
import Layout from "../components/layout/Layout";
import DashboardAdmin from "../components/dashboard/dashboardpages/DashboardAdmin";
import DashboardEmployee from "../components/dashboard/dashboardpages/DashboardEmployee";
import PrivateRoute from "./PrivateRoute";

// Smart redirect: send logged-in users to the right dashboard based on their role
const DashboardRedirect = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(storedUser);
    if ((user.role || "").toLowerCase() === "admin") {
      return <Navigate to="/dashboardadmin" replace />;
    }
    return <Navigate to="/dashboardemployee" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

export const route = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <DashboardHome />,
        children: [
          {
            // Smart redirect: / -> correct dashboard by role, or login
            index: true,
            element: <DashboardRedirect />,
          },
          {
            // Smart redirect: /dashboard → correct dashboard by role
            path: "/dashboard",
            element: <DashboardRedirect />,
          },
          {
            // Admin-only route
            path: "/dashboardadmin",
            element: (
              <PrivateRoute allowedRole="admin">
                <DashboardAdmin />
              </PrivateRoute>
            ),
          },
          {
            // Employee-only route (any role that is NOT admin)
            path: "/dashboardemployee",
            element: (
              <PrivateRoute allowedRole="employee">
                <DashboardEmployee />
              </PrivateRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegistrationPage />,
  },
  {
    path: "/verify-otp",
    element: <VerifyOTP />,
  },
]);