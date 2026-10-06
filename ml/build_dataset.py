"""Builds the training dataset ml/data/ml_dataset_v3.csv from the three raw files in ml/data/raw.

Raw files
  iteration3_data_for_ML.csv   GBIF records by species, state, year, month (kept unchanged)
  population_state.json        DOSM population by state (data.gov.my, population_state); the 2020 value is used
  forest_reserve_state.csv     Area of Permanent Forest Reserves by State, hectares (data.gov.my, CC BY 4.0);
                               the last year available is 2022, later years reuse the 2022 value

Output columns
  features : species, state_normalised, year, month, pop_2020_k, forest_reserve_ha
  targets  : encounter_count, encounter_share, present (never used as features)
Every state-year-month group that has at least one record is expanded to all seven species (count 0 if not recorded).

The script stops with an error if any of the checks in check_dataset() fails.
Usage:  python ml/build_dataset.py
"""
import hashlib
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
RAW = HERE / "data" / "raw"
OUT = HERE / "data" / "ml_dataset_v3.csv"

SPECIES = [
    "Acridotheres tristis", "Corvus splendens", "Macaca fascicularis", "Malayopython reticulatus",
    "Naja sumatrana", "Sus scrofa", "Varanus salvator",
]
STATES = [
    "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka", "Negeri Sembilan", "Pahang",
    "Perak", "Perlis", "Pulau Pinang", "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu",
]
WP = {"W.P. Kuala Lumpur": "Kuala Lumpur", "W.P. Labuan": "Labuan", "W.P. Putrajaya": "Putrajaya"}
FOREST_LAST_YEAR = 2022
COLUMNS = ["species", "state_normalised", "year", "pop_2020_k", "forest_reserve_ha", "month",
           "encounter_count", "encounter_share", "present"]


def load_source() -> pd.DataFrame:
    src = pd.read_csv(RAW / "iteration3_data_for_ML.csv")
    src["year"] = src["year"].astype(int)
    src["month"] = src["month"].astype(int)
    return src


def load_population() -> dict:
    pop = pd.read_json(RAW / "population_state.json")
    pop = pop[(pop["age"] == "overall_age") & (pop["sex"] == "overall_sex") & (pop["ethnicity"] == "overall_ethnicity")]
    pop = pop[pop["date"].astype(str).str.startswith("2020")]
    pop["state"] = pop["state"].replace(WP)
    out = dict(zip(pop["state"], pop["population"]))       # thousands of people
    missing = set(STATES) - set(out)
    if missing:
        raise SystemExit(f"population missing for {sorted(missing)}")
    return out


def load_forest() -> dict:
    f = pd.read_csv(RAW / "forest_reserve_state.csv")
    f["year"] = pd.to_datetime(f["date"]).dt.year
    f["state"] = f["state"].replace(WP)
    return {(r.state, r.year): r.area for r in f.itertuples() if pd.notna(r.area)}


def build(src: pd.DataFrame) -> pd.DataFrame:
    pop, forest = load_population(), load_forest()
    groups = src[["state_normalised", "year", "month"]].drop_duplicates()
    grid = groups.merge(pd.DataFrame({"species": SPECIES}), how="cross")
    df = grid.merge(src, on=["species", "state_normalised", "year", "month"], how="left")
    df["encounter_count"] = df["encounter_count"].fillna(0).astype(int)
    total = df.groupby(["state_normalised", "year", "month"])["encounter_count"].transform("sum")
    df["encounter_share"] = (df["encounter_count"] / total).round(6)
    df["present"] = (df["encounter_count"] > 0).astype(int)
    df["pop_2020_k"] = df["state_normalised"].map(pop)
    df["forest_reserve_ha"] = [int(forest[(s, min(y, FOREST_LAST_YEAR))]) for s, y in zip(df["state_normalised"], df["year"])]
    df["species"] = pd.Categorical(df["species"], categories=SPECIES, ordered=True)
    df = df.sort_values(["year", "month", "state_normalised", "species"]).reset_index(drop=True)
    df["species"] = df["species"].astype(str)
    return df[COLUMNS]


def check_dataset(df: pd.DataFrame, src: pd.DataFrame) -> None:
    """Assertions from section 6.2 of the AI and ML Safeguards document."""
    problems = []
    if len(df) % 7:
        problems.append("row count is not a multiple of 7")
    sizes = df.groupby(["state_normalised", "year", "month"])["species"].nunique()
    if (sizes != 7).any():
        problems.append("a state-year-month group does not have exactly 7 species")
    if int(df["present"].sum()) != len(src):
        problems.append(f"rows with a record ({int(df['present'].sum())}) differ from the source rows ({len(src)})")
    if int(df["encounter_count"].sum()) != int(src["encounter_count"].sum()):
        problems.append("record total differs from the source total")
    if df.isna().any().any() or (df.astype(str) == "").any().any():
        problems.append("the dataset has empty cells")
    if not set(df["state_normalised"]) <= set(STATES) or len(set(df["state_normalised"])) != 16:
        problems.append("state names are not exactly the sixteen expected")
    shares = df.groupby(["state_normalised", "year", "month"])["encounter_share"].sum()
    if ((shares - 1).abs() > 1e-4).any():
        problems.append("record share does not sum to 1 in every group")
    if problems:
        raise SystemExit("DATASET CHECK FAILED:\n  - " + "\n  - ".join(problems))


def main() -> None:
    src = load_source()
    df = build(src)
    check_dataset(df, src)
    df.to_csv(OUT, index=False)
    digest = hashlib.sha256(OUT.read_bytes()).hexdigest()
    print(f"wrote {OUT.name}: {len(df)} rows, {df.groupby(['state_normalised', 'year', 'month']).ngroups} groups, "
          f"{int(df['present'].sum())} rows with a record, {int(df['encounter_count'].sum())} records")
    print(f"all dataset checks passed; sha256 {digest}")


if __name__ == "__main__":
    main()
