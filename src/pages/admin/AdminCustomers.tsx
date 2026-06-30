import { useCallback, useEffect, useState } from "react";
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
import { fetchAdminCustomers, formatAdminRpcError } from "@/services/admin/admin.service";
import type { AdminCustomer } from "@/types/admin";
import { ROUTES } from "@/config/app";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const statusLabel: Record<string, string> = {
  trial: "تجربة",
  active: "نشط",
  expired: "منتهي",
  suspended: "معلّق",
  canceled: "ملغى",
};

type CustomerFilters = {
  search: string;
  status: string;
  page: number;
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState<string>("all");
  const [filters, setFilters] = useState<CustomerFilters>({ search: "", status: "all", page: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminCustomers(
        filters.search || undefined,
        filters.status === "all" ? undefined : filters.status,
        PAGE_SIZE,
        filters.page * PAGE_SIZE,
      );
      setCustomers(result.customers);
      setTotal(result.total);
    } catch (err) {
      const message = formatAdminRpcError(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = () => {
    setFilters({ search: draftSearch.trim(), status: draftStatus, page: 0 });
  };

  return (
    <AdminLayout
      title="إدارة العملاء"
      subtitle={`${total} عميل`}
      action={
        <Button onClick={() => void load()} variant="outline" aria-label="تحديث قائمة العملاء">
          تحديث
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="بحث بالاسم أو البريد أو المنشأة…"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          className="sm:max-w-xs"
          aria-label="بحث العملاء"
        />
        <Select
          value={draftStatus}
          onValueChange={(v) => {
            setDraftStatus(v);
            setFilters((prev) => ({ ...prev, status: v, page: 0 }));
          }}
        >
          <SelectTrigger className="sm:w-40" aria-label="تصفية حسب حالة الاشتراك">
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
        <Button onClick={applyFilters}>بحث</Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center" aria-busy="true" aria-live="polite">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" />
        </div>
      ) : error ? (
        <div className="py-12 text-center space-y-4" role="alert">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="جدول العملاء">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="text-right p-4 font-medium">العميل</th>
                  <th scope="col" className="text-right p-4 font-medium">المنشأة</th>
                  <th scope="col" className="text-right p-4 font-medium">الحالة</th>
                  <th scope="col" className="text-right p-4 font-medium">الأجهزة</th>
                  <th scope="col" className="text-right p-4 font-medium">المنتجات</th>
                  <th scope="col" className="text-right p-4 font-medium">التسجيل</th>
                  <th scope="col" className="p-4"><span className="sr-only">إجراءات</span></th>
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
                        <Link to={`${ROUTES.adminCustomers}/${c.ownerId}`}>تفاصيل</Link>
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
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4 p-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                صفحة {filters.page + 1} من {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 0}
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(0, prev.page - 1) }))}
                  aria-label="الصفحة السابقة"
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page + 1 >= totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  aria-label="الصفحة التالية"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomers;
