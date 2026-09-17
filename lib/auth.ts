import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Role, SessionUser } from "./types";

const SECRET = process.env.AUTH_SECRET || "vexim-global-fda-gacc-secret-2026";
const COOKIE = "vexim_session";

function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compareSync(plain, hash);
}

export function createSessionToken(user: SessionUser) {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data?.id || !data?.role || data.exp < Date.now()) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      team_id: data.team_id ?? null,
    };
  } catch {
    return null;
  }
}

export function getSession(): SessionUser | null {
  const token = cookies().get(COOKIE)?.value;
  return readSessionToken(token);
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export function clearCookie() {
  return {
    name: COOKIE,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}

export function requireUser() {
  const user = getSession();
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    throw err;
  }
  return user;
}

export function requireAdmin() {
  const user = requireUser();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function requireRoles(...roles: Role[]) {
  const user = requireUser();
  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
