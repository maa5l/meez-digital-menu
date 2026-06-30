import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminCustomers } from "@/services/admin/admin.service";
import type { AdminCustomer } from "@/types/admin";
import { ROUTES } from "@/config/app";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  trial: "تجربة",
  active: "نشط",
  expired: "منتهي",
  suspended: "معلّق",
  canceled: "ملغى",
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchAdminCustomers(
        search || undefined,
        status === "all" ? undefined : status,
      );
      setCustomers(result.customers);
      setTotal(result.total);
    } catch {
      toast.error("تعذّر تحميل العملاء");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminLayout
      title="إدارة العملاء"
      subtitle={`${total} عميل`}
      action={
        <Button onClick={() => void load()} variant="outline">
          تحديث
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="بحث بالاسم أو البريد أو المنشأة…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="trial">تجربة</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="suspended">معلّق</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => void load()}>بحث</Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-right p-4 font-medium">العميل</th>
                  <th className="text-right p-4 font-medium">المنشأة</th>
                  <th className="text-right p-4 font-medium">الحالة</th>
                  <th className="text-right p-4 font-medium">الأجهزة</th>
                  <th className="text-right p-4 font-medium">المنتجات</th>
                  <th className="text-right p-4 font-medium">التسجيل</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.ownerId} className="border-t border-border/60 hover:bg-secondary/30">
                    <td className="p-4">
                      <div className="font-medium">{c.fullName || "—"}</div>
                      <div className="text-muted-foreground text-xs" dir="ltr">
                        {c.email}
                      </div>
                    </td>
                    <td className="p-4">{c.venueName || "—"}</td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-secondary text-xs">
                        {statusLabel[c.subscriptionStatus] ?? c.subscriptionStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.deviceCount}/{c.deviceLimit}
                    </td>
                    <td className="p-4">{c.productCount}</td>
                    <td className="p-4 text-muted-foreground">
                      {c.registrationDate
                        ? new Date(c.registrationDate).toLocaleDateString("ar-SA")
                        : "—"}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/customers/${c.ownerId}`}>تفاصيل</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">لا توجد نتائج.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomers;
