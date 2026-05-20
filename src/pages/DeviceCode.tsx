import { Navigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/config/app";

/** إعادة توجيه المسار القديم /display إلى /pair */
const DeviceCode = () => {
  const [params] = useSearchParams();
  const code = params.get("code");
  const target = code ? `${ROUTES.pair}?code=${encodeURIComponent(code)}` : ROUTES.pair;
  return <Navigate to={target} replace />;
};

export default DeviceCode;
