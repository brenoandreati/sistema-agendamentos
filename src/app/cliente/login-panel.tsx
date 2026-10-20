"use client";

import { useRouter } from "next/navigation";
import { CustomerAuthForms } from "@/components/customer-auth";

export function LoginPanel() {
  const router = useRouter();
  return <CustomerAuthForms onDone={() => router.refresh()} />;
}
