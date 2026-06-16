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
  uses a different Workday host, add a `// @match` line for it.
- The script uses the React-safe native-setter trick so Workday actually
  registers the new field values (plain `input.value = ...` would be ignored).
- It re-injects the button as you navigate Workday's single-page app.
