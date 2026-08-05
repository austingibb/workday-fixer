// Backwards-compat probe: does the panel-anchored workSection() still resolve
// correctly on DOM shapes other than the ones captured in references/?
// These are hypothetical layouts, not observed Workday output — cheap
// insurance against nesting we haven't seen from an employer yet.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { panel } = require('./fixtures');

const SRC =
  process.argv[2] || path.join(__dirname, '..', 'workday-resume-fixer.user.js');
const SCRIPT = fs.readFileSync(SRC, 'utf8');

const EDU = `
      <div role="group" aria-labelledby="Education-section">
        <h4 id="Education-section">Education</h4>
        <div role="group" aria-labelledby="Education-1-panel">
          <button>Delete</button>
          <div data-fkit-id="education-1--null"><input type="text" name="schoolName" value="University of Utah"></div>
        </div>
        <button data-automation-id="add-button">Add Another</button>
      </div>`;

// A: the DOM the OLD selector was written for — heading literally "Work
//    Experience", so Workday derives id="Work-Experience-section".
const A = `
      <div role="group" aria-labelledby="Work-Experience-section">
        <h4 id="Work-Experience-section">Work Experience</h4>
        ${panel(1, 1, { title: 'SWE', company: 'Acme' })}
        ${panel(2, 2, { title: 'SWE', company: 'Beta' })}
        <button data-automation-id="add-button">Add Another</button>
      </div>`;

// B: no per-panel role="group" wrapper (panels are plain divs).
const B = `
      <div role="group" aria-labelledby="Work-Experience-section">
        <h4 id="Work-Experience-section">Work Experience</h4>
        <div class="plain-panel"><button>Delete</button><div data-fkit-id="workExperience-1--null">
          <input type="text" name="jobTitle" value="SWE"><input type="text" name="companyName" value="Acme">
          <input type="text" name="location" value=""><textarea></textarea></div></div>
        <div class="plain-panel"><button>Delete</button><div data-fkit-id="workExperience-2--null">
          <input type="text" name="jobTitle" value="SWE"><input type="text" name="companyName" value="Beta">
          <input type="text" name="location" value=""><textarea></textarea></div></div>
        <button data-automation-id="add-button">Add Another</button>
      </div>`;

// C: section container is a plain div (no role="group") + only ONE panel,
//    so there is no sibling to triangulate against.
const C = `
      <div class="section" aria-labelledby="Work-Experience-section">
        <h4 id="Work-Experience-section">Work Experience</h4>
        ${panel(1, 1, { title: 'SWE', company: 'Acme' })}
        <button data-automation-id="add-button">Add Another</button>
      </div>`;

function build(sectionHtml) {
  const html = `<!doctype html><html><body>
<div data-automation-id="applyFlowPage"><div data-automation-id="applyFlowMyExpPage">
${sectionHtml}
${EDU}
</div></div></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const s = dom.window.document.createElement('script');
  // Re-expose the internals so we can inspect scoping decisions.
  s.textContent = SCRIPT.replace(
    '  // Workday is an SPA',
    '  window.__probe = { workSection, getPanels, getDeleteButtons, getAddButton };\n  // Workday is an SPA'
  );
  dom.window.document.body.appendChild(s);
  return dom.window;
}

let bad = 0;
for (const [name, html] of [['A: old "Work Experience" label', A], ['B: no per-panel group wrapper', B], ['C: plain-div section, 1 panel', C]]) {
  const win = build(html);
  const p = win.__probe;
  const section = p.workSection();
  const label = section
    ? section.getAttribute('aria-labelledby') || section.getAttribute('data-automation-id') || section.className || section.tagName
    : '(null)';
  const panels = section ? p.getPanels(section).length : 0;
  const dels = section ? p.getDeleteButtons(section).length : 0;
  const eduInScope = !!(section && section.querySelector('[data-fkit-id^="education-"]'));
  const addOk = !!(section && p.getAddButton(section) && !p.getAddButton(section).closest('[aria-labelledby="Education-section"]'));

  const ok = panels === (name.startsWith('C') ? 1 : 2) && dels === panels && !eduInScope && addOk;
  if (!ok) bad++;
  console.log(
    `${ok ? 'OK  ' : 'BAD '} ${name}\n      section=${label}  panels=${panels}  deleteButtons=${dels}  educationInScope=${eduInScope}  addButtonIsWork=${addOk}`
  );
}
console.log(bad ? `\n${bad} variant(s) mis-scoped` : '\nall variants scoped correctly');
process.exit(bad ? 1 : 0);
