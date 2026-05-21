import Image from "next/image";

import { cn } from "@/lib/utils";

export type TorneaLogoVariant = "mark" | "nav" | "banner";

type TorneaLogoProps = {
  variant?: TorneaLogoVariant;
  className?: string;
  priority?: boolean;
};

/** Marca compacta (nav) o banner con wordmark + tagline (footer, login). */
export function TorneaLogo({
  variant = "mark",
  className,
  priority = false,
}: TorneaLogoProps) {
  if (variant === "nav") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <Image
          src="/images/tornea_logo_transparent.png"
          alt=""
          aria-hidden
          width={1254}
          height={1254}
          priority={priority}
          sizes="44px"
          className="size-10 shrink-0 object-contain sm:size-11"
        />
        <span className="text-lg font-bold tracking-tight italic">tornea</span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <Image
        src="/images/tornea_banner_transparent.png"
        alt="Tornea — Organiza. Compite. Conecta."
        width={2023}
        height={777}
        priority={priority}
        sizes="(max-width: 640px) 240px, 320px"
        className={cn(
          "h-auto w-full max-w-[min(100%,280px)] object-contain drop-shadow-[0_12px_36px_rgba(125,255,106,0.12)] sm:max-w-[320px]",
          className,
        )}
      />
    );
  }

  return (
    <Image
      src="/images/tornea_logo_transparent.png"
      alt=""
      aria-hidden
      width={1254}
      height={1254}
      priority={priority}
      sizes="40px"
      className={cn("size-9 shrink-0 object-contain sm:size-10", className)}
    />
  );
}
