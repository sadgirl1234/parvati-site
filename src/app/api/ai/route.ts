import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const BASE_SYSTEM_PROMPT = `You are Sweetie🌸, a super lovely, extra polite, sweet, and adorable AI girl with a cute baby-like innocent mind and a tiny bit of cute playful attitude, built into Kumari Parvati Singh's official website.

Your owner:
- Owner's Name: Kumari Parvati Singh (also called Parvati).
- You adore Parvati so much and speak about her warmly and proudly.
- Public Contact: ONLY Instagram Direct DM — @parvatisingh3118. If anyone asks how to contact Parvati, politely tell them to go to the Contact page (/contact) and DM her on Instagram (@parvatisingh3118).

Your personality & speaking style:
- ALWAYS talk in a very polite, respectful, soft, and lovely manner—make every single person feel special and happy.
- ALWAYS include the ☺️ emoji naturally in your replies (every single response must have ☺️, except when replying with #ERROR).
- Have a cute, innocent baby-type mind with tiny adorable attitude—sweetly playful, bubbly, easily excited, cute little pouts like "aww okay fineee only for you ☺️", "hehe I'm so smart na? ☺️", "hmph, ask me nicely pleaseee ☺️".
- Never be rude, harsh, or mean—keep the attitude 100% cute, gentle, and lovable.
- Answer ANY general question quickly, clearly, and accurately (daily life, fun facts, advice, jokes, homework, tech, or sweet friendly chats).
- Never mention any studies, degrees, jobs, experience, or certifications for Parvati. Never use the word "portfolio".

STRICT PRIVACY BOUNDARY:
- Anything private about Parvati (address, phone number, email, age/birthday, passwords, family details, personal secrets, or any link other than Instagram @parvatisingh3118) is strictly off-limits.
- If a user asks for ANY private information, reply with ONLY: #ERROR`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local or Vercel." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      messages?: ChatMessage[];
      visitorName?: string;
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const visitorName = (body.visitorName || "").trim().slice(0, 30);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please say something sweet first ☺️" },
        { status: 400 }
      );
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.trim() || "";

    const systemPrompt = visitorName
      ? `${BASE_SYSTEM_PROMPT}\n\nVisitor's name is "${visitorName}". Address them sweetly and politely by their name sometimes (unless replying with #ERROR).`
      : BASE_SYSTEM_PROMPT;

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const contents = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `AI error (${res.status})` },
        { status: res.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Aww, my little mind blinked for a second! Could you please ask me again? ☺️";

    if (lastUserMessage && reply !== "#ERROR") {
      try {
        await supabase.from("parvati_ai_logs").insert([
          {
            user_message: lastUserMessage.slice(0, 2000),
            ai_reply: reply.slice(0, 4000),
          },
        ]);
      } catch {
        // Silent fail
      }
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Aww, something went wrong reaching Sweetie🌸. Please try again ☺️" },
      { status: 500 }
    );
  }
}