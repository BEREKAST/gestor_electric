import { useMemo, useState } from "react";
import PlanCtx from "./PlanCtx.js";

/**
 * Estado temporal de selección/compra de plan.
 * Complementa a AuthCtx (que guarda el plan real del usuario).
 */
export function PlanProvider({ children }) {
  const [selectedPlan, setSelectedPlan] = useState(null); // 'free' | 'pro' | 'enterprise'
  const [isProcessing, setIsProcessing] = useState(false);

  const value = useMemo(() => ({
    selectedPlan,
    setSelectedPlan,
    isProcessing,
    setIsProcessing
  }), [selectedPlan, isProcessing]);

  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}
