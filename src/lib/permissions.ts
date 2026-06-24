/** Permission keys — safe to import in both server and client components. */
export const PERMISSIONS = {
  PROJECTS:    "projects",
  SHARE:       "share",
  MESSAGES:    "messages",
  STORAGE:     "storage",
  COMPRESS:    "compress",
  BRAND_STORY: "brand_story",
  TASKS:       "tasks",
  TASK_ASSIGN: "task_assign",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
