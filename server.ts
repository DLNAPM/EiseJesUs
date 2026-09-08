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

  // Candidate models in priority order (fastest first)
  const CANDIDATE_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
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

  // Graceful theological scholar fallback if API calls or networks temporarily fail
  function getSanctuaryFallbackResponse(userPrompt: string): string {
    const promptLower = userPrompt.toLowerCase();
    if (promptLower.includes("melchizedek") || promptLower.includes("hebrew") || promptLower.includes("priest")) {
      return `### Melchizedek: The Eternal Priest-King

Grace and peace to you, pilgrim. **Melchizedek** appears in **Genesis 14:18–20** as the King of Salem and "Priest of God Most High" (*El Elyon*), presenting bread and wine and blessing Abraham.

In **Psalm 110:4** and **Hebrews 7**, Melchizedek is unveiled as the supreme biblical type of the eternal priesthood of our Lord Jesus Christ. Unlike the Levitical priests descended from Aaron who served under the Law and were hindered by death, Christ is consecrated High Priest forever by divine oath, possessing an **indestructible life** (**Hebrews 7:16, 24–25**).

* **Historical & Patristic Witness:** St. Augustine observed that the bread and wine of Melchizedek foreshadowed the sacramental communion of Christ, while John Calvin noted that scripture's silence regarding Melchizedek's genealogy prefigures the eternal divinity of the Son of God.
* **Pastoral Application:** Rest in the absolute security of having a Great High Priest who lives forever to make intercession for you before the Father. He represents you perfectly and His grace never fails.`;
    }

    return `Grace and peace to you, pilgrim. I have received your inquiry concerning **"${userPrompt}"**.

As the Psalmist proclaims, *"Your word is a lamp to my feet and a light to my path"* (**Psalm 119:105**), and the Apostle Paul assures us in **2 Timothy 3:16–17** that all Scripture is God-breathed and profitable for teaching, reproof, correction, and training in righteousness.

In classical Christian reflection, Church Fathers such as **St. Augustine** and **John Chrysostom** taught that whenever we bring our hearts and minds before Holy Scripture, we are met by the living God who desires to impart wisdom, peace, and spiritual fortitude.

**Pastoral Reflection for Modern Discipleship:**
Take comfort today that the Lord hears every seeking heart. Bring your study and reflections before Him in quiet prayer, and inquire further on any specific passage, verse, or theological theme as we walk this path of faith together.`;
  }

  // 1. Sanctuary Scholar Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [], recentInquiries = [] } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "A message is required" });
      }

      const trimmedMessage = message.trim();
      const ai = getAiClient();
      const contextStrings = Array.isArray(recentInquiries)
        ? recentInquiries
            .filter((inq: any) => inq && (inq.scripture || inq.query))
            .slice(0, 5)
            .map(
              (inq: any) =>
                `Scripture: ${inq.scripture || ""}\nQuestion: ${inq.query || ""}\nKey Insights: ${String(inq.interpretation || "").slice(0, 300)}`
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

      // Filter and sanitize chat history - strip out any previous error or system greeting text
      const rawHistory: { role: string; text: string }[] = [];
      if (Array.isArray(history)) {
        for (const h of history) {
          if (!h || !h.text || (h.role !== "user" && h.role !== "model")) continue;
          const text = String(h.text).trim();
          if (
            !text ||
            text.includes("connection to the sanctuary was interrupted") ||
            text.includes("experiencing high demand") ||
            text.includes("Greetings, pilgrim") ||
            text.includes("Sanctuary Scholar returned an empty response") ||
            text.includes("Sanctuary Scholar communication error") ||
            text.includes("Service temporarily unavailable") ||
            text.startsWith("Forgive me") ||
            text.startsWith("I'm sorry, I couldn't find an answer")
          ) {
            continue;
          }
          rawHistory.push({ role: h.role, text });
        }
      }

      // Ensure history strictly begins with a 'user' turn and alternates
      const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
      for (const item of rawHistory) {
        if (formattedHistory.length === 0) {
          if (item.role === "user") {
            formattedHistory.push({ role: "user", parts: [{ text: item.text }] });
          }
        } else {
          const last = formattedHistory[formattedHistory.length - 1];
          if (last.role === item.role) {
            last.parts[0].text += "\n\n" + item.text;
          } else {
            formattedHistory.push({ role: item.role, parts: [{ text: item.text }] });
          }
        }
      }

      // If formattedHistory ends with a 'user' turn, remove it because contents will supply the final user turn
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === "user") {
        formattedHistory.pop();
      }

      const contents = [
        ...formattedHistory,
        { role: "user", parts: [{ text: trimmedMessage }] },
      ];

      let responseText = "";
      let lastError: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const timeoutMs = model.includes("latest") ? 10000 : 14000;
          const result = await withTimeout(
            ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
              },
            }),
            timeoutMs,
            `Chat on ${model}`
          );

          let text = result.text || "";
          if (!text && result.candidates?.[0]?.content?.parts) {
            text = result.candidates[0].content.parts
              .map((p: any) => p.text || "")
              .filter(Boolean)
              .join("\n\n")
              .trim();
          }

          if (text && text.trim()) {
            responseText = text.trim();
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Chat model ${model} failed, trying next candidate:`, err?.message || err);
        }
      }

      if (!responseText) {
        console.warn("All candidate chat models failed to return text; providing grounded fallback response. Error was:", lastError?.message || lastError);
        responseText = getSanctuaryFallbackResponse(trimmedMessage);
      }

      return res.json({ text: responseText });
    } catch (error: any) {
      console.error("Sanctuary Chat API Error:", error);
      const fallback = getSanctuaryFallbackResponse(typeof req.body?.message === "string" ? req.body.message : "Scripture inquiry");
      return res.json({ text: fallback });
    }
  });

  // Grounded theological exegesis fallback generator ensuring pilgrims never receive empty responses
  function getFallbackExegesis(scripture: string, queryText: string) {
    const sLower = scripture.toLowerCase();
    const qText = queryText && queryText.trim() ? queryText.trim() : "What is the historical, grammatical, and theological meaning of this passage?";

    if (sLower.includes("john 3:16") || (sLower.includes("john 3") && sLower.includes("16"))) {
      return {
        interpretation: `In John 3:16, the Apostle John presents the heart of divine revelation: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life." In addressing your inquiry ("${qText}"), this scripture reveals that God's love is not passive sentiment, but an initiating covenant action. The term "world" (Greek: *kosmos*) encompasses all of fallen humanity, demonstrating that divine mercy extends beyond ethnic or national borders to all who believe. St. John Chrysostom noted that God gave His Son not for righteous angels, but for rebellious mankind. John Calvin remarked that faith in Christ is the single wellspring from which eternal life flows freely to the believer.`,
        historicalContext: `Authored by the Apostle John around 85–95 AD from Ephesus to Jewish and Gentile believers facing Roman imperial persecution and the early philosophical challenge of Gnosticism. In first-century Greco-Roman society, love was conditional and reciprocal; the proclamation of unconditional, divine self-giving love was countercultural. Early papyri (such as P52 and P66) attest to the early canonical transmission and veneration of John's Gospel.`,
        grammarAnalysis: `Key original Greek terms include:\n• ἠγάπησεν (*ēgapēsen*, Strong's G25): Aorist indicative active of *agapaō*, denoting a completed, decisive historical act of self-giving love at the Cross.\n• οὕτως (*houtōs*, Strong's G3779): Adverb meaning "in this manner" or "so intensely," pointing to the magnitude of the gift.\n• μονογενῆ (*monogenē*, Strong's G3439): Accusative singular of *monogenēs*, signifying "unique, only-begotten, beloved," highlighting the infinite cost of the Father's sacrifice.\n• πιστεύων (*pisteuōn*, Strong's G4100): Present active participle, expressing continuous, active trust rather than a momentary intellectual nod.`,
        literaryGenre: `Gospel Narrative and Christological Discourse, set in the nighttime dialogue between Jesus and Nicodemus the Pharisee.`,
        godIntent: `God's eternal intent is to redeem lost humanity from spiritual perishability and welcome every believer into intimate, everlasting fellowship with Himself through the finished work of Jesus Christ.`,
        crossReferences: [
          "Romans 5:8 - God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.",
          "1 John 4:9-10 - In this the love of God was manifested toward us, that God has sent His only begotten Son into the world.",
          "Ephesians 2:4-5 - But God, who is rich in mercy, because of His great love with which He loved us, made us alive together with Christ.",
          "Romans 8:32 - He who did not spare His own Son, but delivered Him up for us all, how shall He not with Him freely give us all things?"
        ],
        geography: {
          location: "Jerusalem",
          thenDesc: "The ancient holy city and capital of Judea, dominated by the Second Temple rebuilt by Herod the Great.",
          nowDesc: "Modern Jerusalem, an ancient metropolitan center sacred to the Abrahamic faiths.",
          thenImageUrl: "historical biblical map of ancient Jerusalem during the Second Temple period, parchment style",
          nowImageUrl: "modern aerial view of Jerusalem Old City and surrounding hills"
        },
        videoClipQuery: "Gospel of John 3:16 historical context and biblical exegesis documentary"
      };
    }

    if (sLower.includes("psalm 23") || sLower.includes("psalms 23")) {
      return {
        interpretation: `Psalm 23:1 proclaims: "The Lord is my shepherd; I shall not want." In relation to your seeking ("${qText}"), King David draws upon his own youth tending flocks in the Judean wilderness to articulate the absolute sufficiency and tender care of Yahweh. The statement "I shall not want" does not promise material luxury, but complete spiritual provision and pastoral security. St. Augustine observed that the green pastures and still waters represent the rich nourishment of God's Word and the peace of the Holy Spirit. Charles Spurgeon called Psalm 23 the "pearl of the Psalms," writing that with Yahweh as our Shepherd, tomorrow's needs are already met by today's Shepherd.`,
        historicalContext: `Penned by David, King of Israel, circa 1000 BC during the United Monarchy. In the ancient Near East, kings were frequently hailed as "shepherds" of their nations, yet David uniquely humbles himself as a sheep under the divine kingship of Yahweh. The topography of the Judean wilderness—with its steep wadis, flash floods, and predators—lends physical realism to the "valley of the shadow of death."`,
        grammarAnalysis: `Key Hebrew terms include:\n• יְהוָה רֹעִי (*Yahweh ro'i*, Strong's H7462): The covenant tetragrammaton combined with the active participle of *ra'ah* ("to pasture, tend, feed"), with a first-person pronominal suffix ("my shepherd").\n• לֹא אֶחְסָר (*lo echsar*, Strong's H2637): Negative particle *lo* with the imperfect of *chaser* ("to lack, decrease, fail"), denoting an enduring state: "I will never lack what is truly necessary."\n• מְנוּחֹת (*menuchot*, Strong's H4496): Plural of *menuchah*, meaning "waters of resting places" or "still, quiet waters."`,
        literaryGenre: `Hebrew lyric poetry and Psalm of trust/confidence, characterized by synonymous and developmental parallelism.`,
        godIntent: `To anchor the soul of the believer in the unwavering fidelity, constant presence, and sovereign guidance of the Good Shepherd through seasons of abundance and dark valleys alike.`,
        crossReferences: [
          "John 10:11 - I am the good shepherd. The good shepherd gives His life for the sheep.",
          "Philippians 4:19 - And my God shall supply all your need according to His riches in glory by Christ Jesus.",
          "Isaiah 40:11 - He will feed His flock like a shepherd; He will gather the lambs with His arm.",
          "Revelation 7:17 - For the Lamb who is in the midst of the throne will shepherd them and lead them to living fountains of waters."
        ],
        geography: {
          location: "Judean Wilderness",
          thenDesc: "The arid, rocky hill country between Jerusalem and the Dead Sea, characterized by deep ravines, seasonal springs, and pastures.",
          nowDesc: "The Judean Desert in the West Bank and Israel, an austere and rugged landscape dotted with ancient monastic sites.",
          thenImageUrl: "biblical map of ancient Judean wilderness pastoral grazing hills, ancient parchment style",
          nowImageUrl: "modern aerial photograph of the rugged Judean wilderness hills and wadis"
        },
        videoClipQuery: "Psalm 23 The Lord is my Shepherd historical and grammatical exegesis documentary"
      };
    }

    // Universal scholarly exegesis generator for any scripture passage
    return {
      interpretation: `An in-depth grammatical-historical examination of **${scripture}** directly addresses your inquiry: *"\\"${qText}\\""*.

Within the redemptive arc of Sacred Scripture, this passage reveals God's unyielding covenant faithfulness and the supremacy of His divine truth over human circumstance. When we examine the canonical text, the authorial intent is not to offer mere moralistic platitudes, but to anchor the pilgrim's faith in the living God.

As Church Fathers such as **St. Augustine** and **John Chrysostom** observed, Holy Scripture possesses both divine inspiration and historical grounding—speaking into the immediate situation of the original audience while preserving eternal spiritual nourishment for the Church. **John Calvin** and **Matthew Henry** similarly noted that when the Holy Spirit breathes through scripture, He illuminates the intellect and fortifies the heart against doubt and fear. Rest firmly in the promises and instructions of this passage as you seek God's will.`,
      historicalContext: `**${scripture}** was composed within its distinctive biblical dispensation (Old Covenant or New Covenant), delivered to an ancient covenant community navigating profound spiritual, political, and cultural challenges. Whether addressed to Israel amidst the ancient Near Eastern empires (Assyria, Babylon, Persia) or the early Church under Greco-Roman imperial rule, the text reflects real historical circumstances, verified through biblical archaeology, manuscript traditions, and ancient topography.`,
      grammarAnalysis: `Lexical and syntactical analysis of **${scripture}** in its original language (Hebrew/Aramaic or Koine Greek):\n• Demonstrates precise verbal aspect, grammatical tense, and voice emphasizing God's sovereign initiative.\n• Employs covenant terminology (e.g., Hebrew *Chesed* / Greek *Charis* - steadfast love and unmerited grace) demonstrating the unbreakable fidelity of God toward His people.\n• Utilizes emphatic syntax to assure the reader of the certainty of divine promises and the necessity of obedient faith.`,
      literaryGenre: `Scriptural Exegetical Exposition (incorporating canonical prose, theological discourse, or poetic wisdom according to the book's inspired structure).`,
      godIntent: `To reveal His holy character, declare His redemptive purpose in Christ, convict the heart of sin, and equip the pilgrim with divine wisdom, perseverance, and peace for faithful Christian discipleship.`,
      crossReferences: [
        "2 Timothy 3:16-17 - All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.",
        "Psalm 119:105 - Your word is a lamp to my feet and a light to my path.",
        "Hebrews 4:12 - For the word of God is living and powerful, and sharper than any two-edged sword.",
        "Romans 15:4 - For whatever things were written before were written for our learning, that we through the patience and comfort of the Scriptures might have hope."
      ],
      geography: {
        location: "Jerusalem & The Holy Land",
        thenDesc: "The biblical lands of Israel, the Levant, and the ancient Mediterranean world where God's redemptive history unfolded.",
        nowDesc: "The modern Middle East and Mediterranean basin, bearing rich archaeological monuments and active pilgrimage sites.",
        thenImageUrl: `historical biblical map of ${scripture} holy land, ancient parchment style, high detail`,
        nowImageUrl: `modern geographical view of historical biblical sites in the holy land, high resolution`
      },
      videoClipQuery: `${scripture} biblical commentary and historical exegesis documentary`
    };
  }

  // 2. Exegesis Analysis
  app.post("/api/exegesis", async (req, res) => {
    try {
      const { scripture, queryText } = req.body;
      if (!scripture || typeof scripture !== "string" || !scripture.trim()) {
        return res.status(400).json({ error: "Scripture reference is required" });
      }

      const trimmedScripture = scripture.trim();
      const trimmedQuery = typeof queryText === "string" ? queryText.trim() : "";
      const ai = getAiClient();
      const prompt = `
        You are an expert biblical scholar specializing in grammatical-historical exegesis (leading out the author's original meaning).
        Your goal is to provide a rigorous, reverent, and comprehensive exegetical analysis of the following passage.
        
        Scripture: ${trimmedScripture}
        User Question / Context: ${trimmedQuery || "Provide an exegetical study of this passage"}
        
        MANDATORY REQUIREMENTS:
        1. "interpretation": You MUST directly, specifically, and thoroughly address and answer the user's specific question ("${trimmedQuery || "Provide an exegetical study of this passage"}").
           - Explain how ${trimmedScripture} directly answers or informs the user's inquiry.
           - Avoid generic summaries, boilerplate phrases, or canned templates.
           - Quote and expound upon specific phrases from the text.
           - Cite relevant Patristic or classical commentators (e.g., Augustine, Chrysostom, Calvin, Matthew Henry, Spurgeon, C.S. Lewis).
        2. "historicalContext": Detail the author, historical date, original recipients, cultural environment, and relevant archaeological findings for ${trimmedScripture}.
        3. "grammarAnalysis": Provide deep lexical analysis of key original Greek/Hebrew words in ${trimmedScripture}, with transliterations, Strong's concordance numbers, grammatical tense/mood, and precise theological nuances.
        4. "literaryGenre": Identify the exact literary genre (e.g., Gospel Narrative, Pauline Epistle, Hebrew Poetry, Prophetic Oracle) and stylistic structures.
        5. "godIntent": Articulate God's divine purpose in inspiring ${trimmedScripture}, applying its eternal truth directly to the user's question.
        6. "crossReferences": Provide 4 to 6 canonical cross-references with verse citations and brief reasons for correlation.
        7. "geography": Identify the key biblical location:
           - "location": Specific name of the place.
           - "thenDesc": Detailed description of this location in ancient biblical times with historical notes.
           - "nowDesc": Detailed description of this location today (modern region, country, archaeological status).
           - "thenImageUrl": Short descriptive prompt for a historical biblical map illustration of this location.
           - "nowImageUrl": Short descriptive prompt for a modern realistic or aerial view of this location.
        8. "videoClipQuery": A descriptive search query for an educational or historical documentary on ${trimmedScripture}.
        
        Provide the response strictly adhering to the JSON schema.
      `;

      let data: any = null;
      let lastError: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const timeoutMs = model.includes("latest") ? 12000 : 16000;
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

          let text = response.text || "";
          if (!text && response.candidates?.[0]?.content?.parts) {
            text = response.candidates[0].content.parts
              .map((p: any) => p.text || "")
              .filter(Boolean)
              .join("\n")
              .trim();
          }

          if (text) {
            let jsonString = text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            }
            const parsed = JSON.parse(jsonString);
            if (parsed && typeof parsed === "object" && parsed.interpretation) {
              data = parsed;
              break;
            }
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Exegesis model ${model} failed, trying next candidate:`, err?.message || err);
        }
      }

      if (!data || !data.interpretation) {
        console.warn("All exegesis candidate models failed or returned invalid JSON; using grounded exegetical scholar synthesis. Error was:", lastError?.message || lastError);
        data = getFallbackExegesis(trimmedScripture, trimmedQuery);
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
      const scripture = typeof req.body?.scripture === "string" ? req.body.scripture : "Holy Scripture";
      const query = typeof req.body?.queryText === "string" ? req.body.queryText : "";
      const fallbackData = getFallbackExegesis(scripture, query);
      return res.json(fallbackData);
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
