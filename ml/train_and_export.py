"""Trains, evaluates and exports the "which of the seven species are likely to be recorded in my state and month" model.

What it does
  1. Reads ml/data/ml_dataset_v3.csv (built and checked by build_dataset.py).
  2. Evaluates with a split by time only: rolling test years 2021, 2022, 2023, then the final test year 2024
     (always trained on earlier years). Three baselines are scored beside the model. 2025 and 2026 are scored
     separately and labelled incomplete.
  3. Trains the final model on 2015-2024 and exports
       output/model.joblib            the trained model with its feature columns and metadata
       output/predictions.json        the static file the page reads: one row per state, month and species
       output/evaluation_report.json  every score, the calibration table and the per-species table
  4. Stops with an error if a file check fails (section 6.4 of the AI and ML Safeguards document).

Design decisions (agreed by the team)
  - Features are species, state, month, year, state population (2020) and forest reserve area.
  - NO features built from the history of the target (for example the share of records over the previous twelve
    months). With a static file they gave no gain in AUC or Brier, and they would let the output predict the output.
  - The record count, the record share and the 0/1 target are never features (checked below).
  - Release gate (D51): AUC above and Brier below the species-only baseline in each of 2021 to 2024. This script
    reports the scores beside the baselines but does not yet check the gate; see ml/README.md. The model is
    described as a simple prediction with no accuracy guarantee.
  - Hyperparameters are fixed in this file before any score is computed and are not tuned on the test years.

Usage:  python ml/train_and_export.py
"""
import hashlib
import os
import json
import platform
import sys
from datetime import date
from pathlib import Path

os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")   # silences a harmless joblib warning about counting cores on Windows
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, roc_auc_score

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from build_dataset import FOREST_LAST_YEAR, SPECIES, STATES, load_forest, load_population  # noqa: E402

DATA = HERE / "data" / "ml_dataset_v3.csv"
OUT = HERE / "output"

# ---------------------------------------------------------------- settings (fixed before any run)
SEED = 42
FEATURES = ["species", "state_normalised", "month", "year", "pop_2020_k", "forest_reserve_ha"]
TARGET = "present"
FORBIDDEN_FEATURES = {"encounter_count", "encounter_share", "present"}
PARAMS = dict(loss="log_loss", learning_rate=0.05, max_iter=200, max_depth=4, min_samples_leaf=20,
              l2_regularization=1.0, early_stopping=False, random_state=SEED)
ROLLING_YEARS = [2021, 2022, 2023]
FINAL_TEST_YEAR = 2024
INCOMPLETE_YEARS = [2025, 2026]
PREDICTION_YEAR = 2024            # the last training year; a tree model cannot look past the years it has seen

if FORBIDDEN_FEATURES & set(FEATURES):
    raise SystemExit(f"LEAKAGE: {sorted(FORBIDDEN_FEATURES & set(FEATURES))} must never be a feature")


# ---------------------------------------------------------------- model and baselines
def design(df: pd.DataFrame) -> pd.DataFrame:
    x = pd.DataFrame(index=df.index)
    for s in SPECIES:
        x["species_" + s] = (df["species"] == s).astype(int)
    for st in STATES:
        x["state_" + st] = (df["state_normalised"] == st).astype(int)
    for c in ["month", "year", "pop_2020_k", "forest_reserve_ha"]:
        x[c] = df[c]
    return x


def fit_model(train: pd.DataFrame) -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(**PARAMS).fit(design(train), train[TARGET])


def predict(model, df: pd.DataFrame) -> np.ndarray:
    return np.clip(model.predict_proba(design(df))[:, 1], 0, 1)


def baselines(train: pd.DataFrame, test: pd.DataFrame, test_year: int) -> dict:
    sp = train.groupby("species")[TARGET].mean()
    ss = train.groupby(["species", "state_normalised"])[TARGET].mean()
    recent = train[train["year"] >= test_year - 2].groupby(["species", "state_normalised"])[TARGET].mean()
    keys = list(zip(test["species"], test["state_normalised"]))
    p1 = test["species"].map(sp).to_numpy()
    p2 = np.array([ss.get(k, sp[k[0]]) for k in keys])
    p3 = np.array([recent.get(k, ss.get(k, sp[k[0]])) for k in keys])
    return {"B1 species only": p1, "B2 species x state average": p2, "B3 species x state, last two years": p3}


# ---------------------------------------------------------------- measures
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


def evaluate(df: pd.DataFrame, test_years: list, label: str) -> dict:
    first = min(test_years)
    train, test = df[df["year"] < first], df[df["year"].isin(test_years)]
    assert train["year"].max() < test["year"].min(), "test years must be later than every training year"
    model = fit_model(train)
    p = predict(model, test)
    y = test[TARGET].to_numpy()
    out = {"label": label, "test_years": test_years, "train_years": f"{int(train['year'].min())}-{int(train['year'].max())}",
           "rows": int(len(test)), "model": scores(y, p)}
    out["baselines"] = {name: scores(y, bp) for name, bp in baselines(train, test, first).items()}
    out["_y"], out["_p"], out["_test"] = y, p, test
    return out


def per_species(result: dict) -> list:
    test, y, p = result["_test"], result["_y"], result["_p"]
    b2 = baselines(df_all[df_all["year"] < FINAL_TEST_YEAR], test, FINAL_TEST_YEAR)["B2 species x state average"]
    rows = []
    for s in SPECIES:
        m = (test["species"] == s).to_numpy()
        try:
            rows.append({"species": s, "rows": int(m.sum()), "model": scores(y[m], p[m]), "baseline_B2": scores(y[m], b2[m])})
        except ValueError:
            rows.append({"species": s, "rows": int(m.sum()), "model": None, "baseline_B2": None})
    return rows


def strip(r: dict) -> dict:
    return {k: v for k, v in r.items() if not k.startswith("_")}


# ---------------------------------------------------------------- run
df_all = pd.read_csv(DATA)
dataset_sha = hashlib.sha256(DATA.read_bytes()).hexdigest()
print(f"dataset {DATA.name}: {len(df_all)} rows, sha256 {dataset_sha[:16]}...")

rolling = [evaluate(df_all, [y], f"rolling {y}") for y in ROLLING_YEARS]
final = evaluate(df_all, [FINAL_TEST_YEAR], f"final test {FINAL_TEST_YEAR}")       # computed once, after the rolling years
incomplete = [evaluate(df_all, [y], f"{y} (incomplete year)") for y in INCOMPLETE_YEARS]
# the models for 2025 and 2026 above are trained on years before each test year; both are labelled incomplete in the report

print("\nAUC / Brier (higher AUC and lower Brier are better)")
print(f"{'test':<24}{'model':<18}" + "".join(f"{n:<38}" for n in final["baselines"]))
for r in rolling + [final] + incomplete:
    print(f"{r['label']:<24}{r['model']['auc']:.3f} / {r['model']['brier']:.3f}   " +
          "".join(f"{b['auc']:.3f} / {b['brier']:.3f}".ljust(38) for b in r["baselines"].values()))

final_cal = calibration(final["_y"], final["_p"])
final_species = per_species(final)
print("\nCalibration on 2024 (model): band, rows, mean prediction, observed share")
for c in final_cal:
    print(f"  {c['band']}  {c['rows']:>4}  {c['mean_prediction']:.3f}  {c['observed_share']:.3f}")
print("\nPer species on 2024 (model AUC / Brier, baseline B2 AUC / Brier)")
for s in final_species:
    if s["model"]:
        print(f"  {s['species']:<26}{s['model']['auc']:.3f} / {s['model']['brier']:.3f}   {s['baseline_B2']['auc']:.3f} / {s['baseline_B2']['brier']:.3f}")

# ---------------------------------------------------------------- final model, trained on 2015-2024
train_final = df_all[df_all["year"] <= PREDICTION_YEAR]
pop, forest = load_population(), load_forest()
state_groups = train_final.groupby("state_normalised").apply(lambda g: g[["year", "month"]].drop_duplicates().shape[0], include_groups=False)
species_state_records = train_final.groupby(["species", "state_normalised"])["encounter_count"].sum()
grid = pd.DataFrame([(sp, st, m) for st in STATES for m in range(1, 13) for sp in SPECIES], columns=["species", "state_normalised", "month"])
grid["year"] = PREDICTION_YEAR
grid["pop_2020_k"] = grid["state_normalised"].map(pop)
grid["forest_reserve_ha"] = [int(forest[(s, min(PREDICTION_YEAR, FOREST_LAST_YEAR))]) for s in grid["state_normalised"]]


def export_rows(model) -> list:
    p = predict(model, grid)
    return [{"state": r.state_normalised, "month": int(r.month), "species": r.species, "probability": round(float(pr), 4),
             "records_species_state": int(species_state_records.get((r.species, r.state_normalised), 0)),
             "groups_state": int(state_groups.get(r.state_normalised, 0))}
            for r, pr in zip(grid.itertuples(), p)]


model_final = fit_model(train_final)
rows = export_rows(model_final)
assert rows == export_rows(fit_model(train_final)), "two runs on the same data must give the same file"     # reproducible
predictions_sha = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()

versions = {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
            "scikit-learn": sklearn.__version__, "joblib": joblib.__version__}
metadata = {
    "model": "Gradient-boosted decision trees (scikit-learn HistGradientBoostingClassifier, logistic loss)",
    "predicts": "how likely each species is to have at least one GBIF record in a state in a month",
    "what_it_is_not": "not a count of animals and not a probability for a household; a record is one report by a person",
    "features": FEATURES,
    "not_used_as_features": sorted(FORBIDDEN_FEATURES),
    "hyperparameters": {k: v for k, v in PARAMS.items()},
    "hyperparameters_note": "fixed before any score was computed; not tuned on the test years",
    "seed": SEED,
    "dataset": {"file": DATA.name, "sha256": dataset_sha, "rows": int(len(df_all)),
                "sources": ["GBIF records (iteration3_data_for_ML.csv)",
                            "DOSM population_state, data.gov.my, 2020 value",
                            "Area of Permanent Forest Reserves by State, Forestry Department of Peninsular Malaysia and DOSM, data.gov.my, CC BY 4.0, hectares; latest year 2022, later years reuse 2022"]},
    "training_years": f"{int(train_final['year'].min())}-{int(train_final['year'].max())}",
    "last_month_of_records_in_training": f"{PREDICTION_YEAR}-12",
    "data_last_month_available": "2026-08 (2025 and 2026 are incomplete because of release lag)",
    "prediction_year": PREDICTION_YEAR,
    "rolling_test_years": ROLLING_YEARS,
    "final_test_year": FINAL_TEST_YEAR,
    "date_trained": date.today().isoformat(),
    "library_versions": versions,
    "predictions_sha256": predictions_sha,
}

# ---------------------------------------------------------------- file checks (section 6.4)
errors = []
if len(rows) != 16 * 12 * 7:
    errors.append(f"expected {16 * 12 * 7} rows, got {len(rows)}")
if any(not (0 <= r["probability"] <= 1) for r in rows):
    errors.append("a probability is outside 0 to 1")
if any(v is None or v == "" for r in rows for v in r.values()):
    errors.append("an empty cell")
if len({(r["state"], r["month"], r["species"]) for r in rows}) != len(rows):
    errors.append("duplicate state, month and species")
for k in ["model", "features", "dataset", "training_years", "date_trained", "predictions_sha256"]:
    if k not in metadata:
        errors.append(f"metadata missing {k}")
if errors:
    raise SystemExit("FILE CHECK FAILED:\n  - " + "\n  - ".join(errors))

OUT.mkdir(exist_ok=True)
joblib.dump({"model": model_final, "feature_columns": list(design(grid).columns), "species": SPECIES, "states": STATES,
             "metadata": metadata}, OUT / "model.joblib")
reloaded = joblib.load(OUT / "model.joblib")
assert rows == export_rows(reloaded["model"]), "the saved model must reproduce the exported predictions"
(OUT / "predictions.json").write_text(json.dumps({"metadata": metadata, "predictions": rows}, separators=(",", ":")), encoding="utf-8")

report = {
    "run_by": None, "run_note": "to be filled in by the member who runs the test; the date is the training date",
    "date": date.today().isoformat(), "dataset_sha256": dataset_sha, "hyperparameters": PARAMS, "library_versions": versions,
    "rolling": [strip(r) for r in rolling],
    "final_test_2024": {**strip(final), "calibration": final_cal, "per_species": final_species},
    "incomplete_years": [{**strip(r), "note": "incomplete year (release lag), reported separately"} for r in incomplete],
}
(OUT / "evaluation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"\nwrote {OUT / 'model.joblib'}\nwrote {OUT / 'predictions.json'} ({len(rows)} rows)\nwrote {OUT / 'evaluation_report.json'}")
print("all file checks passed; two runs give the same file; the saved model reproduces the exported predictions")
