import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { useMe } from "../../hooks/useMe";
import { roleAreaLabel, roleHome } from "../../lib/roles";
import { toast } from "../../lib/toast";
import type { Role } from "../../types/api";

interface RequireRoleProps {
  role: Role;
  children: React.ReactNode;
}

/** Route guard per spec 5.2. The backend enforces every permission; this only steers navigation. */
export function RequireRole({ role, children }: RequireRoleProps) {
  const { data: me, isLoading } = useMe();
  const location = useLocation();
  const toldWrongArea = useRef(false);

  useEffect(() => {
    if (me && me.user.role !== role && !toldWrongArea.current) {
      toldWrongArea.current = true;
      toast.info(`That area is for ${roleAreaLabel(role)}.`);
    }
  }, [me, role]);

  if (isLoading) return null;

  if (!me) {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (me.user.role !== role) {
    return <Navigate to={roleHome(me.user.role)} replace />;
  }

  return children;
}
