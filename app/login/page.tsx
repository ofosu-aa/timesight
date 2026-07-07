import { AuthScaffold, AuthForm } from "@/components/AuthForm";
export default function Login() {
  return <AuthScaffold title="Welcome back" subtitle="Your time data is waiting."><AuthForm mode="login" /></AuthScaffold>;
}
