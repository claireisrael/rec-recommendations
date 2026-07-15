export type AppRole = "superadmin" | "l1_reviewer" | "member" | "viewer";

export interface RoleUser {
  email: string;
  name: string;
  role: AppRole;
  userId?: string;
}
