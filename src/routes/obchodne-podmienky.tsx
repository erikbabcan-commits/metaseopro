import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { TermsContent } from "@/components/legal/LegalContent";

export const Route = createFileRoute("/obchodne-podmienky")({
  head: () => ({
    meta: [
      { title: "Obchodné podmienky | SEO4WEB" },
      {
        name: "description",
        content:
          "Obchodné podmienky služby Seo4web: predmet služby, platené plány, platby cez Stripe, zodpovednosť a odstúpenie od zmluvy.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalLayout title="Obchodné podmienky">
      <TermsContent />
    </LegalLayout>
  );
}
