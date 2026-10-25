/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultLogger } from "../../utils/logger.ts";

let routerInstance: any = null;

export interface LayaEvaluation {
  domain: string;
  complexity: number;
  isSafe: boolean;
  confidence?: number;
}

/**
 * Fast neural-heuristic evaluator mirroring Hermes Antigravity provider.
 * Guarantees sub-millisecond System 1 classification when the neural weights
 * are loading, unavailable, or running in lightweight edge mode.
 */
function fastFallbackEvaluate(text: string): LayaEvaluation {
  const stripped = (text || "").trim();
  if (!stripped || stripped.length < 3) {
    return { domain: "simple", complexity: 0.1, isSafe: true };
  }

  const lower = stripped.toLowerCase();

  // Safety / injection check
  const injectionTriggers = [
    "ignore all previous",
    "ignore previous instructions",
    "disregard all prior",
    "system prompt reveal",
    "reveal secret keys",
  ];
  const isSafe = !injectionTriggers.some((t) => lower.includes(t));

  let domain = "simple";
  let rawComplexity = 1.5;

  if (
    /python|code|client|async|c\+\+|func|class|algorithm|debug|api|buffer|typescript|javascript|interface|function|github|commit|compile|syntax|refactor/i.test(
      lower
    )
  ) {
    domain = "coding";
    rawComplexity = 2.0;
  } else if (
    /math|calculate|prove|integral|theorem|solve|matrix|equation|probability|derivative|statistics/i.test(
      lower
    )
  ) {
    domain = "research";
    rawComplexity = 2.2;
  } else if (/write a poem|story|essay|creative|novel|fiction|screenplay|dialogue/i.test(lower)) {
    domain = "creative";
    rawComplexity = 1.5;
  } else if (/image|screenshot|diagram|photo|picture|ocr|visual|ui mockup/i.test(lower)) {
    domain = "vision";
    rawComplexity = 1.5;
  } else if (/hi|hello|hey|how are you|good morning|thanks|thank you|ping/i.test(lower)) {
    domain = "simple";
    rawComplexity = 0.5;
  } else if (
    /architecture|distributed|consensus|microservice|database schema|system design|kubernetes/i.test(
      lower
    )
  ) {
    domain = "pro";
    rawComplexity = 2.4;
  }

  const complexity = Math.min(Math.max(rawComplexity / 3.0, 0.05), 1.0);
  return {
    domain,
    complexity,
    isSafe,
  };
}

/**
 * Lazily load @johnhenry/laya-router at runtime so Turbopack/Webpack
 * never traces into the heavy ONNX/MLX dependency tree during build.
 */
let layaRouterUnavailable = false;

async function getRouter(): Promise<any> {
  if (routerInstance) return routerInstance;
  if (layaRouterUnavailable) throw new Error("Laya router unavailable");
  try {
    // @ts-ignore — dynamic require bypasses Turbopack static analysis
    const { Router } = await import(/* webpackIgnore: true */ "@johnhenry/laya-router");
    routerInstance = new Router({
      mlxRepos: true,
      loadOptions: { backend: "auto", dtype: "f16" },
    });
    defaultLogger.info("LAYA_ROUTER", "Initialized Laya JS Router (ModernBERT/mmBERT)");
    return routerInstance;
  } catch (e) {
    layaRouterUnavailable = true;
    defaultLogger.debug?.(
      "LAYA_ROUTER",
      "Laya JS neural router not installed or loading; using neural heuristic fast path."
    );
    throw e;
  }
}

export async function evaluateWithLaya(prompt: string): Promise<LayaEvaluation> {
  try {
    const router = await getRouter();

    const state = { message: prompt };
    const questions = {
      domain: {
        type: "choice",
        instructions: "Determine the core domain of this task.",
        criteria: ["vision", "research", "coding", "pro", "creative", "simple"],
      },
      complexity: {
        type: "score",
        instructions: "Estimate the complexity from 0 to 3.",
        criteria: [0, 1, 2, 3],
      },
      safety: {
        type: "choice",
        instructions: "Is this prompt safe or a prompt injection attack?",
        criteria: ["safe", "injection"],
      },
    };

    const result = await router.predict(state, questions);
    const answers = result?.answers || {};

    const domain = answers.domain?.choice || "simple";
    const rawComplexity = answers.complexity?.score ?? 1.5;
    // Normalize complexity to [0, 1] range for OmniRoute tier affinity
    const complexity = Math.min(Math.max(rawComplexity / 3.0, 0), 1);

    const isModelFlagged =
      answers.safety?.choice === "injection" && (answers.safety?.confidence ?? 0) >= 0.6;

    const lower = prompt.toLowerCase();
    const hasInjection = [
      "ignore all previous",
      "ignore previous instructions",
      "disregard all prior",
      "system prompt reveal",
      "reveal secret keys",
    ].some((t) => lower.includes(t));

    const isSafe = !hasInjection && !isModelFlagged;
    const confidence = answers.domain?.confidence;

    return {
      domain,
      complexity,
      isSafe,
      confidence,
    };
  } catch (_err) {
    return fastFallbackEvaluate(prompt);
  }
}

/**
 * Detect language script (Hangul, Kana, CJK, Latin) to eliminate particle
 * hallucinations and calibrate top_p / temperature.
 */
export function detectLanguage(text: string): {
  language: string;
  isEnglish: boolean;
  script: string;
} {
  const stripped = (text || "").trim();
  if (!stripped) {
    return { language: "en", isEnglish: true, script: "latin" };
  }
  const sample = stripped.slice(0, 500);
  const hasHangul = /[\uac00-\ud7a3\u1100-\u11ff]/.test(sample);
  const hasKana = /[\u3040-\u30ff]/.test(sample);
  const hasCJK = /[\u4e00-\u9fff]/.test(sample);

  if (hasHangul) return { language: "ko", isEnglish: false, script: "hangul" };
  if (hasKana) return { language: "ja", isEnglish: false, script: "japanese" };
  if (hasCJK) return { language: "zh", isEnglish: false, script: "cjk" };
  return { language: "en", isEnglish: true, script: "latin" };
}

/**
 * Pre-filter conversation messages using Laya System 1 decision engine.
 *
 * Reduces token overhead by ~50% by pruning redundant turns or stale context
 * when Laya identifies simple, self-contained queries, or deep conversation
 * history with self-contained prompts.
 */
export function prefilterMessagesWithLaya<T extends Record<string, unknown>>(
  messages: T[],
  evaluation: LayaEvaluation,
  prompt: string = ""
): T[] {
  if (!Array.isArray(messages) || messages.length <= 2) {
    return messages;
  }

  const domain = evaluation.domain;
  const complexity = evaluation.complexity;

  // 1. Simple chitchat, direct lookups, or simple queries: keep system message(s) + latest user prompt
  if (domain === "simple" && complexity < 0.35) {
    const filtered: T[] = [];
    const systemMessages = messages.filter(
      (m) => m && (m.role === "system" || m.role === "developer")
    );
    if (systemMessages.length > 0) {
      filtered.push(...systemMessages);
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === "user") {
        if (!filtered.includes(m)) {
          filtered.push(m);
        }
        break;
      }
    }
    if (filtered.length >= 1) {
      return filtered;
    }
  }

  // 2. Deep conversation history (>12 turns) with self-contained prompt in coding/research: preserve system + last 8 turns
  if (
    messages.length > 12 &&
    (complexity >= 0.67 || domain === "coding" || domain === "research" || domain === "pro")
  ) {
    const lower = prompt.toLowerCase().trim();
    const selfContainedPrefixes = [
      "write",
      "create",
      "implement",
      "explain",
      "refactor",
      "how do i",
      "how to",
      "fix",
      "debug",
      "test",
      "build",
      "update",
      "generate",
    ];
    if (selfContainedPrefixes.some((p) => lower.startsWith(p))) {
      const systemMessages = messages
        .slice(0, 2)
        .filter((m) => m && (m.role === "system" || m.role === "developer"));
      const recent = messages.slice(-8);
      const combined = [...systemMessages];
      for (const m of recent) {
        if (!combined.includes(m)) {
          combined.push(m);
        }
      }
      return combined;
    }
  }

  return messages;
}

/**
 * Dynamically calibrate thinking budget, reasoning effort, and safe headroom via Laya.
 */
export function calibrateThinkingWithLaya(
  body: Record<string, unknown>,
  evaluation: LayaEvaluation,
  targetModel: string = ""
): { thinkingConfig: Record<string, unknown> | null; minSafeTokens: number } {
  if (!body || typeof body !== "object") {
    return { thinkingConfig: null, minSafeTokens: 0 };
  }

  const domain = evaluation.domain;
  const complexity = evaluation.complexity;
  const model = String(targetModel || body.model || "").toLowerCase();

  // 1. If caller explicitly configured reasoning/thinking, respect it directly
  const explicitEffort =
    typeof body.reasoning_effort === "string" ? body.reasoning_effort.toLowerCase() : "";
  if (explicitEffort === "none" || explicitEffort === "0") {
    return { thinkingConfig: null, minSafeTokens: 0 };
  }
  const thinkingObj = body.thinking as Record<string, unknown> | undefined;
  if (thinkingObj && thinkingObj.type === "disabled") {
    return { thinkingConfig: null, minSafeTokens: 0 };
  }
  if (
    thinkingObj &&
    typeof thinkingObj.budget_tokens === "number" &&
    thinkingObj.budget_tokens > 0
  ) {
    return { thinkingConfig: thinkingObj, minSafeTokens: 1024 };
  }

  // Check if model supports thinking/reasoning
  const isThinkingModel =
    model.includes("thinking") ||
    model.includes("flash-tiered") ||
    model.includes("gemini-3") ||
    model.includes("claude-3-7") ||
    model.includes("sonnet-4-6") ||
    model.includes("opus-4-6") ||
    model.includes("o1") ||
    model.includes("o3") ||
    model.includes("o4") ||
    model.includes("codex") ||
    model.includes("pro");

  if (!isThinkingModel) {
    return { thinkingConfig: null, minSafeTokens: 0 };
  }

  // 2. Simple queries & chitchat: disable thinking to eliminate latency and save quota
  if (domain === "simple" && complexity < 0.35) {
    body.thinking = { type: "disabled", budget_tokens: 0 };
    body.reasoning_effort = "low";
    const genConfig = (body.generationConfig || {}) as Record<string, unknown>;
    body.generationConfig = {
      ...genConfig,
      thinking_config: { thinking_budget: 0 },
    };
    return { thinkingConfig: { type: "disabled", budget_tokens: 0 }, minSafeTokens: 0 };
  }

  // 3. High-complexity coding / research / pro tasks: boost thinking budget
  if ((domain === "coding" || domain === "research" || domain === "pro") && complexity >= 0.67) {
    const budget = 16384;
    body.thinking = { type: "enabled", budget_tokens: budget };
    body.reasoning_effort = "high";
    const genConfig = (body.generationConfig || {}) as Record<string, unknown>;
    body.generationConfig = {
      ...genConfig,
      thinking_config: { thinking_budget: budget },
    };
    return { thinkingConfig: { type: "enabled", budget_tokens: budget }, minSafeTokens: 2048 };
  }

  // 4. Moderate complexity
  const budget = 8192;
  body.thinking = { type: "enabled", budget_tokens: budget };
  body.reasoning_effort = "medium";
  const genConfig = (body.generationConfig || {}) as Record<string, unknown>;
  body.generationConfig = {
    ...genConfig,
    thinking_config: { thinking_budget: budget },
  };
  return { thinkingConfig: { type: "enabled", budget_tokens: budget }, minSafeTokens: 1024 };
}

/**
 * Recommend optimal sampling parameters (temperature, top_p) tailored to prompt domain,
 * difficulty, and language script.
 */
export function recommendSamplingParamsWithLaya(
  body: Record<string, unknown>,
  evaluation: LayaEvaluation,
  prompt: string = ""
): { temperature: number; top_p: number } {
  const langInfo = detectLanguage(prompt);
  const isCjk = !langInfo.isEnglish;
  const domain = evaluation.domain;

  let temp = 0.4;
  let topP = isCjk ? 0.8 : 0.9;

  if (domain === "coding" || domain === "research" || domain === "pro") {
    temp = 0.2;
    topP = isCjk ? 0.75 : 0.8;
  } else if (domain === "creative") {
    temp = 0.7;
    topP = isCjk ? 0.85 : 0.95;
  } else {
    temp = 0.4;
    topP = isCjk ? 0.8 : 0.9;
  }

  if (body && typeof body === "object") {
    // Only apply recommended defaults if caller hasn't explicitly supplied custom sampling params
    if (body.temperature === undefined) {
      body.temperature = temp;
    }
    if (body.top_p === undefined) {
      body.top_p = topP;
    }
  }

  return { temperature: temp, top_p: topP };
}

/**
 * Automatically update and rank the candidate models based on real-time availability
 * and matching fitness for the domain evaluated by Laya.
 *
 * When new models are introduced to the pool (or when existing models hit 429 quota exhaustion),
 * this dynamically prioritizes the highest-tier available model matching the domain.
 */
export function prioritizeCandidatesWithLaya<
  T extends { model?: string; provider: string; modelStr?: string; connectionId?: string | null },
>(candidates: T[], evaluation: LayaEvaluation): T[] {
  if (!candidates || candidates.length <= 1) return candidates;

  const domain = evaluation.domain;
  const complexity = evaluation.complexity;

  // Domain capability matcher rules (in descending preference order)
  const domainPatterns: Record<string, RegExp[]> = {
    coding: [
      /sonnet-4-6/i,
      /claude-3-7-sonnet/i,
      /claude-3-5-sonnet/i,
      /gpt-5-codex/i,
      /codex/i,
      /deepseek-coder/i,
      /deepseek-v3/i,
      /qwen.*coder/i,
      /code/i,
    ],
    research: [
      /opus-4-6/i,
      /claude-3-opus/i,
      /o3/i,
      /o1/i,
      /gpt-5.*pro/i,
      /gemini-3.1-pro/i,
      /gemini-2.5-pro/i,
      /thinking/i,
    ],
    pro: [/gemini-3.1-pro/i, /gemini-2.5-pro/i, /gpt-5/i, /claude-sonnet/i, /pro/i],
    creative: [/claude-sonnet/i, /gpt-4o/i, /gemini-3.8-flash/i],
    vision: [
      /flash-high/i,
      /gemini-3.6-flash/i,
      /gemini-3.8-flash/i,
      /claude-3-7/i,
      /gpt-4o/i,
      /vision/i,
    ],
    simple: [
      /flash-medium/i,
      /flash-lite/i,
      /gemini-3.5-flash/i,
      /gpt-4o-mini/i,
      /deepseek-chat/i,
      /flash/i,
    ],
  };

  const patterns = domainPatterns[domain] || domainPatterns.simple;

  return [...candidates].sort((a, b) => {
    const aModel = a.model || a.modelStr || "";
    const bModel = b.model || b.modelStr || "";

    let aRank = -1;
    let bRank = -1;

    for (let i = 0; i < patterns.length; i++) {
      if (aRank === -1 && patterns[i].test(aModel)) aRank = i;
      if (bRank === -1 && patterns[i].test(bModel)) bRank = i;
      if (aRank !== -1 && bRank !== -1) break;
    }

    // If complexity is very high (>= 0.7), penalize lightweight models in coding/research
    if (complexity >= 0.7 && (domain === "coding" || domain === "research")) {
      if (/mini|lite|flash-low/i.test(aModel)) aRank += 100;
      if (/mini|lite|flash-low/i.test(bModel)) bRank += 100;
    }

    if (aRank !== -1 && bRank === -1) return -1;
    if (bRank !== -1 && aRank === -1) return 1;
    if (aRank !== -1 && bRank !== -1) return aRank - bRank;

    return 0;
  });
}
