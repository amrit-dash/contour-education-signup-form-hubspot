/* Contour Form 1 logic — source of truth: github.com/contour-tech/contour-education-signup-form-hubspot */
var ContourForm1Logic = function() {
  "use strict";
  var FIELD_SELECTORS = {
    contactType: '[name="web_form_contact_type"]',
    intakeYear: '[name="which_year_are_you_interested_in_tutoring_for_"]',
    location: '[name="state_territory_country"]',
    programInterest: '[name="program_interest"]',
    interestedSubjects: '[name="web_form__interested_subject"]',
    campus: '[name="web_form__preferred_campuses"]',
    yearLevel: '[name="year_level"]',
    schoolText: '[name="school_text"]',
    schoolCode: '[name="school_code"]',
    acaraId: '[name="acara_id"]',
    emailTemp: '[name="email_2"]',
    noProgramWaitlist: '[name="join_no_program_waitlist"]',
    referral: '[name="referral"]'
  };
  var FIELD_WRAPPER_CLASS = "hs-form-field";
  var VALID_LOCATIONS = [ "VIC", "NSW", "QLD", "SA", "ACT", "TAS", "WA", "NT", "United Kingdom", "New Zealand", "Overseas" ];
  var PROGRAM_CARD_CONFIG = [ {
    match: /education|tutoring/i,
    title: "Year 7 - 12 Tutoring",
    description: "Expert tutoring for in-depth understanding and results",
    pillText: "Available all year levels",
    pillClass: "contour-pill--blue",
    logoUrl: "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/6a0bbf0cd57f2b816bcc79fb_Final%20EDUCATION%20horizontal%20logo.svg"
  }, {
    match: /test\s*prep|selective/i,
    title: "Selective Entry",
    description: "Preparing junior students for selective school examinations",
    pillText: "Years 6–8 only",
    pillClass: "contour-pill--green",
    logoUrl: "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/6a0bbed5fdbd2c829b5e4e7c_Final%20TESTPREP%20Charcoal%20horizontal%20logo.svg"
  }, {
    match: /med\s*prep|ucat/i,
    title: "Medical Entry",
    description: "UCAT tutoring and medical interview coaching",
    pillText: "Year 10+ & Graduated",
    pillClass: "contour-pill--purple",
    logoUrl: "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/6a0bbed5058c7ec65b1a454e_Final%20MEDPREP%20Charcoal%20horizontal%20logo.svg"
  } ];
  var UK_TOKEN = "United Kingdom";
  var UCAT_UK_PATTERN = /UCAT\s*\(UK\)/i;
  var UCAT_ANZ_PATTERN = /UCAT\s*\(ANZ\)/i;
  var CATEGORY_DISPLAY_ORDER = [ "Science", "Mathematics", "English", "TestPrep", "MedPrep", "Other" ];
  var CATEGORY_DISPLAY_NAMES = {
    TestPrep: "Selective Entry",
    MedPrep: "Medical Entry"
  };
  function subjectMatchesLocation(subjectState, selectedLocation) {
    if (!subjectState) return true;
    if (subjectState === "ANZ") return !!selectedLocation && selectedLocation !== UK_TOKEN;
    if (subjectState === "UK") return selectedLocation === UK_TOKEN;
    return subjectState === selectedLocation;
  }
  function subjectMatchesPrograms(subjectProgram, selectedPrograms) {
    if (subjectProgram === null) return true;
    return selectedPrograms.indexOf(subjectProgram) !== -1;
  }
  function subjectMatchesDelivery(classification) {
    return classification.delivery === "Term";
  }
  function subjectMatchesIntake(classification, selectedIntakeYear) {
    if (!classification.intake) return true;
    if (!selectedIntakeYear) return true;
    return classification.intake.indexOf(selectedIntakeYear) !== -1;
  }
  function parseStructuredSubjectValue(rawValue) {
    if (!rawValue || rawValue.indexOf(":") === -1) return null;
    var pairs = rawValue.split("|");
    var parsed = {};
    for (var i = 0; i < pairs.length; i++) {
      var idx = pairs[i].indexOf(":");
      if (idx === -1) continue;
      var key = pairs[i].slice(0, idx).trim();
      var value = pairs[i].slice(idx + 1).trim();
      parsed[key] = value;
    }
    if (!parsed.code || !parsed.program) return null;
    return parsed;
  }
  function structuredYearListToLevels(yearStr) {
    if (!yearStr || yearStr === "ALL") return null;
    return yearStr.split(",").map(function(token) {
      var trimmed = token.trim();
      return trimmed === "Graduated" ? "Graduated" : "Year " + trimmed;
    });
  }
  function classificationFromStructuredValue(parsed) {
    var state = !parsed.state || parsed.state === "ALL" ? null : parsed.state;
    var intake = parsed.intake ? parsed.intake.split(",").map(function(s) {
      return s.trim();
    }) : null;
    return {
      program: parsed.program,
      state: state,
      category: parsed.category || parsed.program,
      yearsShown: structuredYearListToLevels(parsed.year),
      delivery: parsed.delivery || "Term",
      intake: intake,
      code: parsed.code,
      subject: parsed.subject || null,
      structured: true
    };
  }
  function parseStructuredCampusValue(rawValue) {
    if (!rawValue || rawValue.indexOf(":") === -1) return null;
    var pairs = rawValue.split("|");
    var parsed = {};
    for (var i = 0; i < pairs.length; i++) {
      var idx = pairs[i].indexOf(":");
      if (idx === -1) continue;
      var key = pairs[i].slice(0, idx).trim();
      var value = pairs[i].slice(idx + 1).trim();
      parsed[key] = value;
    }
    if (!parsed.code) return null;
    return parsed;
  }
  function classificationFromStructuredCampusValue(parsed) {
    return {
      code: parsed.code,
      state: !parsed.state || parsed.state === "ALL" ? null : parsed.state,
      country: parsed.country || null
    };
  }
  var formRoot = null;
  function q(selector) {
    return formRoot.querySelector(selector);
  }
  function qAll(selector) {
    return Array.prototype.slice.call(formRoot.querySelectorAll(selector));
  }
  function fieldWrapper(el) {
    if (!el) return null;
    return el.closest ? el.closest("." + FIELD_WRAPPER_CLASS) : null;
  }
  function showFieldWrapper(el) {
    var wrap = fieldWrapper(el);
    if (wrap) wrap.style.removeProperty("display");
  }
  function hideFieldWrapper(el) {
    var wrap = fieldWrapper(el);
    if (wrap) wrap.style.display = "none";
  }
  function toggleFieldWrapper(el, shouldShow) {
    if (shouldShow) showFieldWrapper(el); else hideFieldWrapper(el);
  }
  function getValue(selector) {
    var el = q(selector);
    return el ? el.value || "" : "";
  }
  function getCheckedValues(selector) {
    return qAll(selector + ":checked").map(function(el) {
      return el.value;
    });
  }
  function setCheckboxChecked(inputEl, checked) {
    if (!inputEl) return;
    if (inputEl.checked !== checked) {
      inputEl.click();
    }
  }
  function optionWrapper(inputEl) {
    return inputEl.closest(".contour-program-card") || inputEl.closest("li") || (inputEl.parentElement && inputEl.parentElement.tagName === "LABEL" ? inputEl.parentElement : null) || inputEl.parentElement;
  }
  function optionLabelText(inputEl) {
    var wrap = optionWrapper(inputEl);
    return wrap ? wrap.textContent.trim() : "";
  }
  function showOption(inputEl) {
    var wrap = optionWrapper(inputEl);
    if (wrap) wrap.style.removeProperty("display");
  }
  function hideOption(inputEl) {
    var wrap = optionWrapper(inputEl);
    if (wrap) wrap.style.display = "none";
    setCheckboxChecked(inputEl, false);
  }
  function setHiddenValue(selector, value) {
    var el = q(selector);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    el.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  }
  function matchCardConfig(inputEl, index) {
    var haystack = (inputEl.value || "") + " " + optionLabelText(inputEl);
    for (var i = 0; i < PROGRAM_CARD_CONFIG.length; i++) {
      if (PROGRAM_CARD_CONFIG[i].match.test(haystack)) return PROGRAM_CARD_CONFIG[i];
    }
    console.warn('Contour Form 1 logic: Program Interest option "' + haystack.trim() + "\" didn't match a known card pattern — falling back to positional order.");
    return PROGRAM_CARD_CONFIG[index] || null;
  }
  function enhanceCampusLabels() {
    var options = qAll(FIELD_SELECTORS.campus);
    options.forEach(function(opt) {
      var wrap = optionWrapper(opt);
      if (!wrap || wrap.querySelector(".contour-campus-address")) return;
      var span = wrap.querySelector("input + span");
      if (!span) return;
      var fullText = span.textContent;
      var match = fullText.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (!match) return;
      var mainText = match[1].trim();
      var addressText = match[2].trim();
      span.textContent = "";
      span.classList.add("contour-campus-label");
      var mainSpan = document.createElement("span");
      mainSpan.className = "contour-campus-name";
      mainSpan.textContent = mainText;
      span.appendChild(mainSpan);
      span.appendChild(document.createTextNode(" "));
      var addressSpan = document.createElement("span");
      addressSpan.className = "contour-campus-address";
      addressSpan.textContent = addressText;
      span.appendChild(addressSpan);
    });
  }
  function enhanceProgramInterestCards() {
    var checkboxes = qAll(FIELD_SELECTORS.programInterest);
    var gridApplied = false;
    checkboxes.forEach(function(inputEl, index) {
      if (inputEl.closest(".contour-program-card")) return;
      var config = matchCardConfig(inputEl, index);
      var nativeWrapper = inputEl.closest("li") || inputEl.parentElement;
      var sharedParent = nativeWrapper.parentNode;
      var card = document.createElement("label");
      card.className = "contour-program-card";
      var badge = document.createElement("span");
      badge.className = "contour-program-card__badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "✓";
      card.appendChild(badge);
      var body = document.createElement("span");
      body.className = "contour-program-card__body";
      var logoPlaceholder = document.createElement("span");
      logoPlaceholder.className = "contour-program-card__logo-placeholder";
      logoPlaceholder.setAttribute("aria-hidden", "true");
      if (config && config.logoUrl) {
        logoPlaceholder.classList.add("contour-program-card__logo-placeholder--has-logo");
        var logoImg = document.createElement("img");
        logoImg.className = "contour-program-card__logo";
        logoImg.src = config.logoUrl;
        logoImg.alt = "";
        logoPlaceholder.appendChild(logoImg);
      }
      body.appendChild(logoPlaceholder);
      var titleEl = document.createElement("span");
      titleEl.className = "contour-program-card__title";
      titleEl.textContent = config ? config.title : optionLabelText(inputEl);
      body.appendChild(titleEl);
      if (config) {
        var descEl = document.createElement("span");
        descEl.className = "contour-program-card__description";
        descEl.textContent = config.description;
        body.appendChild(descEl);
        var pillEl = document.createElement("span");
        pillEl.className = "contour-program-card__pill " + config.pillClass;
        pillEl.textContent = config.pillText;
        body.appendChild(pillEl);
      }
      card.appendChild(body);
      card.insertBefore(inputEl, card.firstChild);
      function syncSelectedState() {
        card.classList.toggle("contour-program-card--selected", inputEl.checked);
      }
      inputEl.addEventListener("change", syncSelectedState);
      syncSelectedState();
      nativeWrapper.parentNode.replaceChild(card, nativeWrapper);
      if (!gridApplied && sharedParent) {
        enforceProgramCardGrid(sharedParent);
        gridApplied = true;
      }
    });
  }
  function enforceProgramCardGrid(ul) {
    var mq = window.matchMedia("(max-width: 700px)");
    function apply() {
      ul.style.display = "grid";
      ul.style.gap = "14px";
      ul.style.gridTemplateColumns = mq.matches ? "1fr" : "repeat(3, minmax(0, 1fr))";
    }
    apply();
    mq.addEventListener("change", apply);
    var observer = new MutationObserver(apply);
    observer.observe(ul, {
      attributes: true,
      attributeFilter: [ "class" ]
    });
  }
  function enforceContactTypeLayout(ul) {
    var mq = window.matchMedia("(max-width: 767px)");
    function apply() {
      ul.style.display = "flex";
      ul.style.flexDirection = mq.matches ? "column" : "row";
      ul.style.gap = mq.matches ? "0.75rem" : "1.25rem";
    }
    apply();
    mq.addEventListener("change", apply);
    var observer = new MutationObserver(apply);
    observer.observe(ul, {
      attributes: true,
      attributeFilter: [ "class" ]
    });
  }
  function enforceContactTypeLayoutIfPresent() {
    var contactTypeUl = formRoot.querySelector(".hs-fieldtype-radio .input > ul.inputs-list");
    if (contactTypeUl) enforceContactTypeLayout(contactTypeUl);
  }
  var CONTACT_TYPE_ILLUSTRATIONS = [ {
    match: /student/i,
    url: "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/6a66e39e97ac4cd2dff8015f_Workbook%20Outline%202.avif"
  }, {
    match: /guardian/i,
    url: "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/69af5e98ec0cb906f867e85d_Special%20events.avif"
  } ];
  function matchContactTypeIllustration(labelText) {
    for (var i = 0; i < CONTACT_TYPE_ILLUSTRATIONS.length; i++) {
      if (CONTACT_TYPE_ILLUSTRATIONS[i].match.test(labelText)) return CONTACT_TYPE_ILLUSTRATIONS[i];
    }
    return null;
  }
  function enhanceContactTypeIllustrations() {
    var radios = qAll(FIELD_SELECTORS.contactType);
    radios.forEach(function(radio) {
      var wrap = optionWrapper(radio);
      if (!wrap || wrap.querySelector(".contour-contact-type-illustration")) return;
      var label = wrap.querySelector("label.hs-form-radio-display");
      if (!label) return;
      var config = matchContactTypeIllustration(optionLabelText(radio));
      if (!config) return;
      var img = document.createElement("img");
      img.className = "contour-contact-type-illustration";
      img.src = config.url;
      img.alt = "";
      label.classList.add("contour-contact-type-has-illustration");
      label.insertBefore(img, label.firstChild);
    });
  }
  function subjectMatchesYearLevel(classification, yearLevelValue) {
    if (!yearLevelValue) return true;
    if (classification.yearsShown === null) return true;
    return classification.yearsShown.indexOf(yearLevelValue) !== -1;
  }
  function isProgramEligibleFromSubjects(programValue, location, yearLevel, intakeYear) {
    var subjectInputs = qAll(FIELD_SELECTORS.interestedSubjects);
    for (var i = 0; i < subjectInputs.length; i++) {
      var classification = getClassification(subjectInputs[i]);
      if (classification.program !== programValue) continue;
      if (!subjectMatchesLocation(classification.state, location)) continue;
      if (!subjectMatchesYearLevel(classification, yearLevel)) continue;
      if (!subjectMatchesDelivery(classification)) continue;
      if (!subjectMatchesIntake(classification, intakeYear)) continue;
      return true;
    }
    return false;
  }
  function hasNativeRequiredMark(fieldWrap) {
    return !!fieldWrap.querySelector('label .hs-form-required:not([class*="contour-"])');
  }
  function createRequiredMarkUpdater(fieldSelectorKey, className) {
    var mark = null;
    return function(shouldShow) {
      if (!mark) {
        var field = q(FIELD_SELECTORS[fieldSelectorKey]);
        var fieldWrap = field ? fieldWrapper(field) : null;
        if (!fieldWrap) return;
        if (hasNativeRequiredMark(fieldWrap)) return;
        var label = fieldWrap.querySelector("label");
        mark = document.createElement("span");
        mark.className = "hs-form-required " + className;
        mark.textContent = "*";
        mark.style.display = "none";
        if (label) label.appendChild(mark); else fieldWrap.insertBefore(mark, fieldWrap.firstChild);
      }
      mark.style.display = shouldShow ? "" : "none";
    };
  }
  var updateProgramInterestRequiredMark = createRequiredMarkUpdater("programInterest", "contour-program-interest-required");
  var updateCampusRequiredMark = createRequiredMarkUpdater("campus", "contour-campus-required");
  var updateSubjectsRequiredMark = createRequiredMarkUpdater("interestedSubjects", "contour-subjects-required");
  function evaluateProgramInterestOptions() {
    var location = getValue(FIELD_SELECTORS.location);
    var yearLevel = getValue(FIELD_SELECTORS.yearLevel);
    var intakeYear = getValue(FIELD_SELECTORS.intakeYear);
    var options = qAll(FIELD_SELECTORS.programInterest);
    var anyEligible = false;
    var eligibleOptions = [];
    options.forEach(function(opt) {
      var programValue = opt.value;
      var eligible = !!location && !!yearLevel && !!intakeYear && isProgramEligibleFromSubjects(programValue, location, yearLevel, intakeYear);
      if (eligible) {
        anyEligible = true;
        eligibleOptions.push(opt);
      }
      var card = opt.closest(".contour-program-card");
      if (card) card.classList.toggle("contour-program-card--disabled", !eligible);
      if (!eligible) setCheckboxChecked(opt, false);
      opt.disabled = !eligible;
    });
    var anyChecked = options.some(function(opt) {
      return opt.checked;
    });
    if (eligibleOptions.length === 1 && !anyChecked) {
      setCheckboxChecked(eligibleOptions[0], true);
    }
    showFieldWrapper(q(FIELD_SELECTORS.programInterest));
    updateProgramInterestLocationHint(!location || !yearLevel || !intakeYear);
    updateProgramInterestRequiredMark(anyEligible);
    updateNoProgramsAvailableMessage(location, yearLevel, intakeYear, anyEligible);
  }
  function ensureProgramInterestLocationHint() {
    var existing = formRoot.querySelector("#contour-program-interest-location-hint");
    if (existing) return existing;
    var programField = q(FIELD_SELECTORS.programInterest);
    var fieldWrap = programField ? fieldWrapper(programField) : null;
    if (!fieldWrap) return null;
    var hint = document.createElement("p");
    hint.id = "contour-program-interest-location-hint";
    hint.className = "contour-program-interest-location-hint";
    hint.textContent = "Select your location, year level, and intake year to see available programs";
    var label = fieldWrap.querySelector("label");
    if (label && label.parentNode) {
      label.parentNode.insertBefore(hint, label.nextSibling);
    } else {
      fieldWrap.insertBefore(hint, fieldWrap.firstChild);
    }
    return hint;
  }
  function updateProgramInterestLocationHint(shouldShow) {
    var hint = ensureProgramInterestLocationHint();
    if (!hint) return;
    hint.style.display = shouldShow ? "" : "none";
  }
  function ensureNoProgramsMessage() {
    var existing = formRoot.querySelector("#contour-no-programs-message");
    if (existing) return existing;
    var container = document.createElement("div");
    container.id = "contour-no-programs-message";
    container.className = "contour-no-programs-message";
    container.style.display = "none";
    var text = document.createElement("p");
    text.className = "contour-no-programs-message__text";
    container.appendChild(text);
    var programField = q(FIELD_SELECTORS.programInterest);
    var fieldWrap = programField ? fieldWrapper(programField) : null;
    if (fieldWrap && fieldWrap.parentNode) {
      fieldWrap.parentNode.insertBefore(container, fieldWrap.nextSibling);
    } else if (formRoot) {
      formRoot.appendChild(container);
    }
    var waitlistField = q(FIELD_SELECTORS.noProgramWaitlist);
    var waitlistWrap = waitlistField ? fieldWrapper(waitlistField) : null;
    if (waitlistWrap) container.appendChild(waitlistWrap);
    return container;
  }
  function getNoProgramsMessageText(location, yearLevel, intakeYear) {
    var DEFAULT_MESSAGE = "We don't currently offer any programs for your location and year level, join the waitlist to be notified when new programs become available";
    if (intakeYear !== "2026") return DEFAULT_MESSAGE;
    var programValues = qAll(FIELD_SELECTORS.programInterest).map(function(opt) {
      return opt.value;
    });
    var wouldBeEligibleFor2027 = programValues.some(function(programValue) {
      return isProgramEligibleFromSubjects(programValue, location, yearLevel, "2027");
    });
    if (wouldBeEligibleFor2027) {
      return "We don't currently offer any programs for your location and year level in 2026, update your intake year to 2027 to see more options";
    }
    return DEFAULT_MESSAGE;
  }
  function updateNoProgramsAvailableMessage(location, yearLevel, intakeYear, anyEligible) {
    var shouldShow = !!location && !!yearLevel && !!intakeYear && !anyEligible;
    var message = ensureNoProgramsMessage();
    message.style.display = shouldShow ? "" : "none";
    if (shouldShow) {
      var textEl = message.querySelector(".contour-no-programs-message__text");
      if (textEl) textEl.textContent = getNoProgramsMessageText(location, yearLevel, intakeYear);
    } else {
      var waitlistField = q(FIELD_SELECTORS.noProgramWaitlist);
      setCheckboxChecked(waitlistField, false);
    }
  }
  var YEAR_13_LOCATIONS = [ "United Kingdom", "New Zealand", "Overseas" ];
  function evaluateYearLevelOptions() {
    var select = q(FIELD_SELECTORS.yearLevel);
    if (!select) return;
    var location = getValue(FIELD_SELECTORS.location);
    var intakeYear = getValue(FIELD_SELECTORS.intakeYear);
    var year13Eligible = YEAR_13_LOCATIONS.indexOf(location) !== -1;
    var year5Blocked = intakeYear === "2026";
    Array.prototype.forEach.call(select.options, function(opt) {
      if (opt.value === "Year 13") {
        opt.hidden = !year13Eligible;
        opt.disabled = !year13Eligible;
        return;
      }
      if (opt.value === "Year 5") {
        if (!opt.hasAttribute("data-original-text")) {
          opt.setAttribute("data-original-text", opt.textContent);
        }
        var originalText = opt.getAttribute("data-original-text");
        opt.disabled = year5Blocked;
        opt.textContent = year5Blocked ? originalText + " - Subjects coming in 2027" : originalText;
      }
    });
    if (!year13Eligible && select.value === "Year 13") {
      select.value = "";
      select.dispatchEvent(new Event("change", {
        bubbles: true
      }));
    }
    if (year5Blocked && select.value === "Year 5") {
      select.value = "";
      select.dispatchEvent(new Event("change", {
        bubbles: true
      }));
    }
  }
  var subjectClassificationCache = new WeakMap;
  var updateSchoolRequiredMark = createRequiredMarkUpdater("schoolText", "contour-school-required");
  function evaluateSchoolFieldVisibility() {
    var input = q(FIELD_SELECTORS.schoolText);
    if (!input) return;
    var location = getValue(FIELD_SELECTORS.location);
    var shouldHide = YEAR_13_LOCATIONS.indexOf(location) !== -1;
    toggleFieldWrapper(input, !shouldHide);
    updateSchoolRequiredMark(!shouldHide);
    if (shouldHide) {
      var codeInput = q(FIELD_SELECTORS.schoolCode);
      var acaraInput = q(FIELD_SELECTORS.acaraId);
      if (input.value) setHiddenValue(FIELD_SELECTORS.schoolText, "");
      if (codeInput && codeInput.value) setHiddenValue(FIELD_SELECTORS.schoolCode, "");
      if (acaraInput && acaraInput.value) setHiddenValue(FIELD_SELECTORS.acaraId, "");
    }
  }
  function setFieldLabelText(fieldSelectorKey, text) {
    var field = q(FIELD_SELECTORS[fieldSelectorKey]);
    var wrap = field ? fieldWrapper(field) : null;
    if (!wrap) return;
    var label = wrap.querySelector("label");
    if (!label) return;
    var spans = label.querySelectorAll("span");
    for (var i = 0; i < spans.length; i++) {
      if (!/hs-form-required/.test(spans[i].className)) {
        spans[i].textContent = text;
        return;
      }
    }
    var node = label.firstChild;
    while (node && node.nodeType !== 3) node = node.nextSibling;
    if (node) node.nodeValue = text; else label.insertBefore(document.createTextNode(text), label.firstChild);
  }
  function evaluateIntakeYearDependents() {
    var intake = getValue(FIELD_SELECTORS.intakeYear);
    var yearSelect = q(FIELD_SELECTORS.yearLevel);
    if (yearSelect) {
      yearSelect.disabled = !intake;
      if (!intake && yearSelect.value) {
        yearSelect.value = "";
        yearSelect.dispatchEvent(new Event("change", {
          bubbles: true
        }));
      }
      setFieldLabelText("yearLevel", intake ? "Year level in " + intake : "Current Year Level");
    }
    var schoolInput = q(FIELD_SELECTORS.schoolText);
    if (schoolInput) {
      var location = getValue(FIELD_SELECTORS.location);
      schoolInput.disabled = !intake || !location;
      setFieldLabelText("schoolText", intake ? "School in " + intake : "Current School");
    }
  }
  function injectDisabledFieldStyles() {
    if (document.getElementById("contour-disabled-field-styles")) return;
    var style = document.createElement("style");
    style.id = "contour-disabled-field-styles";
    style.textContent = ".hs-form select:disabled, .hs-form input:disabled { opacity: 0.55; background-color: #f1f0ec; cursor: not-allowed; }";
    document.head.appendChild(style);
  }
  function getClassification(inputEl) {
    if (subjectClassificationCache.has(inputEl)) {
      return subjectClassificationCache.get(inputEl);
    }
    var structuredParsed = parseStructuredSubjectValue(inputEl.value);
    var classification;
    if (structuredParsed) {
      classification = classificationFromStructuredValue(structuredParsed);
    } else {
      console.warn('Contour Form 1 logic: subject option "' + optionLabelText(inputEl) + '" has no valid structured value — always shown until fixed.');
      classification = {
        program: null,
        state: null,
        category: "Other",
        yearsShown: null,
        delivery: "Term",
        intake: null,
        code: null,
        subject: null,
        structured: false
      };
    }
    subjectClassificationCache.set(inputEl, classification);
    return classification;
  }
  var categoryHeaderMap = {};
  function enhanceInterestedSubjectsCategories() {
    var checkboxes = qAll(FIELD_SELECTORS.interestedSubjects);
    if (checkboxes.length === 0) return;
    var firstWrapper = optionWrapper(checkboxes[0]);
    var listParent = firstWrapper ? firstWrapper.parentNode : null;
    if (!listParent) return;
    var buckets = {};
    checkboxes.forEach(function(inputEl) {
      var classification = getClassification(inputEl);
      var category = classification.category || "Other";
      if (!buckets[category]) buckets[category] = [];
      buckets[category].push(optionWrapper(inputEl));
    });
    var orderedCategories = CATEGORY_DISPLAY_ORDER.concat(Object.keys(buckets).filter(function(c) {
      return CATEGORY_DISPLAY_ORDER.indexOf(c) === -1;
    }));
    orderedCategories.forEach(function(category) {
      var items = buckets[category];
      if (!items || items.length === 0) return;
      var header = document.createElement("li");
      header.className = "contour-subject-category-header";
      header.textContent = CATEGORY_DISPLAY_NAMES[category] || category;
      listParent.appendChild(header);
      categoryHeaderMap[category] = header;
      items.forEach(function(li) {
        listParent.appendChild(li);
      });
    });
  }
  function evaluateInterestedSubjectsOptions() {
    var location = getValue(FIELD_SELECTORS.location);
    var yearLevel = getValue(FIELD_SELECTORS.yearLevel);
    var selectedPrograms = getCheckedValues(FIELD_SELECTORS.programInterest);
    var selectedIntakeYear = getValue(FIELD_SELECTORS.intakeYear);
    var options = qAll(FIELD_SELECTORS.interestedSubjects);
    var anyVisible = false;
    var anyVisibleByCategory = {};
    options.forEach(function(opt) {
      var classification = getClassification(opt);
      var locationOk = subjectMatchesLocation(classification.state, location);
      var programOk = subjectMatchesPrograms(classification.program, selectedPrograms);
      var yearOk = subjectMatchesYearLevel(classification, yearLevel);
      var deliveryOk = subjectMatchesDelivery(classification);
      var intakeOk = subjectMatchesIntake(classification, selectedIntakeYear);
      var shouldShow = !!location && selectedPrograms.length > 0 && locationOk && programOk && yearOk && deliveryOk && intakeOk;
      shouldShow ? showOption(opt) : hideOption(opt);
      if (shouldShow) {
        anyVisible = true;
        var category = classification.category || "Other";
        anyVisibleByCategory[category] = true;
      }
    });
    Object.keys(categoryHeaderMap).forEach(function(category) {
      categoryHeaderMap[category].style.display = anyVisibleByCategory[category] ? "" : "none";
    });
    toggleFieldWrapper(q(FIELD_SELECTORS.interestedSubjects), anyVisible);
    updateSubjectsRequiredMark(anyVisible);
    evaluateSubjectExclusions();
  }
  function subjectExclusionKey(classification) {
    if (classification.program !== "Education") return null;
    if (!classification.subject) return null;
    return classification.state + "|" + classification.subject;
  }
  function ensureSubjectExclusionNote(opt) {
    var wrap = optionWrapper(opt);
    if (!wrap) return null;
    var note = wrap.querySelector(".contour-subject-exclusion-note");
    if (note) return note;
    note = document.createElement("span");
    note.className = "contour-subject-exclusion-note";
    note.style.display = "none";
    wrap.appendChild(note);
    return note;
  }
  function evaluateSubjectExclusions() {
    var options = qAll(FIELD_SELECTORS.interestedSubjects);
    var checkedByKey = {};
    options.forEach(function(opt) {
      if (!opt.checked) return;
      var key = subjectExclusionKey(getClassification(opt));
      if (key) checkedByKey[key] = opt;
    });
    options.forEach(function(opt) {
      var wrap = optionWrapper(opt);
      var isVisible = wrap && wrap.style.display !== "none";
      var key = subjectExclusionKey(getClassification(opt));
      var blockingOption = key ? checkedByKey[key] : null;
      var blocked = isVisible && !!blockingOption && blockingOption !== opt;
      var note = ensureSubjectExclusionNote(opt);
      opt.disabled = blocked;
      if (wrap) wrap.classList.toggle("contour-subject-option--blocked", blocked);
      if (note) {
        if (blocked) {
          note.textContent = "You can only select one level of this subject";
          note.style.display = "";
        } else {
          note.style.display = "none";
        }
      }
    });
  }
  var campusClassificationCache = new WeakMap;
  function getCampusClassification(inputEl) {
    if (campusClassificationCache.has(inputEl)) {
      return campusClassificationCache.get(inputEl);
    }
    var parsed = parseStructuredCampusValue(inputEl.value);
    var classification;
    if (parsed) {
      classification = classificationFromStructuredCampusValue(parsed);
    } else {
      console.warn('Contour Form 1 logic: campus option "' + optionLabelText(inputEl) + '" has no valid structured value — always shown until fixed.');
      classification = {
        code: null,
        state: null,
        country: null
      };
    }
    campusClassificationCache.set(inputEl, classification);
    return classification;
  }
  function evaluateCampusOptions() {
    var location = getValue(FIELD_SELECTORS.location);
    var selectedPrograms = getCheckedValues(FIELD_SELECTORS.programInterest);
    var options = qAll(FIELD_SELECTORS.campus);
    var isMedPrepOnly = selectedPrograms.length === 1 && selectedPrograms[0] === "MedPrep";
    if (isMedPrepOnly) {
      options.forEach(function(opt) {
        var isOnline = getCampusClassification(opt).code === "ONLINE";
        setCheckboxChecked(opt, isOnline);
      });
      toggleFieldWrapper(q(FIELD_SELECTORS.campus), false);
      updateCampusRequiredMark(false);
      return;
    }
    var fieldShouldShow = selectedPrograms.length > 0;
    options.forEach(function(opt) {
      var classification = getCampusClassification(opt);
      var shouldShow = fieldShouldShow && subjectMatchesLocation(classification.state, location);
      shouldShow ? showOption(opt) : hideOption(opt);
    });
    toggleFieldWrapper(q(FIELD_SELECTORS.campus), fieldShouldShow);
    updateCampusRequiredMark(fieldShouldShow);
  }
  function fixRadioCardClickArea() {
    qAll(".hs-fieldtype-radio .hs-form-radio-display").forEach(function(label) {
      label.addEventListener("click", function(e) {
        var input = label.querySelector('input[type="radio"]');
        if (!input || e.target === input) return;
        e.preventDefault();
        if (!input.checked) input.click();
      }, true);
    });
  }
  function fixCheckboxCardClickArea() {
    qAll(".hs-fieldtype-checkbox .hs-form-checkbox-display").forEach(function(label) {
      label.addEventListener("click", function(e) {
        var input = label.querySelector('input[type="checkbox"]');
        if (!input || e.target === input) return;
        e.preventDefault();
        input.click();
      }, true);
    });
  }
  function fixProgramCardClickArea() {
    qAll(".contour-program-card").forEach(function(label) {
      label.addEventListener("click", function(e) {
        var input = label.querySelector('input[type="checkbox"]');
        if (!input || e.target === input) return;
        e.preventDefault();
        input.click();
      }, true);
    });
  }
  var PREFETCH_ENDPOINT = "";
  var EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function splitMultiValue(raw) {
    if (!raw) return [];
    return String(raw).split(";").map(function(s) {
      return s.trim();
    }).filter(function(s) {
      return s.length > 0;
    });
  }
  function setSelectOrTextValue(selector, value) {
    var el = q(selector);
    if (!el || value === undefined || value === null || value === "") return;
    el.value = value;
    el.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    el.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  }
  function setCheckboxValues(selector, values) {
    if (!values || values.length === 0) return;
    qAll(selector).forEach(function(opt) {
      if (values.indexOf(opt.value) !== -1 && !opt.disabled) {
        setCheckboxChecked(opt, true);
      }
    });
  }
  function applyPrefill(contact) {
    setSelectOrTextValue('[name="firstname"]', contact.firstname);
    setSelectOrTextValue('[name="lastname"]', contact.lastname);
    setSelectOrTextValue('[name="phone"]', contact.phone);
    setSelectOrTextValue(FIELD_SELECTORS.location, contact.state_territory_country);
    setSelectOrTextValue(FIELD_SELECTORS.intakeYear, contact.which_year_are_you_interested_in_tutoring_for_);
    setSelectOrTextValue(FIELD_SELECTORS.yearLevel, contact.year_level);
    if (contact.school_text) {
      setSelectOrTextValue(FIELD_SELECTORS.schoolText, contact.school_text);
      setSelectOrTextValue(FIELD_SELECTORS.schoolCode, contact.school_code || "");
      setSelectOrTextValue(FIELD_SELECTORS.acaraId, contact.acara_id || "");
      var schoolInput = q(FIELD_SELECTORS.schoolText);
      if (schoolInput) setTimeout(function() {
        schoolInput.dispatchEvent(new Event("blur"));
      }, 200);
    }
    setCheckboxValues(FIELD_SELECTORS.programInterest, splitMultiValue(contact.program_interest));
    setCheckboxValues(FIELD_SELECTORS.interestedSubjects, splitMultiValue(contact.web_form__interested_subject));
    setCheckboxValues(FIELD_SELECTORS.campus, splitMultiValue(contact.web_form__preferred_campuses));
    setSelectOrTextValue(FIELD_SELECTORS.referral, contact.referral);
  }
  function prefetchPost(path, payload) {
    return fetch(PREFETCH_ENDPOINT + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }
  function enhanceEmailPrefill() {
    if (!PREFETCH_ENDPOINT) return;
    var emailInput = q(FIELD_SELECTORS.emailTemp);
    if (!emailInput) return;
    var wrap = fieldWrapper(emailInput) || emailInput.parentElement;
    var box = document.createElement("div");
    box.id = "contour-prefill-offer";
    box.className = "contour-prefill-offer";
    box.style.display = "none";
    var message = document.createElement("p");
    message.className = "contour-prefill-offer__message";
    box.appendChild(message);
    var codeRow = document.createElement("div");
    codeRow.className = "contour-prefill-offer__code-row";
    codeRow.style.display = "none";
    var codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.inputMode = "numeric";
    codeInput.maxLength = 6;
    codeInput.placeholder = "6-digit code";
    codeInput.className = "contour-prefill-offer__code-input";
    codeRow.appendChild(codeInput);
    var confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Prefill my details";
    confirmBtn.className = "contour-prefill-offer__confirm";
    codeRow.appendChild(confirmBtn);
    box.appendChild(codeRow);
    var errorEl = document.createElement("p");
    errorEl.className = "contour-prefill-offer__error";
    errorEl.style.display = "none";
    box.appendChild(errorEl);
    wrap.appendChild(box);
    var lastRequestedEmail = null;
    function reset() {
      box.style.display = "none";
      codeRow.style.display = "none";
      errorEl.style.display = "none";
      codeInput.value = "";
    }
    emailInput.addEventListener("input", function() {
      reset();
      lastRequestedEmail = null;
    });
    emailInput.addEventListener("blur", function() {
      var email = emailInput.value.trim();
      if (!EMAIL_SHAPE.test(email) || email === lastRequestedEmail) return;
      lastRequestedEmail = email;
      prefetchPost("/request", {
        email: email
      }).then(function(data) {
        if (!data || !data.found) return;
        if (emailInput.value.trim() !== email) return;
        message.textContent = "Looks like you've signed up with us before. We've emailed a 6-digit code to " + email + " — enter it below to prefill your details.";
        box.style.display = "";
        codeRow.style.display = "";
      }).catch(function(err) {
        console.warn("Contour Form 1 logic: prefetch request failed —", err);
      });
    });
    confirmBtn.addEventListener("click", function() {
      var email = emailInput.value.trim();
      var code = codeInput.value.trim();
      if (!code) return;
      confirmBtn.disabled = true;
      prefetchPost("/confirm", {
        email: email,
        code: code
      }).then(function(data) {
        confirmBtn.disabled = false;
        if (data && data.ok && data.contact) {
          applyPrefill(data.contact);
          message.textContent = "Your details have been prefilled from your previous signup. Please review before submitting.";
          codeRow.style.display = "none";
          errorEl.style.display = "none";
          return;
        }
        errorEl.textContent = "That code didn't match. Please check the email and try again.";
        errorEl.style.display = "";
      }).catch(function(err) {
        confirmBtn.disabled = false;
        errorEl.textContent = "Something went wrong verifying the code. Please try again.";
        errorEl.style.display = "";
        console.warn("Contour Form 1 logic: prefetch confirm failed —", err);
      });
    });
  }
  var CALENDLY_URLS = {
    anz: "https://calendly.com/contourmedprep/welcome-consultation-anz",
    uk: "https://calendly.com/contourmedprep/welcome-consultation-uk"
  };
  function isTestprepSelected() {
    var checkedSubjects = qAll(FIELD_SELECTORS.interestedSubjects + ":checked");
    for (var i = 0; i < checkedSubjects.length; i++) {
      if (getClassification(checkedSubjects[i]).program === "TestPrep") return true;
    }
    return false;
  }
  function isUcatSelected() {
    var checkedSubjects = qAll(FIELD_SELECTORS.interestedSubjects + ":checked");
    for (var i = 0; i < checkedSubjects.length; i++) {
      var labelText = optionLabelText(checkedSubjects[i]);
      if (UCAT_UK_PATTERN.test(labelText) || UCAT_ANZ_PATTERN.test(labelText)) return true;
    }
    return false;
  }
  function loadCalendlyScript(callback) {
    if (window.Calendly) {
      callback();
      return;
    }
    var existing = document.getElementById("contour-calendly-script");
    if (existing) {
      existing.addEventListener("load", callback);
      return;
    }
    var script = document.createElement("script");
    script.id = "contour-calendly-script";
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = callback;
    document.body.appendChild(script);
  }
  function ensureWelcomeConsultationContainer() {
    var existing = formRoot.querySelector("#contour-welcome-consultation");
    if (existing) return existing;
    var wrapper = document.createElement("div");
    wrapper.id = "contour-welcome-consultation";
    wrapper.style.display = "none";
    var heading = document.createElement("div");
    heading.className = "contour-welcome-consultation__heading";
    heading.textContent = "Book Your Welcome Consultation";
    wrapper.appendChild(heading);
    var copy = document.createElement("p");
    copy.className = "contour-welcome-consultation__copy";
    copy.textContent = "New UCAT students are required to book a Welcome Consultation before a trial can be booked. Please register your consultation below before completing the rest of this form.";
    wrapper.appendChild(copy);
    var widgetContainer = document.createElement("div");
    widgetContainer.className = "contour-welcome-consultation__widget";
    wrapper.appendChild(widgetContainer);
    var campusField = q(FIELD_SELECTORS.campus);
    var campusFieldWrap = campusField ? fieldWrapper(campusField) : null;
    var submitBlock = formRoot.querySelector(".hs-submit");
    if (campusFieldWrap && campusFieldWrap.parentNode) {
      campusFieldWrap.parentNode.insertBefore(wrapper, campusFieldWrap.nextSibling);
    } else if (submitBlock && submitBlock.parentNode) {
      submitBlock.parentNode.insertBefore(wrapper, submitBlock);
    } else {
      formRoot.appendChild(wrapper);
    }
    return wrapper;
  }
  function renderWelcomeConsultation() {
    var wrapper = ensureWelcomeConsultationContainer();
    var ucat = isUcatSelected();
    var testprep = isTestprepSelected();
    if (!ucat && !testprep) {
      wrapper.style.display = "none";
      return;
    }
    wrapper.style.display = "";
    var copyEl = wrapper.querySelector(".contour-welcome-consultation__copy");
    if (copyEl) {
      var audience = ucat && testprep ? "UCAT and Selective Entry" : ucat ? "UCAT" : "Selective Entry";
      copyEl.textContent = "New " + audience + " students are required to book a Welcome Consultation before a trial can be booked. Please register your consultation below before completing the rest of this form.";
    }
    var location = getValue(FIELD_SELECTORS.location);
    var isUk = location === UK_TOKEN;
    var baseUrl = isUk ? CALENDLY_URLS.uk : CALENDLY_URLS.anz;
    var firstname = getValue('[name="firstname"]');
    var lastname = getValue('[name="lastname"]');
    var email = getValue(FIELD_SELECTORS.emailTemp);
    var fullName = (firstname + " " + lastname).trim();
    var params = [];
    if (fullName) params.push("name=" + encodeURIComponent(fullName));
    if (email) params.push("email=" + encodeURIComponent(email));
    var queryString = params.join("&");
    var fullUrl = baseUrl + (queryString ? "?" + queryString : "");
    var widgetContainer = wrapper.querySelector(".contour-welcome-consultation__widget");
    widgetContainer.innerHTML = "";
    loadCalendlyScript(function() {
      Calendly.initInlineWidget({
        url: fullUrl,
        parentElement: widgetContainer
      });
    });
  }
  function attachListeners() {
    var locationEl = q(FIELD_SELECTORS.location);
    if (locationEl) {
      locationEl.addEventListener("change", function() {
        evaluateProgramInterestOptions();
        evaluateInterestedSubjectsOptions();
        evaluateCampusOptions();
        evaluateYearLevelOptions();
        evaluateSchoolFieldVisibility();
        evaluateIntakeYearDependents();
        renderWelcomeConsultation();
      });
    }
    qAll(FIELD_SELECTORS.programInterest).forEach(function(el) {
      el.addEventListener("change", function() {
        evaluateInterestedSubjectsOptions();
        evaluateCampusOptions();
        renderWelcomeConsultation();
      });
    });
    qAll(FIELD_SELECTORS.interestedSubjects).forEach(function(el) {
      el.addEventListener("change", function() {
        evaluateSubjectExclusions();
        renderWelcomeConsultation();
      });
    });
    var yearLevelEl = q(FIELD_SELECTORS.yearLevel);
    if (yearLevelEl) {
      yearLevelEl.addEventListener("change", function() {
        evaluateProgramInterestOptions();
        evaluateInterestedSubjectsOptions();
      });
    }
    var intakeYearEl = q(FIELD_SELECTORS.intakeYear);
    if (intakeYearEl) {
      intakeYearEl.addEventListener("change", function() {
        evaluateProgramInterestOptions();
        evaluateInterestedSubjectsOptions();
        evaluateYearLevelOptions();
        evaluateIntakeYearDependents();
      });
    }
  }
  var SCHOOL_LIST_URL = "https://cdn.prod.website-files.com/696ed06d2e62378f0a51f2d4/6a58568773b5f6caa95424cc_7250ab944ad1d54f698183343d9a5688_schools_with_codes.txt";
  var schoolListCache = null;
  var schoolListPromise = null;
  function loadSchoolList() {
    if (schoolListCache) return Promise.resolve(schoolListCache);
    if (schoolListPromise) return schoolListPromise;
    schoolListPromise = fetch(SCHOOL_LIST_URL).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function(list) {
      schoolListCache = list;
      return list;
    }).catch(function(err) {
      console.warn("Contour Form 1 logic: failed to load school list —", err);
      schoolListCache = [];
      return schoolListCache;
    });
    return schoolListPromise;
  }
  function enhanceSchoolSearch() {
    var input = q(FIELD_SELECTORS.schoolText);
    if (!input) return;
    if (input.closest(".contour-school-search")) return;
    var codeInput = q(FIELD_SELECTORS.schoolCode);
    var acaraInput = q(FIELD_SELECTORS.acaraId);
    var wrapper = document.createElement("div");
    wrapper.className = "contour-school-search";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("autocomplete", "off");
    var listbox = document.createElement("ul");
    listbox.className = "contour-school-search__listbox";
    listbox.setAttribute("role", "listbox");
    listbox.id = "contour-school-listbox";
    listbox.hidden = true;
    wrapper.appendChild(listbox);
    input.setAttribute("aria-controls", listbox.id);
    var MIN_CHARS = 2;
    var MAX_RESULTS = 50;
    var activeIndex = -1;
    var currentMatches = [];
    function normalize(s) {
      return s.toLowerCase().trim();
    }
    function matchesQueryAndLocation(school, query, location) {
      if (!location || school.state !== location) return false;
      return normalize(school.name).indexOf(query) !== -1;
    }
    function tokenize(s) {
      return normalize(s).split(/[^a-z0-9]+/).filter(function(w) {
        return w.length > 0;
      });
    }
    function levenshtein(a, b) {
      var m = a.length, n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      var prev = new Array(n + 1);
      var curr = new Array(n + 1);
      for (var j = 0; j <= n; j++) prev[j] = j;
      for (var i = 1; i <= m; i++) {
        curr[0] = i;
        for (var j2 = 1; j2 <= n; j2++) {
          var cost = a.charAt(i - 1) === b.charAt(j2 - 1) ? 0 : 1;
          curr[j2] = Math.min(prev[j2] + 1, curr[j2 - 1] + 1, prev[j2 - 1] + cost);
        }
        var tmp = prev;
        prev = curr;
        curr = tmp;
      }
      return prev[n];
    }
    function typoTolerance(len) {
      if (len <= 3) return 0;
      if (len <= 6) return 1;
      return 2;
    }
    function fuzzyWordMatches(queryWord, nameWord) {
      if (nameWord.indexOf(queryWord) === 0) return true;
      var tolerance = typoTolerance(queryWord.length);
      if (tolerance === 0) return false;
      return levenshtein(queryWord, nameWord) <= tolerance;
    }
    function fuzzyMatchesQueryAndLocation(school, queryWords, location) {
      if (!location || school.state !== location) return false;
      var nameWords = tokenize(school.name);
      return queryWords.every(function(qw) {
        return nameWords.some(function(nw) {
          return fuzzyWordMatches(qw, nw);
        });
      });
    }
    function searchSchools(list, query, location) {
      var exact = list.filter(function(school) {
        return matchesQueryAndLocation(school, query, location);
      });
      if (exact.length > 0) return exact;
      var queryWords = tokenize(query);
      if (queryWords.length === 0) return [];
      return list.filter(function(school) {
        return fuzzyMatchesQueryAndLocation(school, queryWords, location);
      });
    }
    function renderResults(matches) {
      listbox.innerHTML = "";
      currentMatches = matches;
      activeIndex = -1;
      if (matches.length === 0) {
        listbox.hidden = true;
        input.setAttribute("aria-expanded", "false");
        return;
      }
      matches.forEach(function(school, i) {
        var li = document.createElement("li");
        li.className = "contour-school-search__option";
        li.id = "contour-school-option-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.textContent = school.name;
        li.addEventListener("mousedown", function(e) {
          e.preventDefault();
          selectSchool(school);
        });
        listbox.appendChild(li);
      });
      listbox.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    var suppressNextInputEvent = false;
    function closeListbox() {
      listbox.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      activeIndex = -1;
    }
    function setHiddenField(el, value) {
      if (!el) return;
      el.value = value || "";
      el.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      el.dispatchEvent(new Event("change", {
        bubbles: true
      }));
    }
    function selectSchool(school) {
      input.value = school.name;
      setHiddenField(acaraInput, school.acara_id);
      setHiddenField(codeInput, school.school_code);
      closeListbox();
      suppressNextInputEvent = true;
      input.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      input.dispatchEvent(new Event("change", {
        bubbles: true
      }));
    }
    function moveActive(delta) {
      if (currentMatches.length === 0) return;
      activeIndex = (activeIndex + delta + currentMatches.length) % currentMatches.length;
      var options = listbox.querySelectorAll(".contour-school-search__option");
      options.forEach(function(opt, i) {
        opt.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      });
      input.setAttribute("aria-activedescendant", "contour-school-option-" + activeIndex);
      options[activeIndex].scrollIntoView({
        block: "nearest"
      });
    }
    input.addEventListener("input", function() {
      if (suppressNextInputEvent) {
        suppressNextInputEvent = false;
        return;
      }
      var query = normalize(input.value);
      if (query.length < MIN_CHARS) {
        closeListbox();
        if (codeInput && codeInput.value) setHiddenField(codeInput, "");
        if (acaraInput && acaraInput.value) setHiddenField(acaraInput, "");
        return;
      }
      if (codeInput && codeInput.value) setHiddenField(codeInput, "");
      if (acaraInput && acaraInput.value) setHiddenField(acaraInput, "");
      loadSchoolList().then(function(list) {
        var currentLocation = getValue(FIELD_SELECTORS.location);
        var matches = searchSchools(list, query, currentLocation).slice(0, MAX_RESULTS);
        renderResults(matches);
      });
    });
    input.addEventListener("keydown", function(e) {
      if (listbox.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        var query = normalize(input.value);
        if (query.length >= MIN_CHARS) {
          loadSchoolList().then(function(list) {
            var currentLocation = getValue(FIELD_SELECTORS.location);
            renderResults(searchSchools(list, query, currentLocation).slice(0, MAX_RESULTS));
          });
        }
        return;
      }
      switch (e.key) {
       case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;

       case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;

       case "Enter":
        if (activeIndex >= 0 && currentMatches[activeIndex]) {
          e.preventDefault();
          selectSchool(currentMatches[activeIndex]);
        }
        break;

       case "Escape":
        closeListbox();
        break;
      }
    });
    input.addEventListener("blur", function() {
      setTimeout(closeListbox, 100);
    });
    document.addEventListener("click", function(e) {
      if (!wrapper.contains(e.target)) closeListbox();
    });
    loadSchoolList();
  }
  function watchSchoolFieldRerender() {
    // HubSpot v2 embeds re-render a field's DOM when native validation fires,
    // destroying the injected combobox — detect that and re-apply.
    var observer = new MutationObserver(function() {
      var input = q(FIELD_SELECTORS.schoolText);
      if (input && !input.closest(".contour-school-search")) {
        enhanceSchoolSearch();
        evaluateIntakeYearDependents();
      }
    });
    observer.observe(formRoot, {
      childList: true,
      subtree: true
    });
  }
  var pendingErrorScrolls = null;
  function scrollErrorIntoView(el) {
    if (!el) return;
    if (pendingErrorScrolls) {
      pendingErrorScrolls.push(el);
      return;
    }
    pendingErrorScrolls = [el];
    setTimeout(function() {
      var best = null;
      var bestTop = null;
      for (var i = 0; i < pendingErrorScrolls.length; i++) {
        var top = pendingErrorScrolls[i].getBoundingClientRect().top;
        if (bestTop === null || top < bestTop) {
          bestTop = top;
          best = pendingErrorScrolls[i];
        }
      }
      pendingErrorScrolls = null;
      if (best && best.scrollIntoView) best.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 0);
  }
  function isFieldWrapVisible(fieldWrap) {
    return fieldWrap.style.display !== "none";
  }
  function schoolFieldSatisfied() {
    var input = q(FIELD_SELECTORS.schoolText);
    return !!input && input.value.trim() !== "";
  }
  function anyProgramInterestOptionEligible() {
    return qAll(FIELD_SELECTORS.programInterest).some(function(opt) {
      return !opt.disabled;
    });
  }
  function enforceFieldRequiredValidation(fieldSelectorKey, errorText, errorClass, isFieldRelevantFn, isFieldSatisfiedFn) {
    var options = qAll(FIELD_SELECTORS[fieldSelectorKey]);
    if (options.length === 0) return;
    var fieldWrap = fieldWrapper(options[0]);
    if (!fieldWrap) return;
    if (hasNativeRequiredMark(fieldWrap)) return;
    function defaultSatisfied() {
      return qAll(FIELD_SELECTORS[fieldSelectorKey]).some(function(opt) {
        return opt.checked;
      });
    }
    var isSatisfied = isFieldSatisfiedFn || defaultSatisfied;
    function isValid() {
      return !isFieldRelevantFn(fieldWrap) || isSatisfied();
    }
    var errorList = document.createElement("ul");
    errorList.className = "no-list hs-error-msgs inputs-list " + errorClass;
    errorList.setAttribute("role", "alert");
    errorList.style.display = "none";
    var errorItem = document.createElement("li");
    var errorLabel = document.createElement("label");
    errorLabel.className = "hs-error-msg hs-main-font-element";
    errorLabel.textContent = errorText;
    errorItem.appendChild(errorLabel);
    errorList.appendChild(errorItem);
    fieldWrap.appendChild(errorList);
    function showError() {
      errorList.style.display = "";
      scrollErrorIntoView(fieldWrap);
    }
    function clearError() {
      errorList.style.display = "none";
    }
    options.forEach(function(opt) {
      opt.addEventListener("change", function() {
        if (isValid()) clearError();
      });
      opt.addEventListener("input", function() {
        if (isValid()) clearError();
      });
    });
    if (formRoot) {
      formRoot.addEventListener("submit", function(e) {
        if (!isValid()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showError();
        }
      }, true);
    }
  }
  function enforceEmailTempValidation() {
    var input = q(FIELD_SELECTORS.emailTemp);
    if (!input) return;
    var EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    function isValid() {
      var value = input.value.trim();
      if (value === "") return true;
      return EMAIL_PATTERN.test(value);
    }
    var wrapper = fieldWrapper(input) || input.parentElement;
    var errorList = document.createElement("ul");
    errorList.className = "no-list hs-error-msgs inputs-list contour-email-temp-error";
    errorList.setAttribute("role", "alert");
    errorList.style.display = "none";
    var errorItem = document.createElement("li");
    var errorLabel = document.createElement("label");
    errorLabel.className = "hs-error-msg hs-main-font-element";
    errorLabel.textContent = "Please enter a valid email address.";
    errorItem.appendChild(errorLabel);
    errorList.appendChild(errorItem);
    wrapper.appendChild(errorList);
    function showError() {
      input.classList.add("invalid", "error");
      errorList.style.display = "";
    }
    function clearError() {
      input.classList.remove("invalid", "error");
      errorList.style.display = "none";
    }
    input.addEventListener("blur", function() {
      if (isValid()) clearError(); else showError();
    });
    input.addEventListener("input", function() {
      if (isValid()) clearError();
    });
    if (formRoot) {
      formRoot.addEventListener("submit", function(e) {
        if (!isValid()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showError();
          scrollErrorIntoView(fieldWrapper(input) || input);
          input.focus();
        }
      }, true);
    }
  }
  function ensureDividerBefore(fieldEl, id) {
    if (!fieldEl) return;
    var wrap = fieldWrapper(fieldEl);
    if (!wrap || !wrap.parentNode) return;
    if (formRoot.querySelector("#" + id)) return;
    var divider = document.createElement("hr");
    divider.id = id;
    divider.className = "contour-section-divider";
    wrap.parentNode.insertBefore(divider, wrap);
  }
  function init(formElement) {
    formRoot = formElement;
    enhanceProgramInterestCards();
    enhanceInterestedSubjectsCategories();
    injectDisabledFieldStyles();
    enhanceSchoolSearch();
    watchSchoolFieldRerender();
    enhanceCampusLabels();
    ensureDividerBefore(q(FIELD_SELECTORS.programInterest), "contour-divider-program-interest");
    ensureDividerBefore(q(FIELD_SELECTORS.referral), "contour-divider-referral");
    fixRadioCardClickArea();
    fixCheckboxCardClickArea();
    fixProgramCardClickArea();
    enforceContactTypeLayoutIfPresent();
    enhanceContactTypeIllustrations();
    enforceEmailTempValidation();
    enhanceEmailPrefill();
    enforceFieldRequiredValidation("programInterest", "Please select a program.", "contour-program-interest-error", anyProgramInterestOptionEligible);
    enforceFieldRequiredValidation("campus", "Please select a campus.", "contour-campus-error", isFieldWrapVisible);
    enforceFieldRequiredValidation("interestedSubjects", "Please select at least one subject.", "contour-subjects-error", isFieldWrapVisible);
    enforceFieldRequiredValidation("schoolText", "Please enter your school.", "contour-school-error", isFieldWrapVisible, schoolFieldSatisfied);
    attachListeners();
    evaluateProgramInterestOptions();
    evaluateInterestedSubjectsOptions();
    evaluateCampusOptions();
    evaluateYearLevelOptions();
    evaluateSchoolFieldVisibility();
    evaluateIntakeYearDependents();
    renderWelcomeConsultation();
  }
  return {
    init: init
  };
}();