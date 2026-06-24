export type Priority = "urgent" | "high" | "medium" | "low";
export type Category = "design" | "development" | "marketing" | "general";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface AdminTask {
  id: string;
  user_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  progress: number;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; name: string; email: string } | null;
}
