import { AuthScaffold, AuthForm } from "@/components/AuthForm";
export default function Signup() {
  return <AuthScaffold title="Create your account" subtitle="Your first estimate does not need to be accurate. That is the point."><AuthForm mode="signup" /></AuthScaffold>;
}
