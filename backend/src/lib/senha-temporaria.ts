// Geração de senha temporária legível (sem caracteres ambíguos).
import { randomInt } from "crypto";

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Ex.: "mee-Xk7Pq2Rv". O closer é obrigado a trocá-la no 1º acesso. */
export function gerarSenhaTemporaria(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `mee-${s}`;
}
