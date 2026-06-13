"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Solo admin");
  return user;
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const newPassword = String(formData.get("newPassword") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";

  if (!displayName || !/^[a-z0-9_]{3,20}$/.test(username)) return;

  const taken = await prisma.user.findFirst({
    where: { username, NOT: { id } },
  });
  if (taken) return;

  await prisma.user.update({
    where: { id },
    data: {
      displayName,
      username,
      isAdmin,
      ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {}),
    },
  });
  revalidatePath("/admin/usuarios");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return; // no puedes borrarte a ti mismo
  // sus predicciones y premios caen en cascada
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
  revalidatePath("/tabla");
}
