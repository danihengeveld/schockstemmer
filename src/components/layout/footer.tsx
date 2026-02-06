import Link from "next/link";
import { Badge } from "../ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github01Icon } from "@hugeicons/core-free-icons";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center md:items-start gap-1">
          <p className="font-semibold text-foreground">© 2026 SchockStemmer</p>
          <p>Built with ❤️ by <Link href="https://dani.hengeveld.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Dani Hengeveld</Link></p>
        </div>

        <div className="flex items-center gap-6">
          <Link href="https://github.com/danihengeveld/schockstemmer" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-all flex items-center gap-2">
            <HugeiconsIcon icon={Github01Icon} strokeWidth={2} className="w-5 h-5" />
            <span>Repository</span>
          </Link>
          <Badge>v1.2.0</Badge>
        </div>
      </div>
    </footer>
  )
}
