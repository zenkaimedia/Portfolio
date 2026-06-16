import type { FileNode, FolderNode, Project, TreeNode } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ensure unique slug within a list of siblings. */
function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base || "item";
  let i = 2;
  while (taken.has(slug)) {
    slug = `${base}-${i++}`;
  }
  taken.add(slug);
  return slug;
}

function isFolder(n: TreeNode): n is FolderNode {
  return n.kind === "folder";
}

/**
 * Build a Google-Drive-style tree from the flat projects table:
 *   category (folder) -> subcategory (folder, optional) -> project (file)
 * Projects with no subcategory become files directly under their category.
 */
export function buildTree(projects: Project[]): FolderNode {
  const root: FolderNode = {
    kind: "folder",
    name: "Our Work",
    slug: "",
    children: [],
  };

  const categoryMap = new Map<string, FolderNode>();
  const subMap = new Map<string, FolderNode>();

  const ensureCategory = (name: string): FolderNode => {
    const key = name;
    let folder = categoryMap.get(key);
    if (!folder) {
      folder = { kind: "folder", name, slug: "", children: [] };
      categoryMap.set(key, folder);
      root.children.push(folder);
    }
    return folder;
  };

  const ensureSub = (parent: FolderNode, name: string): FolderNode => {
    const key = `${parent.name}//${name}`;
    let folder = subMap.get(key);
    if (!folder) {
      folder = { kind: "folder", name, slug: "", children: [] };
      subMap.set(key, folder);
      parent.children.push(folder);
    }
    return folder;
  };

  for (const project of projects) {
    const category = ensureCategory(project.category);
    const fileNode: FileNode = {
      kind: "file",
      name: project.title,
      slug: "",
      project,
    };
    if (project.subcategory && project.subcategory.trim() !== "") {
      const sub = ensureSub(category, project.subcategory);
      sub.children.push(fileNode);
    } else {
      category.children.push(fileNode);
    }
  }

  // Assign slugs + sort (folders first, then files; alpha within each group).
  const finalize = (folder: FolderNode) => {
    folder.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const taken = new Set<string>();
    for (const child of folder.children) {
      child.slug = uniqueSlug(slugify(child.name), taken);
      if (isFolder(child)) finalize(child);
    }
  };
  finalize(root);

  return root;
}

export interface Resolution {
  /** Chain of folders matched along the path (excludes root). */
  chain: FolderNode[];
  /** The file at the end of the path, if any. */
  file: FileNode | null;
}

/** Walk the tree following a list of slugs. */
export function resolvePath(root: FolderNode, slugs: string[]): Resolution {
  const chain: FolderNode[] = [];
  let current: FolderNode = root;
  let file: FileNode | null = null;

  for (const slug of slugs) {
    const next = current.children.find((c) => c.slug === slug);
    if (!next) break;
    if (next.kind === "folder") {
      chain.push(next);
      current = next;
    } else {
      file = next;
      break;
    }
  }
  return { chain, file };
}

/** Columns to render: root contents, then each matched folder's contents. */
export function columnsFor(root: FolderNode, chain: FolderNode[]): TreeNode[][] {
  const cols: TreeNode[][] = [root.children];
  for (const folder of chain) {
    cols.push(folder.children);
  }
  return cols;
}

/** The active slug per column index (what is currently drilled into). */
export function activeSlugs(chain: FolderNode[], file: FileNode | null): string[] {
  const slugs = chain.map((f) => f.slug);
  if (file) slugs.push(file.slug);
  return slugs;
}

export interface FlatFile {
  file: FileNode;
  /** Full slug path from root to the file, e.g. ["ai", "ai-commercials", "realistic-mp4"]. */
  path: string[];
  /** Human-readable folder trail, e.g. ["AI", "AI Commercials"]. */
  trail: string[];
}

/** All files in the tree with their full slug paths — used for search + deep links. */
export function flattenFiles(root: FolderNode): FlatFile[] {
  const out: FlatFile[] = [];
  const walk = (node: FolderNode, path: string[], trail: string[]) => {
    for (const child of node.children) {
      if (child.kind === "folder") {
        walk(child, [...path, child.slug], [...trail, child.name]);
      } else {
        out.push({ file: child, path: [...path, child.slug], trail });
      }
    }
  };
  walk(root, [], []);
  return out;
}
