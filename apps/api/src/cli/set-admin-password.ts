// Fija/reinicia la contraseña de un administrador.
//   pnpm admin-passwd <email> <nueva-contraseña> [rol]
// rol: support | risk | finance | super_admin (por defecto super_admin)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

for (const candidate of [".env", "../../.env"]) {
  try {
    const content = readFileSync(resolve(process.cwd(), candidate), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
    break;
  } catch {
    /* siguiente */
  }
}

async function main() {
  const [email, password, role] = process.argv.slice(2);
  if (!email || !password) {
    console.log("Uso: pnpm admin-passwd <email> <contraseña> [support|risk|finance|super_admin]");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const finalRole = (role ?? "super_admin") as "support" | "risk" | "finance" | "super_admin";

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true, role: finalRole },
    create: { email, passwordHash, role: finalRole },
  });
  console.log(`✓ Contraseña actualizada para ${admin.email} (rol: ${admin.role})`);
  await prisma.$disconnect();
}

main();
