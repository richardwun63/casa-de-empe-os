// js/modules/components/approvals.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';
import { viewServiceDetails } from './serviceManagement.js'; // Importar para ver detalles
// Asegurarse que REQUIRED_DOCS esté disponible si se usa aquí
// import { REQUIRED_DOCS } from './serviceManagement.js'; // O definirlo aquí si es necesario

console.log('Modulo approvals.js cargado.');

// Estados que maneja cada función
const STATUS_PENDING_APPROVAL = ['Pendiente', 'Verificado']; // Manager aprueba estos (Añadido Pendiente)
const STATUS_PENDING_VERIFICATION = ['Pendiente']; // Supervisor verifica estos (solo los nuevos pendientes)
const STATUS_PENDING_DISBURSEMENT = ['Aprobado']; // Manager/Tesorero registra desembolso

// Definir aquí si no se importa
const REQUIRED_DOCS = {
    'Préstamo': ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided'],
    'Empeño': ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'articlePhoto', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided']
};


/**
 * Carga la cola de aprobación para el Gerente General.
 * MODIFICADO: Añadidas columnas de fechas, tipo pago y tasa/%.
 */
export function loadApprovalQueue(contentArea, sectionTitleElement) {
    console.log("Cargando Cola de Aprobación (Gerente)...");
     const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Gerente General') {
        ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
        return;
    }
    sectionTitleElement.textContent = 'Aprobar Servicios Pendientes';

    // Gerente ve los Pendientes (verificados por supervisor) y los Verificados
    const servicesToApprove = data.dummyData.services.filter(s =>
        STATUS_PENDING_APPROVAL.includes(s.status)
    ).sort((a,b) => new Date(a.date) - new Date(b.date)); // Ordenar por fecha más antigua

    // Definir NUEVAS columnas para esta vista
    const columns = [
        { key: 'id', label: 'ID Sol.', numeric: true},
        { key: 'date', label: 'Fec. Solicitud', format: 'date' },
        // Fechas de aprobación y desembolso (serán N/A aquí)
        { key: 'approvalDate', label: 'Fec. Aprobación', format: 'date' },
        { key: 'disbursementDate', label: 'Fec. Desembolso', format: 'date' },
        { key: 'branch', label: 'Sucursal' },
        { key: 'analyst', label: 'Analista' },
        { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'type', label: 'Tipo Serv.' },
        { key: 'paymentType', label: 'Tipo Pago' }, // Nueva columna
        // Tasa o % de Valor
        { key: 'id', label: 'Tasa / % Valor', format: (_, service) => {
            if (service.type === 'Préstamo') {
                return `${service.interestRate ?? 'N/A'}%`;
            } else if (service.type === 'Empeño') {
                return `${service.pawnPercentage ? service.pawnPercentage.toFixed(1) + '%' : 'N/A'}`; // % del valor prestado
            }
            return 'N/A';
          }, center: true },
        { key: 'amount', label: 'Monto Sol./Apr.', format: 'currency', numeric: true },
        { key: 'status', label: 'Estado Actual' } // Pendiente o Verificado
    ];
    const actions = [
        { label: 'Ver Detalles/Docs', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' },
        // Permitir aprobar solo si está Verificado (o si el flujo no usa Verificado)
        { label: 'Aprobar', class: 'btn-success', icon: 'fa-check', actionKey: 'aprobar-servicio', idKey: 'id',
          hideIf: (service) => service.status !== 'Verificado' && service.status !== 'Pendiente' /* Ajustar según flujo */},
        { label: 'Rechazar', class: 'btn-danger', icon: 'fa-times', actionKey: 'rechazar-servicio', idKey: 'id' }
    ];

    contentArea.innerHTML = `
        <h3><i class="fas fa-check-double"></i> Servicios Pendientes de Aprobación Final</h3>
        <p>Revisa los servicios verificados (o pendientes) y toma una decisión.</p>
        ${ui.renderTable(servicesToApprove, columns, actions, {
            defaultMessage: 'No hay servicios pendientes de aprobación.',
            tableId: 'approval-queue-table'
        })}
        <div class="alert alert-info mt-3"><i class="fas fa-info-circle"></i> Ejemplo: Fec. Aprobación y Desembolso aparecerán como 'Fecha inválida' o 'N/A' hasta que se registren esas acciones.</div>
    `;
}

/**
 * Carga la cola de verificación para el Supervisor.
 */
export function loadSupervisorServiceVerification(contentArea, sectionTitleElement) {
    console.log("Cargando Verificación de Servicios (Supervisor)...");
    const currentUser = getCurrentUser();
    // Asegurarse que el supervisor tiene sucursal asignada (de data.js)
    const supervisorBranch = currentUser?.branch;
    if (currentUser?.role !== 'Supervisor' || !supervisorBranch) {
        ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o falta sucursal asignada.');
        return;
    }
    sectionTitleElement.textContent = `Verificar Servicios (${supervisorBranch})`;

    // Supervisor ve los que están 'Pendiente' en SU sucursal
    const servicesToVerify = data.dummyData.services.filter(s =>
        STATUS_PENDING_VERIFICATION.includes(s.status) &&
        s.branch === supervisorBranch // Filtrar por la sucursal del supervisor
    ).sort((a,b) => new Date(a.date) - new Date(b.date));

    const columns = [
        { key: 'id', label: 'ID Sol.' }, { key: 'date', label: 'Fec. Sol.', format: 'date' },
        // { key: 'branch', label: 'Sucursal' }, // Ya filtrado
        { key: 'analyst', label: 'Analista' },
        { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'type', label: 'Tipo' },
        { key: 'amount', label: 'Monto Sol.', format: 'currency', numeric: true },
        // Columna rápida de estado documental
         { key: 'id', label: 'Docs.', format: (_, service) => {
             const required = REQUIRED_DOCS[service.type] || [];
             const missing = required.filter(docKey => !service.documents?.[docKey]);
             return missing.length === 0
                  ? '<span class="text-success" title="Completos"><i class="fas fa-check-circle"></i></span>'
                  : `<span class="text-danger" title="Faltan ${missing.length} doc(s)"><i class="fas fa-times-circle"></i></span>`;
            }, center: true
         }
    ];
    const actions = [
         { label: 'Verificar/Adjuntar Docs', class: 'btn-warning', icon: 'fa-file-signature', actionKey: 'ver-detalles-servicio', idKey: 'id' }, // Reutilizar modal de detalles
         { label: 'Marcar Verificado', class: 'btn-success', icon: 'fa-check', actionKey: 'verificar-listo', idKey: 'id' } // Nueva acción para marcar
         // Se podría añadir botón de rechazo/observación aquí también
    ];

    contentArea.innerHTML = `
        <h3><i class="fas fa-file-signature"></i> Servicios Pendientes de Verificación (${supervisorBranch})</h3>
        <p>Revisa la documentación y marca como verificado para enviar a aprobación final.</p>
        ${ui.renderTable(servicesToVerify, columns, actions, {
            defaultMessage: 'No hay servicios pendientes de verificación en esta sucursal.',
            tableId: 'verification-queue-table'
        })}
    `;
}


/**
 * Carga la cola de registro de desembolsos.
 */
export function loadDisbursementRegistration(contentArea, sectionTitleElement) {
    console.log("Cargando Registro de Desembolsos...");
     const currentUser = getCurrentUser();
    if (!['Gerente General', 'Tesorería'].includes(currentUser?.role)) {
        ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
        return;
    }
    // Si es tesorero, filtrar por su sucursal
    const filterBranch = currentUser.role === 'Tesorería' ? currentUser.branch : null;
     if (currentUser.role === 'Tesorería' && !filterBranch) {
          ui.showError(contentArea, sectionTitleElement, 'Error: Tesorero sin sucursal asignada.');
          return;
     }

    const title = `Registrar Desembolsos ${filterBranch ? `(${filterBranch})` : '(General)'}`;
    sectionTitleElement.textContent = title;

    const servicesToDisburse = data.dummyData.services.filter(s =>
        STATUS_PENDING_DISBURSEMENT.includes(s.status) &&
        (!filterBranch || s.branch === filterBranch) // Aplicar filtro de sucursal si es Tesorero
    ).sort((a,b) => (a.approvalDate || a.date) - (b.approvalDate || b.date)); // Ordenar por fecha aprobación (o solicitud si no hay)

    const columns = [
        { key: 'id', label: 'ID Serv.' },
        { key: 'approvalDate', label: 'Fec. Aprobación', format: 'date' }, // Usar nueva fecha
        { key: 'branch', label: 'Sucursal' }, { key: 'analyst', label: 'Analista' },
        { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'type', label: 'Tipo' },
        { key: 'amount', label: 'Monto Aprobado', format: 'currency', numeric: true }
    ];
    const actions = [
        { label: 'Registrar Desembolso', class: 'btn-primary', icon: 'fa-receipt', actionKey: 'registrar-desembolso', idKey: 'id' }
    ];

    contentArea.innerHTML = `
        <h3><i class="fas fa-money-bill-wave"></i> Servicios Aprobados Pendientes de Desembolso ${filterBranch ? `(${filterBranch})` : ''}</h3>
        ${ui.renderTable(servicesToDisburse, columns, actions, {
            defaultMessage: 'No hay servicios aprobados pendientes de desembolso' + (filterBranch ? ' en esta sucursal.' : '.'),
            tableId: 'disbursement-queue-table'
        })}
    `;
}

/**
 * Aprueba un servicio cambiando su estado y registrando fecha.
 */
export function approveService(serviceId) {
    console.log(`Aprobando servicio ${serviceId}...`);
    const service = data.getService(serviceId);
    if (!service || !STATUS_PENDING_APPROVAL.includes(service.status)) {
         alert(`Error: Servicio ${serviceId} no encontrado o no está en estado ${STATUS_PENDING_APPROVAL.join('/')}.`);
         return;
    }

     // Validar si tiene todos los documentos (opcional pero recomendado)
     // const requiredDocs = REQUIRED_DOCS[service.type] || [];
     // const missingDocs = requiredDocs.filter(docKey => !service.documents?.[docKey]);
     // if (missingDocs.length > 0) {
     //     alert(`No se puede aprobar. Faltan documentos requeridos:\n- ${missingDocs.join('\n- ')}`);
     //     return;
     // }

    if (confirm(`¿Está seguro de APROBAR el servicio #${serviceId} para ${data.getClient(service.clientId)?.name ?? 'Cliente Desconocido'} por ${utils.formatCurrency(service.amount)}?`)) {
        try {
             // Obtener fecha actual para la aprobación
             const approvalDate = new Date().toISOString().split('T')[0];
             const updatedService = data.updateService(serviceId, {
                  status: 'Aprobado',
                  approvalDate: approvalDate // Registrar fecha de aprobación
             });
            if (updatedService) {
                 alert(`Servicio #${serviceId} APROBADO exitosamente el ${utils.formatDate(approvalDate)}.`);
                 ui.reloadCurrentView(); // Recargar la cola de aprobación
            } else {
                 alert(`Error: No se pudo actualizar el servicio ${serviceId}.`);
            }
        } catch(error) {
             console.error("Error aprobando servicio:", error);
             alert(`Error inesperado al aprobar: ${error.message}`);
        }
    }
}

/**
 * Rechaza un servicio cambiando su estado y opcionalmente añadiendo motivo.
 * (Sin cambios respecto a Parte 1)
 */
export function rejectService(serviceId) { /* ... (Código de Parte 1 sin cambios) ... */
    console.log(`Rechazando servicio ${serviceId}...`); 
    const service = data.getService(serviceId); if (!service || !STATUS_PENDING_APPROVAL.includes(service.status)) { alert("Servicio no encontrado o no está pendiente."); return; } const reason = prompt(`Ingrese el motivo del rechazo para el servicio #${serviceId} (opcional):`); if (reason !== null) { if (confirm(`¿Está seguro de RECHAZAR el servicio #${serviceId} para ${data.getClient(service.clientId)?.name ?? 'Cliente Desconocido'}?\nMotivo: ${reason || '(Sin motivo)'}`)) { try { const updatedService = data.updateService(serviceId, { status: 'Rechazado', rejectionReason: reason || undefined }); if (updatedService) { alert(`Servicio #${serviceId} RECHAZADO exitosamente.`); ui.reloadCurrentView(); } else { alert(`Error: No se pudo actualizar el servicio ${serviceId}.`); } } catch(error) { console.error("Error rechazando servicio:", error); alert(`Error inesperado al rechazar: ${error.message}`); } } } else { console.log("Rechazo cancelado por el usuario."); }
}

/**
 * Abre un modal para registrar la fecha y método de desembolso.
 */
export function registerDisbursement(serviceId) {
    console.log(`Abriendo modal para registrar desembolso ${serviceId}...`);
    const service = data.getService(serviceId);
    if (!service || service.status !== 'Aprobado') {
        alert("Error: Servicio no encontrado o no está en estado 'Aprobado'.");
        return;
    }
    const client = data.getClient(service.clientId);
    const today = new Date().toISOString().split('T')[0];
    const formHTML = `
        <form id="disbursement-form">
            <p>Registrando desembolso para Servicio #${serviceId}</p>
            <p>Cliente: <strong>${client?.name ?? 'N/A'}</strong></p>
            <p>Monto Aprobado: <strong>${utils.formatCurrency(service.amount)}</strong></p>
            <hr>
            <div class="input-group">
                <label for="disbursement-date">Fecha de Desembolso:</label>
                <input type="date" id="disbursement-date" name="disbursementDate" value="${today}" required>
            </div>
            <div class="input-group">
                <label for="disbursement-method">Método de Desembolso:</label>
                <select id="disbursement-method" name="disbursementMethod" required>
                    <option value="">-- Seleccione --</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Cheque">Cheque</option>
                </select>
            </div>
            <div class="input-group">
                <label for="disbursement-voucher">Adjuntar Voucher/Constancia (Opcional):</label>
                <input type="file" id="disbursement-voucher" name="disbursementVoucher">
                <small>Se simulará el guardado del nombre.</small>
            </div>
            <div id="disbursement-error" class="error-message" style="display: none;"></div>
        </form>
    `;
    const handleConfirm = () => {
        const form = document.getElementById('disbursement-form');
        const errorDiv = document.getElementById('disbursement-error');
        if (!form || !errorDiv) return false;
        errorDiv.style.display = 'none';
        if (!form.checkValidity()) {
            errorDiv.textContent = 'Completa la fecha y método de desembolso.';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return false;
        }
        const disbursementDate = form.querySelector('#disbursement-date').value;
        const disbursementMethod = form.querySelector('#disbursement-method').value;
        const voucherFile = form.querySelector('#disbursement-voucher').files[0];
        const voucherFileName = voucherFile?.name || null;
        const nextPaymentDate = new Date(disbursementDate + 'T00:00:00Z');
        nextPaymentDate.setUTCMonth(nextPaymentDate.getUTCMonth() + 1);
        const nextPaymentString = nextPaymentDate.toISOString().split('T')[0];

        // Refuerzo: Inicializar plan de pagos si no existe
        let updatedFields = {
            status: 'Desembolsado',
            disbursementDate: disbursementDate,
            disbursementMethod: disbursementMethod,
            nextPayment: nextPaymentString,
            documents: { ...(service.documents || {}), disbursementVoucher: voucherFileName }
        };
        if (!service.paymentPlan || !Array.isArray(service.paymentPlan) || service.paymentPlan.length === 0) {
            // Generar plan de pagos básico
            const plan = [];
            const num = service.numInstallments || 1;
            const cuota = service.installmentAmount || (service.totalToPay || service.amount || 0) / num;
            let fecha = new Date(disbursementDate + 'T00:00:00Z');
            for (let i = 0; i < num; i++) {
                const dueDate = new Date(fecha);
                dueDate.setUTCMonth(fecha.getUTCMonth() + i + 1);
                plan.push({
                    dueDate: dueDate.toISOString().split('T')[0],
                    amount: cuota,
                    paid: false
                });
            }
            updatedFields.paymentPlan = plan;
        }
        try {
            const updatedService = data.updateService(serviceId, updatedFields);
            if (updatedService) {
                alert(`Desembolso para servicio #${serviceId} registrado exitosamente.\nPróximo pago calculado: ${utils.formatDate(nextPaymentString)}`);
                ui.closeModal();
                ui.reloadCurrentView();
                return true;
            } else {
                errorDiv.textContent = 'Error al actualizar el servicio.';
                errorDiv.style.display = 'block';
                return false;
            }
        } catch(error) {
            console.error("Error registrando desembolso:", error);
            errorDiv.textContent = `Error inesperado: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    ui.openModal('Registrar Desembolso', formHTML, true, 'Confirmar Desembolso', 'medium', handleConfirm);
}

/**
 * Muestra un modal para que el supervisor verifique los documentos de un servicio.
 * (Sin cambios respecto a Parte 1)
 */
export function verifyDocuments(serviceId) { /* ... (Código de Parte 1 sin cambios) ... */
      console.log(`Abriendo modal para verificar documentos servicio ${serviceId}...`); viewServiceDetails(serviceId);
}

/**
 * Marca un servicio como Verificado por el Supervisor.
 * (Renombrada de notifyReadyForApproval a verifyService)
 */
export function verifyService(serviceId) { // Renombrada la acción de 'notificar-listo' a 'verificar-listo'
     console.log(`Marcando como Verificado servicio ${serviceId}...`);
     const service = data.getService(serviceId);
     if (!service || !STATUS_PENDING_VERIFICATION.includes(service.status)) {
          alert("Error: Servicio no encontrado o no está pendiente de verificación inicial.");
          return;
     }

     // Validar si tiene todos los documentos (opcional pero recomendado)
     const requiredDocs = REQUIRED_DOCS[service.type] || [];
     // const missingDocs = requiredDocs.filter(docKey => !service.documents?.[docKey]); // Simplificado, viewServiceDetails es para la revisión visual
     // if (missingDocs.length > 0) {
     //     alert(`No se puede marcar como verificado. Faltan documentos requeridos:\n- ${missingDocs.join('\n- ')}`);
     //     viewServiceDetails(serviceId); // Abrir detalles para que vea qué falta
     //     return;
     // }

     if (confirm(`¿Marcar servicio #${serviceId} como VERIFICADO y listo para aprobación final del Gerente?`)) {
         try {
             // Cambiar estado a 'Verificado'
             const updatedService = data.updateService(serviceId, { status: 'Verificado' });
             if (updatedService) {
                 alert(`Servicio #${serviceId} marcado como Verificado.`);
                 ui.reloadCurrentView(); // Recargar la cola de verificación del supervisor
             } else {
                 alert("Error al actualizar el estado del servicio.");
             }
         } catch(error) {
             console.error("Error marcando como verificado:", error);
             alert(`Error inesperado: ${error.message}`);
         }
     }
}