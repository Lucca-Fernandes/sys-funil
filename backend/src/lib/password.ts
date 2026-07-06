// Hash de senhas com bcrypt (bcryptjs — sem dependência nativa).
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Regras mínimas de senha na troca. */
export function validarNovaSenha(senha: string): string | null {
  if (typeof senha !== "string" || senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (senha.length > 200) {
    return "A senha é muito longa.";
  }
  return null;
}
