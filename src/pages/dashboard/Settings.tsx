import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useVenueData } from "@/hooks/useVenueData";
import { useUserProfile, notifyProfileUpdated } from "@/hooks/useUserProfile";
import { getCurrentUserId, syncVenueNameFromProfile } from "@/lib/venue-store";
import { updateUserProfile } from "@/services/auth/profile-supabase.service";
import { usesSupabaseAuth } from "@/config/env";
import { getErrorMessage } from "@/lib/errors";

const Settings = () => {
  const { profile, loading: profileLoading, refresh } = useUserProfile();
  const [venue, updateVenue, { loading: venueLoading }] = useVenueData();
  const [venueName, setVenueName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const supabaseLinked = usesSupabaseAuth();

  useEffect(() => {
    if (!profile) return;
    setEmail(profile.email);
    setFullName(profile.fullName ?? "");
    setVenueName(profile.venueName ?? venue.menuSettings.featuredTitle ?? "");
    setPhone(profile.phone ?? "");
  }, [profile, venue.menuSettings.featuredTitle]);

  const onSave = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    if (!venueName.trim()) {
      toast.error("اسم المنشأة مطلوب");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile(userId, {
        fullName: fullName.trim() || undefined,
        venueName: venueName.trim(),
        phone: phone.trim() || undefined,
      });

      updateVenue((prev) => syncVenueNameFromProfile(prev, updated.venueName));

      notifyProfileUpdated();
      window.dispatchEvent(new Event("meez:venue-updated"));
      toast.success(supabaseLinked ? "تم الحفظ في قاعدة البيانات" : "تم الحفظ محلياً");
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loading = profileLoading || venueLoading;

  return (
    <DashboardLayout
      title="الإعدادات"
      subtitle={
        supabaseLinked
          ? "معلومات حسابك ومنشأتك — مرتبطة بـ Supabase"
          : "معلومات المنشأة — وضع تجريبي محلي"
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-1">معلومات المنشأة والحساب</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {supabaseLinked
              ? "تُحفظ في جدول profiles وتُزامَن مع بيانات المنيو (venues)"
              : "تُحفظ في المتصفح فقط — فعّل Supabase للمزامنة السحابية"}
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">اسم المنشأة</Label>
                <Input
                  id="venue-name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="مثال: مقهى الواحة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-name">اسم المالك</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="h-12 rounded-xl bg-secondary/60"
                  dir="ltr"
                />
                <p className="text-[11px] text-muted-foreground">البريد مرتبط بحساب Supabase ولا يُغيَّر من هنا</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl text-right"
                  placeholder="+966 5xxxxxxxx"
                />
              </div>
              <Button variant="hero" onClick={() => void onSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          )}
        </div>

        <Link
          to="/dashboard/theme"
          className="bg-gradient-hero text-primary-foreground rounded-3xl p-6 flex flex-col justify-between hover:shadow-warm transition-shadow"
        >
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
