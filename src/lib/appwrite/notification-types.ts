export type NotificationType =
  | "l1_review_requested"
  | "superadmin_review_requested"
  | "action_reviewed"
  | "action_published"
  | "changes_requested"
  | "responsibility_assigned";

export interface AppNotification {
  $id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  recommendationId?: string;
  actionId?: string;
  read: boolean;
  $createdAt?: string;
}
