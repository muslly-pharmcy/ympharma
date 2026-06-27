// Compatibility shim — re-exports from src/core/ai-safety/AISafetyGuard.
// لا تُضِف منطقًا هنا. كل التطوير الجديد يكون داخل src/core/ai-safety/.
export {
  AISafetyGuard,
  checkPromptSafety,
  validateAiOutput,
  type SafetyVerdict,
  type OutputValidation,
} from "@/core/ai-safety/AISafetyGuard";
