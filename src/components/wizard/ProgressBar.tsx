import { useT } from "@/i18n/client";

export function ProgressBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground flex justify-between text-xs font-medium">
        <span aria-live="polite">
          {t("wizard.step", { current, total })}
          <span className="sr-only">: {label}</span>
        </span>
        <span aria-hidden>{label}</span>
      </p>
      <div
        className="bg-muted h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={t("wizard.progress")}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div
          className="bg-brand h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
