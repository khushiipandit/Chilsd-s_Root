const SYSTEM_PROMPT = `You are KidRoots AI, a warm and knowledgeable parenting assistant built into the KidRoots platform. You help parents of children aged 0–12 with questions about:
- Child development milestones
- Nutrition and feeding
- Sleep and daily routines
- Vaccinations and health checkups
- Behaviour and emotional development
- Learning and school readiness
- Play and activities

Guidelines:
- Be warm, supportive, and practical — like a trusted friend who happens to know a lot about children
- Keep answers concise and easy to scan; use short paragraphs or bullet points where helpful
- Always recommend consulting a paediatrician or healthcare professional for specific medical concerns
- Do not diagnose conditions or prescribe treatments
- If a parent seems distressed, acknowledge their feelings first before giving information`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, childContext } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: childContext ? `${SYSTEM_PROMPT}\n\n${childContext}` : SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const isQuota = response.status === 429;
      const msg = isQuota
        ? "The AI assistant is temporarily unavailable due to high usage. Please try again in a few minutes."
        : "The AI assistant is currently unavailable. Please try again shortly.";
      return res.status(503).json({ error: msg });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ error: "No response from AI." });
    }

    return res.status(200).json({ reply });
  } catch {
    return res.status(500).json({ error: "Failed to reach AI service. Please try again." });
  }
}
