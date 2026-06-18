export type ProjectType = "image" | "video" | "website" | "pdf";

export interface Project {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  type: ProjectType;
  media: string;
  description: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  parent_id: string | null;
}

export type FolderNode = {
  kind: "folder";
  name: string;
  slug: string;
  children: TreeNode[];
};

export type FileNode = {
  kind: "file";
  name: string;
  slug: string;
  project: Project;
};

export type TreeNode = FolderNode | FileNode;
