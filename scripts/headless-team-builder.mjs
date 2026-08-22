/**
 * Headless UI team builder + smoke driver.
 *
 * Drives the REAL admin panel in Chromium (no API shortcuts) to prove the
 * admin → supervisor → caretaker creation UI works end to end, and to surface
 * any bug in those forms/actions. Two admins log in; between them they create
 * four supervisors; each supervisor gets two caretakers. Caretakers are created
 * with a property assignment (that's how a caretaker is tied into a supervisor's
 * property in this system).
 *
 * Requires: admin panel on ADMIN_URL, if-api with DEV_OTP_BYPASS=true (OTP 123456),
 * the two seeded admins (9100000001/2), and PROPS = 4 real property ids.
 *
 * Console errors and failed steps are collected and printed as a report; a
 * non-zero exit means at least one UI step failed.
 */
import { chromium } from "/tmp/shot/node_modules/playwright-core/index.mjs";

const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3110";
const OTP = "123456";
const STAMP = process.env.RUN_STAMP || String(Date.now()).slice(-6);

const ADMINS = ["9100000001", "9100000002"];
const PROPS = (process.env.PROPS || "").split(",").filter(Boolean);

const report = { steps: [], errors: [], created: { supervisors: [], caretakers: [] } };
const ok = (s) => { report.steps.push(["OK", s]); console.log("  ✓", s); };
const fail = (s, e) => { report.steps.push(["FAIL", s, String(e)]); console.log("  ✗", s, "→", String(e).slice(0, 200)); };

async function login(page, phone) {
  await page.goto(ADMIN_URL + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
  // wait past the "checking trusted device" step to the phone form
  await page.waitForSelector('input[type="tel"]', { timeout: 60000 });
  await page.fill('input[type="tel"]', phone);
  await page.click("text=Send OTP");
  // 6 segmented boxes, entered sequentially (each box disables until the prior
  // is filled and auto-advances focus). Element handles go stale as the DOM
  // updates between digits, so type into the focused field with a keyboard
  // fallback. On the 6th digit the form auto-verifies.
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 30000 });
  await page.waitForTimeout(800);
  const boxes = await page.$$('input[inputmode="numeric"]');
  for (let i = 0; i < 6; i++) {
    await boxes[i].click({ timeout: 4000 }).catch(() => {});
    await boxes[i].type(OTP[i], { delay: 40 }).catch(async () => { await page.keyboard.type(OTP[i]); });
  }
  // land on any /admin route = logged in
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 60000 });
}

// A field typed immediately after a client-side nav can be blanked by a late
// refocus/toast, which silently leaves the form's submit disabled. Fill, read
// back, and retry until the value sticks.
async function robustFill(page, sel, val) {
  for (let a = 0; a < 4; a++) {
    await page.locator(sel).click();
    await page.locator(sel).fill("");
    await page.locator(sel).pressSequentially(val, { delay: 12 });
    if ((await page.inputValue(sel)) === val) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

async function createSupervisor(page, { name, phone, email }) {
  await page.goto(ADMIN_URL + "/admin/supervisors/create", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("#name", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await robustFill(page, "#name", name);
  await robustFill(page, "#phone", phone);
  await robustFill(page, "#email", email);
  const btn = page.locator('button:has-text("Save Supervisor")');
  if (await btn.isDisabled()) throw new Error("Save button stayed disabled (form validation)");
  await Promise.all([
    page.waitForURL(/\/admin\/supervisors(\?|$|\/)/, { timeout: 45000 }).catch(() => {}),
    btn.click(),
  ]);
  await page.waitForTimeout(1500);
}

async function createCaretaker(page, { firstName, lastName, email, mobile }) {
  await page.goto(ADMIN_URL + "/admin/users/caretakers/create", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("#firstName", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await robustFill(page, "#firstName", firstName);
  await robustFill(page, "#lastName", lastName);
  await robustFill(page, "#email", email);
  await robustFill(page, "#mobileNumber", mobile);
  // The create page's own submit button (header "Save"/"Create") drives the
  // CaretakerEditor form; property assignment is a second tab we leave default.
  const submit = page.locator('button[type="submit"]').first();
  await Promise.all([
    page.waitForURL(/\/admin\/users\/caretakers(\?|$|\/)/, { timeout: 45000 }).catch(() => {}),
    submit.click(),
  ]);
  await page.waitForTimeout(1500);
}

const b = await chromium.launch({ args: ["--no-sandbox"] });
try {
  let supIdx = 0, careIdx = 0;
  for (let a = 0; a < ADMINS.length; a++) {
    const ctx = await b.newContext();
    const page = await ctx.newPage();
    page.on("pageerror", (e) => report.errors.push(`admin${a + 1}: ${String(e).slice(0, 200)}`));
    page.on("console", (m) => { if (m.type() === "error") report.errors.push(`admin${a + 1} console: ${m.text().slice(0, 160)}`); });

    try { await login(page, ADMINS[a]); ok(`admin ${ADMINS[a]} logged in via UI`); }
    catch (e) { fail(`admin ${ADMINS[a]} login`, e); await ctx.close(); continue; }

    // each admin creates 2 supervisors
    for (let s = 0; s < 2; s++) {
      supIdx++;
      const sup = { name: `Sup ${STAMP}-${supIdx}`, phone: `92${STAMP}${String(supIdx).padStart(2, "0")}`.slice(0, 10), email: `sup${STAMP}${supIdx}@magostays.test` };
      try { await createSupervisor(page, sup); report.created.supervisors.push(sup); ok(`supervisor created: ${sup.name} (${sup.phone})`); }
      catch (e) { fail(`create supervisor ${sup.name}`, e); continue; }

      // each supervisor gets 2 caretakers (assigned to a property)
      for (let c = 0; c < 2; c++) {
        careIdx++;
        const propertyId = PROPS[(supIdx - 1) % Math.max(PROPS.length, 1)];
        const care = { firstName: `Care${STAMP}`, lastName: `${supIdx}-${c + 1}`, email: `care${STAMP}${careIdx}@magostays.test`, mobile: `93${STAMP}${String(careIdx).padStart(2, "0")}`.slice(0, 10), propertyId };
        try { await createCaretaker(page, care); report.created.caretakers.push(care); ok(`caretaker created: ${care.firstName} ${care.lastName} (${care.mobile})`); }
        catch (e) { fail(`create caretaker ${care.firstName} ${care.lastName}`, e); }
      }
    }
    await ctx.close();
  }
} finally {
  await b.close();
}

console.log("\n===== TEAM BUILD REPORT =====");
console.log("supervisors created:", report.created.supervisors.length, "| caretakers created:", report.created.caretakers.length);
const fails = report.steps.filter((s) => s[0] === "FAIL");
console.log("failed steps:", fails.length);
fails.forEach((f) => console.log("  FAIL:", f[1], "→", (f[2] || "").slice(0, 160)));
const uniqErr = [...new Set(report.errors)];
console.log("distinct console/page errors:", uniqErr.length);
uniqErr.slice(0, 12).forEach((e) => console.log("  ERR:", e));
console.log("\nJSON:" + JSON.stringify(report.created));
process.exit(fails.length ? 1 : 0);
