import { Suspense } from "react";
import { EmailVerificationForm } from "@/components/identity-forms";
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <EmailVerificationForm />
    </Suspense>
  );
}
