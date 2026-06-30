import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAdminDashboardStats,
} from "@/services/admin/admin.service";
import type { AdminDashboardStats } from "@/types/admin";
import { Users, MonitorSmartphone, UserPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const StatCard = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-display font-black">{value}</div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAdminDashboardStats()
      .then(setStats)
      .catch(() => toast.error("تعذّر تحميل الإحصائيات"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="لوحة الإدارة" subtitle="نظرة عامة على المنصة">
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard title="إجمالي العملاء" value={stats.totalCustomers} icon={Users} />
            <StatCard title="اشتراكات نشطة" value={stats.activeCustomers} icon={Users} />
            <StatCard title="فترة تجربة" value={stats.trialCustomers} icon={UserPlus} />
            <StatCard title="منتهية" value={stats.expiredCustomers} icon={AlertTriangle} />
            <StatCard title="معلّقة" value={stats.suspendedCustomers} icon={AlertTriangle} />
            <StatCard title="الأجهزة النشطة" value={stats.totalDevices} icon={MonitorSmartphone} />
            <StatCard title="تسجيلات (7 أيام)" value={stats.newRegistrations7d} icon={UserPlus} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>آخر النشاطات</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا يوجد نشاط حديث.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {stats.recentActivity.map((item, i) => {
                    const row = item as Record<string, unknown>;
                    return (
                      <li key={i} className="flex justify-between gap-4 border-b border-border/50 pb-2">
                        <span>{String(row.action ?? "—")}</span>
                        <span className="text-muted-foreground shrink-0">
                          {row.created_at
                            ? new Date(String(row.created_at)).toLocaleString("ar-SA")
                            : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboard;
