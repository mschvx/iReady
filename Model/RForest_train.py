# ===========================================
# RANDOM FOREST TRAINING ALGORITHM
# ===========================================
import os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor

# Loading CSV Functions
def _data_dir():
    return Path(__file__).resolve().parent.parent / 'Datasets'


def _load_wealth(df_path):
    df = pd.read_csv(df_path)
    if 'adm4_pcode' in df.columns and 'rwi_mean' in df.columns:
        try:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            latest = df.sort_values('date').groupby('adm4_pcode').last().reset_index()
            return latest[['adm4_pcode', 'rwi_mean', 'rwi_std']].rename(columns={'rwi_mean': 'wealth_mean', 'rwi_std': 'wealth_std'})
        except Exception:
            return df[['adm4_pcode', 'rwi_mean', 'rwi_std']].rename(columns={'rwi_mean': 'wealth_mean', 'rwi_std': 'wealth_std'})
    else:
        return pd.DataFrame()


def _load_health(df_path):
    try:
        df = pd.read_csv(df_path, skiprows=[1])
    except Exception:
        df = pd.read_csv(df_path)
    # Keep adm4_pcode and a few useful accessibility columns 
    cols = [c for c in df.columns if 'adm4_pcode' in c or '30min' in c or 'pct_30min' in c or 'pop_reached_30min' in c]
    # fallback to specific column names if the automated list is empty
    expected = ['adm4_pcode', 'brgy_healthcenter_pop_reached_30min', 'brgy_healthcenter_pop_reached_pct_30min',
                'hospital_pop_reached_30min', 'hospital_pop_reached_pct_30min',
                'rhu_pop_reached_30min', 'rhu_pop_reached_pct_30min']
    for e in expected:
        if e in df.columns and e not in cols:
            cols.append(e)
    cols = [c for c in cols if c in df.columns]
    if 'adm4_pcode' not in cols:
        return pd.DataFrame()
    return df[cols].rename(columns={
        'brgy_healthcenter_pop_reached_30min': 'pop_brgy_30min',
        'brgy_healthcenter_pop_reached_pct_30min': 'pct_brgy_30min',
        'hospital_pop_reached_30min': 'pop_hospital_30min',
        'hospital_pop_reached_pct_30min': 'pct_hospital_30min',
        'rhu_pop_reached_30min': 'pop_rhu_30min',
        'rhu_pop_reached_pct_30min': 'pct_rhu_30min'
    })


def _load_climate(df_path):
    df = pd.read_csv(df_path)
    # use median of 'projected seasonal rainfall amount' if present
    for col in df.columns:
        if 'projected seasonal' in col.lower() or 'seasonal rainfall' in col.lower():
            vals = pd.to_numeric(df[col], errors='coerce')
            return float(np.nanmedian(vals))
    numeric = df.select_dtypes(include=[np.number])
    if not numeric.empty:
        return float(numeric.iloc[:, -1].median())
    return 0.0


def _disease_risk(df_path):
    # list proportion of infectious vector-borne/waterborne diseases in list
    df = pd.read_csv(df_path, header=0)
    if 'disease_common_name' in df.columns:
        infectious = df['disease_common_name'].str.upper().fillna('')
        keywords = ['DENGUE', 'LEPTOSPIROSIS', 'CHOLERA', 'RABIES']
        score = infectious.apply(lambda s: any(k in s for k in keywords)).sum()
        return float(score) / max(1, len(infectious))
    return 0.2


def train_rf_model():
    """Load datasets, build features per administrative area, synthesize reasonable per-evacuation-center
    supply targets (kept small — generally <500), train a RandomForestRegressor and return model and test split.

    Returns: rf, X_test, y_test
    """
    base = _data_dir()
    wealth_fp = base / 'CCHAIN' / 'wealth_index.csv'
    health_fp = base / 'CCHAIN' / 'health_facility_evacuation_center_proximity_population.csv'
    disease_fp = base / 'CCHAIN' / 'disease_index.csv'
    climate_fp = base / 'CLIMAP' / 'laguna_rainfall.csv'

    wealth = _load_wealth(wealth_fp)
    health = _load_health(health_fp)
    climate_val = _load_climate(climate_fp)
    disease_val = _disease_risk(disease_fp)

    # join datasets on adm4_pcode; start from health (contains adm4 list)
    if health.empty:
        raise RuntimeError('Health dataset could not be loaded or has unexpected format.')

    df = health.copy()
    # normalize column names present
    if 'adm4_pcode' not in df.columns:
        df = df.rename(columns={df.columns[0]: 'adm4_pcode'})

    # merge wealth if available
    if not wealth.empty:
        df = df.merge(wealth, on='adm4_pcode', how='left')
    else:
        df['wealth_mean'] = 0.6
        df['wealth_std'] = 0.1

    # population served (choose first available 30 million populations)
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

    # add climate and disease global features
    df['climate_rainfall'] = climate_val
    df['disease_risk'] = disease_val

    features = df[['wealth_mean', 'wealth_std', 'pop_30min', 'access_pct_30min', 'climate_rainfall', 'disease_risk']].fillna(0)

    # Using heuristics and a random seed to synthesize needed data

    np.random.seed(42)

    supplies = [
        # Medical & Health
        'paracetamol', 'first_aid_kits', 'antibiotics', 'bandages_gauze', 'alcohol_disinfectants',
        'thermometers', 'blood_pressure_monitors', 'surgical_masks', 'gloves', 'vitamins_supplements',
        # Food & Nutrition
        'rice', 'canned_goods', 'instant_noodles', 'biscuits_crackers', 'baby_food_milk', 'cooking_oil',
        'sugar', 'salt', 'bottled_juices', 'ready_to_eat_meals',
        # Shelter & Personal Relief
        'blankets', 'mats_sleeping_bags', 'tents_tarpaulins', 'pillows', 'clothing_sets', 'towels',
        'slippers', 'hygiene_kits', 'mosquito_nets', 'flashlights_batteries',
        # Water & Sanitation
        'bottled_water', 'water_containers', 'water_purification_tablets', 'portable_filters', 'buckets_basins',
        'toiletries', 'detergent_cleaning_agents', 'waste_bags', 'portable_toilets', 'disinfectant_sprays'
    ]

    # item category factors — roughly how many units per 100 people
    category_factor = {
        'medical': 0.5,  # items per 100 people (low)
        'food': 1.5,
        'shelter': 0.4,
        'water': 1.0
    }

    item_group = {}
    # assign groups by name heuristics
    for s in supplies:
        name = s.lower()
        if any(k in name for k in ['para', 'first', 'antibi', 'bandage', 'alcohol', 'therm', 'blood', 'mask', 'glove', 'vitamin']):
            item_group[s] = 'medical'
        elif any(k in name for k in ['rice', 'canned', 'noodle', 'biscuit', 'baby', 'oil', 'sugar', 'salt', 'juice', 'meal']):
            item_group[s] = 'food'
        elif any(k in name for k in ['blanket', 'mat', 'tent', 'pillow', 'cloth', 'towel', 'slipper', 'hygiene', 'net', 'flash']):
            item_group[s] = 'shelter'
        else:
            item_group[s] = 'water'

    targets = {}
    for s in supplies:
        grp = item_group[s]
        base_factor = category_factor.get(grp, 1.0)
        # need index: higher when wealth low, access low, disease high
        need_index = (1 - features['wealth_mean'].astype(float).fillna(0)) * 0.5
        need_index += (1 - features['access_pct_30min'].astype(float).fillna(50) / 100.0) * 0.3
        need_index += features['disease_risk'].astype(float).fillna(0) * 0.2
        need_index = need_index.clip(0.05, 1.5)

        # evac_size proxy — scale down large population numbers so results stay <500
        evac_size = (features['pop_30min'].astype(float).fillna(500) / 200).clip(lower=20, upper=400)

        # randomized small variation but deterministic
        noise = np.random.normal(loc=1.0, scale=0.08, size=len(features))

        raw = (evac_size * (base_factor) * need_index * noise).round().astype(int)
        # cap at 500 and ensure non-negative
        raw = raw.clip(lower=0, upper=500)
        targets[s] = raw

    y = pd.DataFrame(targets)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(features, y, test_size=0.25, random_state=42)

    rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)

    return rf, X_test, y_test

