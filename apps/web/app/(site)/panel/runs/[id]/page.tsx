import { redirect } from "next/navigation";

// Compatibilidad: la vista de corrida ahora vive en /runs/[id]
export default async function OldRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/runs/${encodeURIComponent(id)}`);
}
