import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserRow } from "@/components/UserRow";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const users = await prisma.user.findMany({
    include: { _count: { select: { predictions: true } }, awardPrediction: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="rise">
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-[var(--cream)]">
        ← Admin
      </Link>
      <h1 className="font-display mt-2 mb-1 text-4xl text-[var(--gold)]">USUARIOS</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {users.length} registrados. Las contraseñas se guardan cifradas y no se pueden
        ver — pero puedes asignar una nueva. Eliminar un usuario borra también sus
        pronósticos.
      </p>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={{
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              isAdmin: u.isAdmin,
              createdAt: u.createdAt.toISOString(),
              predictions: u._count.predictions,
              topScorer: u.awardPrediction?.topScorer ?? "",
              bestKeeper: u.awardPrediction?.bestKeeper ?? "",
            }}
            isSelf={u.id === user.id}
          />
        ))}
      </div>
    </div>
  );
}
