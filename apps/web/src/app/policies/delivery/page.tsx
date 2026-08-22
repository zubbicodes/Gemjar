import { PublicInformationPage } from "@/components/public-information-page";
import { getStorefrontContent } from "@/lib/api";

export const metadata = { title: "Delivery" };

export default async function DeliveryPolicyPage() {
  const content = await getStorefrontContent();
  return (
    <PublicInformationPage eyebrow="Customer care" title="Delivery">
      <p>{content.deliveryPolicy}</p>
    </PublicInformationPage>
  );
}
