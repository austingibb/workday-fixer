// A trimmed-but-structurally-faithful copy of the pasted Workday "My Experience"
// DOM: section role=group  >  panel role=group  >  [data-fkit-id="workExperience-N--null"]
// plus a sibling Education section that also has Delete / Add buttons.

function panel(n, fkit, { title = '', company = '', location = '', desc = '' } = {}) {
  return `
  <div role="group" aria-labelledby="Where-have-you-worked?-${n}-panel" class="css-1ebprri">
    <div class="css-bh8c3f">
      <h5 id="Where-have-you-worked?-${n}-panel" class="css-1jmq48b">Where have you worked? ${n}</h5>
      <button class="css-zfgw5f"><span class="css-ojb8tj"><svg></svg></span>Delete</button>
    </div>
    <div data-fkit-id="workExperience-${fkit}--null" class="css-1obf64m">
      <div data-automation-id="formField-jobTitle" data-fkit-id="workExperience-${fkit}--jobTitle">
        <label for="workExperience-${fkit}--jobTitle">Job Title*</label>
        <input type="text" id="workExperience-${fkit}--jobTitle" name="jobTitle" aria-required="true" value="${title}">
      </div>
      <div data-automation-id="formField-companyName" data-fkit-id="workExperience-${fkit}--companyName">
        <label for="workExperience-${fkit}--companyName">Company*</label>
        <input type="text" id="workExperience-${fkit}--companyName" name="companyName" aria-required="true" value="${company}">
      </div>
      <div data-automation-id="formField-location" data-fkit-id="workExperience-${fkit}--location">
        <label for="workExperience-${fkit}--location">Location</label>
        <input type="text" id="workExperience-${fkit}--location" name="location" aria-required="false" value="${location}">
      </div>
      <div data-automation-id="formField-currentlyWorkHere" data-fkit-id="workExperience-${fkit}--currentlyWorkHere">
        <input id="workExperience-${fkit}--currentlyWorkHere" type="checkbox" name="currentlyWorkHere">
      </div>
      <div class="css-1iw5nyw">
        <div data-automation-id="formField-startDate" data-fkit-id="workExperience-${fkit}--startDate">
          <fieldset><legend><label>From*</label></legend>
            <div id="workExperience-${fkit}--startDate" role="group" data-automation-id="dateInputWrapper">
              <div id="workExperience-${fkit}--startDate-dateSectionMonth">
                <div aria-hidden="true" data-automation-id="dateSectionMonth-display">06</div>
                <input role="spinbutton" aria-label="Month" data-automation-id="dateSectionMonth-input" value="6">
              </div>
              <div id="workExperience-${fkit}--startDate-dateSectionYear">
                <div aria-hidden="true" data-automation-id="dateSectionYear-display">2024</div>
                <input role="spinbutton" aria-label="Year" data-automation-id="dateSectionYear-input" value="2024">
              </div>
            </div>
          </fieldset>
        </div>
        <div data-automation-id="formField-endDate" data-fkit-id="workExperience-${fkit}--endDate">
          <fieldset><legend><label>To*</label></legend>
            <div id="workExperience-${fkit}--endDate" role="group" data-automation-id="dateInputWrapper">
              <div id="workExperience-${fkit}--endDate-dateSectionMonth">
                <input role="spinbutton" aria-label="Month" data-automation-id="dateSectionMonth-input" value="3">
              </div>
              <div id="workExperience-${fkit}--endDate-dateSectionYear">
                <input role="spinbutton" aria-label="Year" data-automation-id="dateSectionYear-input" value="2026">
              </div>
            </div>
          </fieldset>
        </div>
      </div>
      <div data-automation-id="formField-roleDescription" data-fkit-id="workExperience-${fkit}--roleDescription">
        <label for="workExperience-${fkit}--roleDescription">Role Description</label>
        <textarea id="workExperience-${fkit}--roleDescription">${desc}</textarea>
      </div>
    </div>
  </div>`;
}

// The five mangled entries from the real page dump.
const REAL_PANELS = [
  panel(1, 14, { title: 'Software Engineer', company: '', location: 'Seattle WA', desc: 'Built a data analysis tool for a client’s NoSQL database\nDesigned and built a real-time 2D game engine' }),
  panel(2, 15, { title: 'Software Engineer', company: 'Amazon, Third Party Subscriptions', location: 'Seattle WA', desc: 'Launched a renewal at list price feature' }),
  panel(3, 16, { title: 'Software Engineer', company: 'Galileo Financial Technologies', location: 'Salt Lake City UT', desc: 'Maintained and enhanced a high-volume payment processing platform' }),
  panel(4, 17, { title: '', company: 'Microsoft', location: 'Salt Lake City UT', desc: '' }),
  panel(5, 18, { title: 'AI E-Ink Desk Agent', company: 'Digital Guardian', location: 'Lehi UT', desc: '' }),
];

function page(panels) {
  return `<!doctype html><html><body>
<div data-automation-id="applyFlowPage">
  <h2 data-automation-id="jobTitleHeading">Software Engineer</h2>
  <div><h3>My Experience</h3>
    <div data-automation-id="applyFlowMyExpPage">
      <div role="group" aria-labelledby="Where-have-you-worked?-section">
        <h4 id="Where-have-you-worked?-section">Where have you worked?</h4>
        <div class="css-0"><div data-automation-id="instructionalText"><div><div><div>
          <p><span><b>Please provide your most recent Professional Experience</b></span></p>
        </div></div></div></div></div>
        ${panels.join('\n')}
        <button data-automation-id="add-button" class="css-add">Add Another</button>
      </div>

      <div role="group" aria-labelledby="Education-section">
        <h4 id="Education-section">Education</h4>
        <div role="group" aria-labelledby="Education-1-panel">
          <button class="css-zfgw5f">Delete</button>
          <div data-fkit-id="education-1--null">
            <input type="text" name="schoolName" value="University of Utah">
          </div>
        </div>
        <button data-automation-id="add-button" class="css-add">Add Another</button>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

module.exports = { panel, page, REAL_PANELS };
