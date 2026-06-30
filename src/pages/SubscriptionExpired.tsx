import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Brand";
import { SUPPORT } from "@/config/support";
import { signOut } from "@/services/auth/auth.service";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/app";

type Props = {
  /** رسالة إضافية اختيارية */
  message?: string;
};

/** صفحة انتهاء الاشتراك — تظهر عند انتهاء التجربة أو الاشتراك */
const SubscriptionExpired = ({ message }: Props) => {
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate(ROUTES.auth, { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-hero text-primary-foreground"
      dir="rtl"
    >
      <Logo className="h-12 w-auto mb-8 text-primary-foreground" />

      <h1 className="font-display font-black text-3xl md:text-4xl mb-4 text-center">
        انتهى الاشتراك
      </h1>

      <p className="text-primary-foreground/80 max-w-md text-center mb-8 leading-relaxed">
        {message ??
          "انتهت فترة التجربة أو الاشتراك. تواصل مع فريق ميز لتفعيل حسابك بعد إتمام الدفع."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          asChild
          size="lg"
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 ml-2" />
            {SUPPORT.whatsappLabel}
          </a>
        </Button>

        <Button asChild size="lg" variant="secondary" className="flex-1">
          <a href={SUPPORT.emailHref}>
            <Mail className="w-4 h-4 ml-2" />
            {SUPPORT.contactLabel}
          </a>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => void onSignOut()}
        className="mt-10 text-sm text-primary-foreground/60 hover:text-primary-foreground underline-offset-4 hover:underline"
      >
        تسجيل الخروج
      </button>
    </div>
  );
};

export default SubscriptionExpired;
