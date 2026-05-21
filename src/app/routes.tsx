import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/middleware/ProtectedRoute";
import { PublicOnlyRoute } from "@/middleware/PublicOnlyRoute";

const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const DeviceCode = lazy(() => import("@/pages/DeviceCode"));
const DevicePairing = lazy(() => import("@/pages/DevicePairing"));
const MenuDisplay = lazy(() => import("@/pages/MenuDisplay"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const Categories = lazy(() => import("@/pages/dashboard/Categories"));
const Products = lazy(() => import("@/pages/dashboard/Products"));
const Crops = lazy(() => import("@/pages/dashboard/Crops"));
const Devices = lazy(() => import("@/pages/dashboard/Devices"));
const LinkDevice = lazy(() => import("@/pages/dashboard/LinkDevice"));
const Theme = lazy(() => import("@/pages/dashboard/Theme"));
const Subscription = lazy(() => import("@/pages/dashboard/Subscription"));
const Settings = lazy(() => import("@/pages/dashboard/Settings"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/auth"
            element={
              <PublicOnlyRoute>
                <Auth />
              </PublicOnlyRoute>
            }
          />
          <Route path="/display" element={<DeviceCode />} />
          <Route path="/pair" element={<DevicePairing />} />
          <Route path="/menu" element={<MenuDisplay />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/crops"
            element={
              <ProtectedRoute>
                <Crops />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/devices"
            element={
              <ProtectedRoute>
                <Devices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/link-device"
            element={
              <ProtectedRoute>
                <LinkDevice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/theme"
            element={
              <ProtectedRoute>
                <Theme />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
