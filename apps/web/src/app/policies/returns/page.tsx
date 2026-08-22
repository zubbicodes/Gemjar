import { PublicInformationPage } from "@/components/public-information-page";
import { getStorefrontContent } from "@/lib/api";

export const metadata = { title: "Returns" };

export default async function ReturnsPolicyPage() {
  const content = await getStorefrontContent();
  return (
    <PublicInformationPage eyebrow="Customer care" title="Returns">
      <p>{content.returnsPolicy}</p>
    </PublicInformationPage>
  );
}
