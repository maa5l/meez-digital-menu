export type AdminRole = "super_admin" | "admin" | "support";

export type AdminProfile = {
  isAdmin: true;
  userId: string;
  role: AdminRole;
  email: string;
  fullName: string | null;
};

export type AdminDashboardStats = {
  totalCustomers: number;
  activeCustomers: number;
  trialCustomers: number;
  expiredCustomers: number;
  suspendedCustomers: number;
  totalDevices: number;
  newRegistrations7d: number;
  recentActivity: unknown[];
};

export type AdminCustomer = {
  ownerId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  venueName: string | null;
  registrationDate: string | null;
  lastActivityAt: string | null;
  lastLogin: string | null;
  subscriptionStatus: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  deviceLimit: number;
  manualActivation: boolean;
  notes: string | null;
  internalNotes: string | null;
  deviceCount: number;
  productCount: number;
};

export type AdminCustomerList = {
  total: number;
  customers: AdminCustomer[];
};

export type AdminSubscriptionAction =
  | "activate"
  | "suspend"
  | "disable"
  | "extend"
  | "reset_trial"
  | "set_device_limit";
