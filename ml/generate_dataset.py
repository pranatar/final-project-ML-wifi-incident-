"""
generate_dataset.py
====================
Generator dataset sintetis realistis untuk melatih model XGBoost.
Mensimulasikan ratusan insiden Wi-Fi kampus dengan label prioritas dan waktu resolusi.
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
import numpy as np
import os

np.random.seed(42)
N = 800  # jumlah sampel

def generate_dataset():
    # ===================================================================
    # FITUR TELEMETRI ACCESS POINT
    # ===================================================================
    connected_clients   = np.random.randint(1, 76, N)
    cpu_utilization     = np.clip(connected_clients * 1.2 + np.random.normal(0, 8, N), 5, 100)
    memory_utilization  = np.clip(cpu_utilization * 0.9 + np.random.normal(0, 5, N), 10, 100)
    packet_loss_ratio   = np.clip(
        np.where(cpu_utilization > 80, np.random.uniform(5, 25, N),
        np.where(cpu_utilization > 60, np.random.uniform(1, 10, N),
                                       np.random.uniform(0, 2, N))),
        0, 30
    )
    latency_gateway_ms  = np.clip(
        10 + packet_loss_ratio * 8 + np.random.normal(0, 5, N), 5, 300
    )
    dhcp_pool_remaining = np.random.randint(0, 201, N)
    max_client_limit    = np.random.choice([50, 60, 75], N)

    # ===================================================================
    # FITUR KONTEKS TIKET
    # ===================================================================
    is_emergency_deadline = np.random.choice([0, 1], N, p=[0.65, 0.35])
    cluster_count         = np.random.choice([0, 1, 2, 3, 4], N, p=[0.50, 0.25, 0.13, 0.08, 0.04])
    is_clustered          = (cluster_count >= 1).astype(int)
    hour_of_day           = np.random.randint(7, 22, N)  # jam 07.00 - 21.00
    
    # Kategori masalah (encoded)
    kategori_choices = ['AP_Overload', 'DHCP_Exhausted', 'Client_Config', 'RF_Noise', 'Gateway_Timeout', 'UNCLASSIFIED']
    kategori_masalah = np.where(
        cpu_utilization > 80, 'AP_Overload',
        np.where(dhcp_pool_remaining < 10, 'DHCP_Exhausted',
        np.where(packet_loss_ratio > 10, 'Gateway_Timeout',
        np.random.choice(kategori_choices, N)))
    )

    # ===================================================================
    # LABEL 1: PRIORITAS TIKET (Multi-class Classification)
    # Rule berbasis domain knowledge → ground truth label
    # ===================================================================
    prioritas_num = np.where(
        (is_clustered == 1) | (cpu_utilization > 85) | (packet_loss_ratio > 12) | (is_emergency_deadline == 1),
        2,  # P1-CRITICAL
        np.where(
            (cpu_utilization > 60) | (packet_loss_ratio > 5) | (connected_clients > 45),
            1,  # P2-HIGH
            0   # P3-NORMAL
        )
    )
    # Tambahkan sedikit noise realistis
    noise_mask = np.random.choice([True, False], N, p=[0.05, 0.95])
    prioritas_num[noise_mask] = np.random.choice([0, 1, 2], noise_mask.sum())

    prioritas_label = np.where(prioritas_num == 2, 'P1-CRITICAL',
                      np.where(prioritas_num == 1, 'P2-HIGH', 'P3-NORMAL'))

    # ===================================================================
    # LABEL 2: WAKTU RESOLUSI dalam MENIT (Regression)
    # ===================================================================
    base_resolution = np.where(prioritas_num == 2, 5,
                      np.where(prioritas_num == 1, 15, 35))
    
    resolution_minutes = np.clip(
        base_resolution
        + packet_loss_ratio * 0.5
        + (100 - dhcp_pool_remaining) * 0.05
        + cluster_count * 3
        + np.random.normal(0, 3, N),
        2, 90
    ).round(1)

    # ===================================================================
    # BUAT DATAFRAME
    # ===================================================================
    df = pd.DataFrame({
        # Fitur telemetri AP
        'connected_clients':    connected_clients,
        'cpu_utilization':      cpu_utilization.round(1),
        'memory_utilization':   memory_utilization.round(1),
        'packet_loss_ratio':    packet_loss_ratio.round(2),
        'latency_gateway_ms':   latency_gateway_ms.round(1),
        'dhcp_pool_remaining':  dhcp_pool_remaining,
        'max_client_limit':     max_client_limit,
        # Fitur konteks tiket
        'is_emergency_deadline': is_emergency_deadline,
        'cluster_count':         cluster_count,
        'is_clustered':          is_clustered,
        'hour_of_day':           hour_of_day,
        'kategori_masalah':      kategori_masalah,
        # Label
        'prioritas':             prioritas_label,
        'prioritas_num':         prioritas_num,
        'resolution_minutes':    resolution_minutes,
    })

    out_path = os.path.join(os.path.dirname(__file__), 'wifi_incident_dataset.csv')
    df.to_csv(out_path, index=False)
    print(f"[OK] Dataset dibuat: {out_path}")
    print(f"     Total sampel       : {N}")
    print(f"     Distribusi prioritas:\n{df['prioritas'].value_counts().to_string()}")
    print(f"     Rata-rata resolusi : {df['resolution_minutes'].mean():.1f} menit")
    return df

if __name__ == '__main__':
    generate_dataset()

