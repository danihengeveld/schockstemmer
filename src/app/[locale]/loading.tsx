"use client"

import { useTranslations } from "next-intl"
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function Loading() {
  const t = useTranslations("Loading")

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{t("text")}</p>
      </div>
    </div>
  );
}
