import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import DeviceCode from "./pages/DeviceCode.tsx";
import MenuDisplay from "./pages/MenuDisplay.tsx";
import Overview from "./pages/dashboard/Overview.tsx";
import Categories from "./pages/dashboard/Categories.tsx";
import Products from "./pages/dashboard/Products.tsx";
import Devices from "./pages/dashboard/Devices.tsx";
import Subscription from "./pages/dashboard/Subscription.tsx";
import Settings from "./pages/dashboard/Settings.tsx";
import Crops from "./pages/dashboard/Crops.tsx";
import Theme from "./pages/dashboard/Theme.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/display" element={<DeviceCode />} />
          <Route path="/menu" element={<MenuDisplay />} />
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/dashboard/categories" element={<Categories />} />
          <Route path="/dashboard/products" element={<Products />} />
          <Route path="/dashboard/crops" element={<Crops />} />
          <Route path="/dashboard/devices" element={<Devices />} />
          <Route path="/dashboard/subscription" element={<Subscription />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/theme" element={<Theme />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
