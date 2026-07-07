// Fonte única de segmentos usada no select de cadastro de cliente.
export const SEGMENTOS = [
  "Agência",
  "Aluguel de Equipamentos",
  "Aluguel de Vestuário",
  "Artistas",
  "Assessoria e Cerimonial",
  "Banda ou Coral",
  "Bares e Operação de Bebidas",
  "Buffet",
  "Cabine de Fotos",
  "Catering Corporativo / A&B",
  "Celebrante",
  "Cenografia",
  "Centro de Convenções",
  "Confeitaria",
  "Decoração",
  "DJ",
  "Drinks e Coquetéis",
  "Energia e Geradores",
  "Espaço de Eventos",
  "Eventos Proprietários",
  "Fotografia e Filmagem",
  "Hotéis e Resorts",
  "Montagem de Estruturas",
  "Não Informado",
  "Outros",
  "Palestrante",
  "Personalizados e Convites",
  "Produtor de Eventos",
  "Produtor Musical",
  "Recreação e Entretenimento",
  "Segurança e Limpeza",
  "Som e Iluminação",
  "Teatros",
  "Tecnologia para Eventos",
  "Transporte e Logística",
] as const;

export type Segmento = (typeof SEGMENTOS)[number];

export const SEGMENTO_PADRAO: Segmento = "Não Informado";

export function isSegmentoValido(value: unknown): value is Segmento {
  return typeof value === "string" && (SEGMENTOS as readonly string[]).includes(value);
}
