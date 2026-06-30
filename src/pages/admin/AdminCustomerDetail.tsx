import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminUpdateSubscription,
  canAdminMutate,
  fetchAdminCustomer,
} from "@/services/admin/admin.service";
import type { AdminCustomer, AdminSubscriptionAction } from "@/types/admin";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { SUBSCRIPTION } from "@/config/subscription";
import { ROUTES } from "@/config/app";
import { toast } from "sonner";

const AdminCustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAdminProfile();
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceLimit, setDeviceLimit] = useState("1");
  const [subscriptionEnd, setSubscriptionEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [acting, setActing] = useState(false);

  const canMutate = profile ? canAdminMutate(profile.role) : false;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchAdminCustomer(id);
      if (!data) {
        toast.error("العميل غير موجود");
        navigate(ROUTES.adminCustomers);
        return;
      }
      setCustomer(data.customer);
      setHistory(data.history);
      setDeviceLimit(String(data.customer.deviceLimit || 1));
      setNotes(data.customer.notes ?? "");
      setInternalNotes(data.customer.internalNotes ?? "");
      if (data.customer.subscriptionEndsAt) {
        setSubscriptionEnd(data.customer.subscriptionEndsAt.slice(0, 10));
      }
    } catch {
      toast.error("تعذّر تحميل بيانات العميل");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: AdminSubscriptionAction) => {
    if (!id || !canMutate) return;
    setActing(true);
    try {
      const ok = await adminUpdateSubscription(id, action, {
        deviceLimit: Number(deviceLimit) || 1,
        subscriptionEndsAt: subscriptionEnd
          ? new Date(subscriptionEnd).toISOString()
          : undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
      });
      if (ok) {
        toast.success("تم تحديث الاشتراك");
        await load();
      } else {
        toast.error("فشل التحديث");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setActing(false);
    }
  };

  if (loading || !customer) {
    return (
      <AdminLayout title="تفاصيل العميل">
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={customer.venueName || customer.fullName || customer.email}
      subtitle={customer.email}
      action={
        <Button variant="outline" onClick={() => navigate(ROUTES.adminCustomers)}>
          رجوع
        </Button>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">الاسم</div>
              <div className="font-medium">{customer.fullName || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">الجوال</div>
              <div className="font-medium" dir="ltr">
                {customer.phone || "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">تاريخ التسجيل</div>
              <div>
                {customer.registrationDate
                  ? new Date(customer.registrationDate).toLocaleString("ar-SA")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">آخر دخول</div>
              <div>
                {customer.lastLogin
                  ? new Date(customer.lastLogin).toLocaleString("ar-SA")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">بداية التجربة</div>
              <div>
                {customer.trialStartedAt
                  ? new Date(customer.trialStartedAt).toLocaleDateString("ar-SA")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">نهاية التجربة</div>
              <div>
                {customer.trialEndsAt
                  ? new Date(customer.trialEndsAt).toLocaleDateString("ar-SA")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">نهاية الاشتراك</div>
              <div>
                {customer.subscriptionEndsAt
                  ? new Date(customer.subscriptionEndsAt).toLocaleDateString("ar-SA")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">الأجهزة / المنتجات</div>
              <div>
                {customer.deviceCount} جهاز · {customer.productCount} منتج
              </div>
            </div>
          </CardContent>
        </Card>

        {canMutate && (
          <Card>
            <CardHeader>
              <CardTitle>إجراءات الإدارة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deviceLimit">حد الأجهزة</Label>
                <Input
                  id="deviceLimit"
                  type="number"
                  min={SUBSCRIPTION.minDeviceLimit}
                  max={SUBSCRIPTION.maxDeviceLimit}
                  value={deviceLimit}
                  onChange={(e) => setDeviceLimit(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="subscriptionEnd">تاريخ انتهاء الاشتراك</Label>
                <Input
                  id="subscriptionEnd"
                  type="date"
                  value={subscriptionEnd}
                  onChange={(e) => setSubscriptionEnd(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات للعميل</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="internalNotes">ملاحظات داخلية</Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={acting} onClick={() => void runAction("activate")}>
                  تفعيل
                </Button>
                <Button disabled={acting} variant="secondary" onClick={() => void runAction("extend")}>
                  تمديد
                </Button>
                <Button disabled={acting} variant="outline" onClick={() => void runAction("reset_trial")}>
                  إعادة تجربة
                </Button>
                <Button
                  disabled={acting}
                  variant="outline"
                  onClick={() => void runAction("set_device_limit")}
                >
                  تحديث الحد
                </Button>
                <Button disabled={acting} variant="destructive" onClick={() => void runAction("suspend")}>
                  تعليق
                </Button>
                <Button disabled={acting} variant="destructive" onClick={() => void runAction("disable")}>
                  تعطيل
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>سجل التغييرات</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">لا يوجد سجل.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="border-b border-border/50 pb-2">
                  <span className="font-medium">{String(h.change_source ?? "")}</span>
                  {" — "}
                  {String(h.previous_status ?? "?")} → {String(h.new_status ?? "?")}
                  {h.created_at ? (
                    <span className="text-muted-foreground mr-2">
                      ({new Date(String(h.created_at)).toLocaleString("ar-SA")})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCustomerDetail;
