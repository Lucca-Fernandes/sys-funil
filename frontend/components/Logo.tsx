import Image from "next/image";

export default function Logo({
  size = 32,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  const inner = Math.round(size * 0.72);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className="relative inline-flex items-center justify-center rounded-[22%] bg-brand-gradient shadow-brand"
        style={{ width: size, height: size }}
      >
        <Image
          src="/capelo.png"
          alt="meeventos"
          width={768}
          height={601}
          // capelo laranja → silhueta branca dentro da box laranja
          style={{ width: inner, height: "auto", filter: "brightness(0) invert(1)" }}
          priority
        />
      </span>
      {withWordmark && (
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">
          mee<span className="text-gradient-brand">ventos</span>
        </span>
      )}
    </span>
  );
}
