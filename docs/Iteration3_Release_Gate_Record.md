# Release gate record and TC 11.3.1, 10 October 2026

Run by: Xingyu Ye (Maggie), checker. Both models were trained by Jingyu Zhen, so the runner is not the trainer (AC 11.3.1(4)).
Run with Claude Code on Maggie's machine, from branch `roomforboth-final`.

## How the run was made

1. A clean Python environment with the pinned versions in `ml/requirements.txt`: numpy 1.26.4, pandas 2.2.2, scikit-learn 1.5.1, joblib 1.4.2. Python 3.12.8 (the training run used 3.12.7).
2. On a copy of the `ml` folder: `python ml/build_dataset.py`, `python ml/train_and_export.py`, `python ml/train_grid_model.py`.
3. All built-in checks passed: dataset checks, the leakage stop (`encounter_count`, `encounter_share`, `present` are never features), test years later than every training year, "two runs give the same file", and "the saved model reproduces the exported predictions".
4. The re-run outputs were compared with the files deployed on the site:
   - `forecast_predictions.json`: 1,344 rows, largest difference 0.0.
   - `forecast_grid_predictions.json`: 345 squares by 84 values, largest difference 0.0.
   - `ml_dataset_v3.csv` rebuilt with the same content; only the line endings differ (CRLF in the repository, LF from the script), which is why its sha256 differs.

## Gate used

AC 11.3.1(1) and D51: in every test year, the model's AUC is higher and its Brier score lower than the species-only baseline (B1). 2025 and 2026 are scored but are not part of the gate.

## State model (forecast_predictions.json)

| Test year | Model AUC / Brier | B1 species only | Mark met |
|---|---|---|---|
| 2021 | 0.884 / 0.125 | 0.862 / 0.137 | Yes |
| 2022 | 0.922 / 0.113 | 0.873 / 0.137 | Yes |
| 2023 | 0.927 / 0.114 | 0.866 / 0.157 | Yes |
| 2024 (final) | 0.941 / 0.094 | 0.864 / 0.164 | Yes |

Result: **pass**. The predictions stay deployed.

## Area model (forecast_grid_predictions.json)

The grid file has no single years, so there is one test year (2024, trained on 2015 to 2023).

| Test year | Model AUC / Brier | B1 species only | Mark met |
|---|---|---|---|
| 2024 (final) | 0.887 / 0.116 | 0.818 / 0.142 | Yes |

Result: **pass**. The predictions stay deployed.

## TC 11.3.1

| Part | Expected | Result |
|---|---|---|
| (1) Every mark met, predictions exported and deployed | Gate passes; the live file is the tested output | Pass. Both gates pass, and the live files equal the re-run output |
| (2) A missed mark shows the counted fallback | Not triggered, as no mark was missed | Not exercised. The counted fallback is not built, so a future failed gate has no fallback to switch to |
| (3) Scores recorded with the date and who ran the test | `run_by` and `date` filled | Pass. `public/forecast_evaluation.json`, `ml/output/evaluation_report.json` and `ml/output/grid_evaluation_report.json` carry `run_by`, `date`, `run_note` and the gate marks. The method page now shows the table with "Test run recorded on 10 October 2026, run by Xingyu Ye (Maggie)" |
| (4) Runner is not the trainer | Different members | Pass. Trained by Jingyu Zhen; run by Xingyu Ye |
| Baselines shown beside the model | B1, B2 and B3 in the table | Pass, on the method page |

## For the team to decide

1. **Two versions of the gate.** AC 11.3.1 and D51 use the species-only baseline (above). `ml/README.md` still describes a stricter D50 gate against B2, with a calibration mark. Under that version the state model meets the B2 marks: Brier on 2024 is 0.094 against 0.125; Brier is no worse in all three rolling years; AUC on 2024 is within 0.01 of B2 (0.941 against 0.947). It misses the calibration mark: in the 0.6 to 0.9 bands, observed shares are 0.12 to 0.22 above the mean prediction. Confirm that D51 replaces D50 and update `ml/README.md`.
2. **Training years.** The site says 2015 to 2024 and the documents say 2015 to 2023. Both are right: the 2024 test model is trained on 2015 to 2023, and the deployed model is retrained on 2015 to 2024. Documents should say which one they mean.
3. **The area model** is not yet shown with its scores on the method page; its record is in `ml/output/grid_evaluation_report.json`.
