import { redirect } from "next/navigation";

export default function Home() {
  // O middleware cuida de autenticação/gates; aqui só direcionamos.
  redirect("/dashboard");
}
