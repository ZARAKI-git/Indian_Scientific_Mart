/**
 * Browser verification against a running production build.
 *   node qa/verify.mjs [baseUrl]    (needs puppeteer-core + local Chrome)
 * Checks: no horizontal scroll at each breakpoint, no console errors, fullpage
 * engine on home desktop only, reduced-motion fallback, JS-bundle-blocked
 * fallback (everything visible), touch/low-end tier, quote-list flow.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.QA_OUT ?? "qa/out";
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [[1440, 900], [1100, 800], [980, 760], [640, 900], [375, 812]];
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

async function page(opts = {}) {
  const p = await browser.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (opts.viewport) await p.setViewport(opts.viewport);
  if (opts.reduce) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  if (opts.lowEnd) await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }); });
  if (opts.blockBundles) {
    await p.setRequestInterception(true);
    p.on("request", (r) => (r.url().includes("/_next/static/chunks/") ? r.abort() : r.continue()));
  }
  return { p, errors };
}
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

// discover a product URL from the catalogue
const { p: d } = await page({ viewport: { width: 1280, height: 900 } });
await d.goto(`${BASE}/catalogue`, { waitUntil: "load", timeout: 60000 });
const productUrl = await d.$eval(".prow .nm a", (a) => a.getAttribute("href")).catch(() => null);
await d.close();
const PAGES = ["/", "/catalogue", "/catalogue?q=acetone", "/brands", "/brands/merck", productUrl, "/quote"].filter(Boolean);

// 1. overflow + console errors at every breakpoint
for (const [w, h] of WIDTHS) {
  for (const u of PAGES) {
    const { p, errors } = await page({ viewport: { width: w, height: h } });
    await p.goto(BASE + u, { waitUntil: "load", timeout: 60000 });
    await settle(900);
    const over = await p.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > de.clientWidth + 1 && getComputedStyle(el).position !== "fixed" && !el.closest(".windows,.cat-chips,.tbl-wrap,.track,.hero-media,[aria-hidden=true]");
      }).slice(0, 3).map((el) => el.className || el.tagName);
      return { sw: de.scrollWidth, cw: de.clientWidth, wide };
    });
    ok(`no horizontal scroll ${w}px ${u}`, over.sw <= over.cw, over.sw > over.cw ? `scrollWidth ${over.sw} > ${over.cw} ${over.wide.join(" | ")}` : "");
    ok(`no console errors ${w}px ${u}`, errors.length === 0, errors.slice(0, 2).join(" / "));
    if (u === "/" || u === "/catalogue" || u === productUrl) await p.screenshot({ path: path.join(OUT, `${w}${u.replace(/[^a-z0-9]+/gi, "_") || "_home"}.png`) });
    await p.close();
  }
}

// 2. fullpage engine: home desktop only; natural scroll elsewhere and on phones
{
  const { p } = await page({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 60000 }); await settle(1200);
  ok("home desktop uses fullpage engine", await p.evaluate(() => document.documentElement.classList.contains("fp")));
  const rail = await p.$$eval(".rail-nav button", (b) => b.length);
  ok("rail has 7 scenes", rail === 7, `rail=${rail}`);
  await p.mouse.move(700, 450); await p.mouse.wheel({ deltaY: 400 }); await settle(1700);
  const active = await p.evaluate(() => document.querySelector(".scene.is-active")?.id);
  ok("wheel advances to next scene", active === "supply", `active=${active}`);
  await p.keyboard.press("End"); await settle(1700);
  ok("End key goes to quote scene", await p.evaluate(() => document.querySelector(".scene.is-active")?.id) === "quote");
  await p.goto(BASE + "/catalogue", { waitUntil: "load", timeout: 60000 }); await settle(500);
  ok("client nav away from home restores natural scroll", !(await p.evaluate(() => document.documentElement.classList.contains("fp"))));
  await p.close();
}
{
  const { p } = await page({ viewport: { width: 375, height: 812 } });
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 60000 }); await settle(800);
  ok("home on phone uses natural scroll", !(await p.evaluate(() => document.documentElement.classList.contains("fp"))));
  await p.close();
}

// 3. reduced motion: no fullpage, nothing hidden
for (const u of ["/", "/brands"]) {
  const { p } = await page({ viewport: { width: 1440, height: 900 }, reduce: true });
  await p.goto(BASE + u, { waitUntil: "load", timeout: 60000 }); await settle(800);
  const r = await p.evaluate(() => ({ fp: document.documentElement.classList.contains("fp"),
    hidden: [...document.querySelectorAll("[data-a]")].filter((e) => getComputedStyle(e).opacity === "0").length }));
  ok(`reduced motion ${u}: no fullpage, all content visible`, !r.fp && r.hidden === 0, JSON.stringify(r));
  await p.close();
}

// 4. JS bundles blocked (GSAP never loads): page falls back to plain, fully visible
for (const u of ["/", "/catalogue", "/brands"]) {
  const { p } = await page({ viewport: { width: 1440, height: 900 }, blockBundles: true });
  await p.goto(BASE + u, { waitUntil: "load" }); await settle(4800);
  const r = await p.evaluate(() => ({ js: document.documentElement.classList.contains("js"),
    hidden: [...document.querySelectorAll("[data-a]")].filter((e) => getComputedStyle(e).visibility === "hidden" || getComputedStyle(e).opacity === "0").length,
    rows: document.querySelectorAll(".prow").length, h1: document.querySelector("h1")?.textContent?.slice(0, 40) }));
  ok(`bundles blocked ${u}: content visible`, !r.js && r.hidden === 0, JSON.stringify(r));
  await p.close();
}

// 5. touch / low-end tier: no tilt transforms on hover
{
  const { p } = await page({ viewport: { width: 1280, height: 900 }, lowEnd: true });
  await p.goto(BASE + "/brands", { waitUntil: "load", timeout: 60000 }); await settle(1500);
  const card = await p.$(".brand-card");
  if (card) { const b = await card.boundingBox(); await p.mouse.move(b.x + 10, b.y + 10); await settle(600); }
  const t = await p.$eval(".brand-card", (e) => getComputedStyle(e).transform).catch(() => "none");
  ok("low-end tier: tilt disabled", t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)", t);
  await p.close();
}

// 6. quote flow: add from catalogue → badge → /quote list → validation
{
  const { p } = await page({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + "/catalogue?q=acetone", { waitUntil: "load", timeout: 60000 }); await settle(600);
  await p.click(".prow .btn-add"); await settle(300);
  const badge = await p.$eval(".hdr .qbadge", (e) => e.textContent).catch(() => null);
  ok("add to quote updates header badge", badge === "1", `badge=${badge}`);
  await p.goto(BASE + "/quote", { waitUntil: "load", timeout: 60000 }); await settle(1800);
  ok("quote page lists the item", (await p.$$(".qitem")).length === 1);
  await p.$eval("#qform", (f) => f.requestSubmit()); await settle(300);
  const msg = await p.$eval("#formmsg", (e) => e.textContent);
  ok("empty name is rejected with the reference message", /Add your name/.test(msg), msg);
  await p.type("#n", "QA Test"); await p.type("#e", "not-an-email"); await p.$eval("#qform", (f) => f.requestSubmit()); await settle(300);
  const m2 = await p.$eval("#formmsg", (e) => e.textContent);
  ok("bad email is rejected", /doesn.t look right/.test(m2), m2);
  await p.reload({ waitUntil: "load", timeout: 60000 });
  ok("quote list persists across reloads (localStorage)", (await p.$$(".qitem")).length === 1);
  await p.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
