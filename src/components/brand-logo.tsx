import Image from "next/image";

export const BRAND_LOGO_SRC = "/law-office-saudi-logo-removebg-preview.png";

interface BrandLogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  alt = "Law office logo",
  className = "h-10 w-10",
  imageClassName = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      <Image
        src={BRAND_LOGO_SRC}
        alt={alt}
        width={500}
        height={500}
        priority={priority}
        className={`h-full w-full object-contain ${imageClassName}`}
      />
    </span>
  );
}
