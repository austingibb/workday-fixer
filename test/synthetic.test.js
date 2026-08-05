const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { panel, page, REAL_PANELS } = require('./fixtures');

const SCRIPT_PATH =
  process.argv[2] || path.join(__dirname, '..', 'workday-resume-fixer.user.js');
const SCRIPT = fs.readFileSync(SCRIPT_PATH, 'utf8');

const RESUME = `# Austin Gibbons

## Experience

### Software Engineer
*Independent Consultant | Jun 2024 - Mar 2026 | Seattle WA*

- Built a **data analysis tool** for a client's NoSQL database to support operational investigations.
- Designed and built a real-time 2D game engine in C# using Godot (5,000+ LOC).
- Validated feature rollouts for clients via A/B testing.

### Software Engineer
*Amazon, Third Party Subscriptions | Mar 2022 - May 2024 | Seattle WA*

- Launched a renewal at list price feature across multiple SaaS subscription services.
- Owned and maintained distributed microservices handling vendor fulfillment integration.

### Software Engineer
*Galileo Financial Technologies | Oct 2019 - Jan 2021 | Salt Lake City UT*

- Maintained and enhanced a high-volume payment processing platform.
- Built banking integrations for banking-as-a-service customers.

### Internships

### Software Engineering Intern
*Microsoft | Sep 2018 - Oct 2019 | Salt Lake City UT*

- Shipped tooling used by the Windows shell team.

## Projects

### AI E-Ink Desk Agent
*Personal project | 2025 | Lehi UT*

- Should NOT be imported as a job.
`;

function build(panels) {
  const dom = new JSDOM(page(panels), { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const doc = window.document;

  window.confirm = () => true; // accept "delete the extras"
  window.alert = () => {};

  // Make the fixture's Add / Delete buttons behave like Workday's.
  let nextFkit = 100;
  const wireDelete = (btn) =>
    btn.addEventListener('click', () => btn.closest('[role="group"]').remove());
  doc.querySelectorAll('button').forEach((b) => {
    if (/delete/i.test(b.textContent)) wireDelete(b);
  });
  doc.querySelectorAll('button[data-automation-id="add-button"]').forEach((add) => {
    add.addEventListener('click', () => {
      const section = add.parentElement;
      const isWork = section.getAttribute('aria-labelledby') !== 'Education-section';
      if (!isWork) throw new Error('clicked the EDUCATION add button');
      const n = section.querySelectorAll('[data-fkit-id$="--null"]').length + 1;
      const tmp = doc.createElement('div');
      tmp.innerHTML = panel(n, nextFkit++);
      const el = tmp.firstElementChild;
      section.insertBefore(el, add);
      el.querySelectorAll('button').forEach((b) => {
        if (/delete/i.test(b.textContent)) wireDelete(b);
      });
    });
  });

  // Feed the userscript our markdown instead of opening a real file picker.
  window.FileReader = class {
    readAsText() {
      this.result = RESUME;
      setTimeout(() => this.onload && this.onload(), 0);
    }
  };
  const realClick = window.HTMLInputElement.prototype.click;
  window.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') {
      Object.defineProperty(this, 'files', {
        value: [{ name: 'resume.md' }],
        configurable: true,
      });
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

function read(doc) {
  return [...doc.querySelectorAll('[data-fkit-id^="workExperience-"][data-fkit-id$="--null"]')].map(
    (p) => ({
      title: p.querySelector('input[name="jobTitle"]').value,
      company: p.querySelector('input[name="companyName"]').value,
      location: p.querySelector('input[name="location"]').value,
      desc: p.querySelector('textarea').value,
    })
  );
}

let failures = 0;
function check(name, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) {
    failures++;
    if (extra !== undefined) console.log('        got:', JSON.stringify(extra));
  }
}

async function main() {
  // ---- Case 1: the real page — 5 mangled panels, resume has 4 jobs ---------
  {
    const { doc } = build(REAL_PANELS);
    const btn = doc.getElementById('wrf-btn');
    check('button injects into applyFlowMyExpPage', !!btn);
    check('button is first child of the page', doc.querySelector('[data-automation-id="applyFlowMyExpPage"]').firstElementChild === btn);

    btn.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
    await wait(3000);

    const rows = read(doc);
    check('extra 5th panel deleted -> 4 panels', rows.length === 4, rows.length);
    check('education panel untouched', doc.querySelector('input[name="schoolName"]').value === 'University of Utah');
    check('job 1 company filled from resume', rows[0] && rows[0].company === 'Independent Consultant', rows[0]);
    check('job 1 title', rows[0] && rows[0].title === 'Software Engineer', rows[0] && rows[0].title);
    check('job 1 location', rows[0] && rows[0].location === 'Seattle WA', rows[0] && rows[0].location);
    check(
      'job 1 bullets are bulleted + newline separated',
      rows[0] &&
        rows[0].desc ===
          '• Built a data analysis tool for a client\'s NoSQL database to support operational investigations.\n' +
          '• Designed and built a real-time 2D game engine in C# using Godot (5,000+ LOC).\n' +
          '• Validated feature rollouts for clients via A/B testing.',
      rows[0] && rows[0].desc
    );
    check('job 2 = Amazon', rows[1] && rows[1].company === 'Amazon, Third Party Subscriptions', rows[1] && rows[1].company);
    check('job 3 = Galileo', rows[2] && rows[2].company === 'Galileo Financial Technologies', rows[2] && rows[2].company);
    check('job 4 = Microsoft internship (title fixed)', rows[3] && rows[3].title === 'Software Engineering Intern' && rows[3].company === 'Microsoft', rows[3]);
    check('Projects entry NOT imported', !rows.some((r) => /E-Ink|Digital Guardian/.test(r.title + r.company)), rows.map((r) => r.title));
    check('toast reported success', /Filled 4 job/.test((doc.getElementById('wrf-toast') || {}).textContent || ''), (doc.getElementById('wrf-toast') || {}).textContent);
  }

  // ---- Case 2: fewer panels than jobs -> must click the WORK add button ----
  {
    const { doc } = build(REAL_PANELS.slice(0, 2));
    doc.getElementById('wrf-btn').dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
    await wait(4000);
    const rows = read(doc);
    check('grew from 2 panels to 4', rows.length === 4, rows.length);
    check('added panels filled', rows[3] && rows[3].company === 'Microsoft', rows[3]);
    check('education still has 1 entry', doc.querySelectorAll('[data-fkit-id^="education-"][data-fkit-id$="--null"]').length === 1);
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
  process.exit(failures ? 1 : 0);
}

main();
