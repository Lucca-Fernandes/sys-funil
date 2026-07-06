// `key` é o valor persistido em Cliente.canais (String[]).
export interface Canal {
  key: string;
  label: string;
  cor: string;
  emoji: string;
}

export const CANAIS: Canal[] = [
  { key: "whatsapp", label: "WhatsApp", cor: "#25D366", emoji: "💬" },
  { key: "telefone", label: "Telefone", cor: "#2563eb", emoji: "📞" },
  { key: "email", label: "E-mail", cor: "#dc2626", emoji: "✉️" },
  { key: "video", label: "Vídeo", cor: "#f97316", emoji: "🎥" },
  { key: "linkedin", label: "LinkedIn", cor: "#0a66c2", emoji: "💼" },
  { key: "presencial", label: "Presencial", cor: "#16a34a", emoji: "🤝" },
  { key: "outro", label: "Outro", cor: "#7c2d12", emoji: "🔗" },
];

export const CANAL_KEYS = CANAIS.map((c) => c.key);

export const CONTATOS_MIN = 10;
export const DIVERSIDADE_MIN = 3;
export const CONTATOS_MAX_INPUT = 10;
