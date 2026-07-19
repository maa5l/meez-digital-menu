import type { Fault, FaultCode } from "@/kiosk/types";
import { classifyUserFacingError } from "@/lib/user-facing-errors";

export function faultFromCode(code: FaultCode, detail?: string): Fault {
  const classified = classifyUserFacingError(detail ?? "", { faultCode: code });
  return {
    code,
    title: classified.title,
    message: classified.message,
    hint: classified.hint,
    autoRetry: classified.autoRetry,
    detail,
  };
}
