# Epic 11 revised text (to paste into the Epics, User Stories, ACs report)

Why: Epic 11 said the model is given the previous twelve months of records. The trained model does not use them (tested: no gain in AUC or Brier). Every line below is changed to describe the model as built, in `ml/`. Lines that are unchanged are not repeated. Items in [square brackets] are team decisions that still need a value. The band cut points (0.80 and 0.40) are now set.

---

## Epic 11: Wildlife forecast (see which animals are most likely to be recorded in my state in a month)

The resident picks a state and a month of the year. A model the team trained on past wildlife records predicts how likely each of the seven animals is to be recorded there, and the page shows them in order, in words, with what the prediction means and how it was tested.

As a resident, I want to see which of the seven animals are most likely to be recorded in my state in a month, so that I know what to prepare for first, and so that a prediction about records is never mistaken for a count of animals or a chance for my home.

| Field | Detail |
|---|---|
| Priority | Must |
| Section and iteration | Ecosystem. Iteration 3. |
| Data behind it | Wildlife records by animal, state, year and month, 2015 to 2026 (GBIF, 39,766 records). State population 2020 (DOSM). Forest reserve area by state and year, 2003 to 2022 (Forestry Department of Peninsular Malaysia and DOSM, CC BY 4.0). The model learns from 2015 to 2024. 2025 and 2026 records are incomplete and are not used for training. |
| AI or model | Machine learning model trained by the team (gradient-boosted decision trees) |

Changed: "this month" is now "in a month" (the prediction is for a month of the year, built from records up to December 2024); training years stated.

---

## User Story 11.1: Show me the forecast for my state and month  [Iteration 3]

Unchanged.

### AC 11.1.1: The forecast for my state and month

Given the resident opens the Ecosystem section and chooses a state and a month (the current calendar month by default), When the result loads, Then:

(1) The seven species are listed in order of how likely each is to be recorded in that state in that month of the year.
(2) Each species shows a band in words (very likely, likely, unlikely to be recorded) and no percentage. The bands come from fixed cut points: very likely at 0.80 or more, likely from 0.40 up to 0.80, unlikely below 0.40 (roughly: recorded in four of five, or two of five, comparable months). The same cut points apply to every state and month and are written in the exported file's details.
(3) The two snake species are shown together as Snakes until the resident opens the group (AC 3.2.2).
(4) Each species links to its species page and to the plan.
(5) Only months the model has a prediction for can be chosen, and the page shows the last month of records the prediction is built from (December 2024).

And the page asks for nothing else: no district, no location, no free text.
And no line tells the resident to act against an animal.

[Figma: Iteration 3 page, Ecosystem 12]. Must under D47. Build owner: Xingyu Ye; checker: Jingyu Zhen.

Changed: (1) "in that month of the year"; (2) cut points fixed and recorded; (5) last month named.

### AC 11.1.2: When there are too few records to forecast

Unchanged.

---

## User Story 11.2: Explain what the forecast means and how it was made  [Iteration 3]

Unchanged.

### AC 11.2.1: What the forecast is and is not

Given any result from AC 11.1.1 is displayed, When the resident reads it, Then beside the result the page states:

(1) That it predicts how likely each species is to be recorded by people in this state in this month of the year, from records of earlier years.
(2) That a record is one report by a person, not one animal, and that an unlikely record does not mean the animal is absent.
(3) That it is a prediction for the state, not a probability for the resident's home.
(4) The last month of records the prediction is built from (December 2024).

And no sentence says a species is more active this month.
And no sentence says the model is more accurate than counting past records, unless the recorded test run shows it.

[Figma: Iteration 3 page, Ecosystem 12]. Must under D47. Build owner: Xingyu Ye; checker: Jingyu Zhen.

Changed: (1) "earlier months and years" is now "earlier years" (no month-by-month history is used); a sentence added so the page cannot claim more than the test shows.

### AC 11.2.2: How the forecast was made and tested

Given the resident opens How this was made from the result, or the About the data page, When it renders, Then it shows:

(1) The three data files, each with its source, licence and retrieval date. A retrieval date that has not been recorded is shown as "not recorded yet"; the page does not guess one.
(2) What the model is given, in plain words: the animal, the state, the month, the year, the state's population in 2020, and the state's forest reserve area. And that it is not given any count or share of earlier records.
(3) The training years (2015 to 2024) and the test years (2021 to 2023 as rolling tests, and 2024 as the final test). 2025 and 2026 are shown separately and marked incomplete.
(4) The test results beside the results of the simple baselines (species only; the species-by-state average; the species-by-state average of the last two years).
(5) The date the model was trained, and whether the page is showing the model or the counted fallback.

And no result is shown on this page that is not in the recorded test run.

[Figma: About the data 01]. Must under D47. Build owner: Xingyu Ye; checker: Jingyu Zhen.

Changed: (2) previous twelve months removed, what the model is given listed; (3) test years listed; (4) the three baselines named; (1) the missing-date rule written down.

---

## User Story 11.3: Only show a forecast that passed its test  [Iteration 3]

Unchanged.

### AC 11.3.1: Test the model before showing it, or show plain counts instead

Given the model has been trained on earlier years and tested (rolling tests on 2021, 2022 and 2023, then a final test on 2024, each trained only on earlier years), When its scores are compared with the release gate in the AI and ML Safeguards document (section 6.4), Then:

(1) If every mark is met, the model's predictions are exported and deployed. The marks are: in each of the test years 2021, 2022, 2023 and 2024, the model's AUC is higher and its Brier score lower than the species-only baseline's. 2025 and 2026 are scored but are not part of the gate.
(2) If any mark is missed, the page shows each species' share of records in that state over the previous twelve months instead, computed by counting and labelled as that.
(3) The scores are recorded either way, with the date and who ran the test.
(4) The member who runs the test is not the member who trained the model.

And the page, its wording and AC 11.1.1 to AC 11.2.2 hold in both cases.
And the results of the simple baselines are shown with the model's, so a reader can see where the model is no better than counting.
[No frame: verified against the evaluation record and the deployed file]. Must under D47. Build owner: Jingyu Zhen; checker: Xingyu Ye.

Changed: the test is rolling plus final instead of "once"; the gate is named; baselines shown beside the model. The counted fallback in (2) is kept: it uses the last twelve months only for the counted display, never as a model input.

Decision record note: the gate in (1) was written after the test scores were known (2026-10-01 run). The record says so, with the date it was agreed. The same gate must be written in Safeguards section 6.4.

### AC 11.3.2: The forecast uses only past data and is read from a file

Given the training data is built, When a row for a state, month and species is prepared, Then:

(1) The record count, the record share and the recorded flag for the same row never appear among the features, and the build script stops with an error if any of them is added to the feature list.
(2) The test years are later than every training year, and the script stops with an error if not.
(3) No feature is built from the earlier records of the animal being predicted.

And Given the predictions are exported, When the page loads a result, Then: (4) it reads a static file shipped with the site; no model runs online and nothing the resident chooses is stored. (5) The file holds one row per state, month and species (16 x 12 x 7 = 1,344), every value between 0 and 1, and its own details: model, data version, last month of records, date trained.

[No frame: verified against the build script, the network tab and the file]. Must under D47. Build owner: Jingyu Zhen; checker: Xingyu Ye.

Changed: (1) and (3) replace the history-feature rule with the rule the scripts enforce; the order of old (2) and (3) is merged. (4) and (5) unchanged.

---

## Decision to add to section 6 (number to be assigned)

The forecast model uses no feature built from earlier records. Reason: tested with the final model setup, adding the previous twelve months of records gave no gain in AUC or Brier score. This changes AC 11.2.2(2), AC 11.3.2(1), and the wording "this month" in Epic 11, AC 11.1.1, AC 11.2.1. The counted fallback in AC 11.3.1(2) stays. Cards affected: Epic 11, AC 11.1.1, AC 11.2.1, AC 11.2.2, AC 11.3.1, AC 11.3.2.

## Still open (needs a value from the team)

1. Team agreement of D51, which now includes the gate marks (written on 3 October, after the 1 October scores were known). The same marks are in Safeguards 6.4.
2. Retrieval date for each of the three data files.
3. Who runs the test (`run_by`), who is not the person who trained the model.
4. The cut points are not yet in the exported file's details (`metadata`); AC 11.1.1(2) says they will be.
