import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";

const PORT = 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in process.env");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Candidate models in priority order (active, fast, and responsive models)
  const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
  ];

  // Helper for racing a model call against a timeout
  async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      const res = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return res;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  // 1. Sanctuary Scholar Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [], recentInquiries = [] } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "A message is required" });
      }

      const ai = getAiClient();
      const contextStrings = Array.isArray(recentInquiries)
        ? recentInquiries
            .filter((inq: any) => inq && (inq.scripture || inq.query))
            .slice(0, 5)
            .map(
              (inq: any) =>
                `Scripture: ${inq.scripture || ""}\nQuestion: ${inq.query || ""}\nKey Insights: ${(inq.interpretation || "").slice(0, 300)}`
            )
            .join("\n\n---\n\n")
        : "";

      let contextSection = "";
      if (contextStrings.trim()) {
        contextSection = `\nPilgrim's Past Saved Inquiries (REFERENCE ARCHIVE ONLY - ONLY refer to these if the pilgrim explicitly asks about their past studies, seekings, or history):\n${contextStrings}\n`;
      }

      const systemInstruction = `You are the "Sanctuary Scholar", a distinguished, reverent Christian biblical scholar, church historian, and pastoral guide for the XeJesUs app.
Your highest duty is to provide pilgrims with deep, authentic, scripture-saturated, and intellectually rigorous answers to their questions.

PRIMARY DIRECTIVE:
- DIRECTLY AND SPECIFICALLY ANSWER the pilgrim's immediate question or prompt. Never deflect, give vague answers, or repeat canned or evasive phrases.
- Every sentence must address the specific substance of what the pilgrim asked.
- Provide primary Scripture citations (Book, Chapter, and Verse) with biblical context.
- Cite historical theology and classical scholarship (e.g., Early Church Fathers like Augustine and Chrysostom; Reformers like Calvin; and commentators like Matthew Henry, Charles Spurgeon, and C.S. Lewis).
- Explain relevant Greek/Hebrew lexical nuances where they illuminate the question.
- Conclude with a practical, inspiring application for modern Christian discipleship.
${contextSection}
Guidelines:
1. Speak with reverence, warmth, intellectual integrity, and pastoral encouragement.
2. Structure your response with clean formatting, bold theological terms, and clear headings.
3. Always keep your focus fixed on the pilgrim's actual question.`;

      // Filter and sanitize chat history
      const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
      if (Array.isArray(history)) {
        for (const h of history) {
          if (!h || !h.text || (h.role !== "user" && h.role !== "model")) continue;
          formattedHistory.push({
            role: h.role,
            parts: [{ text: String(h.text) }],
          });
        }
      }

      // Ensure history strictly begins with a 'user' turn (skip any initial bot welcome message)
      while (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      let responseText = "";
      let lastError: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction,
            },
            history: formattedHistory,
          });

          const result = await withTimeout(
            chat.sendMessage({ message }),
            14000,
            `Chat on ${model}`
          );

          responseText = result.text || "";
          if (responseText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Chat model ${model} failed, trying next candidate:`, err?.message || err);
        }
      }

      if (!responseText) {
        console.error("All candidate chat models failed to return a response:", lastError);
        return res.status(503).json({
          error: "The Sanctuary Scholar is currently experiencing high demand. Please ask your question again in a moment.",
          message: lastError?.message || "Service temporarily unavailable",
        });
      }

      return res.json({ text: responseText });
    } catch (error: any) {
      console.error("Sanctuary Chat API Error:", error);
      return res.status(500).json({
        error: "Sanctuary connection issue",
        message: error?.message || "Failed to communicate with Sanctuary Scholar",
      });
    }
  });

  // 2. Exegesis Analysis
  app.post("/api/exegesis", async (req, res) => {
    try {
      const { scripture, queryText } = req.body;
      if (!scripture) {
        return res.status(400).json({ error: "Scripture reference is required" });
      }

      const ai = getAiClient();
      const prompt = `
        You are an expert biblical scholar specializing in grammatical-historical exegesis (leading out the author's original meaning).
        Your goal is to provide a rigorous, reverent, and comprehensive exegetical analysis of the following passage.
        
        Scripture: ${scripture}
        User Question / Context: ${queryText || "Provide an exegetical study of this passage"}
        
        MANDATORY REQUIREMENTS:
        1. "interpretation": You MUST directly, specifically, and thoroughly address and answer the user's specific question ("${queryText || "Provide an exegetical study of this passage"}").
           - Explain how ${scripture} directly answers or informs the user's inquiry.
           - Avoid generic summaries, boilerplate phrases, or canned templates.
           - Quote and expound upon specific phrases from the text.
           - Cite relevant Patristic or classical commentators (e.g., Augustine, Chrysostom, Calvin, Matthew Henry, Spurgeon, C.S. Lewis).
        2. "historicalContext": Detail the author, historical date, original recipients, cultural environment, and relevant archaeological findings for ${scripture}.
        3. "grammarAnalysis": Provide deep lexical analysis of key original Greek/Hebrew words in ${scripture}, with transliterations, Strong's concordance numbers, grammatical tense/mood, and precise theological nuances.
        4. "literaryGenre": Identify the exact literary genre (e.g., Gospel Narrative, Pauline Epistle, Hebrew Poetry, Prophetic Oracle) and stylistic structures.
        5. "godIntent": Articulate God's divine purpose in inspiring ${scripture}, applying its eternal truth directly to the user's question.
        6. "crossReferences": Provide 4 to 6 canonical cross-references with verse citations and brief reasons for correlation.
        7. "geography": Identify the key biblical location:
           - "location": Specific name of the place.
           - "thenDesc": Detailed description of this location in ancient biblical times with historical notes.
           - "nowDesc": Detailed description of this location today (modern region, country, archaeological status).
           - "thenImageUrl": Short descriptive prompt for a historical biblical map illustration of this location.
           - "nowImageUrl": Short descriptive prompt for a modern realistic or aerial view of this location.
        8. "videoClipQuery": A descriptive search query for an educational or historical documentary on ${scripture}.
        
        Provide the response strictly adhering to the JSON schema.
      `;

      let data: any = null;
      let lastError: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const timeoutMs = 18000;
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    interpretation: { type: Type.STRING },
                    historicalContext: { type: Type.STRING },
                    grammarAnalysis: { type: Type.STRING },
                    literaryGenre: { type: Type.STRING },
                    godIntent: { type: Type.STRING },
                    crossReferences: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    geography: {
                      type: Type.OBJECT,
                      properties: {
                        location: { type: Type.STRING },
                        thenDesc: { type: Type.STRING },
                        nowDesc: { type: Type.STRING },
                        thenImageUrl: { type: Type.STRING },
                        nowImageUrl: { type: Type.STRING },
                      },
                      required: ["location", "thenDesc", "nowDesc", "thenImageUrl", "nowImageUrl"],
                    },
                    videoClipQuery: { type: Type.STRING },
                  },
                  required: [
                    "interpretation",
                    "historicalContext",
                    "grammarAnalysis",
                    "literaryGenre",
                    "godIntent",
                    "crossReferences",
                    "geography",
                    "videoClipQuery",
                  ],
                },
              },
            }),
            timeoutMs,
            `Exegesis on ${model}`
          );

          const text = response.text;
          if (text) {
            const cleanText = text
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            data = JSON.parse(cleanText);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Exegesis model ${model} failed, trying next candidate:`, err?.message || err);
        }
      }

      if (!data) {
        console.error("All exegesis candidate models failed:", lastError);
        return res.status(503).json({
          error: "The sanctuary scholarship service is currently experiencing high demand. Please press Retry to generate this exegesis.",
          message: lastError?.message || "All models busy",
        });
      }

      // Format image URLs
      if (data.geography) {
        const formatPrompt = (p: string) =>
          `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=800&height=600&nologo=true`;
        if (data.geography.thenImageUrl && !data.geography.thenImageUrl.startsWith("http")) {
          data.geography.thenImageUrl = formatPrompt(
            `historical biblical map of ${data.geography.location}, ancient style, parchment texture, high detail, ${data.geography.thenImageUrl}`
          );
        }
        if (data.geography.nowImageUrl && !data.geography.nowImageUrl.startsWith("http")) {
          data.geography.nowImageUrl = formatPrompt(
            `modern geographical view or drone shot of ${data.geography.location} Israel, high resolution, realistic, ${data.geography.nowImageUrl}`
          );
        }
      }

      return res.json(data);
    } catch (error: any) {
      console.error("Exegesis API Error:", error);
      return res.status(500).json({
        error: "Unable to complete exegesis analysis. Please try again.",
        message: error?.message || "Exegesis service error",
      });
    }
  });

  // 3. Search Scripture by Subject
  app.post("/api/search-scriptures", async (req, res) => {
    try {
      const { subject } = req.body;
      if (!subject || typeof subject !== "string") {
        return res.status(400).json({ error: "A subject is required" });
      }

      const ai = getAiClient();
      const prompt = `
        Find relevant biblical scripture references for the following subject: "${subject}".
        Return a JSON array of objects, each containing:
        - "reference": The canonical reference (e.g., "Psalm 23:1").
        - "reason": A very brief explanation of why this verse is relevant to the subject.
        Provide at most 5 highly relevant suggestions.
      `;

      let results: any[] = [];
      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      reference: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ["reference", "reason"],
                  },
                },
              },
            }),
            15000,
            `Search on ${model}`
          );

          const text = response.text;
          if (text) {
            results = JSON.parse(text.trim());
            if (Array.isArray(results) && results.length > 0) break;
          }
        } catch (err: any) {
          console.warn(`Search model ${model} failed, trying next:`, err?.message || err);
        }
      }

      if (!results || results.length === 0) {
        // Thematic biblical fallback index
        const sub = subject.toLowerCase();
        if (sub.includes("fear") || sub.includes("anxiet") || sub.includes("worry")) {
          results = [
            { reference: "Philippians 4:6-7", reason: "Be anxious for nothing, but in everything by prayer let your requests be known to God." },
            { reference: "Matthew 6:33-34", reason: "Seek first the kingdom of God and His righteousness, and do not worry about tomorrow." },
            { reference: "2 Timothy 1:7", reason: "God has not given us a spirit of fear, but of power, love, and a sound mind." },
            { reference: "Psalm 56:3", reason: "Whenever I am afraid, I will trust in You." },
            { reference: "1 Peter 5:7", reason: "Casting all your care upon Him, for He cares for you." },
          ];
        } else if (sub.includes("peace") || sub.includes("calm") || sub.includes("rest")) {
          results = [
            { reference: "John 14:27", reason: "Peace I leave with you, My peace I give to you; not as the world gives do I give to you." },
            { reference: "Isaiah 26:3", reason: "You will keep him in perfect peace, whose mind is stayed on You, because he trusts in You." },
            { reference: "Matthew 11:28", reason: "Come to Me, all you who labor and are heavy laden, and I will give you rest." },
            { reference: "Psalm 23:2", reason: "He leads me beside the still waters, He restores my soul." },
            { reference: "Romans 5:1", reason: "Having been justified by faith, we have peace with God through our Lord Jesus Christ." },
          ];
        } else if (sub.includes("love") || sub.includes("compassion")) {
          results = [
            { reference: "1 Corinthians 13:4-8", reason: "Love suffers long and is kind; love does not envy; love never fails." },
            { reference: "1 John 4:19", reason: "We love Him because He first loved us." },
            { reference: "John 3:16", reason: "For God so loved the world that He gave His only begotten Son." },
            { reference: "Romans 8:38-39", reason: "Neither death nor life shall be able to separate us from the love of God." },
            { reference: "John 15:13", reason: "Greater love has no one than this, than to lay down one's life for his friends." },
          ];
        } else {
          results = [
            { reference: "Proverbs 3:5-6", reason: "Trust in the Lord with all your heart, and lean not on your own understanding." },
            { reference: "Jeremiah 29:11", reason: "For I know the thoughts that I think toward you, says the Lord, thoughts of peace and not of evil." },
            { reference: "Romans 8:28", reason: "All things work together for good to those who love God and are called according to His purpose." },
            { reference: "Psalm 46:1", reason: "God is our refuge and strength, a very present help in trouble." },
            { reference: "Hebrews 11:1", reason: "Faith is the substance of things hoped for, the evidence of things not seen." },
          ];
        }
      }

      return res.json(results);
    } catch (error: any) {
      console.error("Search Scripture API Error:", error);
      return res.json([
        { reference: "Proverbs 3:5-6", reason: "Trust in the Lord with all your heart and lean not on your own understanding." },
        { reference: "Psalm 23:1", reason: "The Lord is my shepherd; I shall not want." },
      ]);
    }
  });

  // 4. Define Word / Theological Lexicon
  app.post("/api/define-word", async (req, res) => {
    try {
      const { word, context } = req.body;
      if (!word) {
        return res.status(400).json({ error: "Word is required" });
      }

      const ai = getAiClient();
      const prompt = `
        Define the following word or phrase in a biblical, theological, or historical context related to the study of the Bible:
        "${word}"
        
        Context of the document where this was found: "${context || "Biblical exegesis"}"
        
        Provide a concise, academic, yet accessible definition. Do not use formatting like bold or headers, just the text of the definition.
      `;

      let defText = "";
      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
            }),
            15000,
            `Define on ${model}`
          );

          defText = (response.text || "").trim();
          if (defText) break;
        } catch (err: any) {
          console.warn(`Define word model ${model} failed, trying next:`, err?.message || err);
        }
      }

      if (!defText) {
        defText = `${word}: A biblical and theological term signifying spiritual truth and covenantal meaning within the sacred Scriptures, derived from original canonical contexts.`;
      }

      return res.json({ definition: defText });
    } catch (error: any) {
      console.error("Define Word API Error:", error);
      const { word } = req.body || {};
      return res.json({
        definition: `${word || "Term"}: A theological term referencing divine revelation, covenant history, and Christian doctrinal truth.`,
      });
    }
  });

  // 5. Generate Literary Work Publication Export
  app.post("/api/generate-literary-work", async (req, res) => {
    try {
      const { sessionName, messages = [] } = req.body;
      const ai = getAiClient();

      const conversationText = Array.isArray(messages)
        ? messages
            .slice(-15)
            .map((m: any) => `${m.role === "user" ? "Pilgrim" : "Sanctuary Scholar"}: ${m.text}`)
            .join("\n\n")
        : "";

      const prompt = `You are a distinguished Biblical Scholar and Literary Historian for XeJesUs.
Analyze the following saved chat session conversation and synthesize a comprehensive "Professional Literary Work" report.

Session Title: ${sessionName || "Sanctuary Exegesis"}
Conversation History:
${conversationText}

Produce a structured JSON response containing:
1. "themeTitle": A grand, academic literary work title reflecting the core theological theme.
2. "subtitle": A descriptive subtitle summarizing the historical and spiritual scope.
3. "executiveSummary": A 2-3 paragraph executive summary of the conversation's core theological insights and takeaways.
4. "thematicAnalysis": An in-depth literary and theological synthesis connecting the chat insights to classical Christian exegesis and modern life application.
5. "familyTree": An array of 3 to 6 key Biblical/Historical figures, genealogical relationships, or spiritual lineages associated with this theme.
   Each item must have: "generation", "person", "biblicalTitle", "significance", and "keyScripture".
6. "scholarlyWorks": An array of EXACTLY 2 to 3 classical or academic literary works researched by biblical scholars (e.g. Josephus, Augustine, Chrysostom, Dead Sea Scrolls, Eusebius, C.S. Lewis, N.T. Wright).
   Each item must have: "title", "author", "era", "summary", and "relevance".
7. "youtubeVideos": An array of EXACTLY 2 to 3 curated educational or scholarly YouTube videos related to the theme.
   Each item must have: "title", "channel", "searchQuery", "url", "description".
8. "images": An array of EXACTLY 2 sacred imagery & historical artwork items tailored specifically to the saved chat session theme "${sessionName}".
   Each item MUST contain: "title" and "caption".

Return ONLY valid JSON matching this schema.`;

      let reportData: any = null;
      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
              },
            }),
            25000,
            `Literary work on ${model}`
          );

          const text = response.text || "";
          if (text) {
            reportData = JSON.parse(text.trim());
            break;
          }
        } catch (err: any) {
          console.warn(`Literary work model ${model} failed, trying next:`, err?.message || err);
        }
      }

      if (!reportData) {
        reportData = {
          themeTitle: `${sessionName || "Sacred Exegesis"} Theological Monograph`,
          subtitle: "A Scholarly Exposition of Scripture and Christological Hermeneutics",
          executiveSummary: `This monograph explores the divine themes contemplated in "${sessionName || "Sanctuary Dialogue"}". Through close examination of the canonical text, the conversation illuminated the author's original intended meaning, firmly rooting interpretation in the person of Jesus Christ while guarding against eisegesis. The insights drawn demonstrate the enduring vitality of God's Word for contemporary Christian discipleship.`,
          thematicAnalysis: `At the heart of this theological discourse lies the harmony of divine revelation and human response. Grounded in the exegetical traditions of the early Church and Reformation scholars, the dialogue underscored how divine grace and truth intersect within daily life.`,
          familyTree: [
            { generation: "Patriarchal Era", person: "Abraham", biblicalTitle: "Father of the Faithful", significance: "Recipient of the divine covenant promises fulfilled in Christ", keyScripture: "Genesis 12:1-3" },
            { generation: "Davidic Monarchy", person: "David", biblicalTitle: "King of Israel & Psalmist", significance: "Foreshadowed the eternal Messiah King", keyScripture: "2 Samuel 7:12-16" },
            { generation: "Messianic Fulfillment", person: "Jesus Christ", biblicalTitle: "The Son of the Living God", significance: "Author and Finisher of our faith, the Word made flesh", keyScripture: "Hebrews 12:2" },
          ],
          scholarlyWorks: [
            { title: "De Doctrina Christiana", author: "St. Augustine of Hippo", era: "Early Church (c. 397 AD)", summary: "Foundational treatise on Christian biblical hermeneutics and the primacy of divine love in scripture.", relevance: "Guides the reader to Christological interpretation." },
            { title: "The Treasury of David", author: "Charles Haddon Spurgeon", era: "19th Century (1885)", summary: "Exhaustive exposition and historical commentary on the Psalms.", relevance: "Deep devotional and grammatical application." },
          ],
          youtubeVideos: [
            { title: "Biblical Exegesis and Historical Context", channel: "BibleProject", searchQuery: "BibleProject biblical exegesis and context", url: "https://www.youtube.com/results?search_query=BibleProject+biblical+exegesis", description: "Comprehensive introduction to biblical literary design." },
            { title: "The Gospels and Historical Reliability", channel: "CSLewisDoodle", searchQuery: "CS Lewis historical christianity gospels", url: "https://www.youtube.com/results?search_query=CS+Lewis+historical+christianity", description: "Scholarly overview of New Testament authenticity." },
          ],
          images: [
            { title: "Ancient Biblical Manuscript", caption: "Early Greek papyrus fragments attesting to the canonical transmission of the New Testament." },
            { title: "The Sanctuary of Peace", caption: "Sacred visualization of contemplative prayer and exegetical study." },
          ],
        };
      }

      return res.json(reportData);
    } catch (error: any) {
      console.error("Literary Work API Error:", error);
      return res.status(500).json({ error: "Failed to generate literary work" });
    }
  });

  // 6. Gemini Text-To-Speech (TTS)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, personaName = "Sanctuary Scholar", gender = "male" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required for TTS" });
      }

      const ai = getAiClient();
      const cleanText = text
        .replace(/\*+/g, "")
        .replace(/#+/g, "")
        .replace(/`+/g, "")
        .replace(/_+/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanText) {
        return res.json({ audioBase64: "" });
      }

      let voiceName = gender === "male" ? "Charon" : "Kore";
      let promptStyle = `Speak clearly and reverently as ${personaName}:`;
      const lowerPersona = personaName.toLowerCase();

      if (gender === "male") {
        if (lowerPersona.includes("osteen")) {
          voiceName = "Puck";
          promptStyle = "Speak in a warm, encouraging, smiling, bright and optimistic tone as Joel Osteen:";
        } else if (lowerPersona.includes("spurgeon")) {
          voiceName = "Charon";
          promptStyle = "Speak in a majestic, deep, resonant, 19th-century British prince of preachers voice as Charles Spurgeon:";
        } else if (lowerPersona.includes("lewis")) {
          voiceName = "Fenrir";
          promptStyle = "Speak in an articulate, scholarly, warm Oxbridge professor cadence as C.S. Lewis:";
        } else if (lowerPersona.includes("luther")) {
          voiceName = "Charon";
          promptStyle = "Speak in a bold, passionate, strong reformational voice as Martin Luther:";
        } else if (lowerPersona.includes("keller")) {
          voiceName = "Fenrir";
          promptStyle = "Speak in a thoughtful, intellectually rich, warm urban pastor voice as Tim Keller:";
        } else if (lowerPersona.includes("graham")) {
          voiceName = "Charon";
          promptStyle = "Speak with clear, authoritative, passionate evangelistic clarity as Billy Graham:";
        } else {
          voiceName = "Fenrir";
          promptStyle = `Speak in a distinctive, dignified male scholar voice as ${personaName}:`;
        }
      } else {
        if (lowerPersona.includes("oprah") || lowerPersona.includes("winfrey")) {
          voiceName = "Kore";
          promptStyle = "Speak in a deeply empathetic, warm, resonant, expressive and rich tone as Oprah Winfrey:";
        } else if (lowerPersona.includes("moore") || lowerPersona.includes("meyer") || lowerPersona.includes("shirer")) {
          voiceName = "Zephyr";
          promptStyle = `Speak in a passionate, energetic, warm exegetical voice as ${personaName}:`;
        } else {
          voiceName = "Kore";
          promptStyle = `Speak in a distinctive, graceful female scholar voice as ${personaName}:`;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `${promptStyle}\n\n"${cleanText}"` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      return res.json({ audioBase64 });
    } catch (error: any) {
      console.error("TTS API Error:", error);
      return res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // Vite middleware in dev or static files in production
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
    console.log(`Sanctuary Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Sanctuary server:", err);
  process.exit(1);
});
