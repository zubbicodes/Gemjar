import { PasswordRecoveryForm } from "@/components/identity-forms";
import { Suspense } from "react";
export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <PasswordRecoveryForm />
    </Suspense>
  );
}
