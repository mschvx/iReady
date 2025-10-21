# ===========================================
# RANDOM FOREST PREDICTIONS FOR SUPPLIES
# ===========================================
import pandas as pd
import json
import numpy as np
from pathlib import Path
from RForest_train import train_rf_model, _data_dir, _load_wealth, _load_health, _load_climate, _disease_risk

# Call the random forest training model
rf, X_test, y_test = train_rf_model()

# Load ALL barangays from the dataset (not just test split)
base = _data_dir()
health_fp = base / 'CCHAIN' / 'health_facility_evacuation_center_proximity_population.csv'
wealth_fp = base / 'CCHAIN' / 'wealth_index.csv'
disease_fp = base / 'CCHAIN' / 'disease_index.csv'
climate_fp = base / 'CLIMAP' / 'laguna_rainfall.csv'

wealth = _load_wealth(wealth_fp)
health = _load_health(health_fp)
climate_val = _load_climate(climate_fp)
disease_val = _disease_risk(disease_fp)

# Build features for ALL barangays
df = health.copy()
if 'adm4_pcode' not in df.columns:
    df = df.rename(columns={df.columns[0]: 'adm4_pcode'})

# Keep administrative code for output
adm_codes = df[['adm4_pcode']].copy()

# Merge wealth if available
if not wealth.empty:
    df = df.merge(wealth, on='adm4_pcode', how='left')
else:
    df['wealth_mean'] = 0.6
    df['wealth_std'] = 0.1

# Population served
pop_cols = [c for c in df.columns if c.startswith('pop_') and '30min' in c]
pct_cols = [c for c in df.columns if c.startswith('pct_') and '30min' in c]
if pop_cols:
    df['pop_30min'] = df[pop_cols].bfill(axis=1).iloc[:, 0].fillna(1000)
else:
    df['pop_30min'] = 1000
if pct_cols:
    df['access_pct_30min'] = df[pct_cols].bfill(axis=1).iloc[:, 0].fillna(50)
else:
    df['access_pct_30min'] = 50

# Add climate and disease global features
df['climate_rainfall'] = climate_val
df['disease_risk'] = disease_val

# Extract features in the same order as training
X_all = df[['wealth_mean', 'wealth_std', 'pop_30min', 'access_pct_30min', 'climate_rainfall', 'disease_risk']].fillna(0)

# Make predictions for ALL barangays
y_pred = rf.predict(X_all)

# Build predictions dataframe and round to whole numbers
pred_df = pd.DataFrame(y_pred, columns=y_test.columns)
pred_df = pred_df.clip(lower=0).round(0).astype(int)
pred_only_df = pd.concat([adm_codes.reset_index(drop=True), X_all.reset_index(drop=True), pred_df.add_prefix('pred_')], axis=1)

# Area details and predictions
print("\n=== Sample Predictions (features | predicted) ===")
with pd.option_context('display.max_rows', 10, 'display.max_columns', None):
    print(pred_only_df.head(10).round(1))

# Save predictions to ToReceive.json
output_data = pred_only_df.to_dict(orient='records')
output_path = '../Data/ToReceive.json'

with open(output_path, 'w') as f:
    json.dump(output_data, f, indent=2)

print(f"\n=== Predictions saved to {output_path} ===")
print(f"Total predictions: {len(output_data)}")

