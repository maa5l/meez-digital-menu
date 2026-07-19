import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Brand";

const navLinks = [
  { href: "#features", label: "المميزات" },
  { href: "#how", label: "كيف يعمل" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <nav className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2 group text-primary">
          <Logo className="h-9 w-auto aspect-[1031/736] group-hover:scale-105 transition-transform" />
        </a>

        <div className="hidden md:flex items-center gap-8 font-medium text-foreground/80">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-accent transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">تسجيل الدخول</Button>
          </Link>
          <Link to="/auth">
            <Button variant="hero">ابدأ مجانًا</Button>
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card text-primary touch-manipulation"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-40 bg-black/40 md:hidden"
            aria-label="إغلاق القائمة"
            onClick={closeMenu}
          />
          <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background/95 backdrop-blur-xl md:hidden">
            <div className="container py-4">
              <div className="flex flex-col gap-1 font-medium text-foreground/90">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 hover:bg-secondary hover:text-accent transition-colors"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <Link to="/auth" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-center">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link to="/auth" onClick={closeMenu}>
                  <Button variant="hero" className="w-full justify-center">
                    ابدأ مجانًا
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;