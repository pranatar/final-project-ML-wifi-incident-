"""
train_model.py
==============
Melatih dua model XGBoost:
1. Model Klasifikasi Prioritas Tiket (P1-CRITICAL, P2-HIGH, P3-NORMAL)
2. Model Regresi Estimasi Waktu Resolusi SLA (dalam satuan menit)

Model disimpan dalam format JSON bawaan XGBoost ke folder ml/models/.
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import os
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import json

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'wifi_incident_dataset.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

FEATURE_COLS = [
    'connected_clients',
    'cpu_utilization',
    'memory_utilization',
    'packet_loss_ratio',
    'latency_gateway_ms',
    'dhcp_pool_remaining',
    'is_emergency_deadline',
    'cluster_count',
    'is_clustered',
    'hour_of_day'
]

LABEL_MAP = {
    0: 'P3-NORMAL',
    1: 'P2-HIGH',
    2: 'P1-CRITICAL'
}

def train():
    if not os.path.exists(DATA_PATH):
        print("Data belum ditemukan, menjalankan generate_dataset...")
        from generate_dataset import generate_dataset
        df = generate_dataset()
    else:
        df = pd.read_csv(DATA_PATH)

    X = df[FEATURE_COLS]
    y_priority = df['prioritas_num']
    y_sla = df['resolution_minutes']

    os.makedirs(MODELS_DIR, exist_ok=True)

    # =========================================================================
    # 1. TRAINING MODEL KLASIFIKASI PRIORITAS (XGBClassifier)
    # =========================================================================
    print("\n" + "="*50)
    print("[TRAIN] MODEL 1: XGBOOST TICKET PRIORITY CLASSIFIER")
    print("="*50)
    
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X, y_priority, test_size=0.2, random_state=42, stratify=y_priority
    )

    clf = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.08,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        eval_metric='mlogloss'
    )
    clf.fit(X_train_c, y_train_c)

    preds_c = clf.predict(X_test_c)
    print("\nEvaluasi Klasifikasi:")
    print(classification_report(y_test_c, preds_c, target_names=['P3-NORMAL', 'P2-HIGH', 'P1-CRITICAL']))

    priority_model_file = os.path.join(MODELS_DIR, 'xgb_priority.json')
    clf.save_model(priority_model_file)
    print(f"[OK] Model Klasifikasi tersimpan di: {priority_model_file}")

    # =========================================================================
    # 2. TRAINING MODEL REGRESI WAKTU RESOLUSI SLA (XGBRegressor)
    # =========================================================================
    print("\n" + "="*50)
    print("[TRAIN] MODEL 2: XGBOOST RESOLUTION TIME (SLA) REGRESSOR")
    print("="*50)

    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X, y_sla, test_size=0.2, random_state=42
    )

    reg = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.05,
        objective='reg:squarederror',
        random_state=42
    )
    reg.fit(X_train_r, y_train_r)

    preds_r = reg.predict(X_test_r)
    rmse = np.sqrt(mean_squared_error(y_test_r, preds_r))
    r2 = r2_score(y_test_r, preds_r)
    print(f"\nEvaluasi Regresi:")
    print(f" - Root Mean Squared Error (RMSE): {rmse:.2f} menit")
    print(f" - R-squared (R2) Score          : {r2:.3f}")

    sla_model_file = os.path.join(MODELS_DIR, 'xgb_sla.json')
    reg.save_model(sla_model_file)
    print(f"[OK] Model Regresi tersimpan di: {sla_model_file}")

    # Simpan metadata fitur untuk referensi microservice
    meta = {
        "features": FEATURE_COLS,
        "priority_label_map": LABEL_MAP
    }
    with open(os.path.join(MODELS_DIR, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print("\n[SUCCESS] Seluruh model XGBoost berhasil dilatih dan diekspor!")

if __name__ == '__main__':
    train()

