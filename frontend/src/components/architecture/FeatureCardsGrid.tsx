import { COMPONENTS } from "@/data/architecture";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function FeatureCardsGrid({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {COMPONENTS.map((component) => {
        const isSelected = selectedId === component.id;
        return (
          <Card
            key={component.id}
            interactive
            className={cn("cursor-pointer p-4", isSelected && "border-primary ring-1 ring-primary/30")}
            onClick={() => onSelect(component.id)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <component.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-slate-800">{component.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{component.tagline}</p>
          </Card>
        );
      })}
    </div>
  );
}
