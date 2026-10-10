# Release gate record and TC 11.3.1, 10 October 2026

Run by: Xingyu Ye (Maggie), checker. Both models were trained by Jingyu Zhen, so the runner is not the trainer (AC 11.3.1(4)).
Run with Claude Code on Maggie's machine, from branch `roomforboth-final`.

## Gate used

The gate in the code (`ml/train_and_export.py`, D51), as in AC 11.3.1(1): in every test year, the model's AUC is higher and its Brier score lower than the species-only baseline (B1). The state model has four test years (2021, 2022, 2023, 2024); the area model has one (2024), because the grid file has no single years. 2025 and 2026 are scored but are not part of the gate.

The band cut-offs on the page are separate from the gate: very likely at 0.80 and above, likely from 0.40 to below 0.80, unlikely below 0.40 (`public/ecosystem-forecast.js`), the same for both models.

## How the run was made

1. A clean Python environment with the pinned versions in `ml/requirements.txt`: numpy 1.26.4, pandas 2.2.2, scikit-learn 1.5.1, joblib 1.4.2. Python 3.12.8 (the training run used 3.12.7).
2. On a copy of the `ml` folder: `python ml/build_dataset.py`, `python ml/train_and_export.py`, `python ml/train_grid_model.py`.
3. All built-in checks passed: dataset checks, the leakage stop (`encounter_count`, `encounter_share`, `present` are never features), test years later than every training year, "two runs give the same file", and "the saved model reproduces the exported predictions".
4. The re-run outputs were compared with the files deployed on the site:
   - `forecast_predictions.json`: 1,344 rows, largest difference 0.0.
   - `forecast_grid_predictions.json`: 345 squares by 84 values, largest difference 0.0.
   - `ml_dataset_v3.csv` rebuilt with the same content; only the line endings differ (CRLF in the repository, LF from the script), which is why its sha256 differs.

## State model (forecast_predictions.json)

| Test year | Model AUC / Brier | B1 species only | Mark met |
|---|---|---|---|
| 2021 | 0.884 / 0.125 | 0.862 / 0.137 | Yes |
| 2022 | 0.922 / 0.113 | 0.873 / 0.137 | Yes |
| 2023 | 0.927 / 0.114 | 0.866 / 0.157 | Yes |
| 2024 (final) | 0.941 / 0.094 | 0.864 / 0.164 | Yes |

Result: **pass**. The predictions stay on the page.

## Area model (forecast_grid_predictions.json)

| Test year | Model AUC / Brier | B1 species only | Mark met |
|---|---|---|---|
| 2024 (final) | 0.887 / 0.116 | 0.818 / 0.142 | Yes |

Result: **pass**. The By area view stays on.

## TC 11.3.1

| Part | Expected | Result |
|---|---|---|
| Scores compared with the gate | Done for both models | Done; every mark met |
| If every mark is met, the predictions stay on the page | Live files are the tested output | Met. The live files equal the re-run output |
| If a mark is missed, the counted fallback (state) or By area switched off (area) | Not triggered | Not exercised; no mark missed. The counted fallback is not built |
| Scores recorded with the date and who ran the test | `run_by` and `date` filled | Met. `public/forecast_evaluation.json`, `ml/output/evaluation_report.json` and `ml/output/grid_evaluation_report.json` carry `run_by`, `date`, `run_note` and the gate marks. The method page shows the table with "Test run recorded on 10 October 2026, run by Xingyu Ye (Maggie)" |
| Runner is not the trainer | Different members | Met. Trained by Jingyu Zhen; run by Xingyu Ye |
| Baselines shown beside the model | B1, B2 and B3 in the table | Met, on the method page |

TC 11.3.1: **Pass**.

## Recorded beside the gate, not part of it

The evaluation reports also hold a calibration table and per-species scores. They are recorded and not marked. On 2024, the state model's mean prediction is below the observed share in the 0.6 to 0.9 bands (by 0.12 to 0.22), and in the area model the python (AUC 0.561) and cobra (0.572) are the weakest species.

Training years: the 2024 test model is trained on 2015 to 2023; the deployed model is retrained on 2015 to 2024. The site's "2015 to 2024" refers to the deployed model.
