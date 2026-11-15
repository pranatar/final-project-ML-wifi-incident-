/**
 * mlService.js
 * ============
 * Node.js Service Client untuk berkomunikasi dengan XGBoost Python Flask Microservice (:5001).
 * Dilengkapi graceful fallback jika service Python belum diaktifkan.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * Mengecek apakah Python ML Service aktif
 */
async function checkMlHealth() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);

        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) return { available: false, error: `HTTP ${response.status}` };
        const data = await response.json();
        return { available: true, data };
    } catch (err) {
        return { available: false, reason: 'ML service offline or unreachable' };
    }
}

/**
 * Memanggil inferensi XGBoost untuk prioritas dan estimasi SLA
 * @param {Object} params 
 */
async function predictTicket(params) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${ML_SERVICE_URL}/predict/all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`ML service returned status ${response.status}`);
        }

        const result = await response.json();
        return {
            mlEnabled: true,
            model: 'XGBoost',
            prediction: result
        };
    } catch (err) {
        // Graceful fallback ke rule-based / baseline jika service ML offline
        return {
            mlEnabled: false,
            model: 'XGBoost (Offline - Fallback)',
            reason: err.message
        };
    }
}

module.exports = {
    checkMlHealth,
    predictTicket,
    ML_SERVICE_URL
};

