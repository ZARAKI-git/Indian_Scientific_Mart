"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { quoteRepo } from "@/lib/repositories";
import { quoteNotifier } from "@/lib/quote/notifier";
import { NEEDS } from "@/components/quote/needs";

const Input = z.object({
  name: z.string().trim().min(1, "Add your name so the quote can be addressed to you.").max(80),
  institution: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "That email doesn't look right. Please check it."),
  phone: z.string().trim().max(20).regex(/^[+\d][\d\s\-()]{0,19}$|^$/, "Use digits, spaces and + only.").optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  needs: z.array(z.enum(NEEDS)).max(NEEDS.length).default([]),
  website: z.string().max(200).optional().default(""), // honeypot
  lines: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(100000), note: z.string().max(300).optional() }))
    .max(200).default([]),
});

export type QuoteResult =
  | { ok: true; ref: string; firstName: string; items: number; delivered: boolean }
  | { ok: false; field?: "name" | "email" | "phone" | "message"; error: string };

/* naive per-instance throttle: 5 submissions / 10 min / IP */
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now(), win = 10 * 60_000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

export async function submitQuote(raw: unknown): Promise<QuoteResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const field = issue.path[0];
    return { ok: false, field: (["name", "email", "phone", "message"] as const).find((f) => f === field), error: issue.message };
  }
  const v = parsed.data;
  // bots fill the hidden field: pretend success, store nothing (as the reference drops them)
  if (v.website) return { ok: true, ref: "—", firstName: v.name.split(" ")[0]!, items: 0, delivered: false };
  if (!v.lines.length && !v.message) return { ok: false, field: "message", error: "Add items from the catalogue or paste your list here." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (throttled(ip)) return { ok: false, error: "Too many requests from this connection. Please try again in a few minutes." };

  let stored;
  try {
    stored = await quoteRepo().create({ name: v.name, institution: v.institution, email: v.email, phone: v.phone,
      message: v.message, needs: v.needs, lines: v.lines });
  } catch (e) {
    console.error("[quote] store failed", e);
    return { ok: false, error: "We couldn't save your request just now. Your list is still here — please try again in a minute." };
  }
  let delivered = false;
  try {
    await quoteNotifier().notify(stored);
    await quoteRepo().markNotified(stored.id);
    delivered = true;
  } catch (e) {
    // stored safely; the office still sees it in /admin/quotes
    console.error("[quote] notify failed", e);
  }
  return { ok: true, ref: stored.id.slice(0, 8).toUpperCase(), firstName: v.name.split(" ")[0]!, items: stored.items.length, delivered };
}
