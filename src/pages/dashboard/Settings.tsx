import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  return (
    <DashboardLayout
      title="الإعدادات"
      subtitle="معلومات المنشأة والإعدادات العامة"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-4">معلومات المنشأة</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المنشأة</Label>
              <Input defaultValue="مقهى الواحة" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" defaultValue="owner@waha.cafe" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input dir="ltr" defaultValue="+966 50 000 0000" className="h-12 rounded-xl text-right" />
            </div>
            <Button variant="hero">حفظ التغييرات</Button>
          </div>
        </div>

        <Link to="/dashboard/theme" className="bg-gradient-hero text-primary-foreground rounded-3xl p-6 flex flex-col justify-between hover:shadow-warm transition-shadow">
          <div>
            <Palette className="w-10 h-10 mb-4 text-accent" />
            <h3 className="font-display font-bold text-xl mb-1">إعدادات الثيم</h3>
            <p className="text-sm text-primary-foreground/70">قوالب المنيو والألوان والمعاينة المباشرة</p>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 font-bold text-accent">
            فتح صفحة الثيم <ArrowLeft className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default Settings;