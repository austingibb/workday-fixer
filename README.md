# Workday Resume Fixer

A Tampermonkey userscript that fixes Workday's mangled "My Experience" parsing
on job applications, using the clean Markdown source of your resume.

## What it fixes

Workday parses your uploaded **PDF**, which loses information. From your resume
Markdown (the source the PDFs are generated from), this script corrects:

- **Job titles** — e.g. restores `Software Engineer, Contract`.
- **Company names** — e.g. restores the full `Galileo Financial Technologies, Core Services`
  instead of Workday's truncated `Galileo Financial Technologies`.
- **Locations** — e.g. `Seattle, WA` (with the comma).
- **Role descriptions** — rejoins lines broken by PDF wrapping and puts one
  clean `• ` bullet per line, instead of Workday's bullet-less wall of text.
- **Junk entries** — offers to delete the extra work-experience panels Workday
  invents from your Projects/Internships/Skills sections.

Dates are left untouched (Workday usually parses month/year correctly).

## How it decides what's a job

It reads only the `## Experience` section. A `### Heading` is treated as a real
job **only if** its next line is an italic meta line:

```
### Software Engineer, Contract
*OxFACADE | Jun 2024 – March 2026 | Seattle, WA*

* bullet one
* bullet two
```

`### Internships` (plain lines, no meta) and everything under `## Projects` are
ignored automatically — matching "ignore anything after Galileo."

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Tampermonkey → **Dashboard** → **+** (Create a new script) → paste the
   contents of `workday-resume-fixer.user.js` → **File ▸ Save**.
   (Or open the `.user.js` file directly and Tampermonkey will offer to install.)

## Use

1. On a Workday application, reach the **My Experience** page (after Workday has
   auto-filled experience from your PDF).
2. Click the blue **🔧 Fix from resume (.md)** button near the top of the page.
3. Pick the matching Markdown file, e.g.
   `AustinResume_CoxAutomotive_SWE2.md`.
4. It fills/repairs the panels, adds or (with a confirm) removes panels to match
   your real job count, and shows a toast summary. **Review, then Save and Continue.**

## Notes

- Match list covers `*.myworkdayjobs.com` / `*.myworkdaysite.com`. If a company
  uses a different Workday host, add a `// @match` line for it. (If the button
  never appears on a Workday page, this is the first thing to check.)
- **Employers label this section differently.** NCR Voyix titles it "Where have
  you worked?", Warner Bros titles it "Work Experience", and Workday derives the
  section's `aria-labelledby` id from that text — so anything matching on the
  label only works for the one employer you tested. The script instead finds the
  section from the `workExperience-*` panels themselves and refuses to widen its
  scope into a sibling section (Education, Skills, Resume/CV), because it deletes
  extra entries from the bottom.
- The one case that *can't* be label-free: when Workday parsed nothing from your
  PDF, Work Experience / Education / Certifications render identically, so the
  heading text is the only signal. There the script guesses from the heading,
  clicks Add, and verifies a real `workExperience-*` panel appeared before
  filling anything — undoing the click if it didn't.
- The script uses the React-safe native-setter trick so Workday actually
  registers the new field values (plain `input.value = ...` would be ignored).
- It re-injects the button as you navigate Workday's single-page app.

## Reference pages

`references/` holds real "My Experience" pages saved from live applications —
two employers, plus the state where Workday parsed nothing from the PDF:

| File | Section heading | Work entries |
| --- | --- | --- |
| `reference_ncr_voyix_experience_page.html` | Where have you worked? | 6 |
| `reference_warnerbrors_filled_experience_page.html` | Work Experience | 6 |
| `reference_warnerbros_empty_experience_page.html` | Work Experience | 0 |

They are the test fixtures. To add another employer, save the My Experience page
and drop it in — capture the whole page, not just the section, so the sibling
sections are included (that's what proves the script won't touch them).

## Tests

```sh
npm install   # jsdom only; the userscript itself has no dependencies
npm test
```

The suite loads the real pages into jsdom, runs the actual userscript against
them, and asserts the fields it fills, the entries it deletes, and — just as
important — that Education, Skills and Resume/CV come out untouched. `npm test`
also runs the script against hypothetical DOM nestings we haven't seen from an
employer yet.

Any test takes an alternate script path as its first argument, which is handy
for checking a change against the previous version:

```sh
git show HEAD:workday-resume-fixer.user.js > /tmp/old.user.js
node test/real-pages.test.js /tmp/old.user.js
```
