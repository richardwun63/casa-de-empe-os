// js/modules/components/treasury.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';
// Importar para ver detalles de servicio en Abonos
import { viewServiceDetails } from './serviceManagement.js';

console.log('Modulo treasury.js cargado.');

// --- Helper Functions ---

function getFilteredMoneyTransfers(filters = {}) {
    const { branch = null, analyst = null, type = null, startDate = null, endDate = null } = filters;
    const currentUser = getCurrentUser();
    const isTreasury = currentUser?.role === 'Tesorería';
    const treasuryUserFilter = isTreasury ? currentUser.username : null;
    const effectiveBranchFilter = isTreasury ? currentUser.branch : branch;

    return data.dummyData.moneyTransfers.filter(t => {
        const analystUser = data.getUser(t.analyst);
        const transferBranch = analystUser ? analystUser.branch : null;
        const branchMatch = !effectiveBranchFilter || t.branch === effectiveBranchFilter || transferBranch === effectiveBranchFilter;
        const analystMatch = !analyst || t.analyst === analyst;
        const typeMatch = !type || t.type === type;
        const treasuryUserMatch = !treasuryUserFilter || t.treasuryUser === treasuryUserFilter;
        const startDateMatch = !startDate || t.date >= startDate;
        const endDateMatch = !endDate || t.date <= endDate;
        return branchMatch && analystMatch && typeMatch && treasuryUserMatch && startDateMatch && endDateMatch;
    });
}

function getFilteredExpenses(filters = {}) {
     const { branch = null, analyst = undefined, expenseType = null, startDate = null, endDate = null } = filters;
     let analystFilterType;
     if (analyst === null) { analystFilterType = 'only_null'; }
     else if (analyst === undefined) { analystFilterType = 'any'; }
     else if (analyst === '') { analystFilterType = 'only_analysts'; }
     else { analystFilterType = 'specific'; }

    return data.dummyData.expenses.filter(e => {
        const branchMatch = !branch || e.branch === branch;
        let analystMatch = false;
        switch(analystFilterType) {
            case 'any': analystMatch = true; break;
            case 'only_null': analystMatch = e.analyst === null || e.analyst === undefined; break;
            case 'only_analysts': analystMatch = e.analyst !== null && e.analyst !== undefined; break;
            case 'specific': analystMatch = e.analyst === analyst; break;
            default: analystMatch = true;
        }
        const expenseTypeMatch = !expenseType || e.type === expenseType;
        const startDateMatch = !startDate || e.date >= startDate;
        const endDateMatch = !endDate || e.date <= endDate;
        return branchMatch && analystMatch && expenseTypeMatch && startDateMatch && endDateMatch;
    });
}


// --- Liquidez y dinero por analista ---
function getLiquidityAndAnalystBalances() {
    // Liquidez total: suma de caja de tesorería + bóvedas abiertas de analistas
    let liquidezTotal = 0;
    let cajaTesoreria = 0;
    const analystBalances = {};
    // Simulación: cajaTesoreria = suma de ingresos - egresos de tipo 'Tesorería'
    const tesoreriaMovs = data.dummyData.expenses.filter(e => e.analyst === null);
    cajaTesoreria = tesoreriaMovs.reduce((sum, e) => sum + (e.amount || 0) * (e.type === 'Ingreso' ? 1 : -1), 0);
    liquidezTotal += cajaTesoreria;
    // Por analista
    const allAnalysts = data.dummyData.users.filter(u => u.role === 'Analista');
    allAnalysts.forEach(a => {
        const movs = data.dummyData.expenses.filter(e => e.analyst === a.username);
        const saldo = movs.reduce((sum, e) => sum + (e.amount || 0) * (e.type === 'Ingreso' ? 1 : -1), 0);
        analystBalances[a.username] = saldo;
        liquidezTotal += saldo;
    });
    return { liquidezTotal, cajaTesoreria, analystBalances };
}

// --- Funciones Principales del Módulo ---

/**
 * Carga la vista de Reportes de Tesorería.
 * MODIFICADO: Añadidas columnas N° y ID Mov. a la tabla de detalles.
 * Confirmado que los KPIs superiores reaccionan a filtros generales (excepto tipo).
 */
export function loadTreasuryReports(contentArea, sectionTitleElement) {
    console.log("loadTreasuryReports");
    const currentUser = getCurrentUser();
    const allowedRoles = ['Tesorería', 'Dueño', 'Gerente General'];

    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    if (currentUser.role === 'Tesorería' && !currentUser.branch) {
         return ui.showError(contentArea, sectionTitleElement, 'Error: Usuario de Tesorería sin sucursal asignada.');
    }

    let initialBranchFilter = currentUser.role === 'Tesorería' ? currentUser.branch : null;
    const isGeneralView = initialBranchFilter === null;
    const reportTitle = `Reportes Tesorería ${initialBranchFilter ? `- ${initialBranchFilter}` : '(General)'}`;
    sectionTitleElement.textContent = reportTitle;

    // Opciones para filtros
    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    const allAnalysts = data.dummyData.users.filter(u => u.role === 'Analista');
    const relevantAnalysts = isGeneralView ? allAnalysts : allAnalysts.filter(a => a.branch === initialBranchFilter);
    const analystOptions = relevantAnalysts.map(a => `<option value="${a.username}">${a.username} (${a.branch || 'Sin Suc.'})</option>`).join('');
    const uniqueExpenseTypes = [...new Set(data.dummyData.expenses.map(e => e.type))].sort();
    const expenseTypeOptions = uniqueExpenseTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    // HTML del área de contenido
    contentArea.innerHTML = `
        <h3><i class="fas fa-landmark"></i> ${reportTitle}</h3>
        <div class="filter-bar mb-3">
             ${isGeneralView ? `<div class="filter-group"><label for="filter-tr-branch">Sucursal:</label><select id="filter-tr-branch"><option value="">Todas</option>${branchOptions}</select></div>` : `<input type="hidden" id="filter-tr-branch" value="${initialBranchFilter}">`}
             <div class="filter-group"><label for="filter-tr-analyst">Analista:</label><select id="filter-tr-analyst"><option value="">Todos</option><option value="null">Sucursal (Sin Analista)</option>${analystOptions}</select></div>
             <div class="filter-group"><label for="filter-tr-type">Tipo Movimiento:</label><select id="filter-tr-type"><option value="">Todos</option><option value="given">Egreso (Entrega Analista)</option><option value="received">Ingreso (Recepción Analista)</option><option value="expense_branch">Egreso (Gasto Sucursal)</option><option value="expense_analyst">Egreso (Gasto Analista)</option></select></div>
             <div class="filter-group"><label for="filter-tr-expense-type">Tipo Gasto Específico:</label><select id="filter-tr-expense-type" disabled><option value="">Todos</option>${expenseTypeOptions}</select></div>
             <div class="filter-group"><label for="filter-tr-date-start">Desde:</label><input type="date" id="filter-tr-date-start"></div>
             <div class="filter-group"><label for="filter-tr-date-end">Hasta:</label><input type="date" id="filter-tr-date-end" value="${data.HOY_SIMULADO}"></div>
             <button id="clear-tr-filter-btn" class="btn btn-light btn-sm"><i class="fas fa-times"></i> Limpiar</button>
        </div>
        <div id="treasury-kpi-container"><p>Calculando KPIs...</p></div>
        <div id="treasury-details-container" class="mt-3 data-report-section"><p>Seleccione filtros para ver detalles...</p></div>`;

    // Mostrar liquidez y saldos por analista
    const { liquidezTotal, cajaTesoreria, analystBalances } = getLiquidityAndAnalystBalances();
    let liquidityHTML = `<div class="liquidity-summary">
        <div class="kpi-card kpi-success"><h4><i class='fas fa-landmark'></i> Liquidez Total</h4><div class='kpi-value'>${utils.formatCurrency(liquidezTotal)}</div></div>
        <div class="kpi-card kpi-info"><h4><i class='fas fa-cash-register'></i> Caja Tesorería</h4><div class='kpi-value'>${utils.formatCurrency(cajaTesoreria)}</div></div>
        <div class="kpi-card kpi-secondary"><h4><i class='fas fa-user-tie'></i> Saldos Analistas</h4><ul style='margin:0;padding-left:18px;'>`;
    Object.entries(analystBalances).forEach(([analyst, saldo]) => {
        liquidityHTML += `<li><strong>${analyst}:</strong> ${utils.formatCurrency(saldo)}</li>`;
    });
    liquidityHTML += '</ul></div></div>';
    contentArea.innerHTML = liquidityHTML + contentArea.innerHTML;

    // Función para aplicar filtros y renderizar todo
    const applyTreasuryFiltersAndRender = () => {
        console.log("Aplicando filtros y renderizando Reportes Tesorería...");
        // Obtener elementos de filtro
        const branchElement = contentArea.querySelector('#filter-tr-branch');
        const analystElement = contentArea.querySelector('#filter-tr-analyst');
        const typeElement = contentArea.querySelector('#filter-tr-type');
        const expenseTypeElement = contentArea.querySelector('#filter-tr-expense-type');
        const startDateElement = contentArea.querySelector('#filter-tr-date-start');
        const endDateElement = contentArea.querySelector('#filter-tr-date-end');

        if (!analystElement || !typeElement || !expenseTypeElement || !startDateElement || !endDateElement) {
            console.warn("Elementos de filtro no encontrados al aplicar.");
            return;
        }
        expenseTypeElement.disabled = !['expense_branch', 'expense_analyst', ''].includes(typeElement.value);

        const branchValue = isGeneralView ? (branchElement ? branchElement.value : null) : initialBranchFilter;
        const analystValue = analystElement.value;
        const typeValue = typeElement.value;
        const expenseTypeValue = expenseTypeElement.disabled ? null : expenseTypeElement.value;
        const startDateValue = startDateElement.value;
        const endDateValue = endDateElement.value;

        const filters = {
            branch: branchValue || null,
            analyst: analystValue,
            type: typeValue,
            expenseType: expenseTypeValue || null,
            startDate: startDateValue || null,
            endDate: endDateValue || null,
        };
        console.log("Filtros aplicados:", filters);

        // Determinar qué datos obtener para la tabla de DETALLES
        let transferTypeFilter = null; let expenseAnalystFilter = undefined; let showTransfers = true; let showExpenses = true;
        switch (filters.type) {
            case 'given': transferTypeFilter = 'given'; showExpenses = false; break;
            case 'received': transferTypeFilter = 'received'; showExpenses = false; break;
            case 'expense_branch': expenseAnalystFilter = null; showTransfers = false; break;
            case 'expense_analyst': expenseAnalystFilter = filters.analyst ? filters.analyst : ''; showTransfers = false; break;
            default: expenseAnalystFilter = filters.analyst === 'null' ? null : (filters.analyst || undefined);
        }
        const transfers = showTransfers ? getFilteredMoneyTransfers({ ...filters, type: transferTypeFilter, analyst: filters.analyst === 'null' ? null : filters.analyst }) : [];
        const finalExpenses = showExpenses ? getFilteredExpenses({ ...filters, analyst: expenseAnalystFilter, expenseType: filters.expenseType }) : [];
        console.log(`Detalle: Transfers=${transfers.length}, Expenses=${finalExpenses.length}`);

        // Calcular KPIs
        // Define los filtros para los KPIs, EXCLUYENDO type y expenseType
        const kpiFilters = {
            branch: filters.branch,
            // Para KPIs, si el filtro de analista es "null", consideramos todos. Si es un username, filtramos. Si es "", consideramos todos.
            analyst: (filters.analyst && filters.analyst !== 'null') ? filters.analyst : undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
            // No incluimos type ni expenseType
        };
        console.log("Filtros para cálculo de KPIs:", kpiFilters);

        // Obtener TODOS los movimientos y servicios relevantes según kpiFilters
        const allBranchTransfers = getFilteredMoneyTransfers(kpiFilters);
        const allBranchExpenses = getFilteredExpenses(kpiFilters);
        const branchServices = data.dummyData.services.filter(s =>
            (!kpiFilters.branch || s.branch === kpiFilters.branch) &&
            (kpiFilters.analyst === undefined || s.analyst === kpiFilters.analyst) &&
            (!kpiFilters.startDate || s.date >= kpiFilters.startDate) && // Asume fecha de registro del servicio
            (!kpiFilters.endDate || s.date <= kpiFilters.endDate)
        );

        // Cálculos de KPIs
        const totalGiven = allBranchTransfers.filter(t => t.type === 'given').reduce((sum, t) => sum + t.amount, 0);
        const totalReceived = allBranchTransfers.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = allBranchExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalCapital = data.dummyData.branches.filter(b => b.status === 'Activa' && (!kpiFilters.branch || b.name === kpiFilters.branch)).reduce((sum, b) => sum + b.capitalAsignado, 0);
        const totalIncome = branchServices.reduce((sum, s) => sum + (s.totalInterest || 0), 0); // Usar interés real
        const incomePrestamos = branchServices.filter(s=>s.type === 'Préstamo').reduce((sum, s) => sum + (s.totalInterest || 0), 0);
        const incomeEmpenos = branchServices.filter(s=>s.type === 'Empeño').reduce((sum, s) => sum + (s.totalInterest || 0), 0);
        const uniqueAnalystsInPeriod = [...new Set( allBranchTransfers.map(t => t.analyst) .concat(allBranchExpenses.map(e => e.analyst)) .filter(a => a && (kpiFilters.analyst === undefined || a === kpiFilters.analyst)) )];
        const relevantAnalystCount = kpiFilters.analyst ? 1 : uniqueAnalystsInPeriod.length;
        const avgIncomePerAnalyst = relevantAnalystCount > 0 ? totalIncome / relevantAnalystCount : 0;

        // Renderizar KPIs
        const kpiContainer = contentArea.querySelector('#treasury-kpi-container');
        const filterDesc = `(${filters.branch || 'General'}${kpiFilters.analyst ? ', ' + kpiFilters.analyst : ''}${filters.startDate || filters.endDate ? ', Periodo Sel.' : ''})`; // Descripción de filtros aplicados a KPIs
        if (kpiContainer) { kpiContainer.innerHTML = `<div class="dashboard-grid dashboard-grid-financial"> <div class="kpi-card kpi-primary"><h4><i class="fas fa-landmark"></i> Capital Activo</h4><div class="kpi-value">${utils.formatCurrency(totalCapital)}</div><small class="kpi-description">(${filters.branch || 'General'})</small></div> <div class="kpi-card kpi-success"><h4><i class="fas fa-chart-line"></i> Ingresos (Interés Total)</h4><div class="kpi-value">${utils.formatCurrency(totalIncome)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-success"><h4><i class="fas fa-hand-holding-usd"></i> Ing. Préstamos (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(incomePrestamos)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-success"><h4><i class="fas fa-gem"></i> Ing. Empeños (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(incomeEmpenos)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-success"><h4><i class="fas fa-users"></i> Ing. Prom/Analista(Sim.)</h4><div class="kpi-value">${utils.formatCurrency(avgIncomePerAnalyst)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-danger"><h4><i class="fas fa-receipt"></i> Gastos Totales</h4><div class="kpi-value">${utils.formatCurrency(totalExpenses)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-info"><h4><i class="fas fa-arrow-down"></i> Total Entregado</h4><div class="kpi-value">${utils.formatCurrency(totalGiven)}</div><small class="kpi-description">${filterDesc}</small></div> <div class="kpi-card kpi-success"><h4><i class="fas fa-arrow-up"></i> Total Recibido</h4><div class="kpi-value">${utils.formatCurrency(totalReceived)}</div><small class="kpi-description">${filterDesc}</small></div> </div>`; }

        // Renderizar Tabla Detalles
        const detailsContainer = contentArea.querySelector('#treasury-details-container');
        if(detailsContainer) {
            let detailsHTML = '<h4>Detalle de Movimientos Filtrados</h4>';
            // Combinar datos (MODIFICADO: añadir rowNumber e id original)
            const combinedData = [
                ...(transfers.map(t => ({ ...t, _originalId: t.id, _movTypeInternal: 'transfer', movType: t.type === 'given' ? 'Entrega Analista' : 'Recepción Analista', detail: t.method || '-', expenseDetail: t.notes || '-', voucherFile: t.proofFile }))),
                ...(finalExpenses.map(e => ({ ...e, _originalId: e.id, _movTypeInternal: 'expense', movType: e.analyst ? 'Gasto Analista' : 'Gasto Sucursal', detail: e.type, expenseDetail: e.description, voucherFile: e.voucherFile })))
            ].sort((a,b) => new Date(b.date) - new Date(a.date)) // Ordenar por fecha
             .map((item, index) => ({ // Añadir número de fila
                  ...item,
                  rowNumber: index + 1,
                  uniqueId: `${item._movTypeInternal === 'transfer' ? 'T' : 'E'}-${item._originalId}` // Crear ID único T- o E-
             }));

            if(combinedData.length > 0) {
                 // Definición de columnas (MODIFICADO: Añadidas N° y ID Mov.)
                 const detailColumns = [
                     {key: 'rowNumber', label: 'N°', numeric: true}, // Nueva columna N°
                     {key: 'uniqueId', label: 'ID Mov.'},             // Nueva columna ID
                     {key: 'date', label: 'Fecha', format:'date'},
                     {key: 'movType', label: 'Tipo Mov.'},
                     {key: 'analyst', label: 'Analista/Origen', format: v => v || 'Sucursal'},
                     ...(isGeneralView ? [{key: 'branch', label: 'Sucursal'}] : []),
                     {key: 'detail', label: 'Detalle/Tipo Gasto'},
                     {key: 'expenseDetail', label: 'Descripción/Notas'},
                     {key: 'amount', label: 'Monto', format: 'currency', numeric: true},
                     {key: 'voucherFile', label: 'Prueba/Voucher', format: 'fileLink', center: true}
                 ];
                 detailsHTML += ui.renderTable(combinedData, detailColumns, [], {defaultMessage: 'No hay movimientos para los filtros seleccionados.', tableId: 'treasury-details-table'});
            } else {
                 detailsHTML += '<p><em>No se encontraron movimientos con los filtros actuales.</em></p>';
            }
            detailsContainer.innerHTML = detailsHTML;
        }
    };

    // Event Listeners
    const filterControls = contentArea.querySelectorAll('#filter-tr-branch, #filter-tr-analyst, #filter-tr-type, #filter-tr-expense-type, #filter-tr-date-start, #filter-tr-date-end');
    filterControls.forEach(control => { control?.addEventListener('change', applyTreasuryFiltersAndRender); });
    contentArea.querySelector('#filter-tr-type')?.addEventListener('change', () => {
        const typeValue = contentArea.querySelector('#filter-tr-type').value;
        const expenseTypeElement = contentArea.querySelector('#filter-tr-expense-type');
        if (expenseTypeElement) { expenseTypeElement.disabled = !['expense_branch', 'expense_analyst', ''].includes(typeValue); if (expenseTypeElement.disabled) { expenseTypeElement.value = ''; } }
    });
    contentArea.querySelector('#clear-tr-filter-btn')?.addEventListener('click', () => { 
                contentArea.querySelector('#filter-tr-analyst').value = ''; 
        contentArea.querySelector('#filter-tr-type').value = ''; 
        const expenseTypeElement = contentArea.querySelector('#filter-tr-expense-type'); 
        if(expenseTypeElement) { 
            expenseTypeElement.value = ''; 
            expenseTypeElement.disabled = true; 
        } 
        contentArea.querySelector('#filter-tr-date-start').value = ''; 
        contentArea.querySelector('#filter-tr-date-end').value = data.HOY_SIMULADO; 
        applyTreasuryFiltersAndRender(); 
    });

    // Carga inicial
    applyTreasuryFiltersAndRender();
    console.log(`Reportes Tesorería cargados para rol ${currentUser.role}.`);
}

// --- Funciones solo para Tesorero ---
export function loadAnalystCashReconciliation(contentArea, sectionTitleElement) {
    console.log("loadAnalystCashReconciliation");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    sectionTitleElement.textContent = 'Cuadre Caja Analista';
    const currentBranch = currentUser.branch;
    const analystsInBranch = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === currentBranch);

    const renderReconciliationData = (analystUsername) => {
        const analystDataContainer = contentArea.querySelector('#analyst-reconciliation-data');
        if (!analystDataContainer) return;
        if (!analystUsername) {
            analystDataContainer.innerHTML = '<p><em>Selecciona un analista.</em></p>';
            return;
        }
        // Verificar que el analista seleccionado pertenece a la sucursal del tesorero
        const selectedAnalyst = data.getUser(analystUsername);
        if (!selectedAnalyst || selectedAnalyst.branch !== currentBranch) {
             analystDataContainer.innerHTML = '<p class="error-message">Error: Analista no pertenece a esta sucursal.</p>';
             return;
        }
        const analystBranch = selectedAnalyst.branch; // Usar la sucursal confirmada del analista

        // Usar objeto de filtros para las llamadas
        // Para el cuadre de un analista, filtramos exactamente por ESE analista y SU sucursal.
        const transferFilters = { branch: analystBranch, analyst: analystUsername };
        const expenseFilters = { branch: analystBranch, analyst: analystUsername };

        const transfersGiven = getFilteredMoneyTransfers({ ...transferFilters, type: 'given' });
        const transfersReceived = getFilteredMoneyTransfers({ ...transferFilters, type: 'received' });
        const expensesAnalyst = getFilteredExpenses(expenseFilters); // Ya filtra por analista específico

        // Cálculos
        const totalGiven = transfersGiven.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalReceived = transfersReceived.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalExpenses = expensesAnalyst.reduce((sum, e) => sum + (e.amount || 0), 0);
        const expectedBalance = totalGiven - totalReceived - totalExpenses; // Saldo que debería tener el analista

        // Definiciones de columnas (asegurando que los dos puntos ':' estén correctos)
        const transfersColumns = [
            { key: 'date', label: 'Fecha', format: 'date' },
            { key: 'type', label: 'Tipo', format: (v) => v === 'given' ? '<span class="text-danger">Entregado</span>' : '<span class="text-success">Recibido</span>' },
            { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
            { key: 'notes', label: 'Notas' },
            { key: 'proofFile', label: 'Prueba', format: 'fileLink', center: true } // Centrar el icono
        ];
        // Definición de expensesColumns - **Esta es la línea 151 original según el error**
        const expensesColumns = [
            { key: 'date', label: 'Fecha', format: 'date' },              // Objeto 1
            { key: 'type', label: 'Tipo Gasto' },                         // Objeto 2
            { key: 'description', label: 'Descripción' },                 // Objeto 3
            { key: 'amount', label: 'Monto', format: 'currency', numeric: true }, // Objeto 4
            { key: 'voucherFile', label: 'Voucher', format: 'fileLink', center: true } // Objeto 5 - Centrar el icono
        ];

        // Renderizar HTML
        analystDataContainer.innerHTML = `
            <h4>Movimientos para: ${analystUsername} (${analystBranch})</h4>
            <div class="dashboard-grid dashboard-grid-financial mb-3">
                <div class="kpi-card kpi-info"><h4><i class="fas fa-arrow-down"></i> Total Entregado</h4><div class="kpi-value">${utils.formatCurrency(totalGiven)}</div></div>
                <div class="kpi-card kpi-success"><h4><i class="fas fa-arrow-up"></i> Total Recibido</h4><div class="kpi-value">${utils.formatCurrency(totalReceived)}</div></div>
                <div class="kpi-card kpi-danger"><h4><i class="fas fa-receipt"></i> Total Gastos</h4><div class="kpi-value">${utils.formatCurrency(totalExpenses)}</div></div>
                <div class="kpi-card kpi-secondary"><h4><i class="fas fa-balance-scale"></i> Saldo Esperado (Simp.)</h4><div class="kpi-value">${utils.formatCurrency(expectedBalance)}</div></div>
            </div>
            <h5><i class="fas fa-exchange-alt"></i> Transferencias</h5>
            ${ui.renderTable(transfersGiven.concat(transfersReceived).sort((a, b) => new Date(b.date) - new Date(a.date)), transfersColumns, [], { defaultMessage: 'No hay transferencias.', tableId: 'analyst-transfers-table' })}
            <h5 class="mt-3"><i class="fas fa-file-invoice-dollar"></i> Gastos</h5>
            ${ui.renderTable(expensesAnalyst.sort((a, b) => new Date(b.date) - new Date(a.date)), expensesColumns, [], { defaultMessage: 'No hay gastos.', tableId: 'analyst-expenses-table' })}
            <div class="form-actions mt-3">
                <button class="btn btn-success"><i class="fas fa-check"></i> Confirmar Cuadre (STUB)</button>
            </div>
            <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle"></i> Confirmación/manejo de diferencias no implementado. El saldo esperado es una simplificación.
            </div>`;
    };
    // HTML inicial y listener para el select
    contentArea.innerHTML = `
        <h3><i class="fas fa-cash-register"></i> Cuadre de Caja por Analista (${currentBranch})</h3>
        <div class="filter-bar">
            <div class="filter-group">
                <label for="rec-analyst-select">Analista:</label>
                <select id="rec-analyst-select">
                    <option value="">-- Seleccione Analista --</option>
                    ${analystsInBranch.map(a => `<option value="${a.username}">${a.username}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="analyst-reconciliation-data" class="mt-3 data-report-section">
            <p><em>Selecciona un analista para ver sus movimientos y saldo esperado.</em></p>
        </div>`;
    contentArea.querySelector('#rec-analyst-select')?.addEventListener('change', (e) => {
        renderReconciliationData(e.target.value);
    });
}


export function loadBranchCashReconciliation(contentArea, sectionTitleElement) {
    console.log("loadBranchCashReconciliation");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    const branchName = currentUser.branch;
    sectionTitleElement.textContent = `Cuadre Caja - ${branchName}`;

    // Obtener datos relevantes para la sucursal
    const transfers = getFilteredMoneyTransfers({branch: branchName}); // Todas las transferencias de la sucursal
    const expensesBranch = getFilteredExpenses({branch: branchName, analyst: null}); // Gastos directos (sin analista)

    // Calcular totales
    const totalGiven = transfers.filter(t => t.type === 'given').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalReceived = transfers.filter(t => t.type === 'received').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpensesBranch = expensesBranch.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calcular Saldo Simulado (Simplificado)
    // Este cálculo es muy básico. Asume un inicio en 0. No considera saldo inicial, ingresos directos, etc.
    const simulatedCashOnHand = totalReceived - totalGiven - totalExpensesBranch;

    // Definir columnas para las tablas de resumen
    const transfersColumns = [
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'type', label: 'Tipo', format: (v) => v === 'given' ? '<span class="text-danger">Entregado</span>' : '<span class="text-success">Recibido</span>' },
        { key: 'analyst', label: 'Analista' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'notes', label: 'Notas' }
    ];
    const expensesColumns = [
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'type', label: 'Tipo Gasto' },
        { key: 'description', label: 'Descripción' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'voucherFile', label: 'Voucher', format: 'fileLink', center: true }
    ];

    // Renderizar HTML
    contentArea.innerHTML = `
        <h3><i class="fas fa-calculator"></i> Estado de Caja (Simplificado) - ${branchName}</h3>
        <div class="dashboard-grid dashboard-grid-financial">
            <div class="kpi-card kpi-info"><h4><i class="fas fa-sign-out-alt"></i> Total Entregado (Analistas)</h4><div class="kpi-value">${utils.formatCurrency(totalGiven)}</div></div>
            <div class="kpi-card kpi-success"><h4><i class="fas fa-sign-in-alt"></i> Total Recibido (Analistas)</h4><div class="kpi-value">${utils.formatCurrency(totalReceived)}</div></div>
            <div class="kpi-card kpi-danger"><h4><i class="fas fa-file-invoice-dollar"></i> Gastos Directos Sucursal</h4><div class="kpi-value">${utils.formatCurrency(totalExpensesBranch)}</div></div>
            <div class="kpi-card kpi-primary"><h4><i class="fas fa-wallet"></i> Efectivo Estimado (Simplificado)</h4><div class="kpi-value">${utils.formatCurrency(simulatedCashOnHand)}</div><small class="kpi-description">Basado en transferencias y gastos directos.</small></div>
        </div>
        <div class="alert alert-warning mt-3"><i class="fas fa-exclamation-triangle"></i> Cálculo simplificado. No considera saldos iniciales, ingresos por cobranza directa, etc.</div>
        <h4><i class="fas fa-history"></i> Últimas Transferencias (${branchName})</h4>
        ${ui.renderTable(transfers.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10), transfersColumns, [], { defaultMessage: 'No hay transferencias recientes.', tableId: 'branch-recent-transfers' })}
        <h4 class="mt-3"><i class="fas fa-receipt"></i> Últimos Gastos Directos (${branchName})</h4>
        ${ui.renderTable(expensesBranch.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10), expensesColumns, [], { defaultMessage: 'No hay gastos directos recientes.', tableId: 'branch-recent-expenses' })}
    `;
}


export function loadExpenseManagement(contentArea, sectionTitleElement) {
    console.log("loadExpenseManagement");
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    const currentBranch = currentUser.branch;
    sectionTitleElement.textContent = `Gestión Gastos - ${currentBranch}`;

    const loadExpenses = () => {
        // Obtener todos los gastos de la sucursal actual (tanto directos como de analistas)
        const branchExpenses = data.dummyData.expenses
            .filter(e => e.branch === currentBranch)
            .sort((a,b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha

        // Definir columnas
        const columns = [
            { key: 'id', label: 'ID', numeric: true },
            { key: 'date', label: 'Fecha', format: 'date' },
            // Mostrar quién registró: 'Sucursal' si analyst es null, o el nombre del analista
            { key: 'analyst', label: 'Registrado por', format: (v) => v || 'Sucursal' },
            { key: 'type', label: 'Tipo Gasto' },
            { key: 'description', label: 'Descripción' },
            { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
            { key: 'voucherFile', label: 'Voucher', format: 'fileLink', center: true}
        ];
        // Definir acciones: Solo permitir eliminar gastos directos (sin analista)
        const actions = [
            { label: 'Eliminar Gasto', class: 'btn-danger', icon: 'fa-trash-alt', actionKey: 'eliminar-gasto', idKey: 'id',
              // Ocultar botón si el gasto tiene un 'analyst' asignado
              hideIf: (expense) => !!expense.analyst }
        ];

        // Renderizar HTML
        contentArea.innerHTML = `
            <h3><i class="fas fa-file-invoice-dollar"></i> Gastos Registrados para ${currentBranch}</h3>
            <p>Ver gastos y registrar/eliminar los <strong>directos</strong> de sucursal (no los de analistas).</p>
            <button id="add-branch-expense-btn" class="btn btn-primary mb-3">
                <i class="fas fa-plus"></i> Registrar Gasto Directo
            </button>
            <div id="branch-expenses-table-container">
                ${ui.renderTable(branchExpenses, columns, actions, { defaultMessage: 'No hay gastos registrados para esta sucursal.', tableId: 'branch-expenses-table' })}
            </div>`;
        // Añadir listener al botón de agregar
        contentArea.querySelector('#add-branch-expense-btn')?.addEventListener('click', () => {
            addBranchExpense(currentBranch);
        });
        // Listener para la tabla (delegación) ya está en ui.js y manejará la acción 'eliminar-gasto'
    };
    loadExpenses(); // Cargar la vista inicial
}


function addBranchExpense(branchName) {
    console.log(`Modal agregar gasto sucursal: ${branchName}`);
    const today = new Date().toISOString().split('T')[0]; // Fecha actual
    const uniqueExpenseTypes = [...new Set(data.dummyData.expenses.map(e => e.type))].sort(); // Tipos de gasto existentes

    // HTML del formulario en el modal
    const formHTML = `
        <form id="add-expense-form">
            <input type="hidden" name="branch" value="${branchName}">
            <div class="input-group">
                <label for="expense-date">Fecha:<span class="text-danger">*</span></label>
                <input type="date" id="expense-date" name="date" value="${today}" required>
            </div>
            <div class="input-group">
                <label for="expense-type">Tipo Gasto:<span class="text-danger">*</span></label>
                <select id="expense-type" name="type" required>
                    <option value="">-- Seleccione --</option>
                    ${uniqueExpenseTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                    <option value="Otro">Otro (Especifique)</option> </select>
                <input type="text" id="expense-type-other" name="type_other" placeholder="Nuevo tipo de gasto" style="display: none; margin-top: 5px;">
            </div>
            <div class="input-group">
                <label for="expense-description">Descripción:<span class="text-danger">*</span></label>
                <textarea id="expense-description" name="description" required></textarea>
            </div>
            <div class="input-group">
                <label for="expense-amount">Monto (S/):<span class="text-danger">*</span></label>
                <input type="number" id="expense-amount" name="amount" step="0.01" min="0.01" required>
            </div>
            <div class="input-group">
                <label for="expense-voucher">Voucher (Opc):</label>
                <input type="file" id="expense-voucher" name="voucherFile">
                <small>Adjuntar archivo (simulación).</small>
            </div>
            <div id="add-expense-error" class="error-message" style="display: none;"></div>
        </form>
    `;

    // Función a ejecutar al confirmar
    const handleConfirm = async () => {
        const form = document.getElementById('add-expense-form');
        const errorDiv = document.getElementById('add-expense-error');
        if (!form || !errorDiv) return false; // Seguridad
        errorDiv.style.display = 'none'; // Ocultar error previo

        // Validación básica del formulario HTML5
        if (!form.checkValidity()) {
            errorDiv.textContent = 'Por favor, complete todos los campos requeridos (*).';
            errorDiv.style.display = 'block';
            form.reportValidity(); // Mostrar mensajes de validación nativos
            return false; // No continuar
        }

        const formData = new FormData(form);
        let expenseType = formData.get('type');
        // Si se seleccionó 'Otro', usar el valor del campo de texto
        if (expenseType === 'Otro') {
            expenseType = formData.get('type_other')?.trim();
            if (!expenseType) { // Validar que se haya escrito algo en 'Otro'
                errorDiv.textContent = 'Por favor, especifique el tipo de gasto en "Otro".';
                errorDiv.style.display = 'block';
                return false;
            }
        }

        const newExpense = {
            date: formData.get('date'),
            type: expenseType,
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            branch: formData.get('branch'),
            analyst: null, // Gasto directo de sucursal
            // Simular nombre de archivo o null
            voucherFile: formData.get('voucherFile') && formData.get('voucherFile').name ? formData.get('voucherFile').name : null
        };

        // Validar monto
        if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
            errorDiv.textContent = 'El monto debe ser un número mayor a cero.';
            errorDiv.style.display = 'block';
            return false;
        }

        try {
            const added = data.addExpense(newExpense); // Llama a la función en data.js
            console.log("Gasto de sucursal agregado:", added);
            ui.closeModal(); // Cerrar el modal
            // Si la vista actual es la de gestión de gastos, recargarla
            if (ui.getCurrentLoadFunction() === loadExpenseManagement) {
                ui.reloadCurrentView();
            }
            return true; // Indicar éxito para cerrar modal si no lo hizo ya
        } catch (error) {
            console.error("Error agregando gasto de sucursal:", error);
            errorDiv.textContent = `Error al guardar: ${error.message}`;
            errorDiv.style.display = 'block';
            return false; // Indicar fallo
        }
    };

    // Abrir el modal
    ui.openModal('Registrar Gasto Directo de Sucursal', formHTML, true, 'Registrar', 'medium', handleConfirm);

    // Añadir lógica para mostrar/ocultar el campo 'Otro'
    const typeSelect = document.getElementById('expense-type');
    const otherTypeInput = document.getElementById('expense-type-other');
    if (typeSelect && otherTypeInput) {
        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === 'Otro') {
                otherTypeInput.style.display = 'block';
                otherTypeInput.required = true; // Hacerlo requerido
            } else {
                otherTypeInput.style.display = 'none';
                otherTypeInput.required = false; // No requerido
                otherTypeInput.value = ''; // Limpiar valor
            }
        });
    }
}


export function loadRecordMoneyGiven(contentArea, sectionTitleElement) {
    console.log("loadRecordMoneyGiven");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    sectionTitleElement.textContent = 'Entregar Dinero a Analista';
    const currentBranch = currentUser.branch;
    const analystsInBranch = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === currentBranch);
    const today = new Date().toISOString().split('T')[0];

    contentArea.innerHTML = `
        <h3><i class="fas fa-hand-holding-usd"></i> Registrar Entrega a Analista</h3>
        <form id="give-money-form" class="app-form">
            <input type="hidden" name="treasuryUser" value="${currentUser.username}">
            <div class="input-group">
                <label for="give-analyst-select">Analista:<span class="text-danger">*</span></label>
                <select id="give-analyst-select" name="analyst" required>
                    <option value="">-- Seleccione Analista --</option>
                    ${analystsInBranch.map(a => `<option value="${a.username}">${a.username}</option>`).join('')}
                </select>
            </div>
            <div class="input-group">
                <label for="give-amount">Monto (S/):<span class="text-danger">*</span></label>
                <input type="number" id="give-amount" name="amount" step="0.01" min="0.01" required>
            </div>
            <div class="input-group">
                <label for="give-date">Fecha Entrega:<span class="text-danger">*</span></label>
                <input type="date" id="give-date" name="date" value="${today}" required>
            </div>
            <div class="input-group">
                <label for="give-notes">Notas (Opcional):</label>
                <textarea id="give-notes" name="notes" placeholder="Ej: Capital para ruta diaria, adelanto..."></textarea>
            </div>
            <div class="input-group">
                <label for="give-proof">Prueba de Entrega (Opc):</label>
                <input type="file" id="give-proof" name="proofFile">
                <small>Adjuntar foto o documento (simulación).</small>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Registrar Entrega</button>
            </div>
            <div id="give-money-error" class="error-message" style="display: none;"></div>
            <div id="give-money-success" class="alert alert-success mt-2" style="display: none;"></div>
        </form>`;

    const form = contentArea.querySelector('#give-money-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevenir envío normal
        const errorDiv = contentArea.querySelector('#give-money-error');
        const successDiv = contentArea.querySelector('#give-money-success');
        if (!errorDiv || !successDiv) return; // Seguridad
        errorDiv.style.display = 'none'; successDiv.style.display = 'none'; // Ocultar mensajes previos

        if (!form.checkValidity()) {
            errorDiv.textContent = 'Complete todos los campos requeridos (*).';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const newTransfer = {
            date: formData.get('date'),
            type: 'given', // Tipo de transferencia: entregado
            treasuryUser: formData.get('treasuryUser'), // Quién entrega (tesorero)
            analyst: formData.get('analyst'), // Quién recibe (analista)
            amount: parseFloat(formData.get('amount')),
            proofFile: formData.get('proofFile') && formData.get('proofFile').name ? formData.get('proofFile').name : null, // Simulación de archivo
            notes: formData.get('notes')?.trim() || null // Notas opcionales
        };

        if (isNaN(newTransfer.amount) || newTransfer.amount <= 0) {
            errorDiv.textContent = 'El monto debe ser un número mayor a cero.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const added = data.addMoneyTransfer(newTransfer); // Llama a data.js
            console.log("Entrega registrada:", added);
            successDiv.textContent = `Entrega de ${utils.formatCurrency(added.amount)} a ${added.analyst} registrada exitosamente.`;
            successDiv.style.display = 'block';
            form.reset(); // Limpiar formulario
            // Restaurar valores por defecto si es necesario
            form.querySelector('#give-date').value = today;
            form.querySelector('input[name="treasuryUser"]').value = currentUser.username;
            // Opcional: recargar vista si estamos en historial de transferencias
            if (ui.getCurrentLoadFunction() === loadTreasuryDataManagement) {
                 ui.reloadCurrentView();
            }
        } catch (error) {
            console.error("Error registrando entrega:", error);
            errorDiv.textContent = `Error al registrar: ${error.message}`;
            errorDiv.style.display = 'block';
        }
    });
}


export function loadRecordMoneyReceived(contentArea, sectionTitleElement) {
    console.log("loadRecordMoneyReceived");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    sectionTitleElement.textContent = 'Recibir Dinero de Analista';
    const currentBranch = currentUser.branch;
    const analystsInBranch = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === currentBranch);
    const today = new Date().toISOString().split('T')[0];

    contentArea.innerHTML = `
        <h3><i class="fas fa-receipt"></i> Registrar Recepción de Analista</h3>
        <form id="receive-money-form" class="app-form">
            <input type="hidden" name="treasuryUser" value="${currentUser.username}">
            <div class="input-group">
                <label for="receive-analyst-select">Analista:<span class="text-danger">*</span></label>
                <select id="receive-analyst-select" name="analyst" required>
                    <option value="">-- Seleccione Analista --</option>
                    ${analystsInBranch.map(a => `<option value="${a.username}">${a.username}</option>`).join('')}
                </select>
            </div>
            <div class="input-group">
                <label for="receive-amount">Monto Recibido (S/):<span class="text-danger">*</span></label>
                <input type="number" id="receive-amount" name="amount" step="0.01" min="0.01" required>
            </div>
            <div class="input-group">
                <label for="receive-method">Método:<span class="text-danger">*</span></label>
                <select id="receive-method" name="method" required>
                    <option value="">-- Seleccione Método --</option>
                    <option value="Efectivo Cuadre">Efectivo (Cuadre de Ruta)</option>
                    <option value="Yape Cobranza">Yape (Cobranza Cliente)</option>
                    <option value="Efectivo Cobranza">Efectivo (Cobranza Cliente)</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div class="input-group">
                <label for="receive-date">Fecha Recepción:<span class="text-danger">*</span></label>
                <input type="date" id="receive-date" name="date" value="${today}" required>
            </div>
            <div class="input-group">
                <label for="receive-notes">Notas (Opcional):</label>
                <textarea id="receive-notes" name="notes" placeholder="Ej: Liquidación ruta día X, Cobranza cliente Y..."></textarea>
            </div>
            <div class="input-group">
                <label for="receive-proof">Prueba de Recepción (Opc):</label>
                <input type="file" id="receive-proof" name="proofFile">
                <small>Adjuntar captura, voucher, etc. (simulación).</small>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Registrar Recepción</button>
            </div>
            <div id="receive-money-error" class="error-message" style="display: none;"></div>
            <div id="receive-money-success" class="alert alert-success mt-2" style="display: none;"></div>
        </form>`;

    const form = contentArea.querySelector('#receive-money-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = contentArea.querySelector('#receive-money-error');
        const successDiv = contentArea.querySelector('#receive-money-success');
        if (!errorDiv || !successDiv) return;
        errorDiv.style.display = 'none'; successDiv.style.display = 'none';

        if (!form.checkValidity()) {
            errorDiv.textContent = 'Complete todos los campos requeridos (*).';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const newTransfer = {
            date: formData.get('date'),
            type: 'received', // Tipo: recibido
            treasuryUser: formData.get('treasuryUser'), // Quién recibe (tesorero)
            analyst: formData.get('analyst'), // Quién entrega (analista)
            amount: parseFloat(formData.get('amount')),
            method: formData.get('method'), // Método de recepción
            proofFile: formData.get('proofFile') && formData.get('proofFile').name ? formData.get('proofFile').name : null,
            notes: formData.get('notes')?.trim() || null
        };

        if (isNaN(newTransfer.amount) || newTransfer.amount <= 0) {
            errorDiv.textContent = 'El monto debe ser un número mayor a cero.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const added = data.addMoneyTransfer(newTransfer); // Llama a data.js
            console.log("Recepción registrada:", added);
            successDiv.textContent = `Recepción de ${utils.formatCurrency(added.amount)} de ${added.analyst} (${added.method}) registrada exitosamente.`;
            successDiv.style.display = 'block';
            form.reset();
            form.querySelector('#receive-date').value = today;
            form.querySelector('input[name="treasuryUser"]').value = currentUser.username;
            // Opcional: recargar vista si estamos en historial
             if (ui.getCurrentLoadFunction() === loadTreasuryDataManagement) {
                 ui.reloadCurrentView();
            }
        } catch (error) {
            console.error("Error registrando recepción:", error);
            errorDiv.textContent = `Error al registrar: ${error.message}`;
            errorDiv.style.display = 'block';
        }
    });
}


export function loadTreasuryDataManagement(contentArea, sectionTitleElement) {
    console.log("loadTreasuryDataManagement");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Tesorería' || !currentUser.branch) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o sucursal no definida.');
    }
    const branchName = currentUser.branch;
    sectionTitleElement.textContent = `Historial Transferencias - ${branchName}`;

    // Obtener todas las transferencias de la sucursal del tesorero
    const transfers = getFilteredMoneyTransfers({branch: branchName})
                        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha

    // Definir columnas para la tabla
    const columns = [
        { key: 'id', label: 'ID Transf.', numeric: true },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'type', label: 'Tipo', format: (v) => v === 'given' ? '<span class="text-danger">Entregado</span>' : '<span class="text-success">Recibido</span>' },
        { key: 'analyst', label: 'Analista' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'method', label: 'Método (Recep.)', format: (v) => v || '-' }, // Mostrar método solo si existe
        { key: 'notes', label: 'Notas' },
        { key: 'proofFile', label: 'Prueba', format: 'fileLink', center: true },
        { key: 'treasuryUser', label: 'Tesorero' } // Mostrar qué tesorero registró
    ];

    // Renderizar HTML
    contentArea.innerHTML = `
        <h3><i class="fas fa-folder-open"></i> Historial de Transferencias (${branchName})</h3>
        <p>Registro completo de entregas y recepciones de dinero con analistas para esta sucursal.</p>
        <div id="transfers-history-table">
            ${ui.renderTable(transfers, columns, [], { defaultMessage: 'No hay transferencias registradas para esta sucursal.', tableId: 'treasury-transfers-history' })}
        </div>`;
}


export function loadCashReports(contentArea, sectionTitleElement) {
    console.log("loadCashReports");
    // Reutiliza la función principal de reportes, ya que contiene los KPIs y filtros necesarios
    loadTreasuryReports(contentArea, sectionTitleElement);

    // Ajustar título y quizás añadir un mensaje específico para esta vista
    const currentUser = getCurrentUser();
    const branchName = currentUser?.role === 'Tesorería' ? currentUser.branch : null;
    sectionTitleElement.textContent = `Reportes de Caja ${branchName ? `- ${branchName}` : '(General)'}`;

    // Opcional: Añadir un mensaje o sección adicional si es necesario
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-secondary mt-3';
    alertDiv.innerHTML = '<i class="fas fa-info-circle"></i> Use los filtros para explorar los movimientos y KPIs de caja.';
    // Intentar insertar el mensaje después de la barra de filtros
    const filterBar = contentArea.querySelector('.filter-bar');
    if (filterBar && filterBar.nextSibling) {
        filterBar.parentNode.insertBefore(alertDiv, filterBar.nextSibling);
    } else {
        contentArea.appendChild(alertDiv); // Fallback si no encuentra la barra
    }
}



export function deleteExpense(expenseId) {
    console.log(`Intentando eliminar gasto directo ID: ${expenseId}`);
    const expense = data.getExpense(expenseId);
    if (!expense) {
        alert("Error: Gasto no encontrado.");
        console.error(`Gasto directo con ID ${expenseId} no encontrado.`);
        return;
    }
    // Doble check: Solo tesorero puede eliminar gastos SIN analista asignado
    if (expense.analyst) {
        alert("Error: Este gasto fue registrado por un analista y no puede ser eliminado desde aquí.");
        console.warn(`Intento de eliminar gasto de analista (${expense.analyst}) con ID ${expenseId} desde gestión de sucursal.`);
        return;
    }

    // Mensaje de confirmación
    const confirmationMessage = `
        <p>¿Está seguro de que desea eliminar este gasto directo de sucursal?</p>
        <ul>
            <li><strong>ID:</strong> ${expense.id}</li>
            <li><strong>Fecha:</strong> ${utils.formatDate(expense.date)}</li>
            <li><strong>Tipo:</strong> ${expense.type}</li>
            <li><strong>Descripción:</strong> ${expense.description}</li>
            <li><strong>Monto:</strong> ${utils.formatCurrency(expense.amount)}</li>
        </ul>
        <p class="text-danger"><strong>Esta acción no se puede deshacer.</strong></p>
    `;

    // Handler para la confirmación
    const handleConfirmDelete = () => {
        try {
            const success = data.deleteExpenseById(expenseId); // Llama a data.js
            if (success) {
                alert("Gasto directo eliminado exitosamente.");
                ui.closeModal();
                // Recargar la vista si es la de gestión de gastos
                if (ui.getCurrentLoadFunction() === loadExpenseManagement) {
                    ui.reloadCurrentView();
                }
                return true; // Éxito
            } else {
                // Esto no debería ocurrir si getExpense lo encontró antes
                alert("Error: No se pudo eliminar el gasto (no encontrado en data.js).");
                return false; // Fallo
            }
        } catch (error) {
            console.error(`Error al eliminar gasto ${expenseId}:`, error);
            alert(`Error inesperado al eliminar: ${error.message}`);
            return false; // Fallo
        }
    };

    // Mostrar modal de confirmación
    ui.openModal('Confirmar Eliminación de Gasto', confirmationMessage, true, 'Sí, Eliminar', 'medium', handleConfirmDelete);
}

// --- Funciones Rol Analista (Bóveda y Pagos) ---

/**
 * Carga la vista de 'Abonar Pago' para el Analista.
 */
export function loadAbonarView(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Abonar Pago Cliente';
    console.log("Cargando vista: Abonar Pago (Analista)");
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }

    // Obtener servicios activos/morosos del analista para mostrar en tabla
    const servicesForPayment = data.dummyData.services
        .filter(s => s.analyst === currentUser.username && ['Por Cobrar', 'Moroso', 'Desembolsado', 'Verificado', 'Aprobado'].includes(s.status))
        .sort((a, b) => { // Ordenar por estado de pago (más morosos primero) y luego fecha
             const statusA = data.getClientPaymentStatusInfo(a.clientId);
             const statusB = data.getClientPaymentStatusInfo(b.clientId);
             if (statusA.daysOverdue !== statusB.daysOverdue) {
                 return statusB.daysOverdue - statusA.daysOverdue;
             }
             return new Date(a.date) - new Date(b.date);
        });

    // Columnas basadas en "Tablas a Analista.xlsx - Abonar.csv"
    const columns = [
         { key: 'rowNumber', label: 'N°', numeric: true},
         { key: 'id', label: 'ID Serv.'},
         { key: 'id', label: 'Historial', center: true, format: (id) => `<button class="btn btn-link btn-sm" data-action="ver-plan-pagos" data-id="${id}" title="Ver Plan Pagos"><i class="fas fa-calendar-alt"></i></button>` }, // Botón Plan Pagos
         { key: 'id', label: 'Abonar', center: true, format: (id, service) => service.status !== 'Pagado' ? `<button class="btn btn-success btn-sm" data-action="registrar-pago" data-id="${id}" title="Registrar Abono"><i class="fas fa-hand-holding-dollar"></i></button>` : '<span>ABONADO</span>'}, // Botón Abonar
         { key: 'disbursementDate', label: 'Fecha Desemb.', format: 'date'},
         { key: 'status', label: 'Estado Serv.'},
         { key: 'clientId', label: 'DNI', format: (cid) => data.getClient(cid)?.dni ?? 'N/A'},
         { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A'},
         { key: 'amount', label: 'Préstamo', format: 'currency', numeric: true},
         { key: 'id', label: '%', format: (_,s) => s.type === 'Préstamo' ? `${s.interestRate}%` : `${s.pawnPercentage?.toFixed(1)}%`, center: true},
         { key: 'totalToPay', label: 'Total', format: 'currency', numeric: true},
         { key: 'paymentType', label: 'Tipo Pago'},
         { key: 'numInstallments', label: 'Cuotas', numeric: true, center: true},
         { key: 'installmentAmount', label: 'Monto Cuota', format: 'currency', numeric: true},
         { key: 'lastPaymentAmount', label: 'Abonos (Últ.)', format: 'currency', numeric: true}, // Placeholder
         { key: 'id', label: 'Deuda', format: (id, s) => utils.formatCurrency((s.totalToPay||s.amount||0) - (s.lastPaymentAmount||0)), numeric: true}, // Placeholder
         { key: 'lastPaymentDate', label: 'Último Abono', format: 'date'},
         { key: 'nextPayment', label: 'Vencimiento', format: 'date'}, // Vencimiento próxima cuota
    ];

     contentArea.innerHTML = `<h3><i class="fas fa-donate"></i> Registrar Abonos de Clientes</h3>
        <p>Selecciona el servicio y haz clic en el botón <button class="btn btn-success btn-sm" disabled><i class="fas fa-hand-holding-dollar"></i></button> para registrar un pago.</p>
        ${ui.renderTable(servicesForPayment.map((s, i) => ({...s, rowNumber: i+1})), columns, [], { // No acciones directas en la fila, están en la columna Operaciones
            defaultMessage: "No tienes servicios activos que requieran abonos.",
            tableId: "analyst-abonar-table"
        })}
     `;
      console.log("Vista Abonar cargada.");
}


/**
 * Registra un pago/abono (llamada desde el botón en la tabla Abonar).
 * @param {number} serviceId
 */
export function registerPayment(serviceId) {
    console.log(`registerPayment llamado desde vista Abonos para Servicio ID: ${serviceId}`);
    const service = data.getService(serviceId);
    if (!service) {
        ui.openModal('Error', '<div class="alert alert-danger">Servicio no encontrado.</div>');
        return;
    }
    if (service.status === 'Pagado') {
        ui.openModal('Abono no permitido', '<div class="alert alert-success">Este servicio ya está pagado en su totalidad.</div>');
        return;
    }
    if (["Pendiente", "Rechazado", "Verificado", "Aprobado"].includes(service.status)) {
        ui.openModal('Abono no permitido', '<div class="alert alert-warning">El servicio aún no ha sido desembolsado o fue rechazado.</div>');
        return;
    }
    const client = data.getClient(service.clientId);
    const clientName = client ? client.name : `Cliente ID ${service.clientId}`;
    const today = new Date().toISOString().split('T')[0];
    const formHTML = `
        <form id="payment-form">
            <p>Registrando abono para: <strong>${clientName}</strong></p>
            <p>Servicio: <strong>#${serviceId}</strong> (${service.type}) - Monto Cuota: ${utils.formatCurrency(service.installmentAmount)}</p>
            <p>Estado Actual: <span class="status status-${String(service.status).toLowerCase().replace(/ /g, '-')}">${service.status}</span> | Próx Pago: ${utils.formatDate(service.nextPayment) || 'N/A'}</p>
            <hr>
            <div class="input-group">
                <label for="payment-amount">Monto Abonado (S/):<span class="text-danger">*</span></label>
                <input type="number" id="payment-amount" name="amount" required step="0.01" min="0.01" placeholder="0.00">
            </div>
            <div class="input-group">
                <label for="payment-date">Fecha Abono:<span class="text-danger">*</span></label>
                <input type="date" id="payment-date" name="date" value="${today}" required>
            </div>
            <div class="input-group">
                <label for="payment-method">Método:<span class="text-danger">*</span></label>
                <select id="payment-method" name="method" required>
                    <option value="">-- Seleccione --</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Yape">Yape</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div class="input-group">
                <label for="payment-comment">Comentario (Opcional):</label>
                <textarea id="payment-comment" name="comment"></textarea>
            </div>
            <div id="payment-error" class="error-message" style="display: none;"></div>
        </form>`;
    const handleConfirm = async () => {
        const form = document.getElementById('payment-form');
        const errorDiv = document.getElementById('payment-error');
        if (!form || !errorDiv) return false;
        errorDiv.style.display = 'none';
        const amount = parseFloat(form.amount.value);
        const date = form.date.value;
        const method = form.method.value;
        const notes = form.comment.value.trim();
        if (!amount || amount <= 0) {
            errorDiv.textContent = 'El monto abonado debe ser mayor a 0.';
            errorDiv.style.display = 'block';
            return false;
        }
        if (!date) {
            errorDiv.textContent = 'Debe ingresar la fecha del abono.';
            errorDiv.style.display = 'block';
            return false;
        }
        if (!method) {
            errorDiv.textContent = 'Debe seleccionar el método de pago.';
            errorDiv.style.display = 'block';
            return false;
        }
        try {
            // Registrar el pago real en el historial y actualizar estado
            data.addPaymentToService(serviceId, {
                date,
                amount,
                method,
                notes
            });
            alert('Abono registrado correctamente.');
            ui.closeModal();
            ui.reloadCurrentView();
            return true;
        } catch (error) {
            errorDiv.textContent = `Error al registrar abono: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    ui.openModal(`Registrar Abono - Serv. #${serviceId}`, formHTML, true, 'Registrar Abono', 'medium', handleConfirm);
}

/**
 * Muestra el historial real de abonos/pagos de un servicio.
 */
export function viewPaymentsHistory(serviceId) {
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

// --- NUEVO: Gestión de Proveedores ---
export function loadProviderManagement(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Gestión de Proveedores';
    const providers = data.dummyData.providers || [];
    contentArea.innerHTML = `
        <h3><i class="fas fa-truck"></i> Proveedores Registrados</h3>
        <button id="add-provider-btn" class="btn btn-primary mb-3"><i class="fas fa-plus"></i> Agregar Proveedor</button>
        <div id="providers-table-container">
            ${ui.renderTable(providers, [
                { key: 'id', label: 'ID', numeric: true },
                { key: 'name', label: 'Nombre' },
                { key: 'ruc', label: 'RUC' },
                { key: 'contact', label: 'Contacto' },
                { key: 'phone', label: 'Teléfono' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Dirección' }
            ], [], { defaultMessage: 'No hay proveedores registrados.', tableId: 'providers-table' })}
        </div>
    `;
    contentArea.querySelector('#add-provider-btn')?.addEventListener('click', () => {
        addProviderModal();
    });
}

function addProviderModal() {
    const formHTML = `
        <form id="add-provider-form">
            <div class="input-group">
                <label for="provider-name">Nombre:<span class="text-danger">*</span></label>
                <input type="text" id="provider-name" name="name" required>
            </div>
            <div class="input-group">
                <label for="provider-ruc">RUC:<span class="text-danger">*</span></label>
                <input type="text" id="provider-ruc" name="ruc" required>
            </div>
            <div class="input-group">
                <label for="provider-contact">Contacto:</label>
                <input type="text" id="provider-contact" name="contact">
            </div>
            <div class="input-group">
                <label for="provider-phone">Teléfono:</label>
                <input type="text" id="provider-phone" name="phone">
            </div>
            <div class="input-group">
                <label for="provider-email">Email:</label>
                <input type="email" id="provider-email" name="email">
            </div>
            <div class="input-group">
                <label for="provider-address">Dirección:</label>
                <input type="text" id="provider-address" name="address">
            </div>
            <div id="add-provider-error" class="error-message" style="display: none;"></div>
        </form>
    `;
    const handleConfirm = () => {
        const form = document.getElementById('add-provider-form');
        const errorDiv = document.getElementById('add-provider-error');
        if (!form || !errorDiv) return false;
        errorDiv.style.display = 'none';
        if (!form.checkValidity()) {
            errorDiv.textContent = 'Complete los campos obligatorios.';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return false;
        }
        const formData = new FormData(form);
        const newProvider = {
            name: formData.get('name'),
            ruc: formData.get('ruc'),
            contact: formData.get('contact'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address')
        };
        try {
            data.addProvider(newProvider);
            ui.closeModal();
            ui.reloadCurrentView();
            return true;
        } catch (error) {
            errorDiv.textContent = `Error al guardar: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    ui.openModal('Agregar Proveedor', formHTML, true, 'Registrar', 'medium', handleConfirm);
}

// --- NUEVO: Sección Bóveda con formato Excel ---
export function loadVaultSection(contentArea, sectionTitleElement) {
    sectionTitleElement.textContent = 'Bóveda (Formato Excel)';
    const vaultData = data.dummyData.vault || [];
    // Agregar numeración y columnas requeridas
    const formattedVaultData = vaultData.map((row, i) => ({
        rowNumber: i + 1,
        reportNumber: row.reportNumber || '',
        id: row.id || '',
        date: row.date || '',
        cashBox: row.cashBox || '',
        status: row.status || '',
        branch: row.branch || '',
        user: row.user || '',
        initialBalance: row.initialBalance || '',
        bills: row.bills || '',
        payments: row.payments || '',
        companyPayments: row.companyPayments || '',
        incomes: row.incomes || '',
        totalIncomes: row.totalIncomes || '',
        disbursements: row.disbursements || '',
        expenses: row.expenses || '',
        totalExpenses: row.totalExpenses || '',
        missing: row.missing || '',
        surplus: row.surplus || '',
        closingBalance: row.closingBalance || '',
        closing: row.closing || '',
        bankCompanyPayments: row.bankCompanyPayments || '',
        // Para acción editar
        editId: row.id || ''
    }));
    const columns = [
        { key: 'rowNumber', label: 'N°', numeric: true },
        { key: 'reportNumber', label: 'N° de reporte' },
        { key: 'id', label: 'N° ID' },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'cashBox', label: 'Caja' },
        { key: 'status', label: 'Estado' },
        { key: 'branch', label: 'Agencia' },
        { key: 'user', label: 'Usuario' },
        { key: 'initialBalance', label: 'Saldo Inicial', format: 'currency', numeric: true },
        { key: 'bills', label: 'Billetaje' },
        { key: 'payments', label: 'Abonos', format: 'currency', numeric: true },
        { key: 'companyPayments', label: 'Abonos empresa', format: 'currency', numeric: true },
        { key: 'incomes', label: 'Ingresos', format: 'currency', numeric: true },
        { key: 'totalIncomes', label: 'Total de ingresos', format: 'currency', numeric: true },
        { key: 'disbursements', label: 'Desembolsos', format: 'currency', numeric: true },
        { key: 'expenses', label: 'Egresos', format: 'currency', numeric: true },
        { key: 'totalExpenses', label: 'Total de Egresos', format: 'currency', numeric: true },
        { key: 'missing', label: 'Faltante', format: 'currency', numeric: true },
        { key: 'surplus', label: 'Sobrante', format: 'currency', numeric: true },
        { key: 'closingBalance', label: 'Saldo Cierre', format: 'currency', numeric: true },
        { key: 'closing', label: 'Cierre' },
        { key: 'bankCompanyPayments', label: 'Abonos Emp. Banca.', format: 'currency', numeric: true },
        { key: 'editId', label: 'Editar', center: true, format: (id) => `<button class="btn btn-info btn-sm" data-action="editar-vault" data-id="${id}"><i class="fas fa-edit"></i></button>` }
    ];
    contentArea.innerHTML = `
        <h3><i class="fas fa-vault"></i> Estado de Bóveda</h3>
        <button id="export-vault-excel" class="btn btn-success mb-3"><i class="fas fa-file-excel"></i> Exportar a Excel</button>
        <div id="vault-table-container">
            ${ui.renderTable(formattedVaultData, columns, [], { defaultMessage: 'No hay movimientos de bóveda.', tableId: 'vault-table' })}
        </div>
    `;
    contentArea.querySelector('#export-vault-excel')?.addEventListener('click', () => {
        exportVaultToExcel(formattedVaultData);
    });
    // Listener para editar (simulado)
    contentArea.querySelector('#vault-table-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="editar-vault"]');
        if (btn) {
            const id = btn.getAttribute('data-id');
            alert('Función de edición de bóveda para ID: ' + id + ' (por implementar)');
        }
    });
}

function exportVaultToExcel(vaultData) {
    // Simulación: exportar a CSV (puedes reemplazar por librería real de Excel si lo deseas)
    let csv = 'Fecha,Concepto,Entrada,Salida,Saldo\n';
    vaultData.forEach(row => {
        csv += `${row.date},${row.concept},${row.entry || ''},${row.exit || ''},${row.balance || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boveda.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Carga la vista para abrir o cerrar caja del analista
 * NUEVA FUNCIÓN según PDF "USUARIO ANALISTA.pdf"
 */
export function loadOpenCloseCashBoxView(contentArea, sectionTitleElement) {
    console.log("Cargando vista Abrir/Cerrar Caja (Analista)...");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Gestión de Caja - Analista';
    
    // Determinar si la caja está actualmente abierta para este analista
    const isCashBoxOpen = checkCashBoxStatus(currentUser.username);
    const lastOperation = getLastCashBoxOperation(currentUser.username);
    const today = data.HOY_SIMULADO;
    
    // Obtener los movimientos de caja del día para este analista
    const todayMovements = getCashBoxMovements(currentUser.username, today);
    
    // Calcular totales
    const totalIncome = todayMovements
        .filter(mov => mov.type === 'income')
        .reduce((sum, mov) => sum + mov.amount, 0);
        
    const totalExpense = todayMovements
        .filter(mov => mov.type === 'expense')
        .reduce((sum, mov) => sum + mov.amount, 0);
        
    // Saldo inicial (simulado)
    const initialBalance = lastOperation?.closingBalance || 0;
    
    // Saldo actual
    const currentBalance = initialBalance + totalIncome - totalExpense;
    
    contentArea.innerHTML = `
        <div class="cashbox-container">
            <div class="data-report-section">
                <h3>
                    <i class="fas fa-cash-register"></i> 
                    ${isCashBoxOpen ? 'Caja Abierta - Operaciones del Día' : 'Caja Cerrada'}
                </h3>
                
                <div class="dashboard-grid dashboard-grid-financial">
                    <div class="kpi-card kpi-primary">
                        <h4><i class="fas fa-wallet"></i> Saldo Inicial</h4>
                        <div class="kpi-value">${utils.formatCurrency(initialBalance)}</div>
                        <p class="kpi-description">${isCashBoxOpen ? 'Apertura de hoy' : 'Último cierre'}</p>
                    </div>
                    <div class="kpi-card kpi-success">
                        <h4><i class="fas fa-arrow-down"></i> Ingresos</h4>
                        <div class="kpi-value">${utils.formatCurrency(totalIncome)}</div>
                        <p class="kpi-description">${todayMovements.filter(m => m.type === 'income').length} movimiento(s)</p>
                    </div>
                    <div class="kpi-card kpi-danger">
                        <h4><i class="fas fa-arrow-up"></i> Egresos</h4>
                        <div class="kpi-value">${utils.formatCurrency(totalExpense)}</div>
                        <p class="kpi-description">${todayMovements.filter(m => m.type === 'expense').length} movimiento(s)</p>
                    </div>
                    <div class="kpi-card kpi-info">
                        <h4><i class="fas fa-balance-scale"></i> Saldo Actual</h4>
                        <div class="kpi-value">${utils.formatCurrency(currentBalance)}</div>
                        <p class="kpi-description">Calculado</p>
                    </div>
                </div>
                
                <div class="form-actions mt-3">
                    ${isCashBoxOpen 
                        ? `<button id="close-cashbox-btn" class="btn btn-danger"><i class="fas fa-door-closed"></i> Cerrar Caja</button>
                           <button id="register-movement-btn" class="btn btn-primary"><i class="fas fa-plus-circle"></i> Registrar Movimiento</button>`
                        : `<button id="open-cashbox-btn" class="btn btn-success"><i class="fas fa-door-open"></i> Abrir Caja</button>`
                    }
                </div>
            </div>
            
            ${isCashBoxOpen ? `
                <div class="data-report-section mt-3">
                    <h4><i class="fas fa-exchange-alt"></i> Movimientos del Día</h4>
                    ${renderCashMovementsTable(todayMovements)}
                </div>
                
                <div class="data-report-section mt-3">
                    <h4><i class="fas fa-coins"></i> Detalle de Denominaciones</h4>
                    <div class="row">
                        <div class="col-md-6">
                            ${renderDenominationsForm(currentBalance)}
                        </div>
                        <div class="col-md-6">
                            <div class="panel panel-default">
                                <div class="panel-heading">
                                    <h5 class="panel-title">Resumen de Efectivo</h5>
                                </div>
                                <div class="panel-body">
                                    <p><strong>Saldo Actual Calculado:</strong> ${utils.formatCurrency(currentBalance)}</p>
                                    <p><strong>Total en Denominaciones:</strong> <span id="total-denominations">${utils.formatCurrency(0)}</span></p>
                                    <p><strong>Diferencia:</strong> <span id="denominations-difference">${utils.formatCurrency(currentBalance)}</span></p>
                                    
                                    <div id="discrepancy-section" style="display: none;">
                                        <div class="alert alert-warning">
                                            <i class="fas fa-exclamation-triangle"></i> Se ha detectado una diferencia entre el saldo calculado y el conteo físico de efectivo.
                                        </div>
                                        <button id="add-discrepancy-btn" class="btn btn-warning">
                                            <i class="fas fa-exclamation-circle"></i> Registrar Sobrante/Faltante
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle"></i> Debe abrir la caja para registrar operaciones del día.
                </div>
            `}
        </div>
    `;
    
    // Configurar los listeners para los botones y formularios
    setupCashBoxListeners(contentArea, isCashBoxOpen, currentUser, currentBalance);
}

/**
 * Verifica si la caja está abierta para un analista
 */
function checkCashBoxStatus(analystUsername) {
    // En una aplicación real, esto se verificaría en la base de datos
    // Para esta simulación, buscaremos en el arreglo de cash_box_operations
    if (!data.dummyData.cash_box_operations) {
        data.dummyData.cash_box_operations = [];
    }
    
    const analystOperations = data.dummyData.cash_box_operations
        .filter(op => op.analystUsername === analystUsername)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    // Si hay operaciones y la última es de apertura, la caja está abierta
    if (analystOperations.length > 0) {
        return analystOperations[0].operationType === 'open';
    }
    
    return false; // Por defecto, la caja está cerrada
}

/**
 * Obtiene la última operación de caja para un analista
 */
function getLastCashBoxOperation(analystUsername) {
    if (!data.dummyData.cash_box_operations) {
        return null;
    }
    
    const analystOperations = data.dummyData.cash_box_operations
        .filter(op => op.analystUsername === analystUsername)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    return analystOperations.length > 0 ? analystOperations[0] : null;
}

/**
 * Obtiene los movimientos de caja para un analista en una fecha específica
 */
function getCashBoxMovements(analystUsername, date) {
    if (!data.dummyData.cash_movements) {
        data.dummyData.cash_movements = [];
    }
    
    return data.dummyData.cash_movements
        .filter(mov => mov.analystUsername === analystUsername && mov.date === date)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Renderiza la tabla de movimientos de caja
 */
function renderCashMovementsTable(movements) {
    if (movements.length === 0) {
        return '<p class="text-center"><em>No hay movimientos registrados hoy.</em></p>';
    }
    
    let html = `
        <div class="table-responsive">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Concepto</th>
                        <th>Referencia</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Método</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    movements.forEach(mov => {
        const typeClass = mov.type === 'income' ? 'text-success' : 'text-danger';
        const typeIcon = mov.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
        const typeText = mov.type === 'income' ? 'Ingreso' : 'Egreso';
        
        html += `
            <tr>
                <td>${mov.time}</td>
                <td>${mov.concept}</td>
                <td>${mov.reference || '-'}</td>
                <td><i class="fas ${typeIcon} ${typeClass}"></i> ${typeText}</td>
                <td class="${typeClass} text-right">${utils.formatCurrency(mov.amount)}</td>
                <td>${mov.method}</td>
                <td>${mov.observations || '-'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

/**
 * Renderiza el formulario de denominaciones
 */
function renderDenominationsForm(currentBalance) {
    return `
        <div class="panel panel-default">
            <div class="panel-heading">
                <h5 class="panel-title">Conteo de Denominaciones</h5>
            </div>
            <div class="panel-body">
                <form id="denominations-form">
                    <table class="styled-table">
                        <thead>
                            <tr>
                                <th>Denominación</th>
                                <th>Cantidad</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>S/ 200</td>
                                <td><input type="number" class="denomination-input" data-value="200" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 100</td>
                                <td><input type="number" class="denomination-input" data-value="100" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 50</td>
                                <td><input type="number" class="denomination-input" data-value="50" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 20</td>
                                <td><input type="number" class="denomination-input" data-value="20" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 10</td>
                                <td><input type="number" class="denomination-input" data-value="10" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 5</td>
                                <td><input type="number" class="denomination-input" data-value="5" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 2</td>
                                <td><input type="number" class="denomination-input" data-value="2" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 1</td>
                                <td><input type="number" class="denomination-input" data-value="1" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 0.50</td>
                                <td><input type="number" class="denomination-input" data-value="0.5" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 0.20</td>
                                <td><input type="number" class="denomination-input" data-value="0.2" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 0.10</td>
                                <td><input type="number" class="denomination-input" data-value="0.1" min="0" value="0"></td>
                                <td class="subtotal text-right">S/ 0.00</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" class="text-right"><strong>TOTAL:</strong></td>
                                <td id="denomination-total" class="text-right"><strong>S/ 0.00</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </form>
            </div>
        </div>
    `;
}

/**
 * Configura los listeners para la funcionalidad de caja
 */
function setupCashBoxListeners(contentArea, isCashBoxOpen, currentUser, currentBalance) {
    // Listener para abrir caja
    const openCashBoxBtn = contentArea.querySelector('#open-cashbox-btn');
    if (openCashBoxBtn) {
        openCashBoxBtn.addEventListener('click', () => {
            showOpenCashBoxModal(currentUser);
        });
    }
    
    // Listener para cerrar caja
    const closeCashBoxBtn = contentArea.querySelector('#close-cashbox-btn');
    if (closeCashBoxBtn) {
        closeCashBoxBtn.addEventListener('click', () => {
            showCloseCashBoxModal(currentUser, currentBalance);
        });
    }
    
    // Listener para registrar movimiento
    const registerMovementBtn = contentArea.querySelector('#register-movement-btn');
    if (registerMovementBtn) {
        registerMovementBtn.addEventListener('click', () => {
            showRegisterMovementModal(currentUser);
        });
    }
    
    // Listener para registrar discrepancia
    const addDiscrepancyBtn = contentArea.querySelector('#add-discrepancy-btn');
    if (addDiscrepancyBtn) {
        addDiscrepancyBtn.addEventListener('click', () => {
            showDiscrepancyModal(currentUser);
        });
    }
    
    // Listeners para las entradas de denominaciones
    if (isCashBoxOpen) {
        const denominationInputs = contentArea.querySelectorAll('.denomination-input');
        denominationInputs.forEach(input => {
            input.addEventListener('input', () => {
                calculateDenominations(contentArea, currentBalance);
            });
        });
    }
}

/**
 * Muestra el modal para abrir caja
 */
function showOpenCashBoxModal(currentUser) {
    const today = utils.formatDate(data.HOY_SIMULADO);
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    const modalHTML = `
        <form id="open-cashbox-form">
            <p>Está por abrir la caja para las operaciones del día <strong>${today}</strong>.</p>
            
            <div class="input-group">
                <label for="open-date">Fecha:</label>
                <input type="date" id="open-date" name="date" value="${data.HOY_SIMULADO}" readonly>
            </div>
            
            <div class="input-group">
                <label for="open-time">Hora:</label>
                <input type="time" id="open-time" name="time" value="${currentTime}" readonly>
            </div>
            
            <div class="input-group">
                <label for="open-initial-balance">Saldo Inicial (S/):</label>
                <input type="number" id="open-initial-balance" name="initialBalance" step="0.01" min="0" required>
                <small>Ingrese el monto con el que inicia operaciones.</small>
            </div>
            
            <div class="input-group">
                <label for="open-notes">Observaciones:</label>
                <textarea id="open-notes" name="notes" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('open-cashbox-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        const initialBalance = parseFloat(form.querySelector('#open-initial-balance').value);
        const notes = form.querySelector('#open-notes').value;
        
        // Registrar apertura de caja
        if (!data.dummyData.cash_box_operations) {
            data.dummyData.cash_box_operations = [];
        }
        
        data.dummyData.cash_box_operations.push({
            id: Date.now(),
            date: data.HOY_SIMULADO,
            time: currentTime,
            analystUsername: currentUser.username,
            branch: currentUser.branch,
            operationType: 'open',
            initialBalance: initialBalance,
            closingBalance: initialBalance, // Al abrir, el saldo de cierre es igual al inicial
            notes: notes,
            status: 'active'
        });
        
        ui.showNotification('success', 'Caja abierta correctamente', 3000);
        ui.reloadCurrentView();
        return true;
    };
    
    ui.openModal('Abrir Caja', modalHTML, true, 'Abrir Caja', 'small', handleConfirm);
}

/**
 * Muestra el modal para cerrar caja
 */
function showCloseCashBoxModal(currentUser, currentBalance) {
    const today = utils.formatDate(data.HOY_SIMULADO);
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    // Obtener la apertura de caja del día
    const openOperation = data.dummyData.cash_box_operations
        .filter(op => op.analystUsername === currentUser.username && op.date === data.HOY_SIMULADO && op.operationType === 'open')
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))[0];
    
    if (!openOperation) {
        ui.showNotification('error', 'No se encontró registro de apertura de caja para hoy', 3000);
        return;
    }
    
    const initialBalance = openOperation.initialBalance;
    
    const modalHTML = `
        <form id="close-cashbox-form">
            <p>Está por cerrar la caja para las operaciones del día <strong>${today}</strong>.</p>
            
            <div class="input-group">
                <label for="close-date">Fecha:</label>
                <input type="date" id="close-date" name="date" value="${data.HOY_SIMULADO}" readonly>
            </div>
            
            <div class="input-group">
                <label for="close-time">Hora:</label>
                <input type="time" id="close-time" name="time" value="${currentTime}" readonly>
            </div>
            
            <div class="input-group">
                <label for="close-initial-balance">Saldo Inicial:</label>
                <input type="text" id="close-initial-balance" value="${utils.formatCurrency(initialBalance)}" readonly>
            </div>
            
            <div class="input-group">
                <label for="close-calculated-balance">Saldo Calculado:</label>
                <input type="text" id="close-calculated-balance" value="${utils.formatCurrency(currentBalance)}" readonly>
            </div>
            
            <div class="input-group">
                <label for="close-physical-count">Conteo Físico (S/):</label>
                <input type="number" id="close-physical-count" name="physicalCount" step="0.01" min="0" required>
                <small>Ingrese el total del conteo físico del efectivo.</small>
            </div>
            
            <div class="input-group" id="difference-group" style="display: none;">
                <label for="close-difference">Diferencia:</label>
                <input type="text" id="close-difference" readonly>
            </div>
            
            <div class="input-group">
                <label for="close-notes">Observaciones:</label>
                <textarea id="close-notes" name="notes" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('close-cashbox-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        const physicalCount = parseFloat(form.querySelector('#close-physical-count').value);
        const notes = form.querySelector('#close-notes').value;
        const difference = physicalCount - currentBalance;
        
        // Si hay diferencia significativa, preguntar si quiere continuar
        if (Math.abs(difference) > 1) {
            const confirmContinue = confirm(`Hay una diferencia de ${utils.formatCurrency(difference)} entre el saldo calculado y el conteo físico. ¿Desea continuar con el cierre de caja?`);
            if (!confirmContinue) {
                return false;
            }
        }
        
        // Registrar cierre de caja
        if (!data.dummyData.cash_box_operations) {
            data.dummyData.cash_box_operations = [];
        }
        
        // Actualizar la operación de apertura como cerrada
        openOperation.status = 'closed';
        
        // Agregar la operación de cierre
        data.dummyData.cash_box_operations.push({
            id: Date.now(),
            date: data.HOY_SIMULADO,
            time: currentTime,
            analystUsername: currentUser.username,
            branch: currentUser.branch,
            operationType: 'close',
            initialBalance: initialBalance,
            calculatedBalance: currentBalance,
            physicalCount: physicalCount,
            difference: difference,
            closingBalance: physicalCount, // El saldo final es el conteo físico
            notes: notes,
            status: 'completed'
        });
        
        // Si hay diferencia, registrarla como discrepancia
        if (Math.abs(difference) > 0) {
            registerDiscrepancy(currentUser, difference, notes);
        }
        
        ui.showNotification('success', 'Caja cerrada correctamente', 3000);
        ui.reloadCurrentView();
        return true;
    };
    
    ui.openModal('Cerrar Caja', modalHTML, true, 'Cerrar Caja', 'medium', handleConfirm);
    
    // Agregar listener para el cálculo de diferencia
    const physicalCountInput = document.getElementById('close-physical-count');
    const differenceGroup = document.getElementById('difference-group');
    const differenceInput = document.getElementById('close-difference');
    
    physicalCountInput?.addEventListener('input', () => {
        const physicalCount = parseFloat(physicalCountInput.value) || 0;
        const difference = physicalCount - currentBalance;
        
        if (differenceGroup && differenceInput) {
            differenceGroup.style.display = 'block';
            differenceInput.value = utils.formatCurrency(difference);
            
            // Cambiar color según el tipo de diferencia
            if (difference < 0) {
                differenceInput.classList.add('text-danger');
                differenceInput.classList.remove('text-success');
            } else if (difference > 0) {
                differenceInput.classList.add('text-success');
                differenceInput.classList.remove('text-danger');
            } else {
                differenceInput.classList.remove('text-danger', 'text-success');
            }
        }
    });
}

/**
 * Calcula los totales de denominaciones y muestra la diferencia
 */
function calculateDenominations(contentArea, currentBalance) {
    const denominationInputs = contentArea.querySelectorAll('.denomination-input');
    const denominationTotal = contentArea.querySelector('#denomination-total');
    const totalDenominations = contentArea.querySelector('#total-denominations');
    const denominationsDifference = contentArea.querySelector('#denominations-difference');
    const discrepancySection = contentArea.querySelector('#discrepancy-section');
    
    let total = 0;
    
    denominationInputs.forEach(input => {
        const value = parseFloat(input.dataset.value) || 0;
        const quantity = parseInt(input.value) || 0;
        const subtotal = value * quantity;
        
        total += subtotal;
        
        // Actualizar el subtotal en la fila correspondiente
        const subtotalCell = input.closest('tr').querySelector('.subtotal');
        if (subtotalCell) {
            subtotalCell.textContent = utils.formatCurrency(subtotal);
        }
    });
    
    // Actualizar el total de denominaciones
    if (denominationTotal) {
        denominationTotal.textContent = utils.formatCurrency(total);
    }
    
    // Actualizar el total de denominaciones y la diferencia
    if (totalDenominations && denominationsDifference) {
        totalDenominations.textContent = utils.formatCurrency(total);
        
        const difference = currentBalance - total;
        denominationsDifference.textContent = utils.formatCurrency(difference);
        
        // Cambiar color según el tipo de diferencia
        if (difference < 0) {
            denominationsDifference.classList.add('text-danger');
            denominationsDifference.classList.remove('text-success');
        } else if (difference > 0) {
            denominationsDifference.classList.add('text-danger');
            denominationsDifference.classList.remove('text-success');
        } else {
            denominationsDifference.classList.remove('text-danger', 'text-success');
        }
        
        // Mostrar/ocultar la sección de discrepancia
        if (discrepancySection) {
            discrepancySection.style.display = Math.abs(difference) > 0 ? 'block' : 'none';
        }
    }
}

/**
 * Muestra el modal para registrar un movimiento de caja
 */
function showRegisterMovementModal(currentUser) {
    const today = utils.formatDate(data.HOY_SIMULADO);
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    const modalHTML = `
        <form id="register-movement-form">
            <div class="input-group">
                <label for="movement-date">Fecha:</label>
                <input type="date" id="movement-date" name="date" value="${data.HOY_SIMULADO}" readonly>
            </div>
            
            <div class="input-group">
                <label for="movement-time">Hora:</label>
                <input type="time" id="movement-time" name="time" value="${currentTime}" readonly>
            </div>
            
            <div class="input-group">
                <label for="movement-type">Tipo de Movimiento:</label>
                <select id="movement-type" name="type" required>
                    <option value="">-- Seleccione --</option>
                    <option value="income">Ingreso</option>
                    <option value="expense">Egreso</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="movement-concept">Concepto:</label>
                <select id="movement-concept" name="concept" required>
                    <option value="">-- Seleccione --</option>
                    <optgroup label="Ingresos">
                        <option value="Abono de Cliente" class="income-option">Abono de Cliente</option>
                        <option value="Entrega de Tesorería" class="income-option">Entrega de Tesorería</option>
                        <option value="Otros Ingresos" class="income-option">Otros Ingresos</option>
                    </optgroup>
                    <optgroup label="Egresos">
                        <option value="Desembolso Crédito" class="expense-option">Desembolso Crédito</option>
                        <option value="Devolución de Exceso" class="expense-option">Devolución de Exceso</option>
                        <option value="Gastos Operativos" class="expense-option">Gastos Operativos</option>
                        <option value="Entrega a Tesorería" class="expense-option">Entrega a Tesorería</option>
                        <option value="Viáticos" class="expense-option">Viáticos</option>
                        <option value="Otros Egresos" class="expense-option">Otros Egresos</option>
                    </optgroup>
                </select>
            </div>
            
            <div class="input-group">
                <label for="movement-reference">Referencia:</label>
                <input type="text" id="movement-reference" name="reference" placeholder="N° Servicio, DNI cliente, etc.">
            </div>
            
            <div class="input-group">
                <label for="movement-amount">Monto (S/):</label>
                <input type="number" id="movement-amount" name="amount" step="0.01" min="0.01" required>
            </div>
            
            <div class="input-group">
                <label for="movement-method">Método:</label>
                <select id="movement-method" name="method" required>
                    <option value="">-- Seleccione --</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Yape">Yape</option>
                    <option value="Depósito">Depósito Bancario</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="movement-observations">Observaciones:</label>
                <textarea id="movement-observations" name="observations" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('register-movement-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        const type = form.querySelector('#movement-type').value;
        const concept = form.querySelector('#movement-concept').value;
        const reference = form.querySelector('#movement-reference').value;
        const amount = parseFloat(form.querySelector('#movement-amount').value);
        const method = form.querySelector('#movement-method').value;
        const observations = form.querySelector('#movement-observations').value;
        
        // Registrar movimiento de caja
        if (!data.dummyData.cash_movements) {
            data.dummyData.cash_movements = [];
        }
        
        data.dummyData.cash_movements.push({
            id: Date.now(),
            date: data.HOY_SIMULADO,
            time: currentTime,
            analystUsername: currentUser.username,
            branch: currentUser.branch,
            type: type,
            concept: concept,
            reference: reference,
            amount: amount,
            method: method,
            observations: observations
        });
        
        ui.showNotification('success', 'Movimiento registrado correctamente', 3000);
        ui.reloadCurrentView();
        return true;
    };
    
    ui.openModal('Registrar Movimiento de Caja', modalHTML, true, 'Registrar', 'medium', handleConfirm);
    
    // Manejar la visibilidad de opciones según el tipo de movimiento
    const movementType = document.getElementById('movement-type');
    const movementConcept = document.getElementById('movement-concept');
    
    const updateConceptOptions = () => {
        const type = movementType.value;
        
        const incomeOptions = movementConcept.querySelectorAll('.income-option');
        const expenseOptions = movementConcept.querySelectorAll('.expense-option');
        
        incomeOptions.forEach(option => {
            option.style.display = type === 'income' ? '' : 'none';
        });
        
        expenseOptions.forEach(option => {
            option.style.display = type === 'expense' ? '' : 'none';
        });
        
        // Resetear la selección
        movementConcept.value = '';
    };
    
    movementType?.addEventListener('change', updateConceptOptions);
    
    // Inicializar
    updateConceptOptions();
}

/**
 * Muestra el modal para registrar una discrepancia (sobrante/faltante)
 */
export function showDiscrepancyModal(currentUser) {
    const today = utils.formatDate(data.HOY_SIMULADO);
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    // Obtener el saldo actual calculado
    const cashMovements = getCashBoxMovements(currentUser.username, data.HOY_SIMULADO);
    const openOperation = data.dummyData.cash_box_operations
        .filter(op => op.analystUsername === currentUser.username && op.date === data.HOY_SIMULADO && op.operationType === 'open')
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))[0];
    
    const initialBalance = openOperation?.initialBalance || 0;
    const totalIncome = cashMovements
        .filter(mov => mov.type === 'income')
        .reduce((sum, mov) => sum + mov.amount, 0);
    const totalExpense = cashMovements
        .filter(mov => mov.type === 'expense')
        .reduce((sum, mov) => sum + mov.amount, 0);
    const currentBalance = initialBalance + totalIncome - totalExpense;
    
    // Obtener el total de denominaciones
    const denomForm = document.getElementById('denominations-form');
    let physicalCount = 0;
    
    if (denomForm) {
        const inputs = denomForm.querySelectorAll('.denomination-input');
        inputs.forEach(input => {
            const value = parseFloat(input.dataset.value) || 0;
            const quantity = parseInt(input.value) || 0;
            physicalCount += value * quantity;
        });
    }
    
    const difference = physicalCount - currentBalance;
    const discrepancyType = difference > 0 ? 'surplus' : 'shortage';
    
    const modalHTML = `
        <form id="discrepancy-form">
            <p>Registrar ${discrepancyType === 'surplus' ? 'Sobrante' : 'Faltante'} de Caja</p>
            
            <div class="input-group">
                <label for="discrepancy-date">Fecha:</label>
                <input type="date" id="discrepancy-date" name="date" value="${data.HOY_SIMULADO}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-time">Hora:</label>
                <input type="time" id="discrepancy-time" name="time" value="${currentTime}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-type">Tipo:</label>
                <input type="text" id="discrepancy-type" value="${discrepancyType === 'surplus' ? 'Sobrante' : 'Faltante'}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-calculated">Saldo Calculado:</label>
                <input type="text" id="discrepancy-calculated" value="${utils.formatCurrency(currentBalance)}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-physical">Conteo Físico:</label>
                <input type="text" id="discrepancy-physical" value="${utils.formatCurrency(physicalCount)}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-amount">Monto de ${discrepancyType === 'surplus' ? 'Sobrante' : 'Faltante'}:</label>
                <input type="text" id="discrepancy-amount" value="${utils.formatCurrency(Math.abs(difference))}" readonly>
            </div>
            
            <div class="input-group">
                <label for="discrepancy-reason">Motivo:</label>
                <select id="discrepancy-reason" name="reason" required>
                    <option value="">-- Seleccione --</option>
                    <option value="Error en conteo">Error en conteo</option>
                    <option value="Error en registro">Error en registro de operación</option>
                    <option value="Vuelto incorrecto">Vuelto incorrecto</option>
                    <option value="Billetes falsos">Billetes/monedas falsos</option>
                    <option value="Otro">Otro (especificar)</option>
                </select>
            </div>
            
            <div class="input-group" id="other-reason-group" style="display: none;">
                <label for="discrepancy-other-reason">Especifique:</label>
                <input type="text" id="discrepancy-other-reason" name="otherReason">
            </div>
            
            <div class="input-group">
                <label for="discrepancy-observations">Observaciones adicionales:</label>
                <textarea id="discrepancy-observations" name="observations" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('discrepancy-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        const reason = form.querySelector('#discrepancy-reason').value;
        const otherReason = form.querySelector('#discrepancy-other-reason')?.value;
        const observations = form.querySelector('#discrepancy-observations').value;
        
        // Registrar la discrepancia
        registerDiscrepancy(
            currentUser, 
            difference, 
            observations, 
            reason === 'Otro' ? otherReason : reason
        );
        
        ui.showNotification('success', 'Discrepancia registrada correctamente', 3000);
        ui.reloadCurrentView();
        return true;
    };
    
    ui.openModal('Registrar Discrepancia', modalHTML, true, 'Registrar', 'medium', handleConfirm);
    
    // Manejar el campo "Otro motivo"
    const reasonSelect = document.getElementById('discrepancy-reason');
    const otherReasonGroup = document.getElementById('other-reason-group');
    const otherReasonInput = document.getElementById('discrepancy-other-reason');
    
    reasonSelect?.addEventListener('change', () => {
        if (reasonSelect.value === 'Otro') {
            otherReasonGroup.style.display = 'block';
            otherReasonInput.required = true;
        } else {
            otherReasonGroup.style.display = 'none';
            otherReasonInput.required = false;
            otherReasonInput.value = '';
        }
    });
}

/**
 * Registra una discrepancia (sobrante/faltante)
 */
function registerDiscrepancy(currentUser, amount, notes = '', reason = '') {
    if (!data.dummyData.cash_discrepancies) {
        data.dummyData.cash_discrepancies = [];
    }
    
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    data.dummyData.cash_discrepancies.push({
        id: Date.now(),
        date: data.HOY_SIMULADO,
        time: currentTime,
        analystUsername: currentUser.username,
        branch: currentUser.branch,
        type: amount > 0 ? 'surplus' : 'shortage',
        amount: Math.abs(amount),
        reason: reason,
        notes: notes,
        status: 'pending'
    });
    
    console.log(`Discrepancia registrada para ${currentUser.username}: ${amount > 0 ? 'Sobrante' : 'Faltante'} de ${utils.formatCurrency(Math.abs(amount))}`);
}

/**
 * Carga la vista para solicitar efectivo
 * NUEVA FUNCIÓN según PDF "USUARIO ANALISTA.pdf"
 */
export function loadRequestCashView(contentArea, sectionTitleElement) {
    console.log("Cargando vista Solicitar Efectivo (Analista)...");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Solicitar Efectivo';
    
    // Verificar si la caja está abierta
    const isCashBoxOpen = checkCashBoxStatus(currentUser.username);
    
    contentArea.innerHTML = `
        <div class="cash-request-container">
            <div class="data-report-section">
                <h3><i class="fas fa-hand-holding-usd"></i> Solicitud de Efectivo - Tesorería</h3>
                
                ${!isCashBoxOpen ? `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> La caja no está abierta. Debe abrir la caja para solicitar efectivo.
                    </div>
                    <button class="btn btn-primary" data-action="nav-caja">
                        <i class="fas fa-door-open"></i> Ir a Abrir Caja
                    </button>
                ` : `
                    <form id="cash-request-form" class="app-form">
                        <div class="input-group">
                            <label for="request-date">Fecha:</label>
                            <input type="date" id="request-date" name="date" value="${data.HOY_SIMULADO}" readonly>
                        </div>
                        
                        <div class="input-group">
                            <label for="request-amount">Monto Solicitado (S/):</label>
                            <input type="number" id="request-amount" name="amount" step="0.01" min="1" required>
                            <small>Ingrese el monto que necesita para sus operaciones.</small>
                        </div>
                        
                        <div class="input-group">
                            <label for="request-reason">Motivo:</label>
                            <select id="request-reason" name="reason" required>
                                <option value="">-- Seleccione --</option>
                                <option value="Desembolso">Desembolso de crédito</option>
                                <option value="Ruta">Efectivo para ruta</option>
                                <option value="Apertura">Saldo para apertura</option>
                                <option value="Otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="input-group" id="other-reason-group" style="display: none;">
                            <label for="request-other-reason">Especifique:</label>
                            <input type="text" id="request-other-reason" name="otherReason">
                        </div>
                        
                        <div class="input-group">
                            <label for="request-observations">Observaciones:</label>
                            <textarea id="request-observations" name="observations" rows="2"></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar Solicitud
                            </button>
                        </div>
                    </form>
                    
                    <div class="mt-3">
                        <h4>Solicitudes Recientes</h4>
                        ${renderCashRequestsHistory(currentUser.username)}
                    </div>
                `}
            </div>
        </div>
    `;
    
    // Configurar listeners
    if (isCashBoxOpen) {
        // Listener para "Otro" motivo
        const reasonSelect = contentArea.querySelector('#request-reason');
        const otherReasonGroup = contentArea.querySelector('#other-reason-group');
        const otherReasonInput = contentArea.querySelector('#request-other-reason');
        
        reasonSelect?.addEventListener('change', () => {
            if (reasonSelect.value === 'Otro') {
                otherReasonGroup.style.display = 'block';
                otherReasonInput.required = true;
            } else {
                otherReasonGroup.style.display = 'none';
                otherReasonInput.required = false;
                otherReasonInput.value = '';
            }
        });
        
        // Listener para el formulario
        const form = contentArea.querySelector('#cash-request-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const amount = parseFloat(form.querySelector('#request-amount').value);
            const reason = form.querySelector('#request-reason').value;
            const otherReason = form.querySelector('#request-other-reason')?.value;
            const observations = form.querySelector('#request-observations').value;
            
            // Registrar la solicitud
            registerCashRequest(
                currentUser,
                amount,
                reason === 'Otro' ? otherReason : reason,
                observations
            );
            
            ui.showNotification('success', 'Solicitud enviada correctamente', 3000);
            form.reset();
            
            // Recargar la vista para mostrar la nueva solicitud
            setTimeout(() => {
                ui.reloadCurrentView();
            }, 1000);
        });
    } else {
        // Listener para ir a abrir caja
        contentArea.querySelector('button[data-action="nav-caja"]')?.addEventListener('click', () => {
            loadOpenCloseCashBoxView(contentArea, sectionTitleElement);
        });
    }
}

/**
 * Registra una solicitud de efectivo
 */
function registerCashRequest(currentUser, amount, reason, observations = '') {
    if (!data.dummyData.cash_requests) {
        data.dummyData.cash_requests = [];
    }
    
    data.dummyData.cash_requests.push({
        id: Date.now(),
        date: data.HOY_SIMULADO,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        analystUsername: currentUser.username,
        branch: currentUser.branch,
        amount: amount,
        reason: reason,
        observations: observations,
        status: 'pending',
        approvedBy: null,
        approvalDate: null,
        deliveredBy: null,
        deliveryDate: null
    });
    
    console.log(`Solicitud de efectivo registrada para ${currentUser.username}: ${utils.formatCurrency(amount)}`);
}

/**
 * Renderiza el historial de solicitudes de efectivo
 */
function renderCashRequestsHistory(analystUsername) {
    if (!data.dummyData.cash_requests) {
        data.dummyData.cash_requests = [];
    }
    
    const analystRequests = data.dummyData.cash_requests
        .filter(req => req.analystUsername === analystUsername)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (analystRequests.length === 0) {
        return '<p class="text-center"><em>No hay solicitudes recientes.</em></p>';
    }
    
    let html = `
        <div class="table-responsive">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Aprobado Por</th>
                        <th>Entregado Por</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    analystRequests.forEach(req => {
        const statusClass = req.status === 'pending' ? 'text-warning' : (req.status === 'approved' ? 'text-info' : (req.status === 'delivered' ? 'text-success' : 'text-danger'));
        const statusText = req.status === 'pending' ? 'Pendiente' : (req.status === 'approved' ? 'Aprobado' : (req.status === 'delivered' ? 'Entregado' : 'Rechazado'));
        
        html += `
            <tr>
                <td>${utils.formatDate(req.date)}</td>
                <td class="text-right">${utils.formatCurrency(req.amount)}</td>
                <td>${req.reason}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${req.approvedBy || '-'}</td>
                <td>${req.deliveredBy || '-'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

/**
 * Carga la vista para registrar un egreso
 * NUEVA FUNCIÓN según PDF "USUARIO ANALISTA.pdf"
 */
export function loadRequestExpenseView(contentArea, sectionTitleElement) {
    console.log("Cargando vista Registrar Egreso (Analista)...");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Registrar Egreso';
    
    // Verificar si la caja está abierta
    const isCashBoxOpen = checkCashBoxStatus(currentUser.username);
    
    contentArea.innerHTML = `
        <div class="expense-request-container">
            <div class="data-report-section">
                <h3><i class="fas fa-file-invoice-dollar"></i> Registro de Gastos</h3>
                
                ${!isCashBoxOpen ? `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> La caja no está abierta. Debe abrir la caja para registrar gastos.
                    </div>
                    <button class="btn btn-primary" data-action="nav-caja">
                        <i class="fas fa-door-open"></i> Ir a Abrir Caja
                    </button>
                ` : `
                    <form id="expense-form" class="app-form">
                        <div class="input-group">
                            <label for="expense-date">Fecha:</label>
                            <input type="date" id="expense-date" name="date" value="${data.HOY_SIMULADO}" readonly>
                        </div>
                        
                        <div class="input-group">
                            <label for="expense-type">Tipo de Gasto:</label>
                            <select id="expense-type" name="type" required>
                                <option value="">-- Seleccione --</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Alimentación">Alimentación</option>
                                <option value="Útiles">Útiles/Materiales</option>
                                <option value="Comunicación">Comunicación</option>
                                <option value="Otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="input-group" id="other-expense-type-group" style="display: none;">
                            <label for="expense-other-type">Especifique:</label>
                            <input type="text" id="expense-other-type" name="otherType">
                        </div>
                        
                        <div class="input-group">
                            <label for="expense-description">Descripción:</label>
                            <textarea id="expense-description" name="description" rows="2" required></textarea>
                        </div>
                        
                        <div class="input-group">
                            <label for="expense-amount">Monto (S/):</label>
                            <input type="number" id="expense-amount" name="amount" step="0.01" min="0.01" required>
                        </div>
                        
                        <div class="input-group">
                            <label for="expense-voucher">Comprobante:</label>
                            <input type="file" id="expense-voucher" name="voucherFile">
                            <small>Adjunte una foto/imagen del comprobante si está disponible.</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Registrar Gasto
                            </button>
                        </div>
                    </form>
                    
                    <div class="mt-3">
                        <h4>Gastos Recientes</h4>
                        ${renderExpensesHistory(currentUser.username)}
                    </div>
                `}
            </div>
        </div>
    `;
    
    // Configurar listeners
    if (isCashBoxOpen) {
        // Listener para "Otro" tipo de gasto
        const typeSelect = contentArea.querySelector('#expense-type');
        const otherTypeGroup = contentArea.querySelector('#other-expense-type-group');
        const otherTypeInput = contentArea.querySelector('#expense-other-type');
        
        typeSelect?.addEventListener('change', () => {
            if (typeSelect.value === 'Otro') {
                otherTypeGroup.style.display = 'block';
                otherTypeInput.required = true;
            } else {
                otherTypeGroup.style.display = 'none';
                otherTypeInput.required = false;
                otherTypeInput.value = '';
            }
        });
        
        // Listener para el formulario
        const form = contentArea.querySelector('#expense-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const type = form.querySelector('#expense-type').value;
            const otherType = form.querySelector('#expense-other-type')?.value;
            const description = form.querySelector('#expense-description').value;
            const amount = parseFloat(form.querySelector('#expense-amount').value);
            const voucherFile = form.querySelector('#expense-voucher').files[0];
            
            // Registrar el gasto
            registerExpense(
                currentUser,
                type === 'Otro' ? otherType : type,
                description,
                amount,
                voucherFile?.name || null
            );
            
            // También registrar como movimiento de caja
            registerCashMovement(
                currentUser,
                'expense',
                type === 'Otro' ? otherType : type,
                amount,
                'Efectivo',
                description
            );
            
            ui.showNotification('success', 'Gasto registrado correctamente', 3000);
            form.reset();
            
            // Recargar la vista para mostrar el nuevo gasto
            setTimeout(() => {
                ui.reloadCurrentView();
            }, 1000);
        });
    } else {
        // Listener para ir a abrir caja
        contentArea.querySelector('button[data-action="nav-caja"]')?.addEventListener('click', () => {
            loadOpenCloseCashBoxView(contentArea, sectionTitleElement);
        });
    }
}

/**
 * Registra un gasto
 */
function registerExpense(currentUser, type, description, amount, voucherFile = null) {
    data.addExpense({
        date: data.HOY_SIMULADO,
        type: type,
        description: description,
        amount: amount,
        analyst: currentUser.username,
        branch: currentUser.branch,
        voucherFile: voucherFile
    });
    
    console.log(`Gasto registrado para ${currentUser.username}: ${type} - ${utils.formatCurrency(amount)}`);
}

/**
 * Registra un movimiento de caja
 */
function registerCashMovement(currentUser, type, concept, amount, method, observations = '') {
    if (!data.dummyData.cash_movements) {
        data.dummyData.cash_movements = [];
    }
    
    data.dummyData.cash_movements.push({
        id: Date.now(),
        date: data.HOY_SIMULADO,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        analystUsername: currentUser.username,
        branch: currentUser.branch,
        type: type,
        concept: concept,
        reference: null,
        amount: amount,
        method: method,
        observations: observations
    });
    
    console.log(`Movimiento de caja registrado para ${currentUser.username}: ${type} - ${concept} - ${utils.formatCurrency(amount)}`);
}

/**
 * Renderiza el historial de gastos
 */
function renderExpensesHistory(analystUsername) {
    const analystExpenses = data.dummyData.expenses
        .filter(exp => exp.analyst === analystUsername)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (analystExpenses.length === 0) {
        return '<p class="text-center"><em>No hay gastos recientes.</em></p>';
    }
    
    let html = `
        <div class="table-responsive">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Comprobante</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    analystExpenses.forEach(exp => {
        const hasVoucher = exp.voucherFile ? `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(exp.voucherFile)}"><i class="fas fa-file-alt"></i></a>` : '-';
        
        html += `
            <tr>
                <td>${utils.formatDate(exp.date)}</td>
                <td>${exp.type}</td>
                <td>${exp.description}</td>
                <td class="text-right">${utils.formatCurrency(exp.amount)}</td>
                <td class="text-center">${hasVoucher}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}