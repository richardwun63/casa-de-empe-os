// js/modules/components/reports.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js'; // Importar para verificar rol

console.log('Modulo reports.js cargado.');

// --- Reporte de Gastos ---

let currentFilteredExpenses = []; // Variable para guardar los gastos filtrados actualmente
let expenseReportColumns = []; // Variable para guardar las columnas del reporte actual

/**
 * Carga la vista del reporte de gastos detallado.
 * @param {HTMLElement} contentArea - Área para renderizar.
 * @param {HTMLElement} sectionTitleElement - Elemento para el título.
 * @param {object} options - Opciones como { isAdminView: boolean, branchName: string|null }.
 */
export function loadExpenseReport(contentArea, sectionTitleElement, options = {}) {
    const { isAdminView = false, branchName = null } = options;
    console.log(`Cargando Reporte de Gastos. isAdmin: ${isAdminView}, branchFilter: ${branchName}`);

    const baseTitle = 'Reporte Detallado de Gastos';
    sectionTitleElement.textContent = branchName ? `${baseTitle} - ${branchName}` : baseTitle;

    // Definir columnas (guardarlas globalmente en el módulo para exportar)
    expenseReportColumns = [
        { key: 'id', label: 'ID' },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'branch', label: 'Sucursal' },
        { key: 'analyst', label: 'Analista', format: (v)=> v ?? 'Sucursal' },
        { key: 'type', label: 'Tipo', format: (v) => v || 'N/A' }, // Mostrar 'N/A' si está vacío
        { key: 'description', label: 'Descripción' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'voucherFile', label: 'Voucher', format: 'fileLink'} // Usar formato fileLink
    ];

    // --- Lógica de Filtros (Aplicación Automática) ---
    const applyExpenseFilters = () => {
        console.log("Aplicando filtros de gastos...");
        // Asegurarse de que contentArea aún está en el DOM y contiene los elementos
        const branchElement = contentArea.querySelector('#filter-exp-branch');
        const analystElement = contentArea.querySelector('#filter-exp-analyst');
        const typeElement = contentArea.querySelector('#filter-exp-type');
        const startDateElement = contentArea.querySelector('#filter-exp-date-start');
        const endDateElement = contentArea.querySelector('#filter-exp-date-end');

        // Si los elementos no existen (p.ej. usuario navegó a otra sección), no hacer nada
        if (!branchElement || !analystElement || !typeElement || !startDateElement || !endDateElement) {
             console.warn("Elementos de filtro no encontrados. Abortando applyExpenseFilters.");
             return;
        }

        // Obtener valores de filtros, considerando si la vista es fija por sucursal
        const effectiveBranch = branchName || (branchElement ? branchElement.value : null);
        let analyst = analystElement.value;
        const type = typeElement.value;
        const startDate = startDateElement.value;
        const endDate = endDateElement.value;

        console.log(`Filtros aplicados: Sucursal=${effectiveBranch || 'Todas'}, Analista=${analyst || 'Todos'}, Tipo=${type || 'Todos'}, Desde=${startDate || 'Inicio'}, Hasta=${endDate || 'Hoy'}`);

        // Manejar caso especial "Sucursal (Sin Analista)"
        // Ajuste: en getFilteredExpenses, 'null' filtra analyst === null, '' filtra analyst !== null, undefined/sin filtro = todos
        let filterAnalystValue = undefined;
        if (analyst === 'null') {
            filterAnalystValue = null;
        } else if (analyst) {
            filterAnalystValue = analyst;
        } // Si analyst es '', se queda como undefined aquí para que getFilteredExpenses lo trate como 'cualquiera'

        // Usar la función centralizada de data.js que considera los filtros globales (pero aquí aplicamos filtros locales)
        // TODO: Refactorizar para usar filtros globales o pasar filtros locales a getFilteredData
        currentFilteredExpenses = data.dummyData.expenses.filter(e =>
             (!effectiveBranch || e.branch === effectiveBranch) &&
             (filterAnalystValue === undefined || e.analyst === filterAnalystValue) &&
             (!type || e.type === type) &&
             (!startDate || e.date >= startDate) &&
             (!endDate || e.date <= endDate) &&
             e.type // Solo incluir gastos con 'type' definido
        );

        console.log(`${currentFilteredExpenses.length} gastos encontrados después de filtrar.`);
        renderExpenseReport(); // Volver a renderizar tabla y total
    };


    // --- Renderizado Inicial y Actualización ---
    const renderExpenseReport = () => {
        console.log("Renderizando tabla de gastos y total...");
        // Usar las columnas definidas globalmente para este reporte
        const tableHTML = ui.renderTable(currentFilteredExpenses, expenseReportColumns, [], {
            defaultMessage: 'No se encontraron gastos con los filtros aplicados.',
            tableId: 'expense-report-table' // ID específico para la tabla
        });

        // Calcular total de gastos filtrados
        const totalGastos = currentFilteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalHTML = `
            <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ccc;">
                <strong>Total Gastos Filtrados: ${utils.formatCurrency(totalGastos)}</strong>
            </div>
        `;

        // Actualizar contenedor de tabla y total
        const tableContainer = contentArea.querySelector('#expense-report-table-container');
        const totalContainer = contentArea.querySelector('#expense-report-total-container');
        if (tableContainer) {
             tableContainer.innerHTML = tableHTML;
        } else {
             console.warn("Contenedor de tabla #expense-report-table-container no encontrado para renderizar.");
        }
        if (totalContainer) {
            totalContainer.innerHTML = totalHTML;
        } else {
             console.warn("Contenedor de total #expense-report-total-container no encontrado para renderizar.");
        }
    };

    // --- HTML de Filtros ---
    // Opciones para selects
    const uniqueExpenseTypes = [...new Set(data.dummyData.expenses.map(e => e.type))].filter(t => t).sort(); // Filtrar tipos no definidos
    const expenseTypeOptions = uniqueExpenseTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    const allAnalysts = data.dummyData.users.filter(u => u.role === 'Analista');
    // Filtrar analistas por sucursal si la vista es específica
    const relevantAnalysts = branchName ? allAnalysts.filter(a => a.branch === branchName) : allAnalysts;
    const analystOptions = relevantAnalysts.map(a => `<option value="${a.username}">${a.username} (${a.branch || 'Sin Suc.'})</option>`).join('');

    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => `<option value="${b.name}" ${branchName === b.name ? 'selected' : ''}>${b.name}</option>`).join('');
    // Mostrar select de sucursal solo si isAdminView y no hay branchName fijo, o si no es adminView
    const showBranchFilter = (isAdminView && !branchName) || !isAdminView;
    const branchSelectHTML = showBranchFilter ? `
        <div class="filter-group">
            <label for="filter-exp-branch">Sucursal:</label>
            <select id="filter-exp-branch" ${branchName ? 'disabled' : ''}>
                ${branchName ? '' : '<option value="">Todas</option>'}
                ${branchOptions}
            </select>
        </div>` : `<input type="hidden" id="filter-exp-branch" value="${branchName || ''}">`; // Campo oculto si no se muestra

    // HTML Completo
    contentArea.innerHTML = `
        <div class="filter-bar">
            ${branchSelectHTML}
            <div class="filter-group">
                <label for="filter-exp-analyst">Analista/Origen:</label>
                <select id="filter-exp-analyst">
                    <option value="">Todos</option>
                    <option value="null">Sucursal (Sin Analista)</option>
                    ${analystOptions}
                </select>
            </div>
            <div class="filter-group">
                <label for="filter-exp-type">Tipo Gasto:</label>
                <select id="filter-exp-type">
                    <option value="">Todos</option>
                    ${expenseTypeOptions}
                </select>
            </div>
            <div class="filter-group">
                <label for="filter-exp-date-start">Desde:</label>
                <input type="date" id="filter-exp-date-start">
            </div>
            <div class="filter-group">
                <label for="filter-exp-date-end">Hasta:</label>
                <input type="date" id="filter-exp-date-end" value="${data.HOY_SIMULADO}">
            </div>
            <button id="clear-exp-filter-btn" class="btn btn-light btn-sm"><i class="fas fa-times"></i> Limpiar</button>
            <button id="export-exp-btn" class="btn btn-success btn-sm" style="margin-left: auto;"><i class="fas fa-file-excel"></i> Exportar</button>
        </div>

        <h3><i class="fas fa-search-dollar"></i> Gastos Registrados ${branchName ? `(${branchName})` : ''}</h3>
        <div id="expense-report-table-container">
             <p>Cargando gastos...</p> </div>
        <div id="expense-report-total-container">
             </div>
    `;

    // --- Event Listeners (Aplicación Automática) ---
    const filterControls = contentArea.querySelectorAll('#filter-exp-branch, #filter-exp-analyst, #filter-exp-type, #filter-exp-date-start, #filter-exp-date-end');
    filterControls.forEach(control => {
        control.addEventListener('change', applyExpenseFilters);
    });

    contentArea.querySelector('#clear-exp-filter-btn')?.addEventListener('click', () => {
        console.log("Limpiando filtros de gastos...");
        const branchSelect = contentArea.querySelector('#filter-exp-branch');
        if (branchSelect && !(branchSelect.disabled)) branchSelect.value = ''; // Limpiar solo si no está deshabilitado
        const analystSelect = contentArea.querySelector('#filter-exp-analyst');
        if (analystSelect) analystSelect.value = '';
        const typeSelect = contentArea.querySelector('#filter-exp-type');
        if (typeSelect) typeSelect.value = '';
        const startDateInput = contentArea.querySelector('#filter-exp-date-start');
        if (startDateInput) startDateInput.value = '';
        const endDateInput = contentArea.querySelector('#filter-exp-date-end');
        if (endDateInput) endDateInput.value = data.HOY_SIMULADO; // Resetear a hoy

        // Volver a filtrar (aplicará los valores vacíos)
        applyExpenseFilters();
    });
    contentArea.querySelector('#export-exp-btn')?.addEventListener('click', () => {
        console.log("Botón Exportar presionado.");
        // Asegurarse de usar las columnas correctas para exportar
        exportExpensesToCSV(currentFilteredExpenses, expenseReportColumns, `Reporte_Gastos_${branchName || 'General'}_${data.HOY_SIMULADO}.csv`);
    });

    // Filtrado y renderizado inicial
    applyExpenseFilters();
    console.log('Vista Reporte de Gastos cargada y listeners configurados.');
}


/**
 * Genera un archivo CSV a partir de los datos y columnas y lo descarga.
 * @param {Array<object>} dataToExport - Los datos a exportar.
 * @param {Array<object>} columnsDefinition - La definición de columnas.
 * @param {string} filename - Nombre del archivo a descargar.
 */
function exportGenericToCSV(dataToExport, columnsDefinition, filename) {
    console.log(`Iniciando exportación genérica a CSV: ${filename}`);
    if (!dataToExport || dataToExport.length === 0) {
        alert("No hay datos para exportar.");
        console.warn("Intento de exportar CSV sin datos.");
        return;
    }
    if (!columnsDefinition || columnsDefinition.length === 0) {
         console.error("No se proporcionó definición de columnas para exportar CSV.");
         alert("Error interno: No se pudo generar el archivo (faltan columnas).");
         return;
    }

    // 1. Crear cabeceras CSV (usando col.label)
    const headers = columnsDefinition.map(col => utils.escapeCSVValue(col.label || col.key)).join(',');

    // 2. Crear filas CSV
    const rows = dataToExport.map(item => {
        return columnsDefinition.map(col => {
            // Obtener valor usando la clave (puede ser anidada)
            let cellValue = col.key.split('.').reduce((o, k) => (o && o[k] !== undefined && o[k] !== null) ? o[k] : null, item);
            let formattedValue = '';

            // Aplicar formato si existe
            if (typeof col.format === 'function') {
                 try { formattedValue = col.format(cellValue, item); } catch (e) { formattedValue = 'Error Formato'; }
            } else if (col.format === 'date') { formattedValue = utils.formatDate(cellValue); }
            else if (col.format === 'currency') { formattedValue = String(cellValue ?? 0); } // Exportar número simple
            else if (col.format === 'fileLink') { formattedValue = cellValue ?? ''; }
            else if (col.format === 'paymentStatus') {
                 // Para CSV, exportar el texto del estado, no el HTML
                 const statusInfo = data.dummyData.kpis.getClientPaymentStatusInfo(item.clientId ?? item.id); // Asumiendo clientId o id
                 formattedValue = statusInfo?.statusText || 'N/A';
            }
            else { formattedValue = (cellValue !== null && cellValue !== undefined) ? String(cellValue) : ''; }

            // Limpiar HTML si el formateador lo generó
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = formattedValue;
            formattedValue = tempDiv.textContent || tempDiv.innerText || '';

            return utils.escapeCSVValue(formattedValue);
        }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("Descarga CSV iniciada.");
    } else {
        alert("Tu navegador no soporta la descarga directa.");
    }
}

// Wrapper específico para exportar gastos
function exportExpensesToCSV(expensesData, columns, filename) {
    exportGenericToCSV(expensesData, columns, filename);
}


// --- Reporte de Servicios ---

let currentFilteredServices = []; // Guardar servicios filtrados
let serviceReportColumns = []; // Guardar columnas actuales

/**
 * Carga la vista del reporte general de servicios. (MODIFICADO para Dueño/Gerente)
 * @param {HTMLElement} contentArea - Área para renderizar.
 * @param {HTMLElement} sectionTitleElement - Elemento para el título.
 * @param {object} options - Opciones adicionales.
 */
export function loadServicesReport(contentArea, sectionTitleElement, options = {}) {
    const currentUser = getCurrentUser();
    const isOwnerOrManager = ['Dueño', 'Gerente General'].includes(currentUser?.role);
    console.log(`Cargando Reporte Servicios. Rol: ${currentUser?.role}. Es Dueño/Gerente: ${isOwnerOrManager}`);

    // Título base
    sectionTitleElement.textContent = 'Reporte General de Servicios';

    // --- Definición de Columnas ---
    if (isOwnerOrManager) {
        // Usar columnas del "Reporte Diario" para Dueño/Gerente
        sectionTitleElement.textContent = 'Reporte Diario General'; // Cambiar título
        serviceReportColumns = [
            { key: 'rowNumber', label: 'N°', numeric: true },
            { key: 'id', label: 'Crédito' },
            { key: 'clientId', label: 'Apellidos y Nombres', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
            { key: 'date', label: 'Ingreso de solicitud', format: 'date' },
            { key: 'disbursementDate', label: 'Desembolso', format: 'date' },
            { key: 'nextPayment', label: 'Vencimiento', format: 'date' },
            { key: 'lastPaymentDate', label: 'Última fecha de pago', format: 'date' },
            { key: 'clientId', label: 'Atraso V.', format: (cid) => data.getClientPaymentStatusInfo(cid)?.daysOverdue ?? 'N/A', numeric: true, center: true },
            // NUEVO: Atraso Cuotas reales
            { key: 'id', label: 'Atraso Cuotas', format: (id, s) => {
                if (!s.paymentPlan) return 'N/A';
                const vencidas = s.paymentPlan.filter(c => !c.paid && new Date(c.dueDate) < new Date(data.HOY_SIMULADO));
                return vencidas.length;
            }, numeric: true, center: true },
            { key: 'lastPaymentDate', label: 'Último abono', format: 'date' },
            { key: 'type', label: 'Tipo de servicio' },
            { key: 'paymentType', label: 'Tipo de pago' },
            { key: 'amount', label: 'Monto desembolsado', format: 'currency', numeric: true },
            { key: 'id', label: 'Tasa/ % Valor', format: (_, service) => service.type === 'Préstamo' ? `${service.interestRate || 'N/A'}%` : `${service.pawnPercentage || 'N/A'}%`, numeric: true, center: true },
            { key: 'totalInterest', label: 'Interés', format: 'currency', numeric: true },
            { key: 'numInstallments', label: 'N° cuotas', numeric: true, center: true },
            { key: 'installmentAmount', label: 'Valor de la cuota', format: 'currency', numeric: true },
            // NUEVO: Cuotas abonadas reales
            { key: 'id', label: 'Cuotas abonadas', format: (id, s) => s.paymentPlan ? s.paymentPlan.filter(c => c.paid).length : 'N/A', numeric: true, center: true },
            // NUEVO: Cuotas pendientes reales
            { key: 'id', label: 'Cuotas pendientes', format: (id, s) => s.paymentPlan ? s.paymentPlan.filter(c => !c.paid).length : 'N/A', numeric: true, center: true },
            // NUEVO: Monto pagado real
            { key: 'id', label: 'Monto pagado', format: (id, s) => s.payments ? s.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0, formatExport: (id, s) => s.payments ? s.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0, formatCSV: true, numeric: true },
            { key: 'totalToPay', label: 'Monto total a pagar', format: 'currency', numeric: true },
            // NUEVO: Saldo real
            { key: 'id', label: 'Saldo', format: (id, s) => {
                const pagado = s.payments ? s.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0;
                return utils.formatCurrency((s.totalToPay || s.amount || 0) - pagado);
            }, numeric: true },
        ];
    } else {
        // Columnas originales para otros roles (o un reporte diferente si aplica)
        serviceReportColumns = [
            { key: 'id', label: 'ID Serv.' },
            { key: 'type', label: 'Tipo' },
            { key: 'clientId', label: 'Cliente', format: (clientId) => { const client = data.getClient(clientId); return client ? `<a href="#" data-action="ver-cliente" data-id="${clientId}">${client.name}</a>` : 'N/A'; } },
            { key: 'amount', label: 'Monto/Valor', format: 'currency', numeric: true },
            { key: 'branch', label: 'Sucursal' },
            { key: 'analyst', label: 'Analista' },
            { key: 'date', label: 'Fec. Reg.', format: 'date' },
            { key: 'nextPayment', label: 'Próx. Pago', format: 'date' },
            { key: 'status', label: 'Estado Serv.' },
            { key: 'clientId', label: 'Estado Pago Cli.', format: 'paymentStatus'}
        ];
    }

    // Filtrar servicios desembolsados (Pagado, Por Cobrar, Moroso, Desembolsado)
    const desembolsados = data.dummyData.services.filter(s => ['Pagado', 'Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status));
    // Filtrar servicios en proceso de aprobación (Pendiente, Aprobado, Rechazado)
    const enProceso = data.dummyData.services.filter(s => ['Pendiente', 'Aprobado', 'Rechazado'].includes(s.status));

    // Sección de servicios desembolsados
    let desembolsadosHTML = `<h4>Clientes con Crédito/Empeño Desembolsado</h4>`;
    desembolsadosHTML += ui.renderTable(desembolsados, [
        { key: 'id', label: 'ID' },
        { key: 'type', label: 'Tipo' },
        { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'status', label: 'Estado' }
    ], [
        { label: 'Ver Detalles', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' }
    ], {
        defaultMessage: 'No hay clientes con crédito o empeño desembolsado.',
        tableId: 'reporte-diario-desembolsados'
    });

    // Sección de servicios en proceso de aprobación
    let enProcesoHTML = `<h4>Clientes en Proceso de Aprobación</h4>`;
    enProcesoHTML += ui.renderTable(enProceso, [
        { key: 'id', label: 'ID' },
        { key: 'type', label: 'Tipo' },
        { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'status', label: 'Estado' },
        { key: 'id', label: 'Documentos', format: (id) => {
            const s = data.getService(id);
            if (!s) return 'N/A';
            const req = s.type === 'Empeño' ? ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'articlePhoto', 'articlesCombinedPhoto', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided'] : ['facadePhoto', 'dniPhoto', 'supplyPhotoUrl', 'promissoryNote', 'declaration', 'commitment', 'plusCodeProvided'];
            return req.map(doc => {
                const val = s.documents?.[doc];
                return `<span class="badge badge-${val ? 'success' : 'danger'}" title="${doc}">${doc.replace(/([A-Z])/g, ' $1')}</span>`;
            }).join(' ');
        }}
    ], [
        { label: 'Ver Detalles', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' }
    ], {
        defaultMessage: 'No hay clientes en proceso de aprobación.',
        tableId: 'reporte-diario-enproceso'
    });

    // Tabs para navegar entre secciones
    contentArea.innerHTML = `
        <div class="tabs">
            <button class="tab-btn active" data-tab="desembolsados">Desembolsados</button>
            <button class="tab-btn" data-tab="enproceso">En Proceso de Aprobación</button>
        </div>
        <div id="tab-desembolsados" class="tab-content active">${desembolsadosHTML}</div>
        <div id="tab-enproceso" class="tab-content">${enProcesoHTML}</div>
    `;
    // Listeners para tabs
    const tabBtns = contentArea.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            contentArea.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            contentArea.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
}


/**
 * Calcula el conteo de clientes por estado de pago basado en una lista de servicios filtrados.
 * @param {Array<object>} filteredServices - Lista de servicios ya filtrados.
 * @returns {object} - Objeto con el conteo por estado (e.g., {'perdida': 5, 'normal': 20,...}).
 */
function calculateClientStatusCounts(filteredServices) {
    console.log(`Calculando conteos de estado de pago para ${filteredServices.length} servicios.`);
    // Usar los nuevos estados definidos
    const counts = { 'normal': 0, 'cpp': 0, 'deficiente': 0, 'dudoso': 0, 'perdida': 0, 'sin-calificacion': 0, 'al-dia': 0, 'error': 0 };
    const processedClientIds = new Set();

    const clientIdsInFilter = [...new Set(filteredServices.map(s => s.clientId).filter(id => id))]; // Clientes únicos en el filtro

    clientIdsInFilter.forEach(clientId => {
        if (processedClientIds.has(clientId)) return; // Evitar doble conteo

        const paymentInfo = data.getClientPaymentStatusInfo(clientId); // Usar la función actualizada
        if (paymentInfo && counts.hasOwnProperty(paymentInfo.status)) {
             // Incrementar el contador para el estado devuelto por getClientPaymentStatusInfo
             counts[paymentInfo.status]++;
        } else {
             console.warn(`Estado de pago inválido o no encontrado para cliente ${clientId}:`, paymentInfo);
             counts['error']++;
        }
        processedClientIds.add(clientId);
    });

    console.log("Conteos de estado de pago calculados:", counts);
    return counts;
}


// --- Reporte Supervisor Collection ---
/**
 * Carga la vista de cobranza para el supervisor.
 * @param {HTMLElement} contentArea - Área para renderizar.
 * @param {HTMLElement} sectionTitleElement - Elemento para el título.
 */
 export function loadSupervisorCollection(contentArea, sectionTitleElement) {
    console.log("Cargando vista Supervisor Cobranza...");
    const currentUser = getCurrentUser();
    // Asumiendo que el supervisor TIENE una sucursal asignada
    const supervisorBranch = currentUser?.branch;
    if (currentUser?.role !== 'Supervisor' || !supervisorBranch) {
         ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o falta sucursal asignada.');
         return;
    }

    sectionTitleElement.textContent = `Clientes por Cobrar (${supervisorBranch})`;

    // Filtrar servicios por cobrar/morosos DE LA SUCURSAL del supervisor
    const servicesToCollect = data.dummyData.services.filter(s =>
         s.branch === supervisorBranch &&
         ['Por Cobrar', 'Moroso'].includes(s.status) // Estados relevantes para cobranza
    );

    // Pre-procesar datos para añadir información del cliente directamente para la tabla
    const dataForTable = servicesToCollect.map(service => {
        const client = data.getClient(service.clientId);
        // Obtener estado de pago usando la función actualizada
        const paymentStatusInfo = data.getClientPaymentStatusInfo(service.clientId);
        return {
            ...service, // Copiar datos del servicio
            clientName: client?.name ?? 'N/A',
            clientDNI: client?.dni ?? 'N/A',
            clientAddress: client?.address ?? 'N/A',
            clientPlusCode: client?.plusCode ?? 'N/A',
             paymentStatusText: paymentStatusInfo.statusText, // Guardar texto del estado
             paymentStatusClass: paymentStatusInfo.status, // Guardar clase CSS del estado
             daysOverdue: paymentStatusInfo.daysOverdue // Guardar días de atraso
        };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue); // Ordenar por días de atraso descendente

    const columns = [
        { key: 'id', label: 'ID Serv.' },
        // { key: 'branch', label: 'Sucursal' }, // Ya filtrado por sucursal
        { key: 'analyst', label: 'Analista' },
        { key: 'clientName', label: 'Cliente' }, // Mostrar nombre
        { key: 'clientDNI', label: 'DNI' },
        // { key: 'clientPlusCode', label: 'Plus Code', format: 'plusCode' }, // Opcional
        { key: 'type', label: 'Tipo Serv.' },
        { key: 'amount', label: 'Monto Orig.', format: 'currency', numeric: true },
        { key: 'nextPayment', label: 'Vencimiento', format: 'date' },
        // Mostrar estado de pago calculado
        { key: 'paymentStatusText', label: 'Estado Pago', format: (text, item) => `<span class="status status-${item.paymentStatusClass}">${text}</span>` },
         { key: 'daysOverdue', label: 'Días Retr.', numeric: true, center: true }
    ];
    const actions = [
        { label: 'Ver Detalles Servicio', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' },
        { label: 'Ver Cliente', class: 'btn-secondary', icon: 'fa-user', actionKey: 'ver-cliente', idKey: 'clientId' },
        { label: 'Añadir Comentario Pago', class: 'btn-warning', icon: 'fa-comment-medical', actionKey: 'add-comment-modal', idKey: 'clientId' } // Botón directo aquí
    ];

    // Calcular conteos para la sucursal específica
    const clientStatusCounts = calculateClientStatusCounts(servicesToCollect); // Usa la función reutilizable
     const countsHTML = `
         <div class="kpi-card kpi-sin-calificacion"><h4><i class="fas fa-skull-crossbones"></i> Sin Calif. (+60d)</h4><div class="kpi-value">${clientStatusCounts['sin-calificacion'] || 0}</div></div>
         <div class="kpi-card kpi-perdida"><h4><i class="fas fa-dollar-sign"></i> Pérdida (21-60d)</h4><div class="kpi-value">${clientStatusCounts['perdida'] || 0}</div></div>
         <div class="kpi-card kpi-dudoso"><h4><i class="fas fa-question-circle"></i> Dudoso (16-20d)</h4><div class="kpi-value">${clientStatusCounts['dudoso'] || 0}</div></div>
         <div class="kpi-card kpi-deficiente"><h4><i class="fas fa-arrow-down"></i> Deficiente (11-15d)</h4><div class="kpi-value">${clientStatusCounts['deficiente'] || 0}</div></div>
         <div class="kpi-card kpi-cpp"><h4><i class="fas fa-exclamation-circle"></i> CPP (6-10d)</h4><div class="kpi-value">${clientStatusCounts['cpp'] || 0}</div></div>
         <div class="kpi-card kpi-normal"><h4><i class="fas fa-thumbs-up"></i> Normal (1-5d)</h4><div class="kpi-value">${clientStatusCounts['normal'] || 0}</div></div>
         <div class="kpi-card kpi-al-dia"><h4><i class="fas fa-check-circle"></i> Vence Hoy</h4><div class="kpi-value">${clientStatusCounts['al-dia'] || 0}</div></div>
         ${clientStatusCounts['error'] > 0 ? `<div class="kpi-card kpi-danger"><h4><i class="fas fa-bomb"></i> Error Fecha</h4><div class="kpi-value">${clientStatusCounts['error']}</div></div>` : ''}
     `;


    contentArea.innerHTML = `
        <h4><i class="fas fa-chart-pie"></i> Resumen Estados de Pago (${supervisorBranch})</h4>
        <div class="dashboard-grid dashboard-grid-compliance mb-3">
             ${countsHTML}
        </div>
        <h3><i class="fas fa-motorcycle"></i> Clientes con Pagos Pendientes o Vencidos (${supervisorBranch})</h3>
        <p>Lista priorizada por días de retraso para seguimiento.</p>
        ${ui.renderTable(dataForTable, columns, actions, {
            defaultMessage: 'No hay clientes con pagos pendientes o vencidos en esta sucursal.',
            tableId: 'supervisor-collection-table',
            applyPaymentStatusClass: true, // Aplicar clase de color a la fila
            // No es necesario showPaymentStatusColumn si ya tenemos la columna format: 'paymentStatus'
        })}
    `;
    console.log('Vista Supervisor Cobranza renderizada.');
}


// --- Ver Detalles Servicio (Reutilizable - esta función se mantiene igual) ---
export function viewServiceDetails(serviceId) {
     console.log(`(reports.js) Cargando detalles para servicio ID: ${serviceId}`);
     const service = data.getService(serviceId);
     const client = service ? data.getClient(service.clientId) : null;

     if (!service || !client) {
         ui.openModal('Error', '<p>No se encontró el servicio o el cliente asociado.</p>', false);
         return;
     }

     let itemDetails = '';
     if (service.type === 'Empeño') {
         itemDetails = `
             <div class="input-group">
                 <label>Artículo Empeñado:</label>
                 <input type="text" value="${service.item || 'N/A'}" readonly>
             </div>
             <div class="input-group">
                 <label>Valor Estimado:</label>
                 <input type="text" value="${utils.formatCurrency(service.value)}" readonly>
             </div>
             ${service.documents?.articlePhoto ? `<img src="images/${service.documents.articlePhoto}" alt="Foto Artículo" class="client-facade-photo">` : '<p><em>No hay foto del artículo.</em></p>'}
         `;
     }

     let documentList = '<h5><i class="fas fa-folder-open"></i> Documentos Adjuntos</h5>';
     if (service.documents && Object.keys(service.documents).length > 0) {
         documentList += '<ul>';
         for (const key in service.documents) {
             const value = service.documents[key];
             // Ajuste para mostrar múltiples fotos de artículo
             let displayValue = value;
             let isFileLink = false;
             if (key === 'articlePhoto' && Array.isArray(value)) {
                 displayValue = `${value.length} foto(s)`; // Mostrar cantidad si es array
                 // No poner enlace único si son varias
             } else if (value && typeof value === 'string' && !key.includes('Provided')) {
                 isFileLink = true; // Es un enlace si es string no booleano
             }

             if (value && !key.includes('Provided')) {
                 const isImage = isFileLink && /\.(jpg|jpeg|png|gif)$/i.test(value);
                 const isPdf = isFileLink && /\.pdf$/i.test(value);
                 const iconClass = isImage ? 'fa-file-image' : (isPdf ? 'fa-file-pdf' : 'fa-paperclip');

                 documentList += `<li>`;
                 if (isFileLink) {
                      documentList += `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(value)}" title="Ver ${value}">`;
                 }
                 documentList += `<i class="fas ${isFileLink ? iconClass : 'fa-file-alt'}"></i> ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${displayValue}`;
                 if (isFileLink) {
                      documentList += `</a>`;
                 }
                  // Si es array de fotos, añadir enlaces individuales
                  if (key === 'articlePhoto' && Array.isArray(value)) {
                     documentList += ' (';
                     value.forEach((photoName, index) => {
                         documentList += `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(photoName)}" title="Ver ${photoName}">Foto ${index + 1}</a>${index < value.length - 1 ? ', ' : ''}`;
                     });
                     documentList += ')';
                 }

                 documentList += `</li>`;

             } else if (key === 'plusCodeProvided') {
                 documentList += `<li><i class="fas ${value ? 'fa-check text-success' : 'fa-times text-danger'}"></i> Plus Code Proporcionado: ${value ? 'Sí' : 'No'}</li>`;
             }
         }
         documentList += '</ul>';
     } else {
         documentList += '<p><em>No hay documentos registrados para este servicio.</em></p>';
     }


     const detailsHTML = `
         <div class="app-form"> <h4>Detalles del Servicio #${service.id}</h4>
             <div class="input-group">
                 <label>Cliente:</label>
                 <input type="text" value="${client.name} (DNI: ${client.dni})" readonly>
                 <a href="#" data-action="ver-cliente" data-id="${client.id}" class="btn btn-link btn-sm" style="padding-left: 0; margin-top: 5px;">Ver Perfil Cliente</a>
             </div>
             <div class="input-group">
                 <label>Tipo de Servicio:</label>
                 <input type="text" value="${service.type}" readonly>
             </div>
              <div class="input-group">
                 <label>Monto Otorgado:</label>
                 <input type="text" value="${utils.formatCurrency(service.amount)}" readonly>
             </div>
             ${itemDetails}
             <div class="input-group">
                 <label>Estado Actual:</label>
                 <input type="text" value="${service.status}" readonly>
             </div>
              <div class="input-group">
                  <label>Estado Pago Cliente:</label>
                  ${ui.renderTable([service], [{ key: 'clientId', format: 'paymentStatus'}], [], { tableId: 'temp-status-table' }).includes('status-') ? ui.renderTable([service], [{ key: 'clientId', label: '', format: 'paymentStatus'}], [], { tableId: 'temp-status-table' }).match(/<span class="status[^>]*>.*?<\/span>/)[0] : '<span class="status">N/A</span>'}
              </div>
             <div class="input-group">
                 <label>Sucursal:</label>
                 <input type="text" value="${service.branch}" readonly>
             </div>
             <div class="input-group">
                 <label>Analista Asignado:</label>
                 <input type="text" value="${service.analyst || 'N/A'}" readonly>
             </div>
             <div class="input-group">
                 <label>Fecha de Registro:</label>
                 <input type="text" value="${utils.formatDate(service.date)}" readonly>
             </div>
              <div class="input-group">
                 <label>Fecha Desembolso:</label>
                 <input type="text" value="${utils.formatDate(service.disbursementDate) || 'Pendiente'}" readonly>
             </div>
             <div class="input-group">
                 <label>Próximo Pago:</label>
                 <input type="text" value="${utils.formatDate(service.nextPayment) || 'N/A'}" readonly>
             </div>
             <hr>
             ${documentList}
             <button class="btn btn-secondary btn-sm mt-2" data-action="adjuntar-doc" data-id="${service.id}"><i class="fas fa-paperclip"></i> Adjuntar/Actualizar Documento</button>
         </div>
     `;
     ui.openModal(`Detalles Servicio #${service.id}`, detailsHTML, false, '', 'medium');
}