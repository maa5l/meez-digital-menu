import { Navigate } from "react-router-dom";
import { ROUTES } from "@/config/app";
import { isAuthenticated } from "@/security/session";

type Props = {
  children: React.ReactNode;
};

/** يمنع المستخدم المسجّل من زيارة صفحة تسجيل الدخول */
export function PublicOnlyRoute({ children }: Props) {
  if (isAuthenticated()) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <>{children}</>;
}
