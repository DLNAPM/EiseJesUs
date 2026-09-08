export const MODELS = {
  TEXT: "gemini-3.5-flash-lite",
  IMAGE: "gemini-2.5-flash-image",
};

export async function generateExegesis(scripture: string, queryText: string) {
  const tryFetch = async () => {
    const res = await fetch("/api/exegesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scripture, queryText }),
    });

    const rawText = await res.text();

    if (!res.ok) {
      let msg = `Server returned status ${res.status}`;
      try {
        const errObj = JSON.parse(rawText);
        if (errObj.message) msg = errObj.message;
        else if (errObj.error) msg = errObj.error;
      } catch {}
      throw new Error(msg);
    }

    if (!rawText || !rawText.trim()) {
      throw new Error("Empty response received from sanctuary service");
    }

    return JSON.parse(rawText);
  };

  try {
    return await tryFetch();
  } catch (firstError) {
    console.warn("Primary exegesis fetch attempt encountered issue, retrying...", firstError);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await tryFetch();
    } catch (secondError: any) {
      console.error("Secondary exegesis fetch failed:", secondError);
      throw new Error(secondError?.message || "Sanctuary scholarship service returned an empty response. Please try again.");
    }
  }
}

export async function fetchDefinition(word: string, context: string): Promise<string> {
  try {
    const res = await fetch("/api/define-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, context }),
    });

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    if (!rawText || !rawText.trim()) return "";
    const data = JSON.parse(rawText);
    return data.definition || "";
  } catch (error) {
    console.error("Fetch Definition Error:", error);
    throw error;
  }
}

export async function searchScriptureBySubject(subject: string): Promise<{reference: string, reason: string}[]> {
  try {
    const res = await fetch("/api/search-scriptures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });

    const rawText = await res.text();
    if (!res.ok || !rawText || !rawText.trim()) {
      return [];
    }

    const data = JSON.parse(rawText);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Search Scripture Error:", error);
    return [];
  }
}
