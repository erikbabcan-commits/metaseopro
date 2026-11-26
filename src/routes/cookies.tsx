import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { CookiesContent } from "@/components/legal/LegalContent";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies | SEO4WEB" },
      {
        name: "description",
        content:
          "Prehľad cookies a lokálneho úložiska, ktoré Seo4web používa, ich účel a platnosť.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalLayout title="Cookies">
      <CookiesContent />
    </LegalLayout>
  );
}
