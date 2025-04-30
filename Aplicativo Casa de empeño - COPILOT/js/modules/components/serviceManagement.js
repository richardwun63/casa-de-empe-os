// js/modules/components/serviceManagement.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';
import { getSystemSettings } from './settings.js';
import * as clientMgmt from './clientManagement.js';
// Asegurarse de importar treasury si se necesitan funciones de ahí
import * as treasury from './treasury.js';


console.log('Modulo serviceManagement.js cargado.');

// Lista de documentos requeridos (actualizada)
const REQUIRED_DOCS = {
    'Préstamo': ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided'],
    'Empeño': ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'articlePhoto', 'articlesCombinedPhoto', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided']
};

// --- Helper Functions ---
// generateRequestId y calculateLoanDetails se mantienen igual que en Parte 9

/**
 * Calcula el interés total y el valor de cuota (simplificado).
 * MODIFICADO: Recibe tasa y número de cuotas, no plazo en meses.
 * @param {number} amount - Monto del préstamo.
 * @param {number} ratePerPeriod - Tasa de interés por período (%).
 * @param {number} numInstallments - Número de cuotas.
 * @returns {object} { totalInterest, totalToPay, installmentAmount }
 */
function calculateLoanDetails(amount, ratePerPeriod, numInstallments) {
    if (isNaN(amount) || amount <= 0 || isNaN(ratePerPeriod) || ratePerPeriod < 0 || isNaN(numInstallments) || numInstallments <= 0) {
        return { totalInterest: 0, totalToPay: amount, installmentAmount: 0 };
    }
    const totalInterest = amount * (ratePerPeriod / 100);
    const totalToPay = amount + totalInterest;
    const installmentAmount = numInstallments > 0 ? totalToPay / numInstallments : totalToPay;

    return {
        totalInterest: totalInterest,
        totalToPay: totalToPay,
        installmentAmount: installmentAmount
    };
}


/**
 * Carga el formulario rediseñado para solicitar un préstamo.
 * MODIFICADO: Eliminado campo "Plazo".
 * @param {HTMLElement} contentArea - Área para renderizar.
 * @param {HTMLElement} sectionTitleElement - Elemento para el título.
 * @param {object} options - Opciones, ej. { clientId: 101 } para preseleccionar cliente.
 */
export function loadLoanRequest(contentArea, sectionTitleElement, options = {}) {
    const preSelectedClientId = options.clientId || null;
    console.log(`Cargando vista Solicitud Préstamo (Rediseñado). Cliente preseleccionado: ${preSelectedClientId}`);
    sectionTitleElement.textContent = 'Solicitar Préstamo';
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Analista') {
         return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }

    const currentMonthlyRate = getSystemSettings().defaultLoanRate;
    const analystClients = data.dummyData.clients.filter(c => c.analyst === currentUser.username && c.branch === currentUser.branch);
    const allClients = data.dummyData.clients;
    const clientOptions = analystClients
        .map(c => `<option value="${c.id}" ${preSelectedClientId && c.id === preSelectedClientId ? 'selected' : ''}>${c.name} (DNI: ${c.dni})</option>`)
        .join('');
     const guarantorOptions = allClients
         .map(c => `<option value="${c.id}">${c.name} (DNI: ${c.dni})</option>`)
         .join('');

    contentArea.innerHTML = `
        <h3><i class="fas fa-hand-holding-usd"></i> Nueva Solicitud de Préstamo</h3>
        <form id="loan-request-form" class="app-form">
            <div class="row">
                <div class="col-md-6">
                    <h4><i class="fas fa-info-circle"></i> Datos Generales</h4>
                     <div class="input-group"><label>Agencia:</label><input type="text" value="${currentUser.branch || 'N/A'}" readonly disabled></div>
                     <div class="input-group"><label>Analista:</label><input type="text" value="${currentUser.username || 'N/A'}" readonly disabled></div>
                    <div class="input-group">
                        <label for="loan-client">Cliente <span class="text-danger">*</span>:</label>
                        <select id="loan-client" name="clientId" required ${preSelectedClientId ? 'disabled' : ''}>
                            <option value="">-- Seleccione Cliente --</option>
                            ${clientOptions}
                        </select>
                        ${preSelectedClientId ? `<input type="hidden" name="clientId" value="${preSelectedClientId}">` : ''}
                        <small>Clientes de tu cartera. <a href="#" data-action="nav-registrar-cliente">Registrar nuevo</a>.</small>
                    </div>
                     <div class="input-group">
                        <label for="loan-guarantor">Aval / Garante (Opcional):</label>
                        <select id="loan-guarantor" name="guarantorId"><option value="">-- Ninguno --</option>${guarantorOptions}</select>
                    </div>
                    <div class="input-group" id="guarantor-relationship-group" style="display: none;">
                        <label for="loan-guarantor-relationship">Relación con Garante <span class="text-danger">*</span>:</label>
                        <input type="text" id="loan-guarantor-relationship" name="guarantorRelationship">
                    </div>
                </div>
                <div class="col-md-6">
                    <h4><i class="fas fa-calculator"></i> Condiciones del Préstamo</h4>
                     <div class="input-group">
                         <label>Tasa de Interés (% Mensual):</label>
                         <input type="number" id="loan-interest-rate" name="interestRate" value="${currentMonthlyRate}" readonly disabled>
                          <small>Tasa definida por Gerencia.</small>
                     </div>
                     <div class="input-group">
                         <label for="loan-amount">Monto Préstamo (S/) <span class="text-danger">*</span>:</label>
                         <input type="number" id="loan-amount" name="amount" required step="0.01" min="1">
                     </div>
                     <div class="input-group">
                         <label for="loan-payment-type">Tipo de Pago <span class="text-danger">*</span>:</label>
                         <select id="loan-payment-type" name="paymentType" required>
                             <option value="">-- Seleccione --</option>
                             <option value="Diario">Diario</option>
                             <option value="Semanal">Semanal</option>
                             <option value="Mensual">Mensual</option>
                         </select>
                     </div>
                     <div class="input-group">
                         <label for="loan-num-installments">N° de Cuotas <span class="text-danger">*</span>:</label>
                         <input type="number" id="loan-num-installments" name="numInstallments" required step="1" min="1">
                     </div>
                      <hr>
                     <div class="input-group"><label>Total Intereses (Calculado):</label><input type="text" id="loan-total-interest" name="totalInterestDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;"></div>
                     <div class="input-group"><label>Total a Pagar (Calculado):</label><input type="text" id="loan-total-to-pay" name="totalToPayDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;"></div>
                     <div class="input-group"><label>Valor de Cuota (Calculado):</label><input type="text" id="loan-installment-amount" name="installmentAmountDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;"></div>
                </div>
            </div>

            <div class="form-actions">
                 <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Generar Solicitud</button>
            </div>
             <div id="loan-request-error" class="error-message" style="display: none;"></div>
        </form>
    `;

    // --- Event Listeners ---
    const form = contentArea.querySelector('#loan-request-form');
    const amountInput = contentArea.querySelector('#loan-amount');
    // const termInput = contentArea.querySelector('#loan-term-months'); // Eliminado
    const installmentsInput = contentArea.querySelector('#loan-num-installments');
    const paymentTypeSelect = contentArea.querySelector('#loan-payment-type'); // Necesario para cálculo si depende del periodo
    const rateInput = contentArea.querySelector('#loan-interest-rate'); // Leer tasa fija
    const totalInterestDisplay = contentArea.querySelector('#loan-total-interest');
    const totalToPayDisplay = contentArea.querySelector('#loan-total-to-pay');
    const installmentAmountDisplay = contentArea.querySelector('#loan-installment-amount');
    const guarantorSelect = contentArea.querySelector('#loan-guarantor');
    const relationshipGroup = contentArea.querySelector('#guarantor-relationship-group');
    const relationshipInput = contentArea.querySelector('#loan-guarantor-relationship');
    const errorDiv = contentArea.querySelector('#loan-request-error');
    const clientSelect = contentArea.querySelector('#loan-client');

    // Función para actualizar cálculos (MODIFICADA: sin plazo directo)
    const updateCalculations = () => {
        const amount = parseFloat(amountInput.value) || 0;
        const numInstallments = parseInt(installmentsInput.value) || 0;
        // const paymentType = paymentTypeSelect.value; // Podría usarse para ajustar tasa si no es mensual
        const rate = parseFloat(rateInput.value) || 0; // Usar la tasa fija mostrada

        // Usar función de cálculo simplificada (tasa % sobre monto original)
        const results = calculateLoanDetails(amount, rate, numInstallments); // Ya no necesita termMonths

        if (totalInterestDisplay) totalInterestDisplay.value = utils.formatCurrency(results.totalInterest);
        if (totalToPayDisplay) totalToPayDisplay.value = utils.formatCurrency(results.totalToPay);
        if (installmentAmountDisplay) installmentAmountDisplay.value = utils.formatCurrency(results.installmentAmount);
    };

    // Listeners para inputs relevantes
    amountInput?.addEventListener('input', updateCalculations);
    // termInput?.addEventListener('input', updateCalculations); // Eliminado
    installmentsInput?.addEventListener('input', updateCalculations);
    // paymentTypeSelect?.addEventListener('change', updateCalculations); // Recalcular si la tasa dependiera del tipo

    // Listener para garante
    guarantorSelect?.addEventListener('change', () => { /* ... */ });
    contentArea.querySelector('a[data-action="nav-registrar-cliente"]')?.addEventListener('click', (e) => { /* ... */ });


    // Listener para el submit del formulario (MODIFICADO: no lee plazo)
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!errorDiv) return; errorDiv.textContent = ''; errorDiv.style.display = 'none';
        if (!form.checkValidity()) { /* ... */ return; }

        const formData = new FormData(form);
        const clientId = parseInt(formData.get('clientId'));
        const client = data.getClient(clientId);
        const guarantorId = formData.get('guarantorId') ? parseInt(formData.get('guarantorId')) : null;
        if (clientId && guarantorId && clientId === guarantorId) { /* ... */ return; }

        const amount = parseFloat(formData.get('amount'));
        // const termMonths = parseInt(formData.get('term')); // Eliminado
        const numInstallments = parseInt(formData.get('numInstallments'));
        const paymentType = formData.get('paymentType');
        const rate = parseFloat(rateInput.value); // Tasa leída del input (aunque sea readonly)
        const calculated = calculateLoanDetails(amount, rate, numInstallments); // Usar cálculo simple

        const newService = {
            type: 'Préstamo',
            clientId: clientId,
            amount: amount,
            status: 'Pendiente',
            date: new Date().toISOString().split('T')[0],
            branch: currentUser.branch,
            analyst: currentUser.username,
            // term: termMonths, // Ya no se guarda directamente desde input
            interestRate: rate,
            totalInterest: calculated.totalInterest,
            totalToPay: calculated.totalToPay,
            paymentType: paymentType,
            numInstallments: numInstallments,
            installmentAmount: calculated.installmentAmount,
            guarantorId: guarantorId,
            guarantorRelationship: guarantorId ? formData.get('guarantorRelationship') : null,
            nextPayment: null, disbursementDate: null, approvalDate: null, lastPaymentDate: null, lastPaymentAmount: null,
            documents: { /* ... (inicialización como antes) ... */
                 facadePhoto: client?.facadePhotoUrl?.split('/').pop() || null, dniPhoto: client?.dniPhotoUrl?.split('/').pop() || null, supplyPhotoUrl: client?.supplyPhotoUrl?.split('/').pop() || null, plusCodeProvided: !!client?.plusCode
            }
        };

        if (isNaN(newService.amount) || newService.amount <= 0) { /* ... */ return; }
        // if (isNaN(newService.term) || newService.term <= 0) { /* Eliminado */ }
        if (isNaN(newService.numInstallments) || newService.numInstallments <= 0) { /* ... */ return; }

        try {
            const addedService = data.addService(newService);
            console.log('Solicitud de préstamo generada:', addedService);
            alert(`Solicitud de Préstamo #${addedService.id} para ${client?.name || 'Cliente'} generada exitosamente.\nPendiente de adjuntar documentos y aprobación.`);
            // Navegar a vista de solicitudes (si existe)
            if (typeof loadRequestsView === 'function') { loadRequestsView(contentArea, sectionTitleElement); }
            else { console.warn("Función loadRequestsView no encontrada."); ui.loadInitialContent(); } // Fallback
        } catch (error) { /* ... (manejo de error) ... */
            console.error("Error al generar solicitud de préstamo:", error); errorDiv.textContent = `Error al guardar: ${error.message}`; errorDiv.style.display = 'block';
        }
    });
     updateCalculations(); // Llamada inicial
}

/**
 * Carga el formulario REDISEÑADO para solicitar un empeño.
 * @param {HTMLElement} contentArea - Área para renderizar.
 * @param {HTMLElement} sectionTitleElement - Elemento para el título.
 * @param {object} options - Opciones, ej. { clientId: 101 }.
 */
export function loadPawnRequest(contentArea, sectionTitleElement, options = {}) {
    const preSelectedClientId = options.clientId || null;
    console.log(`Cargando vista Solicitud Empeño (NUEVO DISEÑO). Cliente preseleccionado: ${preSelectedClientId}`);
    sectionTitleElement.textContent = 'Solicitar Empeño';
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Analista') {
         return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }

    // --- Opciones para Selects ---
    const analystClients = data.dummyData.clients.filter(c => c.analyst === currentUser.username && c.branch === currentUser.branch);
    const allClients = data.dummyData.clients;
    const clientOptions = analystClients.map(c => `<option value="${c.id}" ${preSelectedClientId && c.id === preSelectedClientId ? 'selected' : ''}>${c.name} (DNI: ${c.dni})</option>`).join('');
    const guarantorOptions = allClients.map(c => `<option value="${c.id}">${c.name} (DNI: ${c.dni})</option>`).join('');
    const itemStatusOptions = ['Muy Deteriorado', 'Deteriorado', 'Regular', 'Bueno', 'Muy Bueno'];
    // Categorías y tasas para Tipo de Interés Empeño
    const interestCategories = ['Balón de Gas', 'Electrónicos', 'Herramientas', 'Inmuebles', 'Joyas', 'Máquina de Gimnasio', 'Vehicular', 'Varios'];
    const interestRatesPawn = [10, 11, 12, 13, 14, 15];
    const interestCategoryOptions = interestCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    const interestRateOptions = interestRatesPawn.map(rate => `<option value="${rate}">${rate}%</option>`).join('');
    const soatOptions = ['Vigente', 'Vencido'];
    const yesNoOptions = ['Sí', 'No'];


    // --- HTML del Formulario (Rediseñado) ---
    contentArea.innerHTML = `
        <h3><i class="fas fa-gem"></i> Nueva Solicitud de Empeño</h3>
        <form id="pawn-request-form" class="app-form">
            <h4><i class="fas fa-user-circle"></i> Datos del Cliente</h4>
            <div class="row">
                <div class="col-md-6">
                    <div class="input-group"><label>Agencia:</label><input type="text" value="${currentUser.branch || 'N/A'}" readonly disabled></div>
                </div>
                <div class="col-md-6">
                    <div class="input-group"><label>Analista:</label><input type="text" value="${currentUser.username || 'N/A'}" readonly disabled></div>
                </div>
            </div>
            <div class="input-group">
                <label for="pawn-client">Cliente <span class="text-danger">*</span>:</label>
                <select id="pawn-client" name="clientId" required ${preSelectedClientId ? 'disabled' : ''}> <option value="">-- Seleccione Cliente --</option>${clientOptions}</select>
                ${preSelectedClientId ? `<input type="hidden" name="clientId" value="${preSelectedClientId}">` : ''}
                <small>Clientes de tu cartera. <a href="#" data-action="nav-registrar-cliente">Registrar nuevo</a>.</small>
            </div>
            <div class="input-group">
                <label for="pawn-guarantor">Aval / Garante (Opcional):</label>
                <select id="pawn-guarantor" name="guarantorId"><option value="">-- Ninguno --</option>${guarantorOptions}</select>
            </div>
            <div class="input-group" id="pawn-guarantor-relationship-group" style="display: none;">
                <label for="pawn-guarantor-relationship">Relación con Garante <span class="text-danger">*</span>:</label>
                <input type="text" id="pawn-guarantor-relationship" name="guarantorRelationship">
            </div>

            <hr>
            <h4><i class="fas fa-boxes"></i> Artículos en Garantía</h4>
            <div id="pawn-items-container">
                <div class="pawn-item-row" data-item-index="0">
                    <div class="row">
                        <div style="flex-basis: 5%; padding-right: 5px;"><label>Cant.*</label><input type="number" name="items[0][quantity]" value="1" min="1" required style="width:100%;"></div>
                        <div style="flex-basis: 15%; padding-right: 5px;"><label>Artículo*</label><input type="text" name="items[0][article]" required placeholder="Descripción"></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Marca*</label><input type="text" name="items[0][brand]" required></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Modelo*</label><input type="text" name="items[0][model]" required></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Serie*</label><input type="text" name="items[0][serial]" required></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Factura</label><input type="file" name="items[0][invoicePhoto]" accept="image/*,application/pdf"></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Fotos*</label><input type="file" name="items[0][photos]" required accept="image/*" multiple></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Observación</label><input type="text" name="items[0][observation]"></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Estado*</label><select name="items[0][itemStatus]" required><option value="">-</option>${itemStatusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
                        <div style="flex-basis: 10%; padding-right: 5px;"><label>Valorización*</label><input type="number" name="items[0][valuation]" required step="0.01" min="0" class="item-valuation" value="0"></div>
                         <div style="flex-basis: 5%; display: flex; align-items: flex-end;"><button type="button" class="btn btn-danger btn-sm remove-item-btn" style="display: none;"><i class="fas fa-trash"></i></button></div>
                    </div>
                     <hr style="margin-top: 5px; margin-bottom: 10px;">
                </div>
            </div>
            <button type="button" id="add-pawn-item-btn" class="btn btn-secondary btn-sm"><i class="fas fa-plus"></i> Añadir Artículo</button>

            <div class="input-group mt-3">
                 <label for="pawn-items-combined-photo">Foto con Todos los Artículos Juntos <span class="text-danger">*</span>:</label>
                 <input type="file" id="pawn-items-combined-photo" name="articlesCombinedPhoto" required accept="image/*">
                 <small>Toma una foto donde se vean todos los artículos empeñados.</small>
            </div>

            <hr>
            <h4><i class="fas fa-car"></i> Empeño Vehicular (Opcional)</h4>
            <div class="input-group">
                 <input type="checkbox" id="is-vehicle-pawn" name="isVehiclePawn" style="width: auto; margin-right: 10px;">
                 <label for="is-vehicle-pawn" style="display: inline;">Marcar si es empeño vehicular</label>
            </div>
            <div id="vehicle-details-section" style="display: none; border: 1px dashed #ccc; padding: 15px; margin-top: 10px; border-radius: 5px;">
                 <h5>Detalles del Vehículo (Obligatorio si se marca)</h5>
                 <div class="row">
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-plate">N° Placa:</label><input type="text" id="vehicle-plate" name="vehicleDetails[plate]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-engine">N° Motor:</label><input type="text" id="vehicle-engine" name="vehicleDetails[engineNo]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-serial">N° Serie:</label><input type="text" id="vehicle-serial" name="vehicleDetails[serialNo]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-color">Color:</label><input type="text" id="vehicle-color" name="vehicleDetails[color]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-brand">Marca:</label><input type="text" id="vehicle-brand" name="vehicleDetails[brand]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-owner">Propietario (Según Tarjeta):</label><input type="text" id="vehicle-owner" name="vehicleDetails[ownerName]"></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-soat">SOAT:</label><select id="vehicle-soat" name="vehicleDetails[soatStatus]"><option value="">-</option>${soatOptions.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-key">Llave:</label><select id="vehicle-key" name="vehicleDetails[hasKey]"><option value="">-</option>${yesNoOptions.map(o => `<option value="${o === 'Sí'}">${o}</option>`).join('')}</select></div></div>
                      <div class="col-md-6"><div class="input-group"><label for="vehicle-card">Tarjeta Propiedad:</label><select id="vehicle-card" name="vehicleDetails[hasCard]"><option value="">-</option>${yesNoOptions.map(o => `<option value="${o === 'Sí'}">${o}</option>`).join('')}</select></div></div>
                 </div>
            </div>

            <hr>
            <h4><i class="fas fa-calculator"></i> Condiciones del Empeño</h4>
            <div class="row">
                <div class="col-md-6">
                    <div class="input-group">
                        <label>Valorización Total de Bienes (S/):</label>
                        <input type="text" id="pawn-total-valuation" name="totalValuationDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;">
                    </div>
                    <div class="input-group">
                        <label for="pawn-percentage">Porcentaje de Valorización a Prestar (%) <span class="text-danger">*</span>:</label>
                        <input type="number" id="pawn-percentage" name="pawnPercentage" required step="1" min="1" max="100" value="50">
                    </div>
                    <div class="input-group">
                        <label>Monto Préstamo (Calculado) (S/):</label>
                        <input type="text" id="pawn-loan-amount" name="amountDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;">
                        <input type="hidden" id="pawn-loan-amount-hidden" name="amount" value="0">
                    </div>
                </div>
                <div class="col-md-6">
                     <div class="input-group">
                         <label for="pawn-interest-category">Tipo de Interés <span class="text-danger">*</span>:</label>
                         <div style="display: flex; gap: 10px;">
                              <select id="pawn-interest-category" name="interestCategory" required style="flex: 1;"> <option value="">-- Categoría --</option>${interestCategoryOptions}</select>
                              <select id="pawn-interest-rate" name="interestRatePawn" required style="flex: 1;"> <option value="">-- Tasa % --</option>${interestRateOptions}</select>
                         </div>
                     </div>
                     <div class="input-group">
                          <label>Préstamo + Interés (Calculado) (S/):</label>
                          <input type="text" id="pawn-total-to-pay" name="totalToPayDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;">
                          <input type="hidden" id="pawn-total-interest-hidden" name="totalInterest" value="0">
                     </div>
                     <div class="input-group">
                          <label for="pawn-num-installments">N° de Cuotas <span class="text-danger">*</span>:</label>
                          <input type="number" id="pawn-num-installments" name="numInstallments" required step="1" min="1">
                     </div>
                     <div class="input-group">
                          <label>Valor de Cuota (Calculado) (S/):</label>
                          <input type="text" id="pawn-installment-amount" name="installmentAmountDisplay" value="S/ 0.00" readonly disabled style="font-weight: bold;">
                     </div>
                     {/* <input type="hidden" name="paymentType" value="Mensual"> */}
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Generar Solicitud de Empeño</button>
            </div>
            <div id="pawn-request-error" class="error-message" style="display: none;"></div>
        </form>
    `;

     // --- Event Listeners Empeño (NUEVA LÓGICA) ---
     const form = contentArea.querySelector('#pawn-request-form');
     const itemsContainer = contentArea.querySelector('#pawn-items-container');
     const addItemBtn = contentArea.querySelector('#add-pawn-item-btn');
     const totalValuationDisplay = contentArea.querySelector('#pawn-total-valuation');
     const percentageInput = contentArea.querySelector('#pawn-percentage');
     const loanAmountDisplay = contentArea.querySelector('#pawn-loan-amount');
     const loanAmountHidden = contentArea.querySelector('#pawn-loan-amount-hidden');
     const interestRateSelect = contentArea.querySelector('#pawn-interest-rate');
     const installmentsInput = contentArea.querySelector('#pawn-num-installments');
     const totalToPayDisplay = contentArea.querySelector('#pawn-total-to-pay');
     const totalInterestHidden = contentArea.querySelector('#pawn-total-interest-hidden');
     const installmentAmountDisplay = contentArea.querySelector('#pawn-installment-amount');
     const isVehicleCheckbox = contentArea.querySelector('#is-vehicle-pawn');
     const vehicleSection = contentArea.querySelector('#vehicle-details-section');
     const errorDiv = contentArea.querySelector('#pawn-request-error');

     let itemIndex = 1; // Contador para nombres de campo únicos de artículos

     // Función para calcular y actualizar TODOS los montos
     const updatePawnCalculations = () => {
        // 1. Calcular Valorización Total
        let currentTotalValuation = 0;
        itemsContainer.querySelectorAll('.item-valuation').forEach(input => {
            currentTotalValuation += parseFloat(input.value) || 0;
        });
        if (totalValuationDisplay) totalValuationDisplay.value = utils.formatCurrency(currentTotalValuation);

        // 2. Calcular Monto Préstamo
        const percentage = parseFloat(percentageInput?.value) || 0;
        const loanAmount = currentTotalValuation * (percentage / 100);
        if(loanAmountDisplay) loanAmountDisplay.value = utils.formatCurrency(loanAmount);
        if(loanAmountHidden) loanAmountHidden.value = loanAmount.toFixed(2);

        // 3. Calcular Interés, Total a Pagar y Cuota
        const rate = parseFloat(interestRateSelect?.value) || 0;
        const numInstallments = parseInt(installmentsInput?.value) || 0;
        const results = calculateLoanDetails(loanAmount, rate, numInstallments); // Usa la función simple adaptada

        if(totalToPayDisplay) totalToPayDisplay.value = utils.formatCurrency(results.totalToPay);
        if(totalInterestHidden) totalInterestHidden.value = results.totalInterest.toFixed(2); // Guardar interés
        if(installmentAmountDisplay) installmentAmountDisplay.value = utils.formatCurrency(results.installmentAmount);

     };

     // Listener para añadir artículo
     addItemBtn?.addEventListener('click', () => {
          const template = itemsContainer.querySelector('.pawn-item-row[data-item-index="0"]');
          if (!template) return;
          const newItemRow = template.cloneNode(true);
          newItemRow.dataset.itemIndex = itemIndex;
          // Limpiar valores y actualizar nombres de campos
          newItemRow.querySelectorAll('input, select').forEach(el => {
              const nameAttr = el.getAttribute('name');
              if (nameAttr) {
                   el.setAttribute('name', nameAttr.replace('[0]', `[${itemIndex}]`));
              }
              if (el.type === 'file') {
                   el.value = null; // Limpiar input de archivo
              } else if (el.tagName === 'SELECT') {
                   el.selectedIndex = 0; // Resetear select
              } else if (el.type !== 'number' || el.name.includes('quantity')) { // No resetear cantidad (asume 1)
                   el.value = '';
              } else {
                    el.value = '0'; // Resetear valoraciones a 0
              }
              el.id = `${el.id.split('-')[0]}-${itemIndex}`; // Actualizar ID si es necesario
          });
           // Hacer visible el botón de eliminar en la nueva fila y filas anteriores
          newItemRow.querySelector('.remove-item-btn').style.display = 'inline-block';
          itemsContainer.querySelectorAll('.pawn-item-row .remove-item-btn').forEach(btn => btn.style.display = 'inline-block');

          itemsContainer.appendChild(newItemRow);
          itemIndex++;
          updatePawnCalculations(); // Recalcular al añadir
     });

     // Listener para eliminar artículo (delegación)
     itemsContainer?.addEventListener('click', (e) => {
          if (e.target.closest('.remove-item-btn')) {
              const rowToRemove = e.target.closest('.pawn-item-row');
              // No eliminar la primera fila
              if (rowToRemove && rowToRemove.dataset.itemIndex !== '0') {
                   rowToRemove.remove();
                   // Ocultar botón eliminar si solo queda 1 item
                   if (itemsContainer.querySelectorAll('.pawn-item-row').length <= 1) {
                       const firstRemoveBtn = itemsContainer.querySelector('.pawn-item-row[data-item-index="0"] .remove-item-btn');
                       if(firstRemoveBtn) firstRemoveBtn.style.display = 'none';
                   }
                   updatePawnCalculations(); // Recalcular al eliminar
              }
          }
     });

     // Listener para cambios en valoraciones, porcentaje, tasa, cuotas
     itemsContainer?.addEventListener('input', (e) => {
         if (e.target.classList.contains('item-valuation')) {
             updatePawnCalculations();
         }
     });
     percentageInput?.addEventListener('input', updatePawnCalculations);
     interestRateSelect?.addEventListener('change', updatePawnCalculations);
     installmentsInput?.addEventListener('input', updatePawnCalculations);

     // Listener para checkbox vehicular
     isVehicleCheckbox?.addEventListener('change', () => {
          const isChecked = isVehicleCheckbox.checked;
          if (vehicleSection) {
               vehicleSection.style.display = isChecked ? 'block' : 'none';
               // Hacer campos requeridos si está marcado
               vehicleSection.querySelectorAll('input, select').forEach(el => {
                   el.required = isChecked;
               });
          }
     });

     // Listener para submit del formulario Empeño (NUEVO)
     form?.addEventListener('submit', (e) => {
         e.preventDefault();
         if (!errorDiv) return; errorDiv.textContent = ''; errorDiv.style.display = 'none';

         if (!form.checkValidity()) {
              errorDiv.textContent = 'Por favor, completa todos los campos requeridos (*).'; errorDiv.style.display = 'block'; form.reportValidity(); return;
         }
         // Validar que haya al menos una foto para cada artículo
         let photosOk = true;
         form.querySelectorAll('.pawn-item-row').forEach((row, idx) => {
              const photoInputItem = row.querySelector(`input[name="items[${row.dataset.itemIndex}][photos]"]`);
              if (!photoInputItem || !photoInputItem.files || photoInputItem.files.length === 0) {
                   photosOk = false;
                   photoInputItem?.focus();
              }
         });
         const combinedPhotoInput = form.querySelector('#pawn-items-combined-photo');
         if (!photosOk || !combinedPhotoInput?.files || combinedPhotoInput.files.length === 0) {
              errorDiv.textContent = 'Debes adjuntar las fotos requeridas para cada artículo y la foto grupal.';
              errorDiv.style.display = 'block';
              return;
         }


         const formData = new FormData(form);
         const clientId = parseInt(formData.get('clientId'));
         const client = data.getClient(clientId);
         const guarantorId = formData.get('guarantorId') ? parseInt(formData.get('guarantorId')) : null;
         if (clientId && guarantorId && clientId === guarantorId) { /* ... validación ... */ return; }

         // Recolectar datos de artículos
         const itemsData = [];
         form.querySelectorAll('.pawn-item-row').forEach(row => {
             const index = row.dataset.itemIndex;
             const photosFiles = row.querySelector(`input[name="items[${index}][photos]"]`)?.files;
             const invoiceFile = row.querySelector(`input[name="items[${index}][invoicePhoto]"]`)?.files[0];
             itemsData.push({
                 id: `item-${index}-${Date.now()}`, // ID simple para el item
                 quantity: parseInt(formData.get(`items[${index}][quantity]`) || '1'),
                 article: formData.get(`items[${index}][article]`),
                 brand: formData.get(`items[${index}][brand]`),
                 model: formData.get(`items[${index}][model]`),
                 serial: formData.get(`items[${index}][serial]`),
                 invoicePhoto: invoiceFile?.name || null, // Simulación nombre
                 photos: photosFiles ? Array.from(photosFiles).map(f => f.name) : [], // Simulación nombres
                 observation: formData.get(`items[${index}][observation]`),
                 itemStatus: formData.get(`items[${index}][itemStatus]`),
                 valuation: parseFloat(formData.get(`items[${index}][valuation]`) || '0')
             });
         });

         // Recolectar datos vehiculares si aplica
         let vehicleData = null;
         if (formData.get('isVehiclePawn') === 'on') {
             vehicleData = {
                 plate: formData.get('vehicleDetails[plate]'),
                 engineNo: formData.get('vehicleDetails[engineNo]'),
                 serialNo: formData.get('vehicleDetails[serialNo]'),
                 color: formData.get('vehicleDetails[color]'),
                 brand: formData.get('vehicleDetails[brand]'),
                 ownerName: formData.get('vehicleDetails[ownerName]'),
                 soatStatus: formData.get('vehicleDetails[soatStatus]'),
                 hasKey: formData.get('vehicleDetails[hasKey]') === 'true',
                 hasCard: formData.get('vehicleDetails[hasCard]') === 'true'
             };
         }

         // Recalcular valores finales desde los datos recolectados
         const finalTotalValuation = itemsData.reduce((sum, item) => sum + (item.valuation * item.quantity), 0);
         const finalPawnPercentage = parseFloat(formData.get('pawnPercentage'));
         const finalLoanAmount = finalTotalValuation * (finalPawnPercentage / 100);
         const finalInterestRate = parseFloat(formData.get('interestRatePawn'));
         const finalNumInstallments = parseInt(formData.get('numInstallments'));
         const finalCalculated = calculateLoanDetails(finalLoanAmount, finalInterestRate, finalNumInstallments);
         const combinedPhotoFile = combinedPhotoInput.files[0];

         const newService = {
             type: 'Empeño',
             clientId: clientId,
             items: itemsData, // Guardar array de items
             vehicleDetails: vehicleData, // Guardar detalles vehiculares o null
             totalValuation: finalTotalValuation,
             pawnPercentage: finalPawnPercentage,
             amount: finalLoanAmount, // Monto prestado
             interestCategory: formData.get('interestCategory'), // Categoría seleccionada
             interestRatePawn: finalInterestRate, // Tasa seleccionada
             totalInterest: finalCalculated.totalInterest,
             totalToPay: finalCalculated.totalToPay,
             numInstallments: finalNumInstallments,
             installmentAmount: finalCalculated.installmentAmount,
             paymentType: 'Mensual', // Asumido o quitar si no aplica a empeño
             status: 'Pendiente',
             date: new Date().toISOString().split('T')[0],
             branch: currentUser.branch,
             analyst: currentUser.username,
             guarantorId: guarantorId,
             guarantorRelationship: guarantorId ? formData.get('guarantorRelationship') : null,
             notes: formData.get('notes'), // Notas generales del empeño
             nextPayment: null, disbursementDate: null, approvalDate: null, lastPaymentDate: null, lastPaymentAmount: null,
             documents: { // Documentos generales + foto grupal
                  facadePhoto: client?.facadePhotoUrl?.split('/').pop() || null,
                  dniPhoto: client?.dniPhotoUrl?.split('/').pop() || null,
                  supplyPhotoUrl: client?.supplyPhotoUrl?.split('/').pop() || null,
                  plusCodeProvided: !!client?.plusCode,
                  articlesCombinedPhoto: combinedPhotoFile?.name || null, // Foto grupal
                  // Los documentos específicos de CADA artículo están dentro del array 'items'
                  // Los documentos de contrato, etc., se añadirán después
                  promissoryNote: null, declaration: null, commitment: null, disbursementVoucher: null
             }
         };

         // Validaciones finales
         if (isNaN(newService.amount) || newService.amount <= 0) { errorDiv.textContent = 'Monto de préstamo calculado inválido.'; errorDiv.style.display = 'block'; return; }
         if (isNaN(newService.numInstallments) || newService.numInstallments <= 0) { errorDiv.textContent = 'N° de cuotas inválido.'; errorDiv.style.display = 'block'; return; }

         try {
             const addedService = data.addService(newService);
             console.log('Solicitud de empeño generada:', addedService);
             alert(`Solicitud de Empeño #${addedService.id} para ${client?.name || 'Cliente'} generada exitosamente.\nPendiente de adjuntar documentos contractuales y aprobación.`);
             // Navegar a vista de solicitudes
             if (typeof loadRequestsView === 'function') { loadRequestsView(contentArea, sectionTitleElement); }
             else { console.warn("loadRequestsView no encontrada."); ui.loadInitialContent(); } // Fallback
         } catch (error) {
             console.error("Error al generar solicitud de empeño:", error);
             errorDiv.textContent = `Error al guardar: ${error.message}`;
             errorDiv.style.display = 'block';
         }
     });

     // Llamada inicial a cálculos
     updatePawnCalculations();
}

// --- Vistas de Listados (Nuevas y Anteriores) ---

/**
 * Muestra la tabla de Solicitudes de Crédito del analista.
 */
export function loadCreditRequestsView(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Solicitudes de Crédito';
    console.log("Cargando vista: Solicitudes de Crédito (Analista)");
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }

    const creditRequests = data.dummyData.services
        .filter(s => s.analyst === currentUser.username && s.type === 'Préstamo') // Solo préstamos del analista
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar

    // Columnas basadas en "Tablas a Analista.xlsx - Solicitud de créditos.csv"
    const columns = [
        { key: 'rowNumber', label: 'N°', numeric: true }, // Añadido
        { key: 'id', label: 'ID de crédito' },
        { key: 'status', label: 'Estado' }, // Mapear a Activo/Liquidado? O usar estado actual? Usaremos actual.
        { key: 'id', label: 'Solicitud', format: () => 'Aprobado', center: true }, // Placeholder "Aprobado" como en CSV? O mostrar estado real? Mostremos estado real.
        { key: 'date', label: 'Fecha', format: 'date' }, // Fecha solicitud
        // Columna Operaciones: Botones para Contrato, Pagaré, Plan Pagos, Abonos
        { key: 'id', label: 'Operaciones', center: true, format: (id, service) => `
            <button class="btn btn-link btn-sm" data-action="generate-contract" data-id="${id}" title="Generar Contrato"><i class="fas fa-file-signature"></i></button>
            <button class="btn btn-link btn-sm" data-action="view-file" data-filename="${service.documents?.promissoryNote || ''}" title="Ver Pagaré" ${!service.documents?.promissoryNote ? 'disabled' : ''}><i class="fas fa-file-alt"></i></button>
            <button class="btn btn-link btn-sm" data-action="ver-plan-pagos" data-id="${id}" title="Ver Plan Pagos"><i class="fas fa-calendar-alt"></i></button>
            <button class="btn btn-link btn-sm" data-action="ver-abonos" data-id="${id}" title="Ver Abonos"><i class="fas fa-money-bill-wave"></i></button>
        `},
        // { key: 'analystDni', label: 'DNI Analista', format: () => data.getUser(currentUser.username)?.dni ?? 'N/A' }, // DNI Analista no está en user data
        { key: 'analyst', label: 'Analista' },
        { key: 'clientId', label: 'DNI', format: (cid) => data.getClient(cid)?.dni ?? 'N/A' },
        { key: 'clientId', label: 'Apellidos y Nombres', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'amount', label: 'Préstamo', format: 'currency', numeric: true },
        { key: 'interestRate', label: 'Porcentaje', format: (r) => r ? `${r}%` : 'N/A', center: true },
        { key: 'totalToPay', label: 'Préstamo + intereses', format: 'currency', numeric: true },
        { key: 'paymentType', label: 'Tipo de Cuota' },
        { key: 'numInstallments', label: 'N° cuotas', numeric: true, center: true },
        { key: 'installmentAmount', label: 'Valor de la cuota', format: 'currency', numeric: true }
    ];

    contentArea.innerHTML = `<h3><i class="fas fa-file-contract"></i> Mis Solicitudes de Crédito</h3>
        ${ui.renderTable(creditRequests.map((r,i)=>({...r, rowNumber: i+1})), columns, [], { // No necesita acciones directas en fila
            defaultMessage: "No has generado solicitudes de crédito.",
            tableId: "analyst-credit-requests-table"
        })}
        <div class="alert alert-info mt-2"><i class="fas fa-info-circle"></i> Usa los botones en 'Operaciones' para ver detalles, generar contrato o consultar pagos.</div>
    `;
}

/**
 * Muestra la tabla de Solicitudes de Empeño del analista.
 */
export function loadPawnRequestsView(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Solicitudes de Empeño';
    console.log("Cargando vista: Solicitudes de Empeño (Analista)");
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }

    const pawnRequests = data.dummyData.services
        .filter(s => s.analyst === currentUser.username && s.type === 'Empeño')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Columnas basadas en "Tablas a Analista.xlsx - Solicitud de empeños.csv"
    const columns = [
         { key: 'rowNumber', label: 'N°', numeric: true }, // Añadido
         { key: 'id', label: 'ID de empeño' },
         { key: 'date', label: 'Fecha de solicitud', format: 'date' },
         { key: 'branch', label: 'Agencia' },
         // { key: 'analystDni', label: 'DNI analista' }, // No disponible
         { key: 'analyst', label: 'Analista' },
         { key: 'status', label: 'Estado' },
         { key: 'clientId', label: 'DNI o RUC', format: (cid) => data.getClient(cid)?.dni ?? 'N/A' }, // Asume DNI
         { key: 'clientId', label: 'Apellidos y nombres o razón social', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
         { key: 'items', label: 'Bienes en garantía', center: true, format: (items, service) => `<button class="btn btn-link btn-sm" data-action="ver-detalles-servicio" data-id="${service.id}"><i class="fas fa-eye"></i> Ver (${items?.length || 0})</button>` },
         { key: 'totalValuation', label: 'Valorización', format: 'currency', numeric: true },
         { key: 'pawnPercentage', label: 'Porcentaje valorizado', format: (p) => p ? `${p.toFixed(1)}%` : 'N/A', center: true },
         { key: 'amount', label: 'Préstamo', format: 'currency', numeric: true },
         { key: 'interestCategory', label: 'Tipo de interés', format: (cat, service) => `${cat || 'N/A'} - ${service.interestRatePawn ?? 'N/A'}%` },
         { key: 'totalToPay', label: 'Préstamo + interes', format: 'currency', numeric: true },
         { key: 'paymentType', label: 'Tipo de pago' }, // Este campo no se pide en el form rediseñado, usamos 'Mensual'?
         { key: 'numInstallments', label: 'N° de cuotas', numeric: true, center: true },
         { key: 'installmentAmount', label: 'Valor de la cuota', format: 'currency', numeric: true },
         { key: 'disbursementDate', label: 'Fecha de desembolso', format: 'date' },
         { key: 'nextPayment', label: 'Vencimiento', format: 'date' }, // Vencimiento de la última cuota? Requiere cálculo. Usaremos nextPayment.
         // { key: 'newVencimiento', label: 'Nuevo vencimiento' }, // Lógica no definida
    ];

     contentArea.innerHTML = `<h3><i class="fas fa-gem"></i> Mis Solicitudes de Empeño</h3>
        ${ui.renderTable(pawnRequests.map((r,i)=>({...r, rowNumber: i+1})), columns, [], {
            defaultMessage: "No has generado solicitudes de empeño.",
            tableId: "analyst-pawn-requests-table"
        })}
    `;
}

/**
 * Muestra la tabla de Créditos - Desembolsos del analista.
 */
export function loadDisbursementsView(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Créditos - Desembolsos';
     console.log("Cargando vista: Créditos - Desembolsos (Analista)");
     const currentUser = getCurrentUser();
     if (!currentUser || !currentUser.role !== 'Analista') {
         return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
     }
     // Mostrar servicios DESEMBOLSADOS o activos del analista
     const disbursedServices = data.dummyData.services
         .filter(s => s.analyst === currentUser.username && (s.disbursementDate || ['Por Cobrar', 'Moroso'].includes(s.status)))
         .sort((a, b) => new Date(b.disbursementDate || b.date) - new Date(a.disbursementDate || a.date));

      // Columnas basadas en "Tablas a Analista.xlsx - Créditos - Desembolsos.csv"
      const columns = [
         { key: 'rowNumber', label: 'N°', numeric: true },
         { key: 'id', label: 'ID' },
         { key: 'status', label: 'Estado' },
         // { key: 'solicitud', label: 'Solicitud', format: () => 'Aprobado' }, // Redundante con Estado?
         { key: 'date', label: 'Fecha Sol.', format: 'date' }, // Fecha solicitud original
         // Operaciones: Contrato, Pagaré, Plan Pagos, Abonos
          { key: 'id', label: 'Operaciones', center: true, format: (id, service) => `
             <button class="btn btn-link btn-sm" data-action="generate-contract" data-id="${id}" title="Generar Contrato"><i class="fas fa-file-signature"></i></button>
             <button class="btn btn-link btn-sm" data-action="view-file" data-filename="${service.documents?.promissoryNote || ''}" title="Ver Pagaré" ${!service.documents?.promissoryNote ? 'disabled' : ''}><i class="fas fa-file-alt"></i></button>
             <button class="btn btn-link btn-sm" data-action="ver-plan-pagos" data-id="${id}" title="Ver Plan Pagos"><i class="fas fa-calendar-alt"></i></button>
             <button class="btn btn-link btn-sm" data-action="ver-abonos" data-id="${id}" title="Ver Abonos"><i class="fas fa-money-bill-wave"></i></button>
         `},
         // { key: 'analystDni', label: 'DNI Analista' }, // No disponible
         { key: 'analyst', label: 'Analista' },
         { key: 'clientId', label: 'DNI', format: (cid) => data.getClient(cid)?.dni ?? 'N/A' },
         { key: 'clientId', label: 'Apellidos y Nombres', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
         { key: 'amount', label: 'Préstamo', format: 'currency', numeric: true },
         { key: 'interestRate', label: 'Porcentaje', format: (r) => r ? `${r}%` : 'N/A', center: true }, // Asume préstamo
         { key: 'totalToPay', label: 'Préstamo + intereses', format: 'currency', numeric: true },
         { key: 'paymentType', label: 'Tipo de Cuota' },
         { key: 'numInstallments', label: 'N° cuotas', numeric: true, center: true },
         { key: 'installmentAmount', label: 'Valor de la cuota', format: 'currency', numeric: true },
         // Columna Abonos - requiere cálculo real
         { key: 'lastPaymentAmount', label: 'Abonos', format: 'currency', numeric: true }, // Placeholder con último pago
         // Columna Deuda - requiere cálculo real
         { key: 'id', label: 'Deuda', format: (id, service) => utils.formatCurrency((service.totalToPay || service.amount || 0) - (service.lastPaymentAmount || 0)), numeric: true }, // Estimación básica
         { key: 'nextPayment', label: 'Vencimiento', format: 'date' }, // Vencimiento próximo pago
         { key: 'branch', label: 'Agencia' },
     ];

     contentArea.innerHTML = `<h3><i class="fas fa-receipt"></i> Mis Créditos Desembolsados / Activos</h3>
          ${ui.renderTable(disbursedServices.map((r,i)=>({...r, rowNumber: i+1})), columns, [], {
             defaultMessage: "No tienes créditos desembolsados o activos.",
             tableId: "analyst-disbursements-table"
         })}
     `;
}

/**
 * Muestra el plan de pagos real de un servicio, con estado de cada cuota.
 */
export function viewPaymentPlan(serviceId) {
    console.log(`Solicitado ver Plan de Pagos para Servicio ID: ${serviceId}`);
    const service = data.getService(serviceId);
    const client = service ? data.getClient(service.clientId) : null;
    if (!service || !client) {
        ui.openModal('Error', '<div class="alert alert-danger">No se encontró el servicio o cliente.</div>');
        return;
    }
    if (!service.paymentPlan || service.paymentPlan.length === 0) {
        ui.openModal('Plan de Pagos', '<div class="alert alert-warning">Este servicio no tiene plan de pagos generado.</div>');
        return;
    }
    // Generar tabla de cuotas
    let rows = '';
    service.paymentPlan.forEach((cuota, idx) => {
        const paid = cuota.paid ? 'Sí' : 'No';
        const paidClass = cuota.paid ? 'table-success' : (new Date(cuota.dueDate) < new Date(data.HOY_SIMULADO) ? 'table-danger' : '');
        rows += `<tr class="${paidClass}"><td>${idx + 1}</td><td>${utils.formatDate(cuota.dueDate)}</td><td>${utils.formatCurrency(cuota.amount)}</td><td>${paid}</td></tr>`;
    });
    const table = `<table class="table table-sm table-bordered"><thead><tr><th>#</th><th>Vencimiento</th><th>Monto</th><th>Pagada</th></tr></thead><tbody>${rows}</tbody></table>`;
    const content = `
        <h4>Plan de Pagos - Serv. #${serviceId}</h4>
        <p>Cliente: ${client.name}</p>
        <p>Monto Cuota: ${utils.formatCurrency(service.installmentAmount)}</p>
        <p>N° Cuotas: ${service.numInstallments}</p>
        <p>Tipo Pago: ${service.paymentType}</p>
        ${table}
    `;
    ui.openModal('Plan de Pagos', content, false, '', 'large');
}

/**
 * Muestra el historial real de abonos/pagos de un servicio.
 */
export function viewPaymentsHistory(serviceId) {
    console.log(`Solicitado ver Historial de Abonos para Servicio ID: ${serviceId}`);
    const service = data.getService(serviceId);
    const client = service ? data.getClient(service.clientId) : null;
    if (!service || !client) {
        ui.openModal('Error', '<div class="alert alert-danger">No se encontró el servicio o cliente.</div>');
        return;
    }
    if (!service.payments || service.payments.length === 0) {
        ui.openModal('Historial de Abonos', '<div class="alert alert-warning">Este servicio no tiene abonos registrados.</div>');
        return;
    }
    let rows = '';
    service.payments.forEach((p, idx) => {
        rows += `<tr><td>${idx + 1}</td><td>${utils.formatDate(p.date)}</td><td>${utils.formatCurrency(p.amount)}</td><td>${p.method || ''}</td><td>${p.notes || ''}</td></tr>`;
    });
    const table = `<table class="table table-sm table-bordered"><thead><tr><th>#</th><th>Fecha</th><th>Monto</th><th>Método</th><th>Notas</th></tr></thead><tbody>${rows}</tbody></table>`;
    const content = `
        <h4>Historial de Abonos - Serv. #${serviceId}</h4>
        <p>Cliente: ${client.name}</p>
        ${table}
    `;
    ui.openModal('Historial de Abonos', content, false, '', 'large');
}

/**
 * Placeholder para mostrar el panel para iniciar la generación de contratos.
 */
export function loadContractGenerator(contentArea, sectionTitleElement) {
     sectionTitleElement.textContent = 'Generar Contrato';
     console.log("Cargando vista: Generar Contrato");
     const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.role !== 'Analista') {
         return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
     }

     contentArea.innerHTML = `
         <h3><i class="fas fa-file-signature"></i> Generar Contrato</h3>
         <p>Selecciona el tipo de servicio para el cual deseas generar el contrato.</p>
         <div class="mb-3">
              <button id="select-loan-contract-btn" class="btn btn-primary mr-2"><i class="fas fa-hand-holding-usd"></i> Contrato de Préstamo</button>
              <button id="select-pawn-contract-btn" class="btn btn-warning"><i class="fas fa-gem"></i> Contrato de Empeño</button>
         </div>
         <div id="contract-form-container" class="app-form" style="display: none;">
            </div>
         <div id="contract-preview-container" class="mt-3" style="display: none; border: 1px solid #ccc; padding: 15px; background-color: #f9f9f9; max-height: 500px; overflow-y: auto;">
              <h4>Vista Previa del Contrato (Texto)</h4>
              <pre id="contract-text-preview" style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace;"></pre>
              <button id="print-contract-btn" class="btn btn-secondary btn-sm mt-2"><i class="fas fa-print"></i> Imprimir (Sim.)</button>
         </div>
         <div id="contract-error" class="error-message mt-2" style="display: none;"></div>
         <div class="alert alert-info mt-3"><i class="fas fa-info-circle"></i> La generación es una vista previa en texto. La exportación a PDF no está implementada.</div>
     `;

     const formContainer = contentArea.querySelector('#contract-form-container');
     const previewContainer = contentArea.querySelector('#contract-preview-container');
     const errorDiv = contentArea.querySelector('#contract-error');

     // Listener para seleccionar tipo de contrato
     contentArea.querySelector('#select-loan-contract-btn')?.addEventListener('click', () => {
          loadContractForm('Préstamo', formContainer, previewContainer, errorDiv);
     });
     contentArea.querySelector('#select-pawn-contract-btn')?.addEventListener('click', () => {
          // Pendiente: Implementar formulario específico para empeño si es diferente
          alert("Generación de contrato de Empeño aún no implementada.");
          // loadContractForm('Empeño', formContainer, previewContainer, errorDiv);
     });

     // Listener para imprimir (simulado)
     contentArea.querySelector('#print-contract-btn')?.addEventListener('click', () => {
          alert("Simulando impresión del contrato...");
          // En una app real: window.print() o librería PDF
     });
}

/**
 * Carga el formulario específico para generar un contrato de Préstamo.
 */
function loadContractForm(type, formContainer, previewContainer, errorDiv) {
     if (!formContainer || !previewContainer || !errorDiv) return;
     console.log(`Cargando formulario para contrato de: ${type}`);
     previewContainer.style.display = 'none'; // Ocultar vista previa
     errorDiv.style.display = 'none';

     const currentUser = getCurrentUser();
     // Obtener clientes y solicitudes APROBADAS o DESEMBOLSADAS del analista
     const analystClients = data.dummyData.clients.filter(c => c.analyst === currentUser.username);
     const relevantServices = data.dummyData.services.filter(s =>
          s.analyst === currentUser.username &&
          s.type === type && // Filtrar por tipo
          ['Aprobado', 'Desembolsado', 'Por Cobrar', 'Moroso', 'Pagado'].includes(s.status) // Solo los que pasaron aprobación
     );

     const clientOptions = analystClients.map(c => `<option value="${c.id}">${c.name} (DNI: ${c.dni})</option>`).join('');
     const serviceOptions = relevantServices.map(s => `<option value="${s.id}">#${s.id} - ${data.getClient(s.clientId)?.name} (${utils.formatCurrency(s.amount)})</option>`).join('');

     formContainer.innerHTML = `
          <h4>Datos para Contrato de ${type}</h4>
          <form id="generate-contract-form">
               <input type="hidden" name="contractType" value="${type}">
               <div class="input-group">
                    <label for="contract-client">Cliente:</label>
                    <select id="contract-client" name="clientId" required>
                         <option value="">-- Seleccione Cliente --</option>${clientOptions}
                    </select>
               </div>
               <div class="input-group"><label>DNI:</label><input type="text" id="contract-dni" name="clientDni" readonly></div>
               <div class="input-group"><label>Domicilio:</label><input type="text" id="contract-address" name="clientAddress" readonly></div>
               <div class="input-group">
                    <label for="contract-service">N° Solicitud ${type}:</label>
                    <select id="contract-service" name="serviceId" required>
                         <option value="">-- Seleccione Solicitud --</option>${serviceOptions}
                    </select>
               </div>
               <div class="input-group"><label>Garante:</label><input type="text" id="contract-guarantor" name="guarantorName" readonly></div>
               <div class="input-group"><label>Monto ${type}:</label><input type="text" id="contract-amount" name="serviceAmount" readonly></div>
               <div class="input-group"><label>Tasa Interés (%):</label><input type="text" id="contract-rate" name="serviceRate" readonly></div>
               <div class="input-group"><label>N° Cuotas:</label><input type="text" id="contract-installments" name="serviceInstallments" readonly></div>
               <div class="input-group"><label>Valor Cuota:</label><input type="text" id="contract-installment-amount" name="serviceInstallmentAmount" readonly></div>
               <div class="input-group"><label>Total a Pagar:</label><input type="text" id="contract-total" name="serviceTotal" readonly></div>
               <div class="input-group"><label>Fecha Desembolso:</label><input type="text" id="contract-disbursement" name="serviceDisbursement" readonly></div>
               <div class="input-group">
                    <label for="contract-first-payment">Primera Cuota (Fecha):</label>
                    <input type="date" id="contract-first-payment" name="firstPaymentDate" required>
               </div>
               <div class="input-group"><label>Fin del Contrato (Fecha Última Cuota):</label><input type="text" id="contract-end-date" name="contractEndDate" readonly></div>
               <div class="input-group"><label>Plazo del Contrato (Días):</label><input type="text" id="contract-duration" name="contractDurationDays" readonly></div>
               <div class="input-group"><label for="contract-pagare">N° Pagaré:</label><input type="text" id="contract-pagare" name="pagareNumber" placeholder="Ingrese N° Pagaré asociado"></div>


               <div class="form-actions">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-file-alt"></i> Generar Vista Previa Contrato</button>
               </div>
          </form>
     `;
     formContainer.style.display = 'block'; // Mostrar formulario

     // --- Lógica para autocompletar y calcular ---
     const clientSelect = formContainer.querySelector('#contract-client');
     const serviceSelect = formContainer.querySelector('#contract-service');
     const firstPaymentInput = formContainer.querySelector('#contract-first-payment');

     // Autocompletar datos cliente
     clientSelect.addEventListener('change', () => {
          const clientId = clientSelect.value;
          const client = clientId ? data.getClient(parseInt(clientId)) : null;
          formContainer.querySelector('#contract-dni').value = client?.dni || '';
          formContainer.querySelector('#contract-address').value = client?.address || '';
          // Filtrar solicitudes para este cliente
          const clientServices = relevantServices.filter(s => s.clientId === parseInt(clientId));
          const clientServiceOptions = clientServices.map(s => `<option value="${s.id}">#${s.id} - (${utils.formatCurrency(s.amount)}) ${utils.formatDate(s.date)}</option>`).join('');
          serviceSelect.innerHTML = `<option value="">-- Seleccione Solicitud --</option>${clientServiceOptions}`;
          // Limpiar campos dependientes del servicio
          clearServiceDependentFields(formContainer);
     });

     // Autocompletar datos servicio y garante
     serviceSelect.addEventListener('change', () => {
          const serviceId = serviceSelect.value;
          const service = serviceId ? data.getService(parseInt(serviceId)) : null;
          const guarantor = service?.guarantorId ? data.getClient(service.guarantorId) : null;

          formContainer.querySelector('#contract-guarantor').value = guarantor?.name || 'Ninguno';
          formContainer.querySelector('#contract-amount').value = service ? utils.formatCurrency(service.amount) : '';
          formContainer.querySelector('#contract-rate').value = service?.interestRate ? `${service.interestRate}%` : (service?.interestRatePawn ? `${service.interestRatePawn}%` : 'N/A');
          formContainer.querySelector('#contract-installments').value = service?.numInstallments || '';
          formContainer.querySelector('#contract-installment-amount').value = service ? utils.formatCurrency(service.installmentAmount) : '';
          formContainer.querySelector('#contract-total').value = service ? utils.formatCurrency(service.totalToPay) : '';
          formContainer.querySelector('#contract-disbursement').value = service ? (utils.formatDate(service.disbursementDate) || 'Pendiente') : '';

          // Pre-llenar primera cuota si hay desembolso?
          if (service?.disbursementDate) {
               const probableFirstPayment = new Date(service.disbursementDate + 'T00:00:00Z');
               // Calcular primera cuota basada en tipo de pago (simplificado)
                if (service.paymentType === 'Diario') probableFirstPayment.setUTCDate(probableFirstPayment.getUTCDate() + 1);
                else if (service.paymentType === 'Semanal') probableFirstPayment.setUTCDate(probableFirstPayment.getUTCDate() + 7);
                else probableFirstPayment.setUTCMonth(probableFirstPayment.getUTCMonth() + 1); // Mensual o por defecto
               firstPaymentInput.value = probableFirstPayment.toISOString().split('T')[0];
          } else {
              firstPaymentInput.value = '';
          }
           calculateContractEnd(formContainer); // Calcular fin y plazo
     });

     // Calcular fecha fin y plazo al cambiar primera cuota
     firstPaymentInput.addEventListener('change', () => calculateContractEnd(formContainer));

     // Submit del formulario de generación
     formContainer.querySelector('#generate-contract-form').addEventListener('submit', (e) => {
          e.preventDefault();
          errorDiv.style.display = 'none';
          if (!e.target.checkValidity()) {
               errorDiv.textContent = 'Completa los campos requeridos.'; errorDiv.style.display = 'block'; e.target.reportValidity(); return;
          }
          const contractData = Object.fromEntries(new FormData(e.target));
          // Añadir datos calculados o formateados que no están en el form directamente
          contractData.serviceAmountWords = numberToWords(parseFloat(contractData.serviceAmount?.replace(/[^0-9.-]+/g,"") || 0)); // Convertir monto a palabras (requiere librería externa o función compleja)
          contractData.clientName = clientSelect.options[clientSelect.selectedIndex]?.text.split(' (DNI:')[0] || 'CLIENTE';
          contractData.serviceDisbursementFormatted = utils.formatDate(contractData.serviceDisbursement) || 'PENDIENTE';
          contractData.firstPaymentDateFormatted = utils.formatDate(contractData.firstPaymentDate) || 'PENDIENTE';
          contractData.contractEndDateFormatted = utils.formatDate(contractData.contractEndDate) || 'PENDIENTE';

          generateContractText(contractData, previewContainer, errorDiv); // Generar texto
     });
}

// Función para limpiar campos que dependen de la selección del servicio
function clearServiceDependentFields(formContainer){
     const fieldsToClear = ['#contract-guarantor', '#contract-amount', '#contract-rate', '#contract-installments', '#contract-installment-amount', '#contract-total', '#contract-disbursement', '#contract-first-payment', '#contract-end-date', '#contract-duration', '#contract-pagare'];
     fieldsToClear.forEach(selector => {
          const element = formContainer.querySelector(selector);
          if (element) element.value = '';
     });
}


// Función para calcular Fecha Fin y Plazo del Contrato
function calculateContractEnd(formContainer) {
     const firstPaymentStr = formContainer.querySelector('#contract-first-payment').value;
     const numInstallments = parseInt(formContainer.querySelector('#contract-installments').value || '0');
     const serviceId = formContainer.querySelector('#contract-service').value;
     const service = serviceId ? data.getService(parseInt(serviceId)) : null;
     const paymentType = service?.paymentType;
     const endDateInput = formContainer.querySelector('#contract-end-date');
     const durationInput = formContainer.querySelector('#contract-duration');

     if (!firstPaymentStr || !numInstallments || !paymentType || !endDateInput || !durationInput) {
         endDateInput.value = ''; durationInput.value = ''; return;
     }

     try {
         const startDate = new Date(firstPaymentStr + 'T00:00:00Z');
         const endDate = new Date(startDate);

         if (paymentType === 'Diario') {
             endDate.setUTCDate(startDate.getUTCDate() + numInstallments - 1);
         } else if (paymentType === 'Semanal') {
              endDate.setUTCDate(startDate.getUTCDate() + (numInstallments - 1) * 7);
         } else { // Mensual o por defecto
             endDate.setUTCMonth(startDate.getUTCMonth() + numInstallments -1);
         }

         if (!isNaN(endDate.getTime())) {
             endDateInput.value = endDate.toISOString().split('T')[0];
             // Calcular plazo en días
             const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // Incluir día inicial
             durationInput.value = duration;
         } else {
             endDateInput.value = 'Error cálculo'; durationInput.value = '';
         }
     } catch (e) {
         console.error("Error calculando fecha fin:", e);
         endDateInput.value = 'Error'; durationInput.value = '';
     }
}

/**
 * Genera el texto del contrato y lo muestra en la vista previa.
 */
function generateContractText(contractData, previewContainer, errorDiv) {
     console.log("Generando texto de contrato con datos:", contractData);
     if (!previewContainer || !errorDiv) return;

     // Plantilla de Contrato (simplificada para demostración)
      const template = `
--------------------------------------------INICIO DEL CONTRATO--------------------------------------------

LOGO DE LA EMPRESA                RUC: 20602137903
                                  Jr. San Pedro/Santo Tomas Mz.A Lt.12
                                  Yarinacocha – Coronel Portillo - Ucayali

CONTRATO DE MUTUO (PRÉSTAMO DE DINERO)

Por el presente con CONTRATO DE MUTUO (Préstamo de Dinero), que otorga en calidad de MUTANTE: LA EMPRESA “CREDIMAS ORIENTE” con RUC. 20602137903, representado por su titular GERENTE GENERAL, Sr. PABLO ELVIS OSORES PAUCARCHUCO, identificado con DNI: 80070183, domiciliado en Jr. MARISCAL SUCRE N° 279, distrito de Chilca, Provincia de Huancayo, y de la otra parte en calidad de MUTUATORIO (A): ${contractData.clientName || '(Nombre Cliente)'}, identificado con DNI: ${contractData.clientDni || '(DNI Cliente)'}, domiciliado (a) en: ${contractData.clientAddress || '(Dirección Cliente)'}.

EN LOS TÉRMINOS SIGUIENTES:
PRIMERO.- LA EMPRESA “CREDIMAS” (MUTANTE), a solicitado de parte, por el presente contrato da en calidad de MUTO “PRÉSTAMO DE DINERO” a favor de ${contractData.clientName || '(Nombre Cliente)'} la suma de ${contractData.serviceAmount || '(Monto Préstamo)'} DINERO ENTREGADO EN LA FECHA ${contractData.serviceDisbursementFormatted || '(Fecha Desembolso)'}.
SEGUNDO.- EL MUTUATARIO (A), declara en efecto el día de la fecha ${contractData.serviceDisbursementFormatted || '(Fecha Desembolso)'} recibe la indicada suma de dinero ascendente a ${contractData.serviceAmount || '(Monto Préstamo)'}
TERCERO.- EL PRESENTE CONTRATO es por el tiempo de ${contractData.contractDurationDays || '(Plazo)'} días comprendidos a partir del ${contractData.firstPaymentDateFormatted || '(Primera Cuota)'} hasta ${contractData.contractEndDateFormatted || '(Fin Contrato)'}; fecha en la que indefectiblemente EL MUTUATARIO (A) deberá cancelar la totalidad del dinero por el presente documento que le otorga en calidad del préstamo.
CUARTO.- Para tal efecto y en calidad de garantía, EL MUTUATARIO (A), le hace la entrega al MUTANTE de un PAGARÉ N° ${contractData.pagareNumber || '(Número Pagaré)'} firmado a favor del mismo, por la suma de ${contractData.serviceAmountWords || '(MONTO EN PALABRAS)'} CON 00/100 NUEVOS SOLES, con fecha de vencimiento ${contractData.contractEndDateFormatted || '(Fin Contrato)'}.
QUINTO.- En todo lo no previsto en el PRESENTE CONTRATO, será de aplicación las normas del código civil y demás disposiciones legales que emanan sobre el caso, dejándose expresa constancia en el supuesto incumplimiento por parte del MUTUATARIO (A), las mismas que se hará responsable de los intereses que se generen, asimismo de los daños y perjuicios que ocasione, quedando a potestad del MUTUANTE pudiente éste proceder conforme a la ley.

Ambas partes contratantes, enteradas de tener el PRESENTE CONTRATO, se afirman y ratifican en su contenido, procediendo a firmar en señal de conformidad.


_________________________                  _________________________
Sr. PABLO ELVIS OSORES PAUCARCHUCO           ${contractData.clientName || '(Nombre Cliente)'}
DNI 80070183                             DNI N°. ${contractData.clientDni || '(DNI Cliente)'}
GERENTE GENERAL                          MUTUATARIO (A)

--------------------------------------------FIN DEL CONTRATO--------------------------------------------
      `;

     const previewElement = previewContainer.querySelector('#contract-text-preview');
     if (previewElement) {
          previewElement.textContent = template;
          previewContainer.style.display = 'block';
          previewElement.scrollTop = 0; // Scroll al inicio
     } else {
          errorDiv.textContent = "Error al mostrar la vista previa.";
          errorDiv.style.display = 'block';
     }
}

// Función placeholder para convertir número a palabras (requiere implementación real o librería)
function numberToWords(num) {
     // Implementación muy básica como placeholder
     if (num === 0) return 'CERO';
     if (num) return `(${num.toFixed(2)} EN PALABRAS)`; // Placeholder
     return '(MONTO EN PALABRAS)';
}


// --- Vistas Existentes (Mis Servicios, Detalles, Adjuntar) ---

/**
 * Muestra los servicios gestionados por el analista actual.
 */
export function loadMyServices(contentArea, sectionTitleElement) {
    console.log('Cargando vista Mis Servicios'); const currentUser = getCurrentUser(); if (!currentUser || !currentUser.role !== 'Analista') { ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.'); return; } sectionTitleElement.textContent = 'Mis Servicios Gestionados'; const myServices = data.dummyData.services.filter(s => s.analyst === currentUser.username && s.branch === currentUser.branch) .sort((a,b) => new Date(b.date) - new Date(a.date)); const columns = [ { key: 'id', label: 'ID' }, { key: 'type', label: 'Tipo' }, { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' }, { key: 'amount', label: 'Monto/Valor', format: 'currency', numeric: true }, { key: 'date', label: 'Fec. Reg.', format: 'date' }, { key: 'status', label: 'Estado' } ]; const actions = [ { label: 'Ver Detalles', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' }, { label: 'Adjuntar Doc.', class: 'btn-secondary', icon: 'fa-paperclip', actionKey: 'adjuntar-doc', idKey: 'id' } ]; contentArea.innerHTML = `<h3><i class="fas fa-briefcase"></i> Listado de Servicios a mi Cargo</h3> ${ui.renderTable(myServices, columns, actions, { defaultMessage: 'No tienes servicios registrados o asignados.', tableId: 'my-services-table' })}`; console.log('Vista Mis Servicios renderizada.');
}

/**
 * Muestra los detalles completos de un servicio en un modal.
 * (MODIFICADO para mostrar detalles de empeño nuevos)
 */
export function viewServiceDetails(serviceId) {
    console.log(`(serviceManagement.js) Cargando detalles para servicio ID: ${serviceId}`);
    const service = data.getService(serviceId);
    const client = service ? data.getClient(service.clientId) : null;
    if (!service || !client) { ui.openModal('Error', '<p>Servicio/Cliente no encontrado.</p>', false); return; }

    let itemDetailsHTML = '';
    if (service.type === 'Empeño') {
        itemDetailsHTML = '<h5><i class="fas fa-boxes"></i> Artículos Empeñados</h5>';
        if (service.items && service.items.length > 0) {
            service.items.forEach((item, index) => {
                 itemDetailsHTML += `
                     <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                         <h6>Artículo ${index + 1} (Cant: ${item.quantity || 1})</h6>
                         <p><strong>Desc:</strong> ${item.article || 'N/A'} | <strong>Marca:</strong> ${item.brand || 'N/A'} | <strong>Modelo:</strong> ${item.model || 'N/A'} | <strong>Serie:</strong> ${item.serial || 'N/A'}</p>
                         <p><strong>Estado:</strong> ${item.itemStatus || 'N/A'} | <strong>Valorización Unit.:</strong> ${utils.formatCurrency(item.valuation)}</p>
                         ${item.observation ? `<p><strong>Obs:</strong> ${item.observation}</p>` : ''}
                         <div><strong>Fotos:</strong> ${item.photos && item.photos.length > 0 ? item.photos.map(p => `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(p)}"><i class="fas fa-image"></i> ${p}</a>`).join(', ') : 'Ninguna'}</div>
                         <div><strong>Factura:</strong> ${item.invoicePhoto ? `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(item.invoicePhoto)}"><i class="fas fa-file-invoice"></i> ${item.invoicePhoto}</a>` : 'Ninguna'}</div>
                     </div>`;
            });
            itemDetailsHTML += `<p><strong>Valorización Total:</strong> ${utils.formatCurrency(service.totalValuation)}</p>`;
            itemDetailsHTML += `<p><strong>% Prestado:</strong> ${service.pawnPercentage ? service.pawnPercentage.toFixed(1) + '%' : 'N/A'}</p>`;
            itemDetailsHTML += `<p><strong>Interés:</strong> Cat: ${service.interestCategory || 'N/A'} - Tasa: ${service.interestRatePawn ?? 'N/A'}%</p>`;
        } else {
            itemDetailsHTML += '<p><em>No hay artículos registrados para este empeño.</em></p>';
        }
        // Detalles vehiculares si existen
        if (service.vehicleDetails) {
            itemDetailsHTML += '<hr><h5><i class="fas fa-car"></i> Detalles Vehiculares</h5>';
            itemDetailsHTML += `<ul>`;
            for (const key in service.vehicleDetails) {
                itemDetailsHTML += `<li><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${service.vehicleDetails[key]}</li>`;
            }
            itemDetailsHTML += `</ul>`;
        }

    } else { // Préstamo
         itemDetailsHTML = `<div class="input-group"><label>Tasa Interés:</label><input type="text" value="${service.interestRate ?? 'N/A'}%" readonly></div>`;
    }

    // Checklist de Documentos (adaptado)
    const requiredDocsForType = REQUIRED_DOCS[service.type] || [];
    let checklistHTML = '<h5><i class="fas fa-tasks"></i> Checklist Documentos Requeridos</h5><ul>';
    let allDocsComplete = true;
    requiredDocsForType.forEach(docKey => {
        const docValue = service.documents?.[docKey];
        let isComplete = false;
        // Validar según tipo de dato
        if (docKey === 'articlePhoto' && service.type === 'Empeño') {
             const photos = service.items?.flatMap(item => item.photos || []); // Obtener todas las fotos de todos los items
             isComplete = photos && photos.length > 0;
        } else if (docKey === 'articlesCombinedPhoto' && service.type === 'Empeño') {
            isComplete = !!docValue; // Verificar foto grupal
        } else if (typeof docValue === 'boolean') {
             isComplete = docValue; // Para plusCodeProvided
        } else {
             isComplete = !!docValue; // Para nombres de archivo
        }

        checklistHTML += `<li><i class="fas ${isComplete ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}"></i> ${docKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
        // Añadir enlace para ver si es un archivo y está presente (excepto booleanos)
        if (isComplete && typeof docValue !== 'boolean' && typeof docValue === 'string') {
             checklistHTML += ` (<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(docValue)}" title="Ver ${docValue}">Ver</a>)`;
        } else if (isComplete && docKey === 'articlePhoto' && service.type === 'Empeño') {
             checklistHTML += ` (Ver artículos)`; // Indicar que se ven en la sección de artículos
        }
        checklistHTML += `</li>`;
        if (!isComplete) allDocsComplete = false;
    });
    checklistHTML += '</ul>';
    if(allDocsComplete) checklistHTML += '<p class="text-success"><i class="fas fa-check-double"></i> ¡Docs. completos!</p>';
    else checklistHTML += '<p class="text-warning"><i class="fas fa-exclamation-triangle"></i> Faltan documentos.</p>';

    const attachDocButton = `<button class="btn btn-secondary btn-sm mt-2" data-action="adjuntar-doc" data-id="${service.id}"><i class="fas fa-paperclip"></i> Adjuntar/Actualizar Documento</button>`;

    // HTML Final del Modal
    const detailsHTML = `
        <div class="app-form"> <h4>Detalles del Servicio #${service.id}</h4>
            <div class="input-group"><label>Cliente:</label><input type="text" value="${client.name} (DNI: ${client.dni})" readonly><a href="#" data-action="ver-cliente" data-id="${client.id}" class="btn btn-link btn-sm" style="padding-left: 0; margin-top: 5px;">Ver Perfil Cliente</a></div>
            <div class="input-group"><label>Tipo:</label><input type="text" value="${service.type}" readonly></div>
            <div class="input-group"><label>Monto Otorgado:</label><input type="text" value="${utils.formatCurrency(service.amount)}" readonly></div>
            <div class="input-group"><label>Estado Actual:</label><input type="text" value="${service.status}" readonly></div>
            <div class="input-group"><label>Sucursal:</label><input type="text" value="${service.branch}" readonly></div>
            <div class="input-group"><label>Analista:</label><input type="text" value="${service.analyst}" readonly></div>
            <hr>
            ${itemDetailsHTML}
            <hr>
            <h4><i class="fas fa-file-invoice-dollar"></i> Condiciones Financieras</h4>
            <div class="input-group"><label>N° Cuotas:</label><input type="text" value="${service.numInstallments || 'N/A'}" readonly></div>
            <div class="input-group"><label>Valor Cuota:</label><input type="text" value="${utils.formatCurrency(service.installmentAmount)}" readonly></div>
            <div class="input-group"><label>Total a Pagar:</label><input type="text" value="${utils.formatCurrency(service.totalToPay)}" readonly></div>
            <div class="input-group"><label>Próximo Pago:</label><input type="text" value="${utils.formatDate(service.nextPayment) || 'N/A'}" readonly></div>
            <div class="input-group"><label>Fecha Desembolso:</label><input type="text" value="${utils.formatDate(service.disbursementDate) || 'Pendiente'}" readonly></div>
            <hr>
            ${checklistHTML}
            ${attachDocButton}
        </div>`;
    ui.openModal(`Detalles Servicio #${service.id}`, detailsHTML, false, '', 'large'); // Modal más grande
}


/**
 * Abre un modal para adjuntar un documento a un servicio.
 * (MODIFICADO para manejar nuevos documentos y fotos de artículos)
 */
export function attachDocument(serviceId) {
    console.log(`Abriendo modal para adjuntar documento a servicio ID: ${serviceId}`);
    const service = data.getService(serviceId); if (!service) { alert('Servicio no encontrado.'); return; }
    const requiredDocsForType = REQUIRED_DOCS[service.type] || [];

    // Opciones de documentos (excluir booleanos, añadir opciones para fotos de items si es empeño)
    let docOptionsHTML = requiredDocsForType
        .filter(docKey => typeof service.documents?.[docKey] !== 'boolean' && docKey !== 'articlePhoto' && docKey !== 'articlesCombinedPhoto') // Excluir fotos de artículo aquí
        .map(docKey => {
            const docName = docKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const currentValue = service.documents?.[docKey];
            let displayValue = '(Pendiente)';
            if (currentValue) { displayValue = `(Actual: ${currentValue})`; }
            return `<option value="${docKey}">${docName} ${displayValue}</option>`;
        }).join('');

    // Añadir opciones específicas para Empeño
    if (service.type === 'Empeño') {
        // Opción para foto grupal
        const combinedPhotoValue = service.documents?.articlesCombinedPhoto;
        docOptionsHTML += `<option value="articlesCombinedPhoto">Foto Grupal Artículos ${combinedPhotoValue ? `(Actual: ${combinedPhotoValue})` : '(Pendiente)'}</option>`;
        // Opción para fotos individuales (indicará que el input acepta multiple)
        docOptionsHTML += `<option value="articlePhotosIndividual">Fotos Individuales Artículo(s)</option>`;
        // Opción para factura de artículo (asociarla a un item específico?) - Por ahora, genérica
        // docOptionsHTML += `<option value="itemInvoice">Factura de Artículo</option>`;
    }

    const formHTML = `
        <p>Adjuntar/Actualizar documento para Servicio ID: <strong>${serviceId}</strong> (${service.type})</p>
        <form id="attach-doc-form" class="app-form">
            <div class="input-group">
                <label for="doc-type">Tipo Documento:</label>
                <select id="doc-type" name="docType" required>
                    <option value="">-- Seleccione Tipo --</option>
                    ${docOptionsHTML}
                </select>
            </div>
            <div class="input-group">
                <label for="doc-file">Archivo(s):</label>
                <input type="file" id="doc-file" name="docFile" required>
                <small id="doc-file-hint">Selecciona un archivo.</small>
            </div>
            <div id="attach-doc-error" class="error-message" style="display: none;"></div>
        </form>
    `;

    const handleAttachConfirm = () => {
          const form = document.getElementById('attach-doc-form');
          const errorDiv = document.getElementById('attach-doc-error');
          const docTypeSelect = document.getElementById('doc-type');
          const fileInput = document.getElementById('doc-file');
          if (!form || !errorDiv || !docTypeSelect || !fileInput) return false;
          errorDiv.style.display = 'none';

          const docType = docTypeSelect.value;
          if (!docType) { errorDiv.textContent = 'Selecciona un tipo de documento.'; errorDiv.style.display = 'block'; return false; }
          if (!fileInput.files || fileInput.files.length === 0) { errorDiv.textContent = 'Selecciona al menos un archivo.'; errorDiv.style.display = 'block'; form.reportValidity(); return false; }

          const files = Array.from(fileInput.files);
          const fileNames = files.map(f => f.name);
          let valueToSave;
          let docKeyToUpdate = docType;

          // Manejar caso especial de fotos individuales de artículos
          if (docType === 'articlePhotosIndividual') {
               // ¿Cómo asociamos estas fotos a items específicos aquí? Es complejo.
               // Solución simple: Sobrescribir/Añadir a un array general 'otherPhotos' o similar?
               // O pedir al usuario que las suba desde el formulario de edición del empeño?
               // Por ahora, lo guardaremos en un campo genérico o mostraremos alerta.
               alert("La carga de fotos individuales de artículos se debe hacer preferentemente al crear/editar la solicitud de empeño. Esta carga se simulará pero no se asociará específicamente.");
               // Podríamos guardarlo en documents.miscPhotos = fileNames;
               valueToSave = fileNames; // Guardar array de nombres
               docKeyToUpdate = 'miscItemPhotos'; // Usar clave genérica
          } else if (fileInput.multiple && files.length > 1) {
               // Si se seleccionaron múltiples archivos para un tipo que no lo soporta
                errorDiv.textContent = `Solo puedes subir un archivo para "${docTypeSelect.options[docTypeSelect.selectedIndex].text}".`;
                errorDiv.style.display = 'block'; return false;
          } else {
                // Caso normal: un solo archivo o tipo que sí acepta múltiple (ninguno por ahora)
                valueToSave = fileNames[0];
          }


          try {
               const updatedDocs = { ...(service.documents || {}) };
               updatedDocs[docKeyToUpdate] = valueToSave; // Actualizar o añadir documento

               // Llamar a updateService
               const updatedService = data.updateService(serviceId, { documents: updatedDocs });

               if (updatedService) {
                    console.log(`Documento '${docKeyToUpdate}' actualizado a '${JSON.stringify(valueToSave)}' para servicio ${serviceId}`);
                    alert(`Documento '${docKeyToUpdate}' actualizado/adjuntado.`);
                    ui.closeModal();
                    // Recargar vista si es relevante (Solicitudes, Mis Servicios, Detalles)
                    // if (ui.getCurrentLoadFunction() === loadRequestsView || ui.getCurrentLoadFunction() === loadMyServices) {
                    ui.reloadCurrentView(); // Recargar la vista actual (sea cual sea)
                    // }
                    return true;
               } else {
                    throw new Error("La actualización del servicio falló.");
               }
          } catch (error) {
               console.error("Error al actualizar documento:", error);
               errorDiv.textContent = `Error al guardar: ${error.message}`;
               errorDiv.style.display = 'block'; return false;
          }
    };

    // Abrir modal y añadir lógica para habilitar/deshabilitar 'multiple' en file input
    ui.openModal('Adjuntar/Actualizar Documento', formHTML, true, 'Guardar Documento', 'medium', handleAttachConfirm);

    const docTypeSelectModal = document.getElementById('doc-type');
    const fileInputModal = document.getElementById('doc-file');
    const fileHintModal = document.getElementById('doc-file-hint');
    if(docTypeSelectModal && fileInputModal && fileHintModal) {
         docTypeSelectModal.addEventListener('change', () => {
              const selectedType = docTypeSelectModal.value;
              if (selectedType === 'articlePhotosIndividual') {
                   fileInputModal.multiple = true;
                   fileHintModal.textContent = 'Puedes seleccionar varias fotos para los artículos.';
              } else {
                   fileInputModal.multiple = false;
                   fileHintModal.textContent = 'Selecciona un archivo.';
              }
              fileInputModal.value = null; // Limpiar selección al cambiar tipo
         });
    }
}
