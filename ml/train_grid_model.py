"""Trains, evaluates and exports the area model: "in which 0.25 degree squares are the seven species recorded".

This is the second model of the Ecosystem forecast. The state model (train_and_export.py) says how likely a species is to be
recorded in a state in a month. This one uses the location of the record, a square of about 28 km, as its input.

What it predicts
  If at least one record is made in a square in a month, how likely is it that the species is among them.
  It is conditional on the square having a record that month, because the source file only lists square-months with a record.
  It is not a count of animals and not a probability for a home. A record is one report by a person.

What it does
  1. Reads ml/Iteration 3 Data for ML (grid cell, smoothed).csv. One row is a square, a month, a period and a species.
  2. Evaluates with a split by time only. Final test: train on 2015-2023, test on 2024. The file has no single years,
     so there are no rolling years. 2025-2026 are scored separately, trained on 2015-2024, and labelled incomplete.
     Three baselines that need no training are scored beside the model.
  3. Trains the final model on 2015-2024 and exports
       output/grid_model.joblib            the model with its feature columns and metadata
       output/grid_predictions.json        one entry per square: 12 months x 7 species
       output/grid_evaluation_report.json  every score, the calibration table and the per-species table
  4. Stops with an error if a file check fails.

Design decisions
  - Features: species, state, latitude and longitude of the square centre, month, and the length of the period in years.
  - Nothing built from the records themselves is a feature: not the counts, the square totals, the smoothed shares, the
    state-month share, the records in training years or the enough-records flag (checked below). This follows the state model.
  - The length of the period is a feature because a period of nine years has more species recorded than a period of one year.
    The exported predictions are for a period of one year, like one year and month in the state model.
  - Hyperparameters are the same as the state model and are not tuned on the test period.
  - The model is described as a simple prediction with no accuracy guarantee.

Usage:  python ml/train_grid_model.py
"""
import hashlib
import json
import os
import platform
import sys
from datetime import date
from pathlib import Path

os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, roc_auc_score

HERE = Path(__file__).resolve().parent
DATA = HERE / "Iteration 3 Data for ML (grid cell, smoothed).csv"
OUT = HERE / "output"

SPECIES = ["Acridotheres tristis", "Corvus splendens", "Macaca fascicularis", "Malayopython reticulatus",
           "Naja sumatrana", "Sus scrofa", "Varanus salvator"]
PERIODS = {"train_2015_2023": 9, "test_2024": 1, "incomplete_2025_2026": 2}   # name -> length in years (2025-2026 is about 1.7)
TRAIN, TEST, INCOMPLETE = "train_2015_2023", "test_2024", "incomplete_2025_2026"
EXPORT_PERIOD_YEARS = 1
CELL = 0.25

SEED = 42
FEATURES = ["species", "state", "cell_lat", "cell_lon", "month", "window_years"]
TARGET = "recorded"
FORBIDDEN_FEATURES = {"encounter_count", "cell_total", "recorded", "encounter_share", "encounter_share_raw",
                      "state_month_share", "enough_records", "cell_records_train_years"}
PARAMS = dict(loss="log_loss", learning_rate=0.05, max_iter=200, max_depth=4, min_samples_leaf=20,
              l2_regularization=1.0, early_stopping=False, random_state=SEED)

if FORBIDDEN_FEATURES & set(FEATURES):
    raise SystemExit(f"LEAKAGE: {sorted(FORBIDDEN_FEATURES & set(FEATURES))} must never be a feature")

df = pd.read_csv(DATA)
dataset_sha = hashlib.sha256(DATA.read_bytes()).hexdigest()
need = {"period", "cell_id", "cell_lat", "cell_lon", "state", "month", "species", "encounter_count", "recorded"}
if need - set(df.columns):
    raise SystemExit(f"missing columns: {sorted(need - set(df.columns))}")
if set(df.period.unique()) != set(PERIODS) or set(df.species.unique()) != set(SPECIES):
    raise SystemExit("unexpected periods or species in the grid file")
if ((df.encounter_count > 0).astype(int) != df.recorded).any():
    raise SystemExit("recorded must equal encounter_count > 0")
df["window_years"] = df.period.map(PERIODS)
STATES = sorted(df.state.unique())
print(f"dataset {DATA.name}: {len(df)} rows, {df.cell_id.nunique()} squares, sha256 {dataset_sha[:16]}...")


def design(d: pd.DataFrame) -> pd.DataFrame:
    x = pd.DataFrame(index=d.index)
    for s in SPECIES:
        x["species_" + s] = (d["species"] == s).astype(int)
    for st in STATES:
        x["state_" + st] = (d["state"] == st).astype(int)
    for c in ["cell_lat", "cell_lon", "month", "window_years"]:
        x[c] = d[c]
    return x


def fit_model(train: pd.DataFrame) -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(**PARAMS).fit(design(train), train[TARGET])


def predict(model, d: pd.DataFrame) -> np.ndarray:
    return np.clip(model.predict_proba(design(d))[:, 1], 0, 1)


def baselines(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    sp = train.groupby("species")[TARGET].mean()
    ss = train.groupby(["state", "species"])[TARGET].mean()
    sc = train.groupby(["cell_id", "species"])[TARGET].mean()
    p1 = test["species"].map(sp).to_numpy()
    p2 = np.array([ss.get((a, b), sp[b]) for a, b in zip(test["state"], test["species"])])
    p3 = np.array([sc.get((c, b), ss.get((a, b), sp[b])) for c, a, b in zip(test["cell_id"], test["state"], test["species"])])
    return {"B1 species only": p1, "B2 species x state average": p2, "B3 species x square average": p3}


def scores(y, p) -> dict:
    return {"auc": round(float(roc_auc_score(y, p)), 4), "brier": round(float(brier_score_loss(y, p)), 4)}


def calibration(y, p) -> list:
    band = np.minimum((np.asarray(p) * 10).astype(int), 9)
    rows = []
    for b in range(10):
        m = band == b
        if m.any():
            rows.append({"band": f"{b / 10:.1f}-{(b + 1) / 10:.1f}", "rows": int(m.sum()),
                         "mean_prediction": round(float(np.asarray(p)[m].mean()), 3),
                         "observed_share": round(float(np.asarray(y)[m].mean()), 3)})
    return rows


def evaluate(train_periods: list, test_period: str, label: str) -> dict:
    train, test = df[df.period.isin(train_periods)], df[df.period == test_period]
    order = list(PERIODS)
    assert max(order.index(p) for p in train_periods) < order.index(test_period), "the test period must be later than every training period"
    model = fit_model(train)
    p = predict(model, test)
    y = test[TARGET].to_numpy()
    out = {"label": label, "train_periods": train_periods, "test_period": test_period, "rows": int(len(test)),
           "share_recorded_train": round(float(train[TARGET].mean()), 3), "share_recorded_test": round(float(y.mean()), 3),
           "squares_in_test_never_seen_in_training": int(test[~test.cell_id.isin(train.cell_id)].cell_id.nunique()),
           "model": scores(y, p)}
    out["baselines"] = {n: scores(y, bp) for n, bp in baselines(train, test).items()}
    t = test.assign(p=p)
    top = t.loc[t.groupby(["cell_id", "month"]).p.idxmax()]
    out["top_species_recorded_share"] = round(float(top[TARGET].mean()), 3)
    out["_y"], out["_p"], out["_test"], out["_train"] = y, p, test, train
    return out


def per_species(r: dict) -> list:
    test, y, p = r["_test"], r["_y"], r["_p"]
    b3 = baselines(r["_train"], test)["B3 species x square average"]
    rows = []
    for s in SPECIES:
        m = (test["species"] == s).to_numpy()
        try:
            rows.append({"species": s, "rows": int(m.sum()), "model": scores(y[m], p[m]), "baseline_B3": scores(y[m], b3[m])})
        except ValueError:
            rows.append({"species": s, "rows": int(m.sum()), "model": None, "baseline_B3": None})
    return rows


def strip(r: dict) -> dict:
    return {k: v for k, v in r.items() if not k.startswith("_")}


# ---------------------------------------------------------------- tests
final = evaluate([TRAIN], TEST, "final test 2024")
incomplete = evaluate([TRAIN, TEST], INCOMPLETE, "2025-2026 (incomplete)")

print("\nAUC / Brier (higher AUC and lower Brier are better)")
print(f"{'test':<26}{'model':<18}" + "".join(f"{n:<34}" for n in final["baselines"]))
for r in (final, incomplete):
    print(f"{r['label']:<26}{r['model']['auc']:.3f} / {r['model']['brier']:.3f}   " +
          "".join(f"{b['auc']:.3f} / {b['brier']:.3f}".ljust(34) for b in r["baselines"].values()))
print(f"\nshare recorded: train {final['share_recorded_train']}, test {final['share_recorded_test']}; "
      f"top species of each square-month was recorded in {final['top_species_recorded_share']:.1%} of square-months")
cal = calibration(final["_y"], final["_p"])
by_species = per_species(final)
print("\nCalibration on 2024: band, rows, mean prediction, observed share")
for c in cal:
    print(f"  {c['band']}  {c['rows']:>5}  {c['mean_prediction']:.3f}  {c['observed_share']:.3f}")
print("\nPer species on 2024 (model AUC / Brier, baseline B3 AUC / Brier)")
for s in by_species:
    if s["model"]:
        print(f"  {s['species']:<26}{s['model']['auc']:.3f} / {s['model']['brier']:.3f}   {s['baseline_B3']['auc']:.3f} / {s['baseline_B3']['brier']:.3f}")

# ---------------------------------------------------------------- final model, trained on 2015-2024
train_final = df[df.period.isin([TRAIN, TEST])]
squares = (df.drop_duplicates("cell_id")[["cell_id", "cell_lat", "cell_lon", "state"]]
           .sort_values("cell_id").reset_index(drop=True))
records = train_final[train_final.encounter_count > 0].groupby("cell_id").encounter_count.sum()
grid = pd.DataFrame([(r.cell_id, r.cell_lat, r.cell_lon, r.state, m, s) for r in squares.itertuples() for m in range(1, 13) for s in SPECIES],
                    columns=["cell_id", "cell_lat", "cell_lon", "state", "month", "species"])
grid["window_years"] = EXPORT_PERIOD_YEARS


def export_cells(model) -> list:
    p = np.round(predict(model, grid), 3).reshape(len(squares), 12 * len(SPECIES))
    return [{"id": r.cell_id, "lat": round(float(r.cell_lat), 3), "lon": round(float(r.cell_lon), 3), "state": r.state,
             "records": int(records.get(r.cell_id, 0)), "p": [float(v) for v in p[i]]}
            for i, r in enumerate(squares.itertuples())]


model_final = fit_model(train_final)
cells = export_cells(model_final)
assert cells == export_cells(fit_model(train_final)), "two runs on the same data must give the same file"

versions = {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
            "scikit-learn": sklearn.__version__, "joblib": joblib.__version__}
metadata = {
    "model": "Gradient-boosted decision trees (scikit-learn HistGradientBoostingClassifier, logistic loss), area model",
    "predicts": "if at least one record is made in a 0.25 degree square in a month, how likely the species is among the species recorded",
    "conditional_on": "the square having at least one record that month; the source file lists only square-months with a record",
    "what_it_is_not": "not a count of animals and not a probability for a household; a record is one report by a person",
    "layout": "cells[i].p has 84 values: month 1 to 12, and within each month the species in the order of the species list",
    "species": SPECIES,
    "features": FEATURES,
    "not_used_as_features": sorted(FORBIDDEN_FEATURES),
    "export_period_years": EXPORT_PERIOD_YEARS,
    "hyperparameters": PARAMS,
    "hyperparameters_note": "same as the state model; not tuned on the test period",
    "seed": SEED,
    "square_size_degrees": CELL,
    "dataset": {"file": DATA.name, "sha256": dataset_sha, "rows": int(len(df)), "squares": int(len(squares)),
                "periods": PERIODS},
    "training_periods": "2015-2023 and 2024",
    "date_trained": date.today().isoformat(),
    "library_versions": versions,
}

# ---------------------------------------------------------------- file checks
errors = []
if len(cells) != len(squares) or any(len(c["p"]) != 12 * len(SPECIES) for c in cells):
    errors.append("every square needs 12 x 7 values")
if any(not (0 <= v <= 1) for c in cells for v in c["p"]):
    errors.append("a probability is outside 0 to 1")
if len({c["id"] for c in cells}) != len(cells):
    errors.append("duplicate square")
if any(v is None or v == "" for c in cells for v in (c["id"], c["lat"], c["lon"], c["state"])):
    errors.append("an empty cell")
for k in ["model", "features", "dataset", "training_periods", "date_trained", "layout"]:
    if k not in metadata:
        errors.append(f"metadata missing {k}")
if errors:
    raise SystemExit("FILE CHECK FAILED:\n  - " + "\n  - ".join(errors))

OUT.mkdir(exist_ok=True)
joblib.dump({"model": model_final, "feature_columns": list(design(grid).columns), "species": SPECIES, "states": STATES,
             "metadata": metadata}, OUT / "grid_model.joblib")
assert cells == export_cells(joblib.load(OUT / "grid_model.joblib")["model"]), "the saved model must reproduce the exported predictions"
(OUT / "grid_predictions.json").write_text(json.dumps({"metadata": metadata, "cells": cells}, separators=(",", ":")), encoding="utf-8")

report = {
    "run_by": None, "run_note": "to be filled in by the member who runs the test; the date is the training date",
    "date": date.today().isoformat(), "dataset_sha256": dataset_sha, "hyperparameters": PARAMS, "library_versions": versions,
    "final_test_2024": {**strip(final), "calibration": cal, "per_species": by_species},
    "incomplete_2025_2026": {**strip(incomplete), "note": "incomplete period (release lag), reported separately"},
}
(OUT / "grid_evaluation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"\nwrote {OUT / 'grid_model.joblib'}\nwrote {OUT / 'grid_predictions.json'} ({len(cells)} squares x 84 values)\nwrote {OUT / 'grid_evaluation_report.json'}")
print("all file checks passed; two runs give the same file; the saved model reproduces the exported predictions")
