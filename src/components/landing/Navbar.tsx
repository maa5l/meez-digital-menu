import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Brand";

const Navbar = () => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <nav className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2 group text-primary">
          <Logo className="h-9 w-auto aspect-[1031/736] group-hover:scale-105 transition-transform" />
        </a>

        <div className="hidden md:flex items-center gap-8 font-medium text-foreground/80">
          <a href="#features" className="hover:text-accent transition-colors">المميزات</a>
          <a href="#how" className="hover:text-accent transition-colors">كيف يعمل</a>
          <a href="#pricing" className="hover:text-accent transition-colors">الأسعار</a>
          <a href="#faq" className="hover:text-accent transition-colors">الأسئلة</a>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" className="hidden sm:inline-flex">تسجيل الدخول</Button></Link>
          <Link to="/auth"><Button variant="hero">ابدأ مجانًا</Button></Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;