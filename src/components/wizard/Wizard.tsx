"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createBikeFromWizard } from "@/actions/bikes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  emptyDraft,
  partChoicesFor,
  validateStep,
  wizardSteps,
  type WizardDraft,
  type WizardStep,
} from "@/lib/wizard-schema";
import { useT, useUnits } from "@/i18n/client";
import { ProgressBar } from "./ProgressBar";
import {
  StepBasics,
  StepParts,
  StepPurchase,
  StepReview,
  StepStrava,
  type StepProps,
  type WizardStrava,
} from "./steps";
import {
  clearSavedWizard,
  loadSavedWizard,
  saveWizard,
  stepIndex,
  wizardReducer,
} from "./wizard-state";

export function Wizard({
  today,
  cancelHref,
  strava,
  prefill,
}: {
  today: string;
  cancelHref: string | null;
  strava: WizardStrava;
  /** A Strava bike to start from (Settings → "Add to BikePro"); replaces any saved draft. */
  prefill?: Partial<WizardDraft>;
}) {
  const router = useRouter();
  const t = useT();
  const { unit } = useUnits();
  const [state, dispatch] = useReducer(wizardReducer, undefined, () => {
    const draft = { ...emptyDraft(today, unit), ...prefill };
    return {
      step: "basics" as WizardStep,
      draft: { ...draft, parts: partChoicesFor(draft.type, draft.brakeType, unit) },
      errors: {},
    };
  });
  const [restored, setRestored] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);

  // Pick up a draft from earlier in this browser tab (refresh, or coming back from Strava).
  useEffect(() => {
    const saved = prefill ? null : loadSavedWizard(unit);
    if (saved) {
      // The Strava bike may have been linked elsewhere since the draft was saved.
      const linkable = strava.bikes.some((b) => b.id === saved.draft.stravaGearId);
      if (!linkable) saved.draft.stravaGearId = "";
      dispatch({ type: "restore", state: saved });
    }
    // sessionStorage only exists in the browser, so this has to wait until after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestored(true);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restored && !created) saveWizard(state);
  }, [state, restored, created]);

  // Move focus to the new step's question, but not on first load.
  useEffect(() => {
    if (!movedRef.current) return;
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const index = stepIndex(state.step);
  const isLast = index === wizardSteps.length - 1;

  const goto = (step: WizardStep) => {
    movedRef.current = true;
    setSubmitError(null);
    dispatch({ type: "goto", step });
  };

  const next = () => {
    const errors = validateStep(state.step, state.draft, today, t);
    if (errors) {
      dispatch({ type: "errors", errors });
      // Bring the first problem into view.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true], [role=alert]")?.focus(),
      );
      return;
    }
    if (!isLast) return goto(wizardSteps[index + 1]!);

    startTransition(async () => {
      const result = await createBikeFromWizard(state.draft);
      if (!result.ok) {
        setSubmitError(result.error);
        if (result.step && result.step !== state.step) goto(result.step);
        return;
      }
      clearSavedWizard();
      setCreated({ id: result.bikeId, name: state.draft.name.trim() });
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => router.replace(`/bikes/${result.bikeId}`), reduceMotion ? 600 : 1500);
    });
  };

  if (created) return <Success name={created.name} />;

  const props: StepProps = {
    draft: state.draft,
    errors: state.errors,
    dispatch,
    today,
    headingRef,
    strava,
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="sm:bg-card mx-auto flex w-full max-w-2xl flex-col sm:rounded-2xl sm:border sm:shadow-sm"
    >
      <div className="flex flex-col gap-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <ProgressBar
              current={index + 1}
              total={wizardSteps.length}
              label={t(`wizard.steps.${state.step}`)}
            />
          </div>
          {cancelHref && (
            <Link
              href={cancelHref}
              onClick={clearSavedWizard}
              className="text-muted-foreground hover:text-foreground -mt-1 text-sm"
            >
              {t("common.cancel")}
            </Link>
          )}
        </div>

        <div
          key={state.step}
          className="animate-in fade-in-0 flex flex-col gap-6 duration-200 motion-reduce:animate-none"
        >
          {state.step === "basics" && <StepBasics {...props} />}
          {state.step === "odometer" && <StepStrava {...props} />}
          {state.step === "purchase" && <StepPurchase {...props} />}
          {state.step === "parts" && <StepParts {...props} />}
          {state.step === "review" && <StepReview {...props} onEdit={goto} />}
        </div>
      </div>

      {/* Stays at the bottom of the screen on phones, so Next is always in reach. */}
      <div className="bg-background/95 sm:bg-card sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:mt-0 sm:rounded-b-2xl sm:px-8 sm:py-4">
        {submitError && (
          <p role="alert" tabIndex={-1} className="text-destructive text-sm outline-none">
            {submitError}
          </p>
        )}
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 px-4"
              onClick={() => goto(wizardSteps[index - 1]!)}
              disabled={pending}
            >
              <ArrowLeft aria-hidden />
              {t("common.back")}
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className={cn(
              "bg-brand text-brand-foreground hover:bg-brand/90 h-12 flex-1 text-base",
              index === 0 && "sm:ml-auto sm:max-w-56",
            )}
          >
            {isLast ? (pending ? t("wizard.addingBike") : t("nav.addBike")) : t("wizard.next")}
            {!isLast && <ArrowRight aria-hidden />}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Success({ name }: { name: string }) {
  const t = useT();
  return (
    <div
      role="status"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center"
    >
      <div className="bg-brand text-brand-foreground animate-in zoom-in-50 fade-in-0 grid size-20 place-items-center rounded-full duration-500 motion-reduce:animate-none">
        <Check aria-hidden className="size-10" strokeWidth={3} />
      </div>
      <div className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both flex flex-col gap-1 delay-150 duration-500 motion-reduce:animate-none">
        <p className="font-display text-3xl leading-tight">
          {t("wizard.success.title", { bike: name })}
        </p>
        <p className="text-muted-foreground">{t("wizard.success.body")}</p>
      </div>
    </div>
  );
}
