// js/modules/components/settings.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';

console.log('Modulo settings.js cargado.');

// --- Parámetros configurables del sistema ---
const DEFAULT_SETTINGS = {
    defaultLoanRate: 10.5,
    defaultPawnRate: 8.0,
    daysForLate: 6,
    penaltyRate: 2.5
};

function loadSettings() {
    const settings = { ...DEFAULT_SETTINGS };
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null && val !== undefined && val !== '') {
            settings[key] = isNaN(DEFAULT_SETTINGS[key]) ? val : parseFloat(val);
        }
    });
    return settings;
}

function saveSettings(newSettings) {
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (newSettings[key] !== undefined) {
            localStorage.setItem(key, newSettings[key]);
        }
    });
}

export function getSystemSettings() {
    return loadSettings();
}

export function loadInterestRateManagement(contentArea, sectionTitleElement) {
    console.log("Cargando Configuración del Sistema...");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Gerente General') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    sectionTitleElement.textContent = 'Configuración del Sistema';
    const settings = loadSettings();
    contentArea.innerHTML = `
        <h3><i class="fas fa-cogs"></i> Configuración del Sistema</h3>
        <form id="settings-form" class="app-form">
            <div class="input-group"><label for="defaultLoanRate">Tasa de Interés Préstamo (% mensual):</label>
                <input type="number" id="defaultLoanRate" name="defaultLoanRate" value="${settings.defaultLoanRate}" step="0.1" min="0" required></div>
            <div class="input-group"><label for="defaultPawnRate">Tasa de Empeño (% mensual):</label>
                <input type="number" id="defaultPawnRate" name="defaultPawnRate" value="${settings.defaultPawnRate}" step="0.1" min="0" required></div>
            <div class="input-group"><label for="daysForLate">Días para considerar Mora:</label>
                <input type="number" id="daysForLate" name="daysForLate" value="${settings.daysForLate}" step="1" min="1" required></div>
            <div class="input-group"><label for="penaltyRate">Penalidad por Mora (% mensual):</label>
                <input type="number" id="penaltyRate" name="penaltyRate" value="${settings.penaltyRate}" step="0.1" min="0" required></div>
            <button id="save-settings-btn" class="btn btn-primary mt-2"><i class="fas fa-save"></i> Guardar Configuración</button>
        </form>
        <div id="settings-feedback" class="mt-2" style="font-size: 0.9em;"></div>
        <div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle"></i> <strong>Nota:</strong> Los cambios afectan solo nuevos servicios y cálculos futuros. No afectan servicios ya desembolsados.
        </div>
    `;
    const form = contentArea.querySelector('#settings-form');
    const feedbackDiv = contentArea.querySelector('#settings-feedback');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSettings = {
            defaultLoanRate: parseFloat(form.defaultLoanRate.value),
            defaultPawnRate: parseFloat(form.defaultPawnRate.value),
            daysForLate: parseInt(form.daysForLate.value, 10),
            penaltyRate: parseFloat(form.penaltyRate.value)
        };
        if (Object.values(newSettings).some(v => isNaN(v) || v < 0)) {
            feedbackDiv.textContent = 'Verifique que todos los valores sean válidos y mayores a 0.';
            feedbackDiv.className = 'mt-2 text-danger';
            return;
        }
        saveSettings(newSettings);
        feedbackDiv.textContent = 'Configuración guardada correctamente.';
        feedbackDiv.className = 'mt-2 text-success';
    });
}