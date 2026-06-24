import { requireAccess } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { fetchBrandStory, fetchFAQs } from "./actions";
import BrandStoryPanel from "./BrandStoryPanel";

export const dynamic = "force-dynamic";

export default async function BrandStoryPage() {
  const user = await requireAccess(PERMISSIONS.BRAND_STORY);
  const canManageFaqs = user.role === "admin" || user.permissions.includes(PERMISSIONS.FAQS_MANAGE as Permission);

  let story = "";
  let faqs: Awaited<ReturnType<typeof fetchFAQs>> = [];
  try {
    [story, faqs] = await Promise.all([fetchBrandStory(), fetchFAQs()]);
  } catch { /* tables may not exist yet */ }

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Script</h1>
        <p className="text-sm leading-relaxed text-muted">
          Your personal script. FAQs are shared across the team.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <BrandStoryPanel
          initialStory={story}
          initialFaqs={faqs}
          userName={user.name}
          canManageFaqs={canManageFaqs}
        />
      </div>
    </div>
  );
}
