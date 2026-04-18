import React from "react";
import { Navigate } from "react-router-dom";

/**
 * PrivateRoute - guards a route by checking localStorage for a logged-in user.
 * @param {string} allowedRole - "admin" | "employee" | null (null = any logged-in user)
 * @param {string} redirectTo  - where to send unauthorized users (default: "/login")
 */
const PrivateRoute = ({ children, allowedRole, redirectTo = "/login" }) => {
  const storedUser = localStorage.getItem("user");

  // Not logged in at all — send to login
  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (allowedRole) {
    const userRole = (user.role || "").toLowerCase();
    const required  = allowedRole.toLowerCase();

    // "admin" role can only access admin routes
    // all other roles are treated as "employee"
    const isAdmin    = userRole === "admin";
    const wantsAdmin = required === "admin";

    if (wantsAdmin && !isAdmin) {
      // Employee trying to reach admin — redirect to their dashboard
      return <Navigate to="/dashboardemployee" replace />;
    }

    if (!wantsAdmin && isAdmin) {
      // Admin trying to reach employee — redirect to admin dashboard
      return <Navigate to="/dashboardadmin" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
