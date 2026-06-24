export type Priority = "high" | "medium" | "low";
export type Category = "design" | "development" | "marketing";
export type TaskStatus = "todo" | "inprogress" | "done";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  avatar_initials: string;
  created_at: string;
}

export interface TaskCard {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  progress: number;
  created_at: string;
  profile?: Profile | null; // joined assigned profile
}

export interface Column {
  id: TaskStatus;
  title: string;
  tasks: TaskCard[];
}
