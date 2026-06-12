import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { register } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function RegistroPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <AuthForm mode="registro" action={register} />;
}
