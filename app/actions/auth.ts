"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword } from "@/lib/auth";

export async function register(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "El usuario debe tener 3-20 letras, números o _" };
  }
  if (!displayName) return { error: "Pon tu nombre para el ranking" };
  if (password.length < 4) return { error: "La contraseña necesita al menos 4 caracteres" };

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "Ese usuario ya existe" };

  const user = await prisma.user.create({
    data: { username, displayName, passwordHash: hashPassword(password) },
  });
  await createSession(user.id);
  redirect("/");
}

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: "Usuario o contraseña incorrectos" };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
