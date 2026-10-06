"""Prints the ranking of the seven species for one state and month, read from output/predictions.json.
Usage:  python ml/show_prediction.py "Selangor" 10
"""
import json
import sys
from pathlib import Path

state, month = sys.argv[1], int(sys.argv[2])
data = json.loads((Path(__file__).resolve().parent / "output" / "predictions.json").read_text(encoding="utf-8"))
rows = sorted((r for r in data["predictions"] if r["state"] == state and r["month"] == month), key=lambda r: -r["probability"])
if not rows:
    raise SystemExit(f"no rows for {state}, month {month}")
meta = data["metadata"]
print(f"{state}, month {month}  (model trained on {meta['training_years']}, prediction year {meta['prediction_year']})")
for r in rows:
    print(f"  {r['species']:<26}{r['probability']:.3f}   records for this species in this state: {r['records_species_state']}")
print(f"  state groups in training data: {rows[0]['groups_state']}")
