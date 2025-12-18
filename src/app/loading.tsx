import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading SchockStemmer...</p>
      </div>
    </div>
  );
}
