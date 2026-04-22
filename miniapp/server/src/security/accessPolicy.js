export const getUserAccess = ({ userId, allowedUserIds, adminUserIds }) => {
  const id = String(userId || "");
  if (!id) {
    return { allowed: false, role: "none", permissions: { canApprove: false } };
  }

  const hasAllowlist = allowedUserIds.size > 0;
  if (hasAllowlist && !allowedUserIds.has(id)) {
    return {
      allowed: false,
      role: "none",
      permissions: { canApprove: false }
    };
  }

  const isAdmin = adminUserIds.has(id) || (!adminUserIds.size && allowedUserIds.has(id));
  return {
    allowed: true,
    role: isAdmin ? "admin" : "viewer",
    permissions: {
      canApprove: isAdmin
    }
  };
};

