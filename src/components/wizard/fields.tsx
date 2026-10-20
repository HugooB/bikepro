import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Labelled input with an optional hint and an inline error, used by every wizard step. */
export function WizardField({
  label,
  hint,
  error,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [error && `${props.id}-error`, hint && `${props.id}-hint`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <Input
        className="h-11 text-base"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${props.id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

/** One clear question per step; the heading takes focus when the step opens. */
export function StepHeading({
  title,
  intro,
  headingRef,
}: {
  title: string;
  intro?: string;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl leading-tight text-balance outline-none sm:text-3xl"
      >
        {title}
      </h1>
      {intro && <p className="text-muted-foreground">{intro}</p>}
    </div>
  );
}

/** Big tap-target choice chip, rendered as a radio. */
export function ChoiceChip({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        "has-focus-visible:ring-ring/50 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-medium transition-colors has-focus-visible:ring-3 " +
        (checked ? "border-brand bg-brand/5 text-brand" : "hover:bg-muted")
      }
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
