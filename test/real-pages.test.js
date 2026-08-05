// End-to-end against the three real captured Workday pages.
// The snapshots are static (no React), so we wire Add/Delete to behave the way
// Workday's do; everything else — structure, ids, scoping — is genuine.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const REFS = path.join(REPO, 'references');
const SRC = process.argv[2] || path.join(REPO, 'workday-resume-fixer.user.js');
const SCRIPT = fs.readFileSync(SRC, 'utf8');

const RESUME = `# Austin Gibbons

## Experience

### Software Engineer, Contract
*OxFACADE | Jun 2024 - Mar 2026 | Seattle, WA*

- Built a **data analysis tool** for a client's NoSQL database.
- Designed and built a real-time 2D game engine in C# using Godot.

### Software Engineer
*Amazon, Third Party Subscriptions | Mar 2022 - May 2024 | Seattle, WA*

- Launched a renewal at list price feature across SaaS subscription services.

### Software Engineer
*Galileo Financial Technologies, Core Services | Oct 2019 - Jan 2021 | Salt Lake City, UT*

- Maintained a high-volume payment processing platform.

## Projects

### AI E-Ink Desk Agent
*Personal project | 2025 | Lehi, UT*

- Must not be imported as a job.
`;

const PANEL = '[data-fkit-id^="workExperience-"][data-fkit-id$="--null"]';

function load(file) {
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const doc = window.document;
  window.confirm = () => true;
  window.alert = () => {};

  // A previous run's button is baked into one snapshot; drop it so injection
  // is exercised for real.
  const stale = doc.getElementById('wrf-btn');
  if (stale) stale.remove();

  const wireDelete = (btn) => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', () => {
      const g = btn.closest('[role="group"][aria-labelledby$="-panel"]') || btn.closest('.css-1ebprri') || btn.parentElement;
      g.remove();
    });
  };
  doc.querySelectorAll('button').forEach((b) => {
    if (/^delete$/i.test(b.textContent.trim())) wireDelete(b);
  });

  // Model Workday's Add: clone the section's own last panel (or synthesize a
  // blank one) so added entries carry that section's fkit prefix.
  let seq = 900;
  doc.querySelectorAll('button[data-automation-id="add-button"]').forEach((add) => {
    add.addEventListener('click', () => {
      const section = add.closest('[aria-labelledby$="-section"]');
      const label = section.getAttribute('aria-labelledby');
      const prefix = /work|employ/i.test(label) ? 'workExperience' : label.split('-')[0].toLowerCase();
      const last = section.querySelector(`[data-fkit-id^="${prefix}-"][data-fkit-id$="--null"]:last-of-type`);
      const lasts = section.querySelectorAll(`[data-fkit-id$="--null"]`);
      const src = lasts.length ? lasts[lasts.length - 1] : null;
      const id = `${prefix}-${seq++}`;
      let panelEl;
      if (src) {
        panelEl = src.cloneNode(true);
        panelEl.setAttribute('data-fkit-id', `${id}--null`);
        panelEl.querySelectorAll('input, textarea').forEach((f) => {
          if (f.type !== 'checkbox') f.value = '';
        });
      } else {
        panelEl = doc.createElement('div');
        panelEl.setAttribute('data-fkit-id', `${id}--null`);
        panelEl.innerHTML =
          '<input type="text" name="jobTitle"><input type="text" name="companyName">' +
          '<input type="text" name="location"><textarea></textarea>';
      }
      const wrap = doc.createElement('div');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-labelledby', `${label.replace('-section', '')}-${seq}-panel`);
      const del = doc.createElement('button');
      del.textContent = 'Delete';
      wireDelete(del);
      wrap.appendChild(del);
      wrap.appendChild(panelEl);
      add.closest('.css-1ebprri') ? section.insertBefore(wrap, add.closest('.css-1ebprri')) : section.appendChild(wrap);
    });
  });

  window.FileReader = class {
    readAsText() {
      this.result = RESUME;
      setTimeout(() => this.onload && this.onload(), 0);
    }
  };
  const realClick = window.HTMLInputElement.prototype.click;
  window.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') {
      Object.defineProperty(this, 'files', { value: [{ name: 'r.md' }], configurable: true });
      this.dispatchEvent(new window.Event('change'));
      return;
    }
    return realClick.apply(this, arguments);
  };

  const s = doc.createElement('script');
  s.textContent = SCRIPT;
  doc.body.appendChild(s);
  return { window, doc };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, c, extra) => {
  console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`);
  if (!c) {
    failures++;
    if (extra !== undefined) console.log('          got:', JSON.stringify(extra));
  }
};

async function run(file, label) {
  console.log(`\n--- ${label} ---`);
  const { window, doc } = load(path.join(REFS, file));
  const btn = doc.getElementById('wrf-btn');
  check('button injected', !!btn);
  if (!btn) return;

  const eduBefore = doc.querySelectorAll('[data-fkit-id^="education-"][data-fkit-id$="--null"]').length;
  const skillsBefore = doc.querySelectorAll('[data-fkit-id="skills--null"]').length;
  const resumeBefore = doc.querySelectorAll('[data-fkit-id="resumeAttachments--null"]').length;

  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(5000);

  const rows = [...doc.querySelectorAll(PANEL)].map((p) => ({
    title: (p.querySelector('input[name="jobTitle"]') || {}).value,
    company: (p.querySelector('input[name="companyName"]') || {}).value,
    location: (p.querySelector('input[name="location"]') || {}).value,
    desc: (p.querySelector('textarea') || {}).value,
  }));

  check('3 work panels remain', rows.length === 3, rows.length);
  check('job 1 title restored', rows[0] && rows[0].title === 'Software Engineer, Contract', rows[0] && rows[0].title);
  check('job 1 company restored', rows[0] && rows[0].company === 'OxFACADE', rows[0] && rows[0].company);
  check('job 1 location keeps comma', rows[0] && rows[0].location === 'Seattle, WA', rows[0] && rows[0].location);
  check('job 1 bullets', rows[0] && rows[0].desc === "• Built a data analysis tool for a client's NoSQL database.\n• Designed and built a real-time 2D game engine in C# using Godot.", rows[0] && rows[0].desc);
  check('job 3 full company name', rows[2] && rows[2].company === 'Galileo Financial Technologies, Core Services', rows[2] && rows[2].company);
  check('Projects entry not imported', !rows.some((r) => /E-Ink/.test(r.title)), rows.map((r) => r.title));

  check('education untouched', doc.querySelectorAll('[data-fkit-id^="education-"][data-fkit-id$="--null"]').length === eduBefore, eduBefore);
  check('skills untouched', doc.querySelectorAll('[data-fkit-id="skills--null"]').length === skillsBefore);
  check('resume attachment untouched', doc.querySelectorAll('[data-fkit-id="resumeAttachments--null"]').length === resumeBefore);
  const toast = doc.getElementById('wrf-toast');
  check('success toast', /Filled 3 job/.test((toast || {}).textContent || ''), (toast || {}).textContent);
}

async function main() {
  await run('reference_ncr_voyix_experience_page.html', 'NCR Voyix — "Where have you worked?" (6 panels)');
  await run('reference_warnerbrors_filled_experience_page.html', 'Warner Bros filled — "Work Experience" (6 panels)');
  await run('reference_warnerbros_empty_experience_page.html', 'Warner Bros empty — no panels at all');
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
  process.exit(failures ? 1 : 0);
}
main();
