"""
ml_service.py
=============
Microservice REST API berbasis Flask untuk melayani inferensi model XGBoost.
Port default: 5001

Endpoints:
- GET  /health          : Status microservice dan ketersediaan model
- POST /predict/priority: Prediksi kelas prioritas tiket (P1, P2, P3) + confidence score
- POST /predict/sla     : Prediksi estimasi waktu resolusi teknis (dalam menit)
- POST /predict/all     : Menjalankan kedua prediksi sekaligus untuk tiket masuk
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import os
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
import xgboost as xgb

app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
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

# Inisialisasi model
clf_priority = None
reg_sla = None

def load_models():
    global clf_priority, reg_sla
    priority_file = os.path.join(MODELS_DIR, 'xgb_priority.json')
    sla_file = os.path.join(MODELS_DIR, 'xgb_sla.json')

    if os.path.exists(priority_file):
        clf_priority = xgb.XGBClassifier()
        clf_priority.load_model(priority_file)
        print("[OK] Model Priority XGBoost berhasil dimuat.")
    else:
        print("[WARN] Model Priority belum tersedia.")

    if os.path.exists(sla_file):
        reg_sla = xgb.XGBRegressor()
        reg_sla.load_model(sla_file)
        print("[OK] Model SLA XGBoost berhasil dimuat.")
    else:
        print("[WARN] Model SLA belum tersedia.")

load_models()

def parse_input_features(payload):
    """
    Ekstraksi fitur dari payload JSON dan set nilai default yang wajar jika ada data yang kosong.
    """
    row = {
        'connected_clients': float(payload.get('connectedClients', payload.get('connected_clients', 20))),
        'cpu_utilization': float(payload.get('cpuUtilization', payload.get('cpu_utilization', 30.0))),
        'memory_utilization': float(payload.get('memoryUtilization', payload.get('memory_utilization', 40.0))),
        'packet_loss_ratio': float(payload.get('packetLossRatio', payload.get('packet_loss_ratio', 0.0))),
        'latency_gateway_ms': float(payload.get('latencyGatewayMs', payload.get('latency_gateway_ms', 10.0))),
        'dhcp_pool_remaining': float(payload.get('dhcpPoolRemaining', payload.get('dhcp_pool_remaining', 100))),
        'is_emergency_deadline': 1.0 if payload.get('isEmergencyDeadline', payload.get('is_emergency_deadline', False)) else 0.0,
        'cluster_count': float(payload.get('clusterCount', payload.get('cluster_count', 0))),
        'is_clustered': 1.0 if payload.get('isClustered', payload.get('is_clustered', False)) else 0.0,
        'hour_of_day': float(payload.get('hourOfDay', payload.get('hour_of_day', 10)))
    }
    return pd.DataFrame([row])[FEATURE_COLS]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'UP',
        'service': 'WiFi Incident XGBoost ML Service',
        'priority_model_loaded': clf_priority is not None,
        'sla_model_loaded': reg_sla is not None,
        'features_required': FEATURE_COLS
    }), 200

@app.route('/predict/priority', methods=['POST'])
def predict_priority():
    if clf_priority is None:
        return jsonify({'error': 'Priority model not loaded. Run train_model.py first.'}), 503

    payload = request.get_json() or {}
    df_feat = parse_input_features(payload)

    probs = clf_priority.predict_proba(df_feat)[0]
    pred_idx = int(np.argmax(probs))
    pred_label = LABEL_MAP.get(pred_idx, 'P3-NORMAL')

    return jsonify({
        'success': True,
        'predicted_priority': pred_label,
        'confidence': float(probs[pred_idx]),
        'probabilities': {
            'P3-NORMAL': float(probs[0]),
            'P2-HIGH': float(probs[1]),
            'P1-CRITICAL': float(probs[2])
        }
    })

@app.route('/predict/sla', methods=['POST'])
def predict_sla():
    if reg_sla is None:
        return jsonify({'error': 'SLA model not loaded. Run train_model.py first.'}), 503

    payload = request.get_json() or {}
    df_feat = parse_input_features(payload)

    est_minutes = float(reg_sla.predict(df_feat)[0])
    est_minutes = max(1.0, round(est_minutes, 1))

    return jsonify({
        'success': True,
        'predicted_resolution_minutes': est_minutes,
        'sla_target_met': est_minutes <= 15.0
    })

@app.route('/predict/all', methods=['POST'])
def predict_all():
    payload = request.get_json() or {}
    df_feat = parse_input_features(payload)

    res = {'success': True}

    if clf_priority is not None:
        probs = clf_priority.predict_proba(df_feat)[0]
        pred_idx = int(np.argmax(probs))
        res['priority'] = {
            'label': LABEL_MAP.get(pred_idx, 'P3-NORMAL'),
            'confidence': round(float(probs[pred_idx]), 4),
            'probabilities': {
                'P3-NORMAL': round(float(probs[0]), 4),
                'P2-HIGH': round(float(probs[1]), 4),
                'P1-CRITICAL': round(float(probs[2]), 4)
            }
        }

    if reg_sla is not None:
        est_minutes = float(reg_sla.predict(df_feat)[0])
        est_minutes = max(1.0, round(est_minutes, 1))
        res['sla'] = {
            'predicted_resolution_minutes': est_minutes,
            'sla_status': 'ON_TRACK' if est_minutes <= 15.0 else 'POTENTIAL_BREACH'
        }

    return jsonify(res)

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"[START] Starting XGBoost ML Flask Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)

