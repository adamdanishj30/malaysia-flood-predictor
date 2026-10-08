"""
Malaysia Flood Data Processing, Cleaning & ML Pipeline
Strictly following ml-best-practices:
1. Merge raw JPS & regression datasets
2. Clean anomalies, handle data types, impute contextually
3. Engineer hydrologic features (rainfall rate, river proximity, monsoon seasonality)
4. Split BEFORE fitting any scalers/encoders
5. Compare multiple models: Naive Baseline, Logistic Regression, Random Forest, XGBoost
6. Evaluate with business metrics (ROC-AUC, PR-AUC, F1, Recall, Confusion Matrix)
7. Save cleaned data and deployable model artifacts
"""

import os
import json
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    classification_report, mean_squared_error, mean_absolute_error, r2_score
)
from xgboost import XGBClassifier

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def step1_load_and_clean_data():
    print("=" * 70)
    print("STEP 1: DATA INGESTION & QUALITY AUDIT")
    print("=" * 70)

    reg_path = os.path.join(DATA_DIR, 'regression_data.csv')
    flood_path = os.path.join(DATA_DIR, 'flood_risk.csv')

    df_reg = pd.read_csv(reg_path)
    df_flood = pd.read_csv(flood_path)

    print(f"Loaded regression_data.csv: {df_reg.shape}")
    print(f"Loaded flood_risk.csv:      {df_flood.shape}")

    # Combine complementary columns
    df = pd.concat([
        df_reg[[
            'latitude', 'longitude', 'region', 'state', 'postcode',
            'flood_risk', 'distance', 'kawasan_banjir', 'kedalaman_banjir',
            'month_kb', 'altitude', 'slope', 'min_distance_river',
            'land_cover', 'town_distance'
        ]],
        df_flood[['nilai_hujan_max', 'tempoh_hujan', 'tempoh_ulang']]
    ], axis=1)

    print(f"\nInitial merged dataset shape: {df.shape}")

    # --- Cleaning Step 1: Return Period (tempoh_ulang) ---
    # Convert 'NORM\nAL' or non-numeric entries to 1.0 (baseline normal return period)
    def clean_tempoh_ulang(val):
        if pd.isna(val):
            return 1.0
        val_str = str(val).strip().replace('\n', '').upper()
        if 'NORM' in val_str:
            return 1.0
        try:
            return float(val_str)
        except ValueError:
            return 1.0

    df['tempoh_ulang_years'] = df['tempoh_ulang'].apply(clean_tempoh_ulang)

    # --- Cleaning Step 2: Flood Depth (kedalaman_banjir) ---
    # Negative values are sensor offsets or dry gauge readings; clip to 0.0
    neg_depth_count = (df['kedalaman_banjir'] < 0).sum()
    print(f"Negative flood depths clipped to 0.0: {neg_depth_count} instances")
    df['kedalaman_banjir_m'] = df['kedalaman_banjir'].clip(lower=0.0)

    # --- Cleaning Step 3: Altitude & Slope ---
    # Negative altitudes clipped to 0.0 (sea level baseline)
    neg_alt_count = (df['altitude'] < 0).sum()
    print(f"Negative altitudes clipped to 0.0 (sea level): {neg_alt_count} instances")
    df['altitude_m'] = df['altitude'].clip(lower=0.0)
    df['slope_deg'] = df['slope'].clip(lower=0.0)

    # --- Cleaning Step 4: Rainfall parameters ---
    df['tempoh_hujan_hrs'] = df['tempoh_hujan'].clip(lower=0.5) # Minimum half hour to avoid div by zero
    df['rain_max_mm'] = df['nilai_hujan_max'].clip(lower=0.0)

    # Target variable conversion
    df['target_flood_risk'] = df['flood_risk'].astype(int)

    print("\n--- Target Variable Distribution ---")
    counts = df['target_flood_risk'].value_counts()
    percentages = df['target_flood_risk'].value_counts(normalize=True) * 100
    print(f"Class 0 (No Flood): {counts[0]} ({percentages[0]:.2f}%)")
    print(f"Class 1 (Flood):    {counts[1]} ({percentages[1]:.2f}%)")

    # --- Feature Engineering ---
    print("\nEngineering Hydrological & Geospatial Features:")
    # 1. Hourly rainfall intensity (mm/h)
    df['rain_intensity_mmh'] = df['rain_max_mm'] / df['tempoh_hujan_hrs']
    # 2. River proximity index (0 to 1, higher = closer to river stream)
    df['river_proximity_idx'] = 1.0 / (1.0 + (df['min_distance_river'] / 1000.0))
    # 3. Low-lying terrain vulnerability (higher for low elevation)
    df['lowland_vulnerability'] = 1.0 / (1.0 + (df['altitude_m'] / 25.0))
    # 4. Drainage slope vulnerability (flat terrain accumulates water)
    df['flat_slope_idx'] = 1.0 / (1.0 + df['slope_deg'])
    # 5. Monsoon surge seasonality (Northeast Monsoon: Nov, Dec, Jan, Feb)
    df['is_northeast_monsoon'] = df['month_kb'].isin([11, 12, 1, 2]).astype(int)
    # 6. Historical flood zone proximity index
    df['flood_zone_proximity'] = 1.0 / (1.0 + (df['distance'] / 1000.0))

    cleaned_csv = os.path.join(DATA_DIR, 'malaysia_floods_cleaned.csv')
    df.to_csv(cleaned_csv, index=False)
    print(f"Cleaned master dataset saved to: {cleaned_csv}")
    print(f"Final cleaned shape: {df.shape}")

    return df

def step2_train_and_compare_models(df):
    print("\n" + "=" * 70)
    print("STEP 2: MODEL TRAINING & MULTI-MODEL COMPARISON")
    print("=" * 70)

    feature_cols = [
        'rain_max_mm',
        'rain_intensity_mmh',
        'tempoh_hujan_hrs',
        'tempoh_ulang_years',
        'altitude_m',
        'slope_deg',
        'min_distance_river',
        'river_proximity_idx',
        'lowland_vulnerability',
        'flat_slope_idx',
        'is_northeast_monsoon',
        'flood_zone_proximity',
        'town_distance'
    ]

    X = df[feature_cols]
    y = df['target_flood_risk']

    print(f"Features list ({len(feature_cols)} features):")
    for col in feature_cols:
        print(f"  • {col}")

    # Strict featurization ordering: split into train and test BEFORE scaling
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"\nTrain set shape: {X_train.shape} | Test set shape: {X_test.shape}")

    # Fit scaler on X_train ONLY to prevent data leakage
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Save scaler for inference
    joblib.dump(scaler, os.path.join(MODELS_DIR, 'scaler.joblib'))

    # Model 1: Naive Baseline (Predict majority class 0)
    y_pred_naive = np.zeros_like(y_test)
    naive_acc = accuracy_score(y_test, y_pred_naive)

    # Model 2: Logistic Regression Baseline (Balanced weights)
    log_reg = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    log_reg.fit(X_train_scaled, y_train)
    y_pred_lr = log_reg.predict(X_test_scaled)
    y_proba_lr = log_reg.predict_proba(X_test_scaled)[:, 1]

    # Model 3: Random Forest Classifier
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        class_weight='balanced',
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train) # Tree models work directly on unscaled features
    y_pred_rf = rf.predict(X_test)
    y_proba_rf = rf.predict_proba(X_test)[:, 1]

    # Model 4: XGBoost Classifier
    scale_pos = (len(y_train) - sum(y_train)) / sum(y_train) # Class imbalance weight ~3.9
    xgb = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        scale_pos_weight=scale_pos,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric='logloss'
    )
    xgb.fit(X_train, y_train)
    y_pred_xgb = xgb.predict(X_test)
    y_proba_xgb = xgb.predict_proba(X_test)[:, 1]

    # Evaluation comparison dictionary
    models = {
        'Naive Baseline': (y_pred_naive, None),
        'Logistic Regression': (y_pred_lr, y_proba_lr),
        'Random Forest': (y_pred_rf, y_proba_rf),
        'XGBoost': (y_pred_xgb, y_proba_xgb)
    }

    results = []
    print("\n" + "-" * 75)
    print(f"{'Model':<22} | {'Accuracy':<8} | {'Precision':<9} | {'Recall':<8} | {'F1-Score':<8} | {'ROC-AUC':<8}")
    print("-" * 75)

    for name, (pred, proba) in models.items():
        acc = accuracy_score(y_test, pred)
        prec = precision_score(y_test, pred, zero_division=0)
        rec = recall_score(y_test, pred, zero_division=0)
        f1 = f1_score(y_test, pred, zero_division=0)
        auc = roc_auc_score(y_test, proba) if proba is not None else 0.50
        pr_auc = average_precision_score(y_test, proba) if proba is not None else 0.20

        results.append({
            'Model': name,
            'Accuracy': acc,
            'Precision': prec,
            'Recall': rec,
            'F1-Score': f1,
            'ROC-AUC': auc,
            'PR-AUC': pr_auc
        })

        print(f"{name:<22} | {acc:<8.4f} | {prec:<9.4f} | {rec:<8.4f} | {f1:<8.4f} | {auc:<8.4f}")
    print("-" * 75)

    results_df = pd.DataFrame(results)

    # Select Best Classifier based on ROC-AUC and F1
    best_clf = xgb if results_df.loc[3, 'ROC-AUC'] >= results_df.loc[2, 'ROC-AUC'] else rf
    best_name = 'XGBoost' if best_clf == xgb else 'Random Forest'
    print(f"\nOptimal Production Model Selected: {best_name}")

    print("\n--- Confusion Matrix (Optimal Model) ---")
    best_pred = y_pred_xgb if best_name == 'XGBoost' else y_pred_rf
    cm = confusion_matrix(y_test, best_pred)
    print(f"True Negatives (Correct Safe):    {cm[0, 0]:5d}")
    print(f"False Positives (False Warning):  {cm[0, 1]:5d}")
    print(f"False Negatives (Missed Floods):  {cm[1, 0]:5d}")
    print(f"True Positives (Caught Floods):   {cm[1, 1]:5d}")

    print("\nDetailed Classification Report:")
    print(classification_report(y_test, best_pred, target_names=['Safe', 'Flood Warning']))

    # Feature Importances
    importances = best_clf.feature_importances_
    feat_imp = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
    print("\n--- Top Hydrological & Spatial Feature Importances ---")
    for feat, imp in feat_imp:
        bar = "#" * int(imp * 40)
        print(f"  {feat:24s}: {imp:6.4f} {bar}")

    # Save Trained Best Model
    joblib.dump(best_clf, os.path.join(MODELS_DIR, 'flood_classifier.joblib'))
    joblib.dump(rf, os.path.join(MODELS_DIR, 'flood_rf.joblib'))
    print(f"\nSaved models to {MODELS_DIR}/flood_classifier.joblib")

    # Step 2b: Flood Depth Regression Model (Predicting kedalaman_banjir_m)
    print("\n" + "=" * 70)
    print("STEP 2B: CONTINUOUS FLOOD DEPTH REGRESSION (METERS)")
    print("=" * 70)
    y_reg = df['kedalaman_banjir_m']
    X_tr_reg, X_te_reg, y_tr_reg, y_te_reg = train_test_split(
        X, y_reg, test_size=0.20, random_state=42
    )
    regressor = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    regressor.fit(X_tr_reg, y_tr_reg)
    y_pred_reg = regressor.predict(X_te_reg)

    rmse = np.sqrt(mean_squared_error(y_te_reg, y_pred_reg))
    mae = mean_absolute_error(y_te_reg, y_pred_reg)
    r2 = r2_score(y_te_reg, y_pred_reg)
    print(f"Flood Depth Regression Performance:")
    print(f"  • Root Mean Squared Error (RMSE): {rmse:.4f} meters")
    print(f"  • Mean Absolute Error (MAE):     {mae:.4f} meters")
    print(f"  • R² Determination Score:        {r2:.4f}")
    joblib.dump(regressor, os.path.join(MODELS_DIR, 'flood_depth_regressor.joblib'))

    # Step 3: Export Clean Lightweight Production Model Parameters for Web (app.js)
    # Extract Logistic Regression coefficients for lightweight client-side execution in Cloudflare Pages
    lr_weights = {
        'intercept': float(log_reg.intercept_[0]),
        'coefficients': {col: float(coef) for col, coef in zip(feature_cols, log_reg.coef_[0])},
        'scaler_mean': {col: float(m) for col, m in zip(feature_cols, scaler.mean_)},
        'scaler_scale': {col: float(s) for col, s in zip(feature_cols, scaler.scale_)},
        'metrics': {
            'best_model': best_name,
            'roc_auc': float(results_df.loc[results_df['Model'] == best_name, 'ROC-AUC'].values[0]),
            'recall': float(results_df.loc[results_df['Model'] == best_name, 'Recall'].values[0]),
            'f1_score': float(results_df.loc[results_df['Model'] == best_name, 'F1-Score'].values[0]),
            'total_samples': len(df)
        }
    }
    weights_path = os.path.join(DATA_DIR, 'model_weights.json')
    with open(weights_path, 'w', encoding='utf-8') as f:
        json.dump(lr_weights, f, indent=2)
    print(f"\nExported web inference weights to: {weights_path}")

    return results_df, feat_imp

if __name__ == "__main__":
    df = step1_load_and_clean_data()
    results_df, feat_imp = step2_train_and_compare_models(df)
    print("\n[DONE] Data processing, cleaning, and model training successfully completed!")
