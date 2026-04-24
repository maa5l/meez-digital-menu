import { UtensilsCrossed } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-black text-2xl">قائمة</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-primary-foreground/70">
            <a href="#" className="hover:text-accent transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-accent transition-colors">الشروط</a>
            <a href="#" className="hover:text-accent transition-colors">تواصل معنا</a>
          </div>

          <div className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} قائمة. جميع الحقوق محفوظة.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;