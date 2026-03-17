"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useFormContext } from "@/lib/form-context";
import { CATEGORIES } from "@/types";
import BasicInfoForm from "@/components/BasicInfoForm";
import FacilitySearchSection from "@/components/FacilitySearchSection";
import ConfirmationView from "@/components/ConfirmationView";
import CompleteView from "@/components/CompleteView";
import AppointmentScheduler from "@/components/AppointmentScheduler";

function StepContent() {
  const { state } = useFormContext();
  const { currentStep } = state;

  switch (currentStep) {
    case 0:
      return <BasicInfoForm />;
    case 1:
      return <FacilitySearchSection category={CATEGORIES[0]} />;
    case 2:
      return <FacilitySearchSection category={CATEGORIES[1]} />;
    case 3:
      return <FacilitySearchSection category={CATEGORIES[2]} />;
    case 4:
      return <ConfirmationView />;
    case 5:
      return <AppointmentScheduler />;
    case 6:
      return <CompleteView />;
    default:
      return null;
  }
}

function FormContent() {
  const { state } = useFormContext();
  const totalSteps = 7;
  const prevStepRef = useRef(state.currentStep);

  useEffect(() => {
    if (prevStepRef.current !== state.currentStep) {
      prevStepRef.current = state.currentStep;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.currentStep]);

  return (
    <div className="min-h-screen bg-gf-bg py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-[640px]">
        {state.currentStep < 6 && (
          <div className="mb-3 text-right text-xs text-gf-text-secondary">
            ステップ {state.currentStep + 1} / {totalSteps}
          </div>
        )}
        <StepContent />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <FormProvider>
      <FormContent />
    </FormProvider>
  );
}
