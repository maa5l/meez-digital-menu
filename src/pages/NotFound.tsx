import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/config/app";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn("route.not_found", { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted" dir="rtl">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">الصفحة غير موجودة</p>
        <Link to={ROUTES.home} className="text-primary underline hover:text-primary/90">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
