"use client";

import { useState } from "react";
import Link from "next/link";
import { updateUser, deleteUser } from "@/app/actions/users";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  predictions: number;
  topScorer: string;
  bestKeeper: string;
};

export function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-44 flex-1">
          <Link
            href={`/jugador/${user.id}`}
            className="font-semibold hover:text-[var(--grass)] hover:underline"
          >
            {user.displayName}
          </Link>
          {user.isAdmin && <span className="chip chip-gold ml-2">admin</span>}
          {isSelf && <span className="ml-2 text-xs text-[var(--grass)]">(tú)</span>}
          <div className="text-xs text-[var(--muted)]">
            @{user.username} · {user.predictions} pronósticos · desde{" "}
            {new Date(user.createdAt).toLocaleDateString("es", {
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={() => setEditing(!editing)}>
            {editing ? "Cancelar" : "Editar"}
          </button>
          {!isSelf &&
            (confirmDelete ? (
              <form action={deleteUser} className="flex items-center gap-2">
                <input type="hidden" name="id" value={user.id} />
                <span className="text-xs text-[var(--danger)]">¿Seguro?</span>
                <button className="btn !bg-[var(--danger)] !px-3 !py-1.5 !text-[11px] !text-white">
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !px-3 !py-1.5 !text-[11px]"
                  onClick={() => setConfirmDelete(false)}
                >
                  No
                </button>
              </form>
            ) : (
              <button
                className="btn btn-ghost !px-3 !py-1.5 !text-[11px] !text-[var(--danger)]"
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar
              </button>
            ))}
        </div>
      </div>

      {editing && (
        <form
          action={async (fd) => {
            await updateUser(fd);
            setEditing(false);
          }}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-4"
        >
          <input type="hidden" name="id" value={user.id} />
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Nombre</label>
            <input name="displayName" defaultValue={user.displayName} className="input !w-44" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Usuario</label>
            <input name="username" defaultValue={user.username} className="input !w-36" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">
              Nueva contraseña (vacío = no cambiar)
            </label>
            <input name="newPassword" type="text" className="input !w-44" placeholder="••••" />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              name="isAdmin"
              defaultChecked={user.isAdmin}
              disabled={isSelf}
              className="size-4 accent-[var(--grass)]"
            />
            Admin
          </label>
          <button className="btn !px-4 !py-2 !text-xs">Guardar</button>
        </form>
      )}
    </div>
  );
}
