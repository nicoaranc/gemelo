import { redirect } from "next/navigation";

// La galería de grabaciones vive en /ataca
export default function ReplayIndex() {
  redirect("/ataca");
}
