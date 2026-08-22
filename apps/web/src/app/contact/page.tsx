import { PublicInformationPage } from "@/components/public-information-page";
import { getStorefrontContent } from "@/lib/api";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const content = await getStorefrontContent();
  return (
    <PublicInformationPage eyebrow="Customer care" title="Contact Gemjar">
      <p>
        For product, order, trade or account help, email our commerce team. We
        aim to reply within two working days.
      </p>
      <p>
        <a
          className="font-semibold text-forest underline underline-offset-4"
          href={`mailto:${content.contactEmail}`}
        >
          {content.contactEmail}
        </a>
      </p>
    </PublicInformationPage>
  );
}
