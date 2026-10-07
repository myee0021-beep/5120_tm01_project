"""Does the new grid-cell file help the model?  A check, not part of the pipeline: it reads the data files and the project's settings, and writes nothing.

Usage:  python ml/check_grid_features.py

Part 0  reproduce the current model on ml_dataset_v3.csv with the project's settings
Part 1  same task (state, month, species), same time split, plus features built from the grid file
        - grid features use only the training period of the grid file (2015-2023), so 2024, 2025, 2026 are clean tests
        - 2021-2023 cannot be tested cleanly because the grid file has no single years
Part 2  the grid file's own task: which species are recorded in a 0.25 degree cell in a month (train 2015-2023, test 2024)
"""
import os, sys, warnings
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, brier_score_loss

from pathlib import Path
ML = Path(__file__).resolve().parent
v3 = pd.read_csv(ML / "data" / "ml_dataset_v3.csv")
g = pd.read_csv(ML / "Iteration 3 Data for ML (grid cell, smoothed).csv")
SPECIES = sorted(v3.species.unique()); STATES = sorted(v3.state_normalised.unique())
PARAMS = dict(loss="log_loss", learning_rate=0.05, max_iter=200, max_depth=4, min_samples_leaf=20,
              l2_regularization=1.0, early_stopping=False, random_state=42)

def sc(y, p): return round(roc_auc_score(y, p), 4), round(brier_score_loss(y, p), 4)

# ------------------------------------------------------------------ Part 0
BASE = ["month", "year", "pop_2020_k", "forest_reserve_ha"]
def design(df, extra=()):
    x = pd.DataFrame(index=df.index)
    for s in SPECIES: x["species_" + s] = (df.species == s).astype(int)
    for st in STATES: x["state_" + st] = (df.state_normalised == st).astype(int)
    for c in list(BASE) + list(extra): x[c] = df[c]
    return x
def baselines(train, test, ty):
    sp = train.groupby("species").present.mean(); ss = train.groupby(["species", "state_normalised"]).present.mean()
    rec = train[train.year >= ty - 2].groupby(["species", "state_normalised"]).present.mean()
    k = list(zip(test.species, test.state_normalised))
    return {"B1": test.species.map(sp).to_numpy(), "B2": np.array([ss.get(a, sp[a[0]]) for a in k]),
            "B3": np.array([rec.get(a, ss.get(a, sp[a[0]])) for a in k])}
def run(df, ty, extra=()):
    tr, te = df[df.year < ty], df[df.year == ty]
    m = HistGradientBoostingClassifier(**PARAMS).fit(design(tr, extra), tr.present)
    p = np.clip(m.predict_proba(design(te, extra))[:, 1], 0, 1)
    return te, p, baselines(tr, te, ty)

print("=== Part 0: current model on ml_dataset_v3 (project settings)")
print("README says 2024: model 0.941/0.094, B1 0.864/0.164, B2 0.947/0.125, B3 0.942/0.093")
for ty in [2024, 2025, 2026]:
    te, p, b = run(v3, ty)
    print(ty, "model", sc(te.present, p), {k: sc(te.present, v) for k, v in b.items()})

# ------------------------------------------------------------------ Part 1
gt = g[g.period == "train_2015_2023"].copy()
gt["month"] = gt.month.astype(int)
rec = gt[gt.encounter_count > 0]
# cells and records per state from the training period only
st_cells = rec.groupby("state").cell_id.nunique().rename("n_cells_state")
ss_cells = rec.groupby(["state", "species"]).cell_id.nunique().rename("ss_cells")
st_rec = rec.groupby("state").encounter_count.sum()
top_cell = rec.groupby(["state", "cell_id"]).encounter_count.sum().groupby("state").max() / st_rec
ss_rec = rec.groupby(["state", "species"]).encounter_count.sum()
ss_top = (rec.groupby(["state", "species", "cell_id"]).encounter_count.sum().groupby(["state", "species"]).max() / ss_rec)
geo = rec.assign(w=rec.encounter_count).groupby("state").apply(lambda d: pd.Series({"state_lat": np.average(d.cell_lat, weights=d.w), "state_lon": np.average(d.cell_lon, weights=d.w)}), include_groups=False)
sm_cells = rec.groupby(["state", "month"]).cell_id.nunique().rename("sm_cells")
ssm_cells = rec.groupby(["state", "species", "month"]).cell_id.nunique().rename("ssm_cells")
smshare = gt.drop_duplicates(["state", "month", "species"]).set_index(["state", "month", "species"]).state_month_share.rename("grid_state_month_share")

d = v3.copy()
d["n_cells_state"] = d.state_normalised.map(st_cells)
d["top_cell_share"] = d.state_normalised.map(top_cell)
d["state_lat"] = d.state_normalised.map(geo.state_lat); d["state_lon"] = d.state_normalised.map(geo.state_lon)
k = list(zip(d.state_normalised, d.species))
d["ss_cells"] = [ss_cells.get(a, 0) for a in k]
d["ss_cell_share"] = d.ss_cells / d.n_cells_state
d["ss_top_cell_share"] = [ss_top.get(a, np.nan) for a in k]
d["sm_cells"] = [sm_cells.get(a, 0) for a in zip(d.state_normalised, d.month)]
d["ssm_cells"] = [ssm_cells.get(a, 0) for a in zip(d.state_normalised, d.species, d.month)]
d["grid_state_month_share"] = [smshare.get(a, np.nan) for a in zip(d.state_normalised, d.month, d.species)]
print("\nstates with no grid cells (features missing):", sorted(set(STATES) - set(g.state.unique())))

SETS = {
    "current model": [],
    "+ state position (lat, lon)": ["state_lat", "state_lon"],
    "+ species footprint (cells where the species was recorded)": ["ss_cells", "ss_cell_share", "ss_top_cell_share"],
    "+ state spread (cells with records, top-cell share)": ["n_cells_state", "top_cell_share"],
    "+ footprint by month (cells active that month)": ["sm_cells", "ssm_cells"],
    "+ all of the above": ["state_lat", "state_lon", "ss_cells", "ss_cell_share", "ss_top_cell_share", "n_cells_state", "top_cell_share", "sm_cells", "ssm_cells"],
    "+ grid state-month species share (history of the target)": ["grid_state_month_share"],
}
print("\n=== Part 1: AUC / Brier by test year (features from the 2015-2023 grid rows only)")
res = {}
for name, extra in SETS.items():
    row = []
    for ty in [2024, 2025, 2026]:
        te, p, b = run(d, ty, extra); res[(name, ty)] = (te, p, b)
        row.append(f"{ty}: {sc(te.present, p)[0]:.3f}/{sc(te.present, p)[1]:.3f}")
    print(f"{name:<62}" + "   ".join(row))
for ty in [2024, 2025, 2026]:
    te, p, b = res[("current model", ty)]
    print(f"baselines {ty}: " + "  ".join(f"{k} {sc(te.present, v)[0]:.3f}/{sc(te.present, v)[1]:.3f}" for k, v in b.items()))

# paired bootstrap over state-month groups on 2024 and 2025/2026 for the two most relevant sets
rng = np.random.default_rng(7)
def boot(name_a, name_b, ty, n=300):
    te, pa, _ = res[(name_a, ty)]; _, pb, _ = res[(name_b, ty)]
    y = te.present.to_numpy(); grp = (te.state_normalised + "|" + te.month.astype(str)).to_numpy()
    ug = np.unique(grp); idx = {u: np.where(grp == u)[0] for u in ug}
    da, db = [], []
    for _ in range(n):
        pick = np.concatenate([idx[u] for u in rng.choice(ug, len(ug))])
        if len(set(y[pick])) < 2: continue
        da.append(roc_auc_score(y[pick], pb[pick]) - roc_auc_score(y[pick], pa[pick]))
        db.append(brier_score_loss(y[pick], pa[pick]) - brier_score_loss(y[pick], pb[pick]))
    return np.percentile(da, [2.5, 50, 97.5]).round(4), np.percentile(db, [2.5, 50, 97.5]).round(4)
print("\npaired bootstrap, change from adding features (AUC gain, Brier improvement; 95% interval; 0 means no change)")
for nm in ["+ all of the above", "+ species footprint (cells where the species was recorded)", "+ grid state-month species share (history of the target)"]:
    for ty in [2024, 2025, 2026]:
        a, b = boot("current model", nm, ty)
        print(f"  {nm[:58]:<58} {ty}  AUC {a.tolist()}  Brier {b.tolist()}")

# ------------------------------------------------------------------ Part 2
print("\n=== Part 2: the grid file's own task (cell, month, species), train 2015-2023, test 2024")
g["month"] = g.month.astype(int)
tr = g[g.period == "train_2015_2023"].copy(); te = g[g.period == "test_2024"].copy()
print("rows train", len(tr), "test", len(te), " share recorded: train %.3f test %.3f" % (tr.recorded.mean(), te.recorded.mean()))
print("test cell-months with cells never seen in training:", te[~te.cell_id.isin(tr.cell_id)].drop_duplicates(["cell_id", "month"]).shape[0], "of", te.drop_duplicates(["cell_id", "month"]).shape[0])
# is the file's encounter_share built from the same period (leak for the test rows)?
tr_cm = tr.groupby(["cell_id", "month", "species"]).encounter_count.sum()
def sh(df): s = df.groupby(["cell_id", "month", "species"]).encounter_count.sum(); return s / s.groupby(level=[0, 1]).transform("sum")
own = sh(te); j = te.set_index(["cell_id", "month", "species"])
print("test rows: corr(encounter_share, raw share of the same 2024 cell-month) = %.3f ; corr(encounter_share, state_month_share) = %.3f" % (j.encounter_share.corr(own.reindex(j.index)), j.encounter_share.corr(j.state_month_share)))
print("test rows: corr(encounter_share, encounter_share_raw) = %.3f   train rows: %.3f" % (te.encounter_share.corr(te.encounter_share_raw), tr.encounter_share.corr(tr.encounter_share_raw)))

def fe(df, ref):
    x = pd.DataFrame(index=df.index)
    for s in SPECIES: x["sp_" + s] = (df.species == s).astype(int)
    x["lat"] = df.cell_lat; x["lon"] = df.cell_lon; x["month"] = df.month
    x["state"] = df.state.astype("category").cat.codes
    x["log_cell_train"] = np.log1p(df.cell_records_train_years)
    return x
FE = {"species + position (lat, lon, month, state)": ["lat", "lon", "month", "state"],
      "+ cell records in training years (history)": ["lat", "lon", "month", "state", "log_cell_train"]}
# baselines on the test rows
sp = tr.groupby("species").recorded.mean(); ss = tr.groupby(["state", "species"]).recorded.mean(); sc_ = tr.groupby(["cell_id", "species"]).recorded.mean()
k1 = te.species.map(sp).to_numpy(); k2 = np.array([ss.get((a, b), sp[b]) for a, b in zip(te.state, te.species)])
k3 = np.array([sc_.get((a, b), ss.get((c, b), sp[b])) for a, b, c in zip(te.cell_id, te.species, te.state)])
print("baselines (AUC/Brier):  B1 species", sc(te.recorded, k1), " B2 species x state", sc(te.recorded, k2), " B-cell species x cell", sc(te.recorded, k3))
for name, cols in FE.items():
    Xtr, Xte = fe(tr, tr), fe(te, tr)
    cols_all = [c for c in Xtr.columns if c.startswith("sp_")] + cols
    m = HistGradientBoostingClassifier(**PARAMS).fit(Xtr[cols_all], tr.recorded)
    p = np.clip(m.predict_proba(Xte[cols_all])[:, 1], 0, 1)
    print(f"model {name:<48}", sc(te.recorded, p))
    if "history" in name:
        for s in SPECIES:
            mk = (te.species == s).to_numpy()
            print(f"    {s:<26} model {sc(te.recorded[mk], p[mk])}  B2 {sc(te.recorded[mk], k2[mk])}  B-cell {sc(te.recorded[mk], k3[mk])}")
# ranking within a cell-month: is the top-ranked species the one recorded?
te2 = te.assign(p=p); top = te2.loc[te2.groupby(["cell_id", "month"]).p.idxmax()]
print("share of active cell-months where the model's top species was recorded: %.3f" % top.recorded.mean())
te2["p2"] = k2; top2 = te2.loc[te2.groupby(["cell_id", "month"]).p2.idxmax()]
print("same for species x state average: %.3f" % top2.recorded.mean())
