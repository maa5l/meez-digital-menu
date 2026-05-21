export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  venueName: string | null;
  phone: string | null;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfileUpdate = {
  fullName?: string;
  venueName?: string;
  phone?: string;
};
