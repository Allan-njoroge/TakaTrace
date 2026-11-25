import { Navigate } from "react-router";
import { useMe } from "../../hooks/useMe";
import { roleHome } from "../../lib/roles";

/** /app redirects to the signed-in user's role home (spec 5.1). */
export default function AppIndexPage() {
  const { data: me, isLoading } = useMe();

  if (isLoading) return null;
  if (!me) return <Navigate to="/sign-in?next=/app" replace />;
  return <Navigate to={roleHome(me.user.role)} replace />;
}
