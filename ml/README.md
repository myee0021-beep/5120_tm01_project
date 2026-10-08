# ML model: which of the seven species are likely to be recorded in my state in a month

This folder holds the trained model for the Ecosystem section: the data, the scripts that build and test it, and the files it produces. Nothing in this folder runs online. The page reads one static file: a copy of `output/predictions.json` shipped as `public/forecast_predictions.json`.

## What the model predicts

For a state and a month, it gives each of the seven species a number between 0 and 1: how likely the species is to have at least one GBIF record in that state in that month.

It is **not** a count of animals, and **not** a probability for a resident's home. A record is one report by a person. A low number does not mean the animal is absent. The page must show results in words, not percentages, and must say this beside every result.

The seven species: *Acridotheres tristis* (common myna), *Corvus splendens* (house crow), *Macaca fascicularis* (long-tailed macaque), *Malayopython reticulatus* (reticulated python), *Naja sumatrana* (equatorial spitting cobra), *Sus scrofa* (wild boar), *Varanus salvator* (Asian water monitor).

## Folder contents

| Path | What it is |
|---|---|
| `data/raw/iteration3_data_for_ML.csv` | GBIF records by species, state, year and month, 2015 to 2026 (kept unchanged) |
| `data/raw/population_state.json` | DOSM population by state, data.gov.my `population_state`; the 2020 value is used |
| `data/raw/forest_reserve_state.csv` | Area of Permanent Forest Reserves by State, hectares (kept unchanged) |
| `data/ml_dataset_v3.csv` | Training dataset built by `build_dataset.py` (12,131 rows, 9 columns) |
| `build_dataset.py` | Builds the dataset and stops with an error if any check fails |
| `train_and_export.py` | Tests, trains and exports the model |
| `show_prediction.py` | Prints the ranking for one state and month from `predictions.json` |
| `requirements.txt` | Library versions used |
| `output/model.joblib` | The trained model, with its feature columns and metadata |
| `output/predictions.json` | The static file the page reads (1,344 rows) |
| `output/evaluation_report.json` | Every score, the calibration table and the per-species table |
| `Iteration 3 Data for ML (grid cell, smoothed).csv` | Records by 0.25 degree square, month, period and species (used by the area model, see below) |
| `train_grid_model.py` | Tests, trains and exports the area model |
| `output/grid_model.joblib`, `output/grid_predictions.json`, `output/grid_evaluation_report.json` | The area model, its static file (345 squares) and its scores |
| `check_grid_features.py` | A check that adds grid features to the state model; reads only, writes nothing |

## How to run

Python 3.12 with the libraries in `requirements.txt` (the conda base environment on the development machine has them).

```
python ml/build_dataset.py
python ml/train_and_export.py
python ml/show_prediction.py "Selangor" 10
```

Run from the project root. The first command rebuilds `data/ml_dataset_v3.csv`. The second tests the model, trains the final model and writes everything in `output/`. The third prints the seven species in order for one state and month.

## Data

| Data | Source | Notes |
|---|---|---|
| Species records | GBIF, prepared by the team (`iteration3_data_for_ML.csv`) | 4,645 rows with a record, 39,766 records, 1,733 state-year-month groups, 16 states, 2015 to 2026 |
| State population | DOSM, `population_state` on data.gov.my | 2020 value, thousands of people; checked against the DOSM 2020 census press release for all 16 states |
| Forest reserve area | "Area of Permanent Forest Reserves by State", Forestry Department of Peninsular Malaysia and DOSM, data.gov.my, CC BY 4.0 | Hectares as of 31 December each year. The latest year is 2022, so 2023 onward reuses the 2022 value. The method changed in 2017 (earlier years include proposed reserves not yet gazetted) |

The raw record file only has rows where a species was recorded. `build_dataset.py` expands every state-year-month group to all seven species, with a count of 0 where there is no record. The rows with a record are exactly the rows of the source file.

Attribution is required for CC BY 4.0 data. The licence and retrieval date for each file belong in the Data Management Plan.

## Features and target

| Feature | Content |
|---|---|
| species | one of the seven species |
| state_normalised | one of 16 states and federal territories |
| month | 1 to 12 |
| year | 2015 to 2024 in training; fixed to 2024 in the exported file |
| pop_2020_k | state population in 2020, thousands |
| forest_reserve_ha | forest reserve area of the state in that year, hectares |

Target: `present` (1 if the species has at least one record in that state and month, otherwise 0).

`encounter_count`, `encounter_share` and `present` are never used as features; `train_and_export.py` stops with an error if one is added to the feature list.

Two decisions the team made:

1. **No features built from the history of the target** (for example the share of records over the previous twelve months). With a static file they gave no gain in AUC or Brier score, and they would let the output predict the output.
2. **Release gate (D50, as in section 6.4 of the AI and ML Safeguards document).** The baseline is B2, the historical average for the same animal and state. The model is deployed only if: its Brier score on 2024 is no worse than B2; its Brier score is no worse than B2 in at least two of the three rolling years; its AUC on 2024 is within 0.01 of B2 or better; and in every calibration band with at least 50 rows the mean prediction is within 0.10 of the observed share. A species whose own AUC on 2024 is below 0.60 is shown with its record count only. 2025 and 2026 are scored but are not part of the gate. If a mark is missed, the page shows the counted fallback (each species' share of records in the state over the previous twelve months, computed by counting; not built as a separate feature at 8 October 2026). `train_and_export.py` does not yet check the gate: read `evaluation_report.json`, and the member who runs the official test is not the member who trained the model.

## Model

Gradient-boosted decision trees (`HistGradientBoostingClassifier`, logistic loss), 200 iterations, depth 4, learning rate 0.05, minimum leaf size 20, L2 regularisation 1.0, no early stopping, seed 42. The settings are fixed in the code before any score is computed and are not tuned on the test years.

## How it is tested

The split is by time only: the model is trained on earlier years and tested on a later year. There is no random split.

- Rolling tests: 2021, 2022, 2023.
- Final test: 2024, trained on 2015 to 2023.
- 2025 and 2026 are scored separately and labelled incomplete (release lag).
- The final model is then trained on 2015 to 2024 and used for the exported file.

Baselines that need no training are scored beside the model:

- B1: species only;
- B2: the historical average for that species in that state;
- B3: the same average over the last two years.

Measures: AUC (does it order correctly), Brier score (how close the numbers are), a calibration table, and a per-species table.

## Results (development run of 1 October 2026)

> These are the training script's own scores. They are **not** the recorded release-gate result (`run_by` is empty) and must not be quoted in a deck, report or on the site until the official run is recorded (D50).

AUC / Brier score. Higher AUC and lower Brier are better.

| Test year | Model | B1 species only | B2 species x state | B3 last two years |
|---|---|---|---|---|
| 2021 | 0.884 / 0.125 | 0.862 / 0.137 | 0.880 / 0.132 | 0.882 / 0.128 |
| 2022 | 0.922 / 0.113 | 0.873 / 0.137 | 0.914 / 0.116 | 0.910 / 0.120 |
| 2023 | 0.927 / 0.114 | 0.866 / 0.157 | 0.927 / 0.127 | 0.923 / 0.120 |
| **2024 (final)** | **0.941 / 0.094** | 0.864 / 0.164 | 0.947 / 0.125 | 0.942 / 0.093 |
| 2025 (incomplete) | 0.846 / 0.163 | 0.728 / 0.243 | 0.838 / 0.194 | 0.853 / 0.168 |
| 2026 (incomplete) | 0.884 / 0.138 | 0.735 / 0.226 | 0.826 / 0.189 | 0.882 / 0.144 |

What this means:

- The model is about as good as simple averages. On 2024 it matches the last-two-years average and is slightly below the all-years average on AUC. It is a simple prediction.
- Rare species are weaker. On 2024 the AUC is 0.726 for the python, 0.696 for the cobra and 0.707 for the wild boar.
- The calibration table is in `output/evaluation_report.json`. Predictions in the highest bands are lower than what was observed (for example a mean prediction of 0.86 where every row had a record in 2024), because the share of rows with a record rose from about 0.32 in 2020 to 0.48 in 2024 as more records were reported.
- `run_by` in the report is empty. It is filled in by the member who runs the test.

## The file the page reads: `output/predictions.json`

```
{
  "metadata": { ... },
  "predictions": [
    { "state": "Selangor", "month": 10, "species": "Corvus splendens",
      "probability": 0.984, "records_species_state": 4936, "groups_state": 120 },
    ...
  ]
}
```

- One row per state, month and species: 16 x 12 x 7 = 1,344 rows. Every probability is between 0 and 1.
- `records_species_state` is the number of records of that species in that state in the training data; `groups_state` is the number of state-year-month groups the state has. The page uses them to decide when to say "not enough records" instead of showing a result.
- `metadata` holds the model, the features, the settings, the data sources, the training years, the last month of records used (2024-12), the training date, the library versions, the dataset hash, the predictions hash and a summary of the test results. The page can show this on the About the data page.
- The values are computed for 2024, the last training year. A tree model cannot look past the years it has seen, so the page does not offer a future year.

## Rules for the page

- Show a word band or an ordered list. No percentage and no number that reads as a chance. The bands are very likely at 0.80 or more, likely from 0.40 up to 0.80, unlikely below 0.40 (D51, proposed); the cut points live in `BAND_CUTS` in `public/ecosystem-forecast.js` and are not yet written into the metadata of `predictions.json`.
- Say beside the result what it is and what it is not (see the first section).
- Do not say a species is more active this month. The monthly differences are small: for the same state, the order of the species hardly changes from month to month.
- Show "not enough records" with the count where the training data is thin (for example Labuan has only 8 groups).
- Never tell a resident to act against an animal.

## Checks built into the scripts

`build_dataset.py` stops with an error unless: the row count is a multiple of 7; every group has exactly 7 species; the number of rows with a record equals the number of source rows; the record total equals the source total; no cell is empty; the state names are exactly the sixteen; the record share sums to 1 in every group.

`train_and_export.py` stops with an error if: a forbidden column is in the feature list; a test year is not later than every training year; the exported file does not have exactly 1,344 rows, every value in 0 to 1, no empty cell and the metadata; two runs on the same data do not give the same file; or the saved model does not reproduce the exported predictions.

## Updating the model

When new records arrive: put the new extract in `data/raw/`, run both scripts, and compare the new `predictions.json` with the old one. Read any state, month and species whose value moved by more than 0.15 before deploying. Keep the old file deployed until the new one has been checked. To deploy: copy `output/predictions.json` to `public/forecast_predictions.json`, copy the evaluation report of the official test run (with `run_by` and the date filled in by the member who ran it) to `public/forecast_evaluation.json`, and raise the `?v=` number in `public/ecosystem-forecast.js` and `public/ecosystem-forecast-method.js` so browsers load the new files. The page that explains how the forecast was made and tested shows no test result until `run_by` is filled.

## Area model (grid squares)

The mentor review of 6 October asked for the location in the new data to be used, whatever the effect on the scores. `train_grid_model.py` does that: its input is the position of a 0.25 degree square (about 28 km), not a state.

**What it predicts.** If at least one record is made in a square in a month, how likely it is that a species is among the species recorded. It is conditional on the square having a record, because the source file lists only square-months with a record. It is not a count of animals and not a probability for a home.

**Features.** Species, state, latitude and longitude of the square centre, month, and the length of the period in years (9, 1 or 2), because a nine-year period has more species recorded than a one-year period. The exported values are for a one-year period. As in the state model, nothing built from the records is a feature (counts, square totals, smoothed shares, records in training years, the enough-records flag); the script stops if one is added. The settings are the same as the state model.

**How it is tested.** By time only. The file has no single years, so there is one final test: trained on 2015-2023, tested on 2024. 2025-2026 is scored separately, trained on 2015-2024, and labelled incomplete. Baselines: B1 species only, B2 species x state average, B3 species x square average.

AUC / Brier (run of 7 October 2026):

| Test | Model | B1 species only | B2 species x state | B3 species x square |
|---|---|---|---|---|
| 2024 (final) | 0.887 / 0.116 | 0.818 / 0.142 | 0.876 / 0.122 | 0.889 / 0.122 |
| 2025-2026 (incomplete) | 0.774 / 0.159 | 0.645 / 0.188 | 0.768 / 0.170 | 0.814 / 0.160 |

What this means:

- The model is better than species only and than the state average, and about level with the species x square average (AUC a little lower, Brier a little better on 2024, lower AUC on 2025-2026). It is a simple prediction. The top species of a square-month was recorded in 68.5% of square-months.
- Rare species are weak. On 2024 the AUC is 0.56 for the python, 0.57 for the cobra and 0.69 for the wild boar.
- The values are too high where the model is most sure: in the 0.8 to 0.9 band the mean prediction is 0.85 and the observed share is 0.76. The 2024 test period is one year and the training period nine, and the model has not seen a one-year period when it is tested on 2024. The final model is trained on 2015-2024, so it has seen both.
- 37 of the 965 test square-months are in squares the training period never saw.

**The file the page can read: `output/grid_predictions.json`.** One entry per square (345): `id`, centre `lat` and `lon`, `state`, `records` (records in 2015-2024) and `p`, 84 values: month 1 to 12 and, within each month, the species in the order of `metadata.species`. Every value is between 0 and 1. Squares with few records should be shown as "not enough records", as on the state page. The values are for squares and months that may never have had a record; those are extrapolated.

**Limits.** The grid file is a different extract from `ml_dataset_v3.csv` (39,957 records against 39,766, no Putrajaya, one state per square so border squares are counted in one state only). It has no single years. It does not say whether a place will have any record at all.

To run: `python ml/train_grid_model.py` from the project root.

**On the site.** The forecast page has a "By area (28 km squares)" view that reads `public/forecast_grid_predictions.json`, a copy of `output/grid_predictions.json`. After retraining, copy the file again and raise `GRID_FILE`'s `?v=` number in `public/ecosystem-forecast.js`.

## Known limits

- GBIF records show where people reported animals, not where animals are. Busy places and easy-to-see species have more records.
- Common myna and house crow hold about four in five of all records, so a plain ranking puts them first in almost every state.
- The location is the state only, and the month is a monthly total.
- Wild boar and the two snake species have few records, so their results are less stable.
- The forest value is forest reserve area, not forest cover, and values after 2022 reuse 2022.
- The 2025 and 2026 records are incomplete.
