// ==UserScript==
// @name         Workday Resume Fixer
// @namespace    https://github.com/austingibb/workday-fixer
// @version      1.0.0
// @description  Fix Workday's mangled "My Experience" parsing (titles, companies, locations, bullet/newline descriptions) from your clean resume Markdown.
// @author       Austin Gibbons
// @match        *://*.myworkdayjobs.com/*
// @match        *://*.myworkdaysite.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const BULLET = '• '; // "• "

  // ---------------------------------------------------------------------------
  // Markdown parsing
  // ---------------------------------------------------------------------------

  function cleanInline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '$1')          // bold
      .replace(/\*(.+?)\*/g, '$1')              // italic
      .replace(/`(.+?)`/g, '$1')                // inline code
      .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1') // escaped markdown chars
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Returns [{ title, company, location, bullets: [..] }] for the Experience
  // section only. A heading counts as a real job only if its next non-empty
  // line is an italic "*Company | dates | location*" meta line. That naturally
  // skips "### Internships" and stops before "## Projects".
  function parseResume(md) {
    const lines = md.split(/\r?\n/);
    const jobs = [];
    let inExp = false;
    let cur = null;

    const flush = () => {
      if (cur && cur.bullets.length) jobs.push(cur);
      cur = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const h2 = line.match(/^##\s+(.*)/);
      if (h2 && !/^###/.test(line)) {
        flush();
        inExp = /experience/i.test(h2[1]);
        continue;
      }
      if (!inExp) continue;

      const h3 = line.match(/^###\s+(.*)/);
      if (h3) {
        flush();
        // peek for the meta line
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const meta = lines[j] && lines[j].trim().match(/^\*(.+)\*$/);
        if (meta && meta[1].includes('|')) {
          const parts = meta[1].split('|').map((s) => s.trim());
          cur = {
            title: cleanInline(h3[1]),
            company: cleanInline(parts[0] || ''),
            location: cleanInline(parts[2] || ''),
            bullets: [],
          };
          i = j; // consume the meta line
        } else {
          cur = null; // heading without meta (e.g. Internships) -> not a job
        }
        continue;
      }

      if (cur) {
        const b = line.match(/^\s*[*+-]\s+(.*)/);
        if (b) cur.bullets.push(cleanInline(b[1]));
      }
    }
    flush();
    return jobs;
  }

  // ---------------------------------------------------------------------------
  // React-safe field setting
  // ---------------------------------------------------------------------------

  function setVal(el, value) {
    if (!el) return;
    const proto =
      el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // ---------------------------------------------------------------------------
  // Workday DOM helpers (scoped to the Work Experience section)
  // ---------------------------------------------------------------------------

  function workSection() {
    return document.querySelector('[aria-labelledby="Work-Experience-section"]');
  }

  function getPanels(section) {
    return [
      ...section.querySelectorAll(
        '[data-fkit-id^="workExperience-"][data-fkit-id$="--null"]'
      ),
    ];
  }

  function getDeleteButtons(section) {
    return [...section.querySelectorAll('button')].filter((b) =>
      /delete/i.test(b.textContent || '')
    );
  }

  function getAddButton(section) {
    return section.querySelector('button[data-automation-id="add-button"]');
  }

  async function setPanelCount(section, target, log) {
    // Add panels if we need more.
    let guard = 0;
    while (getPanels(section).length < target && guard++ < 20) {
      const add = getAddButton(section);
      if (!add) break;
      add.click();
      await sleep(350);
    }

    // Remove extras (from the bottom) if we have too many.
    const extra = getPanels(section).length - target;
    if (extra > 0) {
      const ok = confirm(
        `Your resume has ${target} job(s), but Workday created ` +
          `${target + extra}.\n\nDelete the ${extra} extra entry/entries ` +
          `from the bottom (e.g. junk parsed from Projects/Internships)?`
      );
      if (ok) {
        guard = 0;
        while (getPanels(section).length > target && guard++ < 20) {
          const dels = getDeleteButtons(section);
          if (!dels.length) break;
          dels[dels.length - 1].click();
          await sleep(350);
        }
      } else {
        log('Kept extra entries — only the first ' + target + ' were filled.');
      }
    }
  }

  function fillPanel(panel, job) {
    setVal(panel.querySelector('input[name="jobTitle"]'), job.title);
    setVal(panel.querySelector('input[name="companyName"]'), job.company);
    const loc = panel.querySelector('input[name="location"]');
    if (loc && job.location) setVal(loc, job.location);
    const desc = panel.querySelector('textarea');
    if (desc) setVal(desc, job.bullets.map((b) => BULLET + b).join('\n'));
  }

  async function applyResume(md, log) {
    const section = workSection();
    if (!section) {
      log('Could not find the Work Experience section on this page.');
      return;
    }
    const jobs = parseResume(md);
    if (!jobs.length) {
      log('No Experience entries found in that Markdown file.');
      return;
    }

    await setPanelCount(section, jobs.length, log);

    const panels = getPanels(section);
    const n = Math.min(panels.length, jobs.length);
    for (let i = 0; i < n; i++) {
      fillPanel(panels[i], jobs[i]);
      await sleep(120);
    }

    log(
      `Filled ${n} job(s): ` +
        jobs.slice(0, n).map((j) => j.company || j.title).join(', ') +
        '. Review before Save and Continue.'
    );
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  function toast(msg) {
    let el = document.getElementById('wrf-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wrf-toast';
      el.style.cssText =
        'position:fixed;z-index:2147483647;bottom:16px;right:16px;max-width:360px;' +
        'background:#0875e1;color:#fff;padding:12px 14px;border-radius:8px;' +
        'font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 8000);
  }

  function pickFileAndApply() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => applyResume(String(reader.result), toast);
      reader.readAsText(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  function injectButton() {
    const page = document.querySelector('[data-automation-id="applyFlowMyExpPage"]');
    if (!page || document.getElementById('wrf-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'wrf-btn';
    btn.type = 'button';
    btn.textContent = '🔧 Fix from resume (.md)';
    btn.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;margin:8px 0 16px;' +
      'background:#0875e1;color:#fff;border:0;border-radius:6px;cursor:pointer;' +
      'padding:8px 14px;font:600 13px system-ui,sans-serif';
    btn.addEventListener('click', pickFileAndApply);
    page.insertBefore(btn, page.firstChild);
  }

  // Workday is an SPA — keep trying to (re)inject the button as pages change.
  const obs = new MutationObserver(() => injectButton());
  obs.observe(document.body, { childList: true, subtree: true });
  injectButton();
})();
