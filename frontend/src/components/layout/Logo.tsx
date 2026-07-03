import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-16",
};

/** The PiByThree mark. A single shared component so every placement (sidebar,
 * login, footer, print) stays pixel-consistent and never gets stretched. */
export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <img
      src="/pibythree-logo.jpg"
      alt="PiByThree"
      className={cn("w-auto object-contain", SIZE_CLASSES[size], className)}
    />
  );
}
