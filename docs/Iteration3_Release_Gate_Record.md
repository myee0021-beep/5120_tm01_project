# Release gate record and TC 11.3.1, 10 October 2026

Run by: Xingyu Ye (Maggie), checker. Both models were trained by Jingyu Zhen, so the runner is not the trainer (AC 11.3.1(4)).
Run with Claude Code on Maggie's machine, from branch `roomforboth-final`.

Correction, same day: a first version of this record judged the models against the species-only baseline (B1), as written in `docs/Epic11_revised_text.md` and the header of `ml/train_and_export.py`. The Test Plan (section 6, updated 8 October under D51) sets a different gate, against the historical average for the same animal and state (or square), with a calibration mark. This record now uses the Test Plan's marks. Under B1 both models would pass; under the Test Plan's marks both miss the calibration mark.

## How the run was made

1. A clean Python environment with the pinned versions in `ml/requirements.txt`: numpy 1.26.4, pandas 2.2.2, scikit-learn 1.5.1, joblib 1.4.2. Python 3.12.8 (the training run used 3.12.7).
2. On a copy of the `ml` folder: `python ml/build_dataset.py`, `python ml/train_and_export.py`, `python ml/train_grid_model.py`.
3. All built-in checks passed: dataset checks, the leakage stop (`encounter_count`, `encounter_share`, `present` are never features), test years later than every training year, "two runs give the same file", and "the saved model reproduces the exported predictions".
4. The re-run outputs were compared with the files deployed on the site:
   - `forecast_predictions.json`: 1,344 rows, largest difference 0.0.
   - `forecast_grid_predictions.json`: 345 squares by 84 values, largest difference 0.0.
   - `ml_dataset_v3.csv` rebuilt with the same content; only the line endings differ (CRLF in the repository, LF from the script), which is why its sha256 differs.

## State model: gate against the same animal and state average (B2)

| Mark | Model | Baseline | Met |
|---|---|---|---|
| Brier on 2024 no worse than the baseline | 0.094 | 0.125 | Yes |
| Brier no worse in at least two of the three rolling years | 3 of 3 | | Yes |
| AUC on 2024 within 0.01 of the baseline or better | 0.941 | 0.947 | Yes (0.0055 below) |
| Every band of at least 50 rows within 0.10 | | | **No**: 0.6 to 0.7 (63 rows) predicts 0.642, observed 0.857; 0.7 to 0.8 (94 rows) 0.760 against 0.883; 0.8 to 0.9 (112 rows) 0.860 against 1.000 |
| Species with AUC below 0.60 | none | | (lowest: cobra 0.696) |
| File checks | | | Yes |

Result: **gate not met** (calibration). The model under-predicts in the upper bands: the share of state-months with a record rose from about 0.32 in 2020 to 0.48 in 2024, and the model trained on earlier years has not seen that level.

Rolling and final scores, AUC / Brier (the table shown on the method page):

| Test year | Model | B1 species only | B2 same animal and state | B3 last two years |
|---|---|---|---|---|
| 2021 | 0.884 / 0.125 | 0.862 / 0.137 | 0.880 / 0.132 | 0.882 / 0.128 |
| 2022 | 0.922 / 0.113 | 0.873 / 0.137 | 0.914 / 0.116 | 0.910 / 0.120 |
| 2023 | 0.927 / 0.114 | 0.866 / 0.157 | 0.927 / 0.127 | 0.923 / 0.120 |
| 2024 (final) | 0.941 / 0.094 | 0.864 / 0.164 | 0.947 / 0.125 | 0.942 / 0.093 |

## Area model: gate against the same animal and square average (B3)

The grid file has no single years, so there is one test year (2024, trained on 2015 to 2023) and no rolling mark.

| Mark | Model | Baseline | Met |
|---|---|---|---|
| Brier on 2024 no worse than the baseline | 0.116 | 0.122 | Yes |
| AUC on 2024 within 0.01 of the baseline or better | 0.887 | 0.889 | Yes (0.0026 below) |
| Every band of at least 50 rows within 0.10 | | | **No**: 0.1 to 0.2 (715 rows) predicts 0.155, observed 0.052; 0.4 to 0.5 (371 rows) 0.447 against 0.315 |
| Species with AUC below 0.60 | python 0.561, cobra 0.572 | | These two must not be shown as a model result |
| File checks | | | Yes |

Result: **gate not met** (calibration). The area model over-predicts in the lower and middle bands.

## TC 11.3.1

| Part | Expected | Result |
|---|---|---|
| Scores compared with the gate | Done for both models | Done; both miss the calibration mark |
| If every mark is met, predictions stay | n/a | Not the case |
| If a mark is missed: state model shows the counted shares; area model's By area view is switched off | Page changes | **Not met.** On 10 October the page still shows both models. The counted fallback is not built (Test Plan section 6), and the By area view is still on |
| Scores recorded with the date and who ran the test | `run_by` and `date` filled | Met. `public/forecast_evaluation.json`, `ml/output/evaluation_report.json` and `ml/output/grid_evaluation_report.json` carry `run_by`, `date`, `run_note` and every gate mark |
| Runner is not the trainer | Different members | Met. Trained by Jingyu Zhen; run by Xingyu Ye |

TC 11.3.1: **Fail**, until the team either applies the fallback (switch off By area; show counted shares or remove the state forecast) or records a decision that accepts the models with the calibration mark missed.

## For the team to decide

1. Which gate holds. `docs/Epic11_revised_text.md` and the header of `ml/train_and_export.py` still describe a gate against B1; the Test Plan and `ml/README.md` describe the gate used here. One of them must be changed.
2. What to do about the missed marks: apply the fallback as the Test Plan says, or record a new decision.
3. Training years. The site says 2015 to 2024 and the documents say 2015 to 2023. Both are right: the 2024 test model is trained on 2015 to 2023, and the deployed model is retrained on 2015 to 2024.
