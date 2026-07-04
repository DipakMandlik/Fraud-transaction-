import * as RadixTabs from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn("inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 ease-premium",
        "data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm",
        "hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return <RadixTabs.Content className={cn("mt-4 animate-rise focus:outline-none", className)} {...props} />;
}
