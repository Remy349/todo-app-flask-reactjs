import { Role } from "@/types/types";

export const isAdminRole = (role: Role | null) =>
  role === "admin" || role === "admin_viewer" || role === "admin_manager";

export const canManage = (role: Role | null) =>
  role === "admin" || role === "admin_manager";

export const roleLabel = (role: Role) => {
  const labels: Record<Role, string> = {
    user: "User",
    admin: "Manager Admin",
    admin_viewer: "Viewer Admin",
    admin_manager: "Manager Admin",
  };

  return labels[role];
};
