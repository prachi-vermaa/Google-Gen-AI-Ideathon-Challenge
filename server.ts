import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Standard middleware
app.use(express.json({ limit: "5mb" }));

// Lazy-initialized GoogleGenAI client to avoid startup crashes if missing
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Reusable generation helper with fallback ladder
async function generateContentWithFallback(params: {
  contents: any[];
  config?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  let lastError: any = null;

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      if (response && typeof response.text === "string") {
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 503 ||
        err?.code === 503 ||
        err?.status === "UNAVAILABLE" ||
        String(err?.message || "").includes("503") ||
        String(err?.message || "").includes("high demand") ||
        String(err?.message || "").includes("UNAVAILABLE") ||
        String(err?.message || "").includes("429");

      const nextCandidate = FALLBACK_MODELS[i + 1];
      if (nextCandidate) {
        console.log(
          `[Gemini Fallback] Model ${model} is temporarily busy (${isTransient ? "503 High Demand" : "Transient Issue"}). Cascading to next candidate: ${nextCandidate}...`
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      } else {
        console.warn(`[Gemini Fallback] All fallback models exhausted. Last model ${model} failed.`);
      }
    }
  }

  throw lastError || new Error("All models in the resilient fallback ladder failed.");
}

// Safe JSON parser from Gemini markdown output
function extractJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {}
    }
    return fallback;
  }
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 1. Reflection & AI conversation endpoint
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode : "reflect";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt && history.length === 0) {
      res.status(400).json({ error: "Prompt or message history is required." });
      return;
    }

    let systemInstruction = `You are an insightful, empathetic reflection companion and thinking partner.
The user is writing in their private reflection and journaling application.
Your goal is to help them gain clarity, explore deeper emotional resonance, identify cognitive patterns, and discover new perspectives without being overly prescriptive or clinical.
Adopt a warm, thoughtful, clear, and articulate tone. Use markdown formatting with clean headers and bullet points where helpful.`;

    if (mode === "summarize") {
      systemInstruction += `\nYour specific task: Provide a structured summary of the reflection.
Include:
1. **Core Themes**: 2-3 key topics or narratives present in the reflection.
2. **Emotional Undercurrents**: Observed feelings, conflicts, or energies.
3. **Key Takeaways & Clarity**: Distilled insights the user can carry forward.
Keep it succinct, respectful, and empowering.`;
    } else if (mode === "brainstorm") {
      systemInstruction += `\nYour specific task: Brainstorm creative angles, reframing exercises, and potential next steps or journaling prompts based on what the user shared.
Provide 3-4 distinct perspectives or exploration ideas.`;
    } else {
      systemInstruction += `\nYour specific task: Respond deeply to the user's reflection.
Validate their experience, offer a meaningful synthesis, and conclude with 1-2 open-ended, gently provocative questions to spur further journaling or introspection.`;
    }

    const contents: any[] = [];
    for (const item of history) {
      if (item && typeof item.content === "string") {
        contents.push({
          role: item.role === "assistant" || item.role === "model" ? "model" : "user",
          parts: [{ text: item.content }],
        });
      }
    }
    if (prompt) {
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });
    }

    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error generating reflection:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate AI response. Please try again.",
    });
  }
});

// 2. Feature 2: LifeMirror — Long-Term Pattern Discovery
app.post("/api/gemini/lifemirror", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      res.status(400).json({
        error: "At least one past journal entry is required for pattern discovery.",
      });
      return;
    }

    // Prepare bounded corpus of entries
    const serializedCorpus = entries
      .slice(0, 30) // Cap to prevent context window overflow
      .map(
        (e: any, idx: number) =>
          `[Entry #${idx + 1} | ID: ${e.id} | Title: "${e.title}" | Date: ${new Date(
            e.updatedAt || e.createdAt || Date.now()
          ).toLocaleDateString()}]\nPreview/Content: ${e.preview || e.content || "(empty entry)"}`
      )
      .join("\n\n---\n\n");

    const systemInstruction = `You are LifeMirror, an objective, empathetic pattern discovery system analyzing personal journal entries across time.
Your purpose is to identify recurring themes across multiple entries:
- Frequently mentioned topics
- Repeated concerns
- Goals
- Sources of joy
- Recurring frustrations
- Changes in priorities
- Repeated situations
- Personal growth over time

CRITICAL REQUIREMENTS:
1. Strict Distinction: You MUST strictly distinguish between:
   - What the user explicitly wrote (with exact direct quotes, entry title, and entry ID).
   - AI-generated interpretation (clearly framed as an exploratory reflection or reflective hypothesis; NEVER state an AI interpretation as an objective fact).
2. Ground Truth: Every pattern must reference at least 1 (ideally 2+) specific entries from the provided corpus.
3. If entries are few, surface initial nascent themes rather than fabricating data.

Output Format: You MUST return a valid JSON array of objects with the following exact TypeScript shape:
[
  {
    "id": "pattern_1",
    "category": "topics" | "concerns" | "goals" | "joy" | "frustrations" | "priorities" | "situations" | "growth",
    "title": "Short descriptive title of pattern",
    "explicitEvidence": [
      {
        "entryId": "entry_id_here",
        "entryTitle": "entry_title_here",
        "date": "date_str",
        "quote": "Direct quote or exact phrase the user wrote"
      }
    ],
    "aiInterpretation": "Gentle, reflective interpretation. For example: 'This may suggest you are feeling ready for greater creative autonomy, though you also express caution about timing.' (Never assert as fact)",
    "confidence": "high" | "medium" | "emerging"
  }
]`;

    const userPrompt = `Here is the user's journal entry corpus:
<journal_corpus>
${serializedCorpus}
</journal_corpus>

Discover the recurring themes and patterns following all LifeMirror guidelines. Return valid JSON only.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for faithful pattern matching
      },
    });

    const patterns = extractJson<any[]>(result.text, []);

    res.json({
      success: true,
      patterns,
      rawText: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in LifeMirror pattern discovery:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to discover patterns.",
    });
  }
});

// 3. Feature 3: Ask Your Past Self
app.post("/api/gemini/ask-past-self", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!question) {
      res.status(400).json({ error: "Question is required." });
      return;
    }

    const serializedCorpus = entries
      .slice(0, 30)
      .map(
        (e: any, idx: number) =>
          `[Entry #${idx + 1} | ID: ${e.id} | Title: "${e.title}" | Date: ${new Date(
            e.updatedAt || e.createdAt || Date.now()
          ).toLocaleDateString()}]\nContent: ${e.preview || e.content || ""}`
      )
      .join("\n\n---\n\n");

    const systemInstruction = `You are "Ask Your Past Self", a grounded archival assistant that searches and answers questions about the user's personal journal history.
Examples of questions:
- "What was I worried about six months ago?"
- "When did I first start thinking about changing jobs?"
- "What made me happy last month?"
- "Have I written about this person before?"
- "What goals did I set for myself?"

CRITICAL RULES:
1. SOURCE OF TRUTH: Answer using ONLY the user's stored journal entries provided in the context as your ground truth.
2. CITATIONS: When answering, explicitly quote and show relevant journal entries and dates that support your answer.
3. ANTI-HALLUCINATION REQUIREMENT: If the journal does not contain enough information to answer the question, you MUST explicitly state that the journal does not contain enough information on this topic, rather than hallucinating an answer.
4. Set "hasEnoughInfo": false if the information is absent or insufficient.

Output Format: Return valid JSON matching:
{
  "answer": "Warm, respectful, conversational answer citing findings or explaining what was or wasn't found...",
  "hasEnoughInfo": true | false,
  "citations": [
    {
      "entryId": "entry_id",
      "entryTitle": "Title of entry",
      "date": "Date string",
      "relevantExcerpt": "Direct quote or relevant passage"
    }
  ]
}`;

    const userPrompt = `User question: "${question}"

Stored Journal Entries:
<journal_corpus>
${serializedCorpus || "No past entries stored."}
</journal_corpus>

Answer truthfully based only on these journal entries. Return valid JSON only.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const parsed = extractJson<any>(result.text, {
      answer: result.text,
      hasEnoughInfo: true,
      citations: [],
    });

    res.json({
      success: true,
      answer: parsed.answer,
      hasEnoughInfo: Boolean(parsed.hasEnoughInfo),
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in Ask Your Past Self:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to query past self.",
    });
  }
});

// 4. Feature 4: Decision Journal Companion Assist
app.post("/api/gemini/decision-assist", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const decisionTitle = typeof body.decisionTitle === "string" ? body.decisionTitle : "";
    const context = typeof body.context === "string" ? body.context : "";
    const options = Array.isArray(body.optionsConsidered) ? body.optionsConsidered : [];
    const reasons = typeof body.reasons === "string" ? body.reasons : "";
    const concerns = typeof body.concerns === "string" ? body.concerns : "";
    const expectedOutcome = typeof body.expectedOutcome === "string" ? body.expectedOutcome : "";
    const confidenceLevel = Number(body.confidenceLevel) || 5;

    const systemInstruction = `You are a Decision Thinking Companion for a personal reflection journal.
The user is framing an important personal or professional decision.
Your goal is to help summarize the decision structure, analyze potential trade-offs, and surface constructive questions or blind spots to consider.

CRITICAL MANDATE:
- You MUST NOT make the decision for the user.
- Emphasize that all agency, values, and choices belong to the user.
- Provide a structured reflection including:
  1. **Decision Synthesis**: Clear restatement of the choice and stakes.
  2. **Options & Trade-offs Matrix**: Strengths, risks, and assumptions for each considered path.
  3. **Blind Spots & Second-Order Effects**: Questions about unintended consequences or hidden factors.
  4. **Retrospective Checkpoints**: 2-3 specific questions for the user to ask themselves when they review this decision in the future.`;

    const userPrompt = `Decision: ${decisionTitle}
Context: ${context}
Options Considered: ${options.join(", ") || "None specified"}
Reasons: ${reasons}
Concerns: ${concerns}
Expected Outcome: ${expectedOutcome}
Current Confidence: ${confidenceLevel} / 10

Please provide thoughtful decision structuring and blind-spot analysis without making the decision for me.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.6,
      },
    });

    res.json({
      success: true,
      synthesis: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in Decision Assist:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to assist with decision.",
    });
  }
});

// 5. Feature 6: Intelligent Journal Search
app.post("/api/gemini/intelligent-search", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!query) {
      res.status(400).json({ error: "Search query is required." });
      return;
    }

    const serializedCorpus = entries
      .slice(0, 40)
      .map(
        (e: any, idx: number) =>
          `[Entry ID: ${e.id} | Title: "${e.title}" | Date: ${new Date(
            e.updatedAt || e.createdAt || Date.now()
          ).toLocaleDateString()}]\n${e.preview || e.content || ""}`
      )
      .join("\n\n---\n\n");

    const systemInstruction = `You are an Intelligent Journal Semantic Search engine.
The user is searching their private journal entries with natural language queries such as:
- "Find entries where I talked about work stress"
- "Show me entries about travelling"
- "When did I write about starting this project?"
- "Find my happiest entries from last year"

Match entries based on conceptual semantic relevance, emotional tone, and contextual themes, even if exact keywords differ.
Strictly respect the user's isolated content. Do not invent entries.

Output Format: Return a valid JSON array of matching entries ordered by relevance score (1-100):
[
  {
    "entryId": "string",
    "entryTitle": "string",
    "date": "string",
    "relevanceScore": 95,
    "matchExplanation": "One clear sentence explaining why this entry matched the natural search query.",
    "matchedExcerpt": "Short representative quote or excerpt from the entry."
  }
]
If no entries match reasonably, return an empty array [].`;

    const userPrompt = `Search Query: "${query}"

Available User Journal Entries:
<entries>
${serializedCorpus || "No entries."}
</entries>

Return matching entries as JSON only.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const matches = extractJson<any[]>(result.text, []);

    res.json({
      success: true,
      matches,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in intelligent search:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Search failed.",
    });
  }
});

// 6. Feature 7: Journal Summaries (Session, Week, Month, Custom Date Range)
app.post("/api/gemini/summarize-period", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const periodType = typeof body.periodType === "string" ? body.periodType : "week";
    const periodLabel = typeof body.periodLabel === "string" ? body.periodLabel : "Journal Period";
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      res.status(400).json({
        error: "No journal entries found in the selected date range to summarize.",
      });
      return;
    }

    const serializedCorpus = entries
      .slice(0, 30)
      .map(
        (e: any, idx: number) =>
          `[Entry #${idx + 1} | ID: ${e.id} | Title: "${e.title}" | Date: ${new Date(
            e.updatedAt || e.createdAt || Date.now()
          ).toLocaleDateString()}]\n${e.preview || e.content || ""}`
      )
      .join("\n\n---\n\n");

    const systemInstruction = `You are a Period Journal Summarizer.
Your goal is to synthesize the user's actual journal entries across a specified period (${periodLabel}) into a structured, holistic summary.
The summary MUST be generated strictly from the user's actual journal content. Do not invent events.

Required Structured Sections:
1. **What Happened**: Clear, objective narrative of the experiences, events, and situations the user documented.
2. **What Mattered**: Core personal significance, deeper values, and what carried weight for the user.
3. **Recurring Themes**: Bullet points of patterns or topics appearing multiple times.
4. **Decisions**: Notable choices, commitments, or forks in the road recorded.
5. **Goals Mentioned**: Intentions, aspirations, or milestones highlighted.
6. **Positive Moments**: Sources of gratitude, relief, joy, or small wins.
7. **Things to Revisit**: Open loops, lingering questions, or topics deserving future reflection.

Output Format: Return valid JSON matching:
{
  "periodType": "${periodType}",
  "periodLabel": "${periodLabel}",
  "entryCount": ${entries.length},
  "whatHappened": "Paragraph text...",
  "whatMattered": "Paragraph text...",
  "recurringThemes": ["theme 1", "theme 2"],
  "decisions": ["decision 1", "decision 2"],
  "goalsMentioned": ["goal 1", "goal 2"],
  "positiveMoments": ["moment 1", "moment 2"],
  "thingsToRevisit": ["item 1", "item 2"]
}`;

    const userPrompt = `Period: ${periodLabel}
Number of Entries: ${entries.length}

Journal Entries in Period:
<entries>
${serializedCorpus}
</entries>

Generate the structured period summary as valid JSON only.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const summary = extractJson<any>(result.text, {
      periodType,
      periodLabel,
      entryCount: entries.length,
      whatHappened: result.text,
      whatMattered: "See full synthesis.",
      recurringThemes: [],
      decisions: [],
      goalsMentioned: [],
      positiveMoments: [],
      thingsToRevisit: [],
    });

    res.json({
      success: true,
      summary,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error generating period summary:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate summary.",
    });
  }
});

// Single entry point start with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
