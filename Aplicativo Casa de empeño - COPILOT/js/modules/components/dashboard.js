import * as utils from '../utils.js';
import * as data from '../data.js';
import * as ui from '../ui.js';
import { getCurrentUser } from '../auth.js';
// Importar módulos necesarios aunque no se usen directamente aquí,
// ya que las acciones de los botones podrían llamarlos (implícito en ui.js)
import * as approvals from './approvals.js';
import * as branchMgmt from './branchManagement.js';
import * as fieldMonitor from './fieldMonitoring.js';
import * as treasury from './treasury.js';
import * as reports from './reports.js';

console.log('Modulo dashboard.js cargado.');

/**
 * Carga y renderiza el Dashboard del Dueño/Gerente con filtros y KPIs.
 * MODIFICADO: Añadidos KPIs de actividad semanal y menú de funcionalidades gerenciales.
 */
export function loadOwnerDashboard(contentArea, sectionTitleElement) {
    console.log("Cargando Dashboard Dueño/Gerente...");
    const currentUser = getCurrentUser();
    const title = currentUser?.role === 'Dueño' ? 'Dashboard General (Dueño)' : 'Dashboard General (Gerente)';
    sectionTitleElement.textContent = title;

    // Opciones para filtros
    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    const allAnalysts = data.dummyData.users.filter(u => u.role === 'Analista');
    const analystOptions = allAnalysts.map(a => `<option value="${a.username}">${a.username} (${a.branch || 'Sin Suc.'})</option>`).join('');

    // HTML del filtro (Con tipo servicio y fechas de Parte 3)
    contentArea.innerHTML = `
        <div class="filter-bar mb-3">
            <div class="filter-group">
                <label for="dash-filter-branch">Sucursal:</label>
                <select id="dash-filter-branch">
                    <option value="">Todas</option>${branchOptions}
                </select>
            </div>
            <div class="filter-group">
                <label for="dash-filter-analyst">Analista:</label>
                <select id="dash-filter-analyst">
                    <option value="">Todos</option>
                    <option value="null">Sucursal (Sin Analista)</option>
                    ${analystOptions}
                </select>
            </div>
            <div class="filter-group">
                <label for="dash-filter-service-type">Tipo Servicio:</label>
                <select id="dash-filter-service-type">
                    <option value="">Todos</option>
                    <option value="Préstamo">Préstamo</option>
                    <option value="Empeño">Empeño</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="dash-filter-date-start">Fecha Desde:</label>
                <input type="date" id="dash-filter-date-start">
            </div>
            <div class="filter-group">
                <label for="dash-filter-date-end">Fecha Hasta:</label>
                <input type="date" id="dash-filter-date-end" value="${data.HOY_SIMULADO}">
            </div>
            <button id="dash-clear-filters-btn" class="btn btn-light btn-sm"><i class="fas fa-times"></i> Limpiar</button>
        </div>
        
        <!-- NUEVO: Panel de Acceso Rápido a Funcionalidades Gerenciales -->
        <div class="data-report-section mb-3">
            <h3><i class="fas fa-th"></i> Acceso Rápido a Herramientas Gerenciales</h3>
            <div class="dashboard-tools-grid">
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-aprobaciones">
                        <i class="fas fa-check-double"></i>
                        <span>Aprobación de Créditos y Empeños</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-desembolsos">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Registro de Desembolsos</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-facturas">
                        <i class="fas fa-file-invoice"></i>
                        <span>Generar Factura/Boleta SUNAT</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-calendario-abonos">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Calendario de Abonos</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-caja-boveda">
                        <i class="fas fa-vault"></i>
                        <span>Gestión Caja-Bóveda</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-transferencia-efectivo">
                        <i class="fas fa-exchange-alt"></i>
                        <span>Transferencia Entre Sucursales</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-sobrante-faltante">
                        <i class="fas fa-balance-scale"></i>
                        <span>Sobrantes y Faltantes</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-admin-agencias">
                        <i class="fas fa-store"></i>
                        <span>Administración de Agencias</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-equifax">
                        <i class="fas fa-database"></i>
                        <span>Gestión de Datos Equifax</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-cuotas-empeno">
                        <i class="fas fa-gem"></i>
                        <span>Gestión Cuotas de Empeño</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-gestionar-tasas">
                        <i class="fas fa-percentage"></i>
                        <span>Gestión de Tasas</span>
                    </a>
                </div>
                <div class="tool-card">
                    <a href="#" class="btn-tool" data-action="nav-rrhh">
                        <i class="fas fa-users-cog"></i>
                        <span>Gestión RRHH</span>
                    </a>
                </div>
            </div>
        </div>
        
        <!-- Contenedor para KPIs -->
        <div id="dashboard-kpi-container"><p>Seleccione filtros para ver los KPIs...</p></div>
    `;

    // Agregar listeners a los botones de herramientas
    setupToolButtonListeners(contentArea);

    // --- Renderizado de KPIs (MODIFICADO: Añadidas nuevas tarjetas de actividad semanal) ---
    const renderDashboardKPIs = () => {
        console.log("Renderizando KPIs Dashboard...");
        const kpiContainer = contentArea.querySelector('#dashboard-kpi-container');
        if (!kpiContainer) {
            console.error("Contenedor #dashboard-kpi-container no encontrado.");
            return;
        }
        kpiContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Calculando KPIs con filtros aplicados...</p>';

        try {
            // Obtener KPIs usando los filtros globales ya establecidos en data.js
            const kpis = data.kpiService.getAllKPIs();
            console.log("KPIs globales calculados con filtros:", kpis);

            // Renderizar HTML de los KPIs
            kpiContainer.innerHTML = `
                 <div class="data-report-section"><h3><i class="fas fa-chart-line"></i> Rentabilidad y Finanzas (Filtrado)</h3>
                     <div class="dashboard-grid dashboard-grid-financial">
                         <!-- KPIs existentes -->
                         <div class="kpi-card kpi-success"><h4><i class="fas fa-dollar-sign"></i> Ingresos (Interés Total)</h4><div class="kpi-value">${utils.formatCurrency(kpis.sumaIngresosTotales)}</div></div>
                         <div class="kpi-card kpi-warning"><h4><i class="fas fa-percent"></i> Interés por Cobrar (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.interesPorCobrar)}</div></div>
                         <div class="kpi-card kpi-danger"><h4><i class="fas fa-receipt"></i> Gastos Totales</h4><div class="kpi-value">${utils.formatCurrency(kpis.sumaGastosTotales)}</div></div>
                         <div class="kpi-card kpi-info"><h4><i class="fas fa-money-bill-wave"></i> Beneficio Neto (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.beneficioNetoCalculado)}</div></div>
                         <!-- KPIs de Capital -->
                         <div class="kpi-card kpi-secondary"><h4><i class="fas fa-landmark"></i> Capital Asignado</h4><div class="kpi-value">${utils.formatCurrency(kpis.sumaCapitalTotal)}</div></div>
                         <div class="kpi-card kpi-primary"><h4><i class="fas fa-coins"></i> Capital Disponible (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.capitalDisponible)}</div></div>
                         <div class="kpi-card kpi-primary"><h4><i class="fas fa-hand-holding-usd"></i> Capital en Préstamos</h4><div class="kpi-value">${utils.formatCurrency(kpis.capitalEnPrestamos)}</div></div>
                         <div class="kpi-card kpi-success"><h4><i class="fas fa-undo-alt"></i> Capital Recuperado (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.capitalRecuperado)}</div></div>
                         <!-- Otros KPIs financieros -->
                         <div class="kpi-card kpi-primary"><h4><i class="fas fa-vault"></i> Disponible Bóveda (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.disponibleEnBoveda)}</div></div>
                      </div>
                 </div>

                 <div class="data-report-section"><h3><i class="fas fa-briefcase"></i> Cartera Agregada (Filtrado)</h3>
                     <div class="dashboard-grid dashboard-grid-portfolio">
                         <div class="kpi-card kpi-primary"><h4><i class="fas fa-wallet"></i> V. Cartera Activa</h4><div class="kpi-value">${utils.formatCurrency(kpis.valorTotalCarteraActiva)}</div></div>
                         <div class="kpi-card kpi-warning"><h4><i class="fas fa-user-clock"></i> Valor en Morosidad (Sim.)</h4><div class="kpi-value">${utils.formatCurrency(kpis.valorEnMorosidad)}</div></div>
                         <div class="kpi-card kpi-danger"><h4><i class="fas fa-exclamation-triangle"></i> Tasa Morosidad</h4><div class="kpi-value">${kpis.tasaMorosidadTotal}</div></div>
                         <div class="kpi-card kpi-sin-calificacion"><h4><i class="fas fa-times-circle"></i> Pérdida Estimada (&gt;60d)</h4><div class="kpi-value">${utils.formatCurrency(kpis.perdidaEstimada)}</div></div>
                         <div class="kpi-card"><h4> Incump./Castigo</h4><div class="kpi-value">${kpis.tasaIncumplimientoCastigo}</div><p class="kpi-description">(Pl.)</p></div>
                         <div class="kpi-card"><h4> Redención Emp.</h4><div class="kpi-value">${kpis.tasaRedencionPromedio}</div><p class="kpi-description">(Pl.)</p></div>
                     </div>
                     <h4>Detalle Morosidad (Clientes - según filtros)</h4>
                     <div class="dashboard-grid dashboard-grid-compliance">
                          <div class="kpi-card kpi-al-dia"><h4> Al día / Vence Hoy</h4><div class="kpi-value">${kpis.conteosMorosidad['al-dia'] || 0}</div></div>
                          <div class="kpi-card kpi-normal"><h4> Normal (1-5d)</h4><div class="kpi-value">${kpis.conteosMorosidad['normal'] || 0}</div></div>
                          <div class="kpi-card kpi-cpp"><h4> CPP (6-10d)</h4><div class="kpi-value">${kpis.conteosMorosidad['cpp'] || 0}</div></div>
                          <div class="kpi-card kpi-deficiente"><h4> Deficiente (11-15d)</h4><div class="kpi-value">${kpis.conteosMorosidad['deficiente'] || 0}</div></div>
                          <div class="kpi-card kpi-dudoso"><h4> Dudoso (16-20d)</h4><div class="kpi-value">${kpis.conteosMorosidad['dudoso'] || 0}</div></div>
                          <div class="kpi-card kpi-perdida"><h4> Pérdida (21-60d)</h4><div class="kpi-value">${kpis.conteosMorosidad['perdida'] || 0}</div></div>
                          <div class="kpi-card kpi-sin-calificacion"><h4> Sin Calif. (+60d)</h4><div class="kpi-value">${kpis.conteosMorosidad['sin-calificacion'] || 0}</div></div>
                         ${kpis.conteosMorosidad['error'] > 0 ? `<div class="kpi-card kpi-danger"><h4> Error Fecha</h4><div class="kpi-value">${kpis.conteosMorosidad['error']}</div></div>` : ''}
                      </div>
                 </div>

                 <div class="data-report-section"><h3><i class="fas fa-cogs"></i> Actividad y Eficiencia (Filtrado)</h3>
                     <div class="dashboard-grid dashboard-grid-efficiency">
                         <!-- KPIs de actividad semanal -->
                         <div class="kpi-card kpi-info"><h4><i class="fas fa-user-plus"></i> Clientes Nuevos (7d)</h4><div class="kpi-value">${kpis.clientesNuevosSemana}</div></div>
                         <div class="kpi-card kpi-info"><h4><i class="fas fa-file-invoice-dollar"></i> Préstamos Nuevos (7d)</h4><div class="kpi-value">${kpis.prestamosSemana}</div></div>
                         <div class="kpi-card kpi-info"><h4><i class="fas fa-gem"></i> Empeños Nuevos (7d)</h4><div class="kpi-value">${kpis.empenosSemana}</div></div>
                         <!-- KPIs de eficiencia existentes -->
                         <div class="kpi-card"><h4> Ratio Eficiencia</h4><div class="kpi-value">${kpis.ratioEficienciaConsolidado}</div><p class="kpi-description">(Sim.)</p></div>
                         <div class="kpi-card kpi-info"><h4> Total Serv. Orig. (#)</h4><div class="kpi-value">${kpis.volumenTotalPrestamosNumero}</div></div>
                         <div class="kpi-card kpi-info"><h4> Total Serv. Orig. (S/)</h4><div class="kpi-value">${utils.formatCurrency(kpis.volumenTotalPrestamosMonto)}</div></div>
                         <div class="kpi-card"><h4> Rotación Inv. Emp.</h4><div class="kpi-value">${kpis.rotacionTotalInventarioEmpeno}</div><p class="kpi-description">(Pl.)</p></div>
                     </div>
                 </div>

                 <div class="data-report-section"><h3><i class="fas fa-store"></i> Resumen / Sucursal (Filtrado)</h3><div id="branch-kpi-container" class="dashboard-grid dashboard-grid-branch"><p>Calculando...</p></div></div>
                 <div class="data-report-section"><h3><i class="fas fa-user-tie"></i> Resumen / Analista (Filtrado)</h3><div id="analyst-kpi-container"><p>Calculando...</p></div></div>
                 <div class="alert alert-secondary mt-3"><i class="fas fa-info-circle"></i> Algunos KPIs marcados con (Sim.) usan cálculos simplificados o placeholders. Requieren lógica adicional para precisión completa.</div>
                `;
            renderBranchKPIs(kpiContainer.querySelector('#branch-kpi-container'));
            renderAnalystKPIs(kpiContainer.querySelector('#analyst-kpi-container'));

        } catch (error) {
            console.error("Error al calcular o renderizar KPIs:", error);
            kpiContainer.innerHTML = `<div class="alert alert-danger">Error al cargar los KPIs: ${error.message}</div>`;
        }
    };

    // --- Renderizado KPIs por Sucursal y Analista (sin cambios internos) ---
    const renderBranchKPIs = (container) => {
        if (!container) return;
        container.innerHTML = '';
        const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
        const { branch: globalBranchFilter } = data.getCurrentFilters();

        activeBranches.forEach(branch => {
            if (globalBranchFilter && globalBranchFilter !== branch.name) return;
            const branchKPIs = data.kpiService.getBranchKPIs(branch.name);
            if (!branchKPIs) return;

            const card = document.createElement('div');
            card.className = 'kpi-card';
            card.style.borderLeft = `4px solid var(--info-color)`;
            card.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><h5 style="margin: 0; font-size: 1em;"><i class="fas fa-store"></i> ${branchKPIs.nombre}</h5><div class="action-buttons"><button class="btn btn-info btn-sm" data-action="ver-detalles-sucursal" data-id="${branch.id}" title="Ver Detalles"><i class="fas fa-eye"></i></button><button class="btn btn-warning btn-sm" data-action="ver-gastos-sucursal" data-id="${branch.name}" title="Ver Detalle Gastos"><i class="fas fa-search-dollar"></i></button><button class="btn btn-secondary btn-sm" data-action="ver-servicios-sucursal" data-id="${branch.name}" title="Ver Servicios"><i class="fas fa-list"></i></button></div></div> <div style="font-size: 0.8em; line-height: 1.3;"><p><strong>Contribución:</strong> ${utils.formatCurrency(branchKPIs.contribucionAlBeneficio)}</p><p><strong>Ing. (Sim):</strong> ${utils.formatCurrency(branchKPIs.ingresosIntereses)} | <strong>Gastos:</strong> ${utils.formatCurrency(branchKPIs.gastosOperativosDirectosSucursal)}</p><p><strong>Morosidad:</strong> ${branchKPIs.tasaMorosidadSucursal} | <strong>Cli. Nuevos:</strong> ${branchKPIs.numClientesNuevosSucursal}</p><p><strong>Prést. Orig.:</strong> ${branchKPIs.numPrestamosOriginadosSucursal} (${utils.formatCurrency(branchKPIs.montoPrestamosOriginadosSucursal)})</p><p><strong>Incump:</strong> ${branchKPIs.tasaIncumplimientoCastigoSucursal}(Pl)|<strong>Redenc:</strong> ${branchKPIs.tasaRedencionEmpenosSucursal}(Pl)|<strong>Efic:</strong> ${branchKPIs.ratioEficienciaSucursal}(Pl)</p></div>`;
            // Delegar listeners a nivel de dashboard (por delegación en ui.js)
            container.appendChild(card);
        });
        if (container.innerHTML === '') container.innerHTML = '<p><em>No hay datos de sucursal para los filtros aplicados.</em></p>';
    };
    
    const renderAnalystKPIs = (container) => {
         if (!container) return;
         container.innerHTML = '';
         const allAnalysts = data.dummyData.users.filter(u => u.role === 'Analista');
         const { branch: globalBranchFilter, analyst: globalAnalystFilter } = data.getCurrentFilters();

         allAnalysts.forEach(analyst => {
              if (globalBranchFilter && analyst.branch !== globalBranchFilter) return;
              if (globalAnalystFilter && globalAnalystFilter !== 'null' && analyst.username !== globalAnalystFilter) return;
              if (globalAnalystFilter === 'null') return;

              const analystKPIs = data.kpiService.getAnalystKPIs(analyst.username);
              if (!analystKPIs) return;

             const card = document.createElement('div');
             card.className = 'kpi-card';
             card.style.borderLeft = `4px solid var(--secondary-color)`;
             card.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><h5 style="margin: 0; font-size: 1em;"><i class="fas fa-user-tie"></i> ${analystKPIs.username} (${analystKPIs.branch || 'Sin Suc.'})</h5><button class="btn btn-secondary btn-sm" data-action="ver-servicios-analista" data-id="${analystKPIs.username}" title="Ver Servicios"><i class="fas fa-list"></i></button></div> <div style="font-size: 0.8em; line-height: 1.3;"><p><strong>Prést. Orig.:</strong> ${analystKPIs.numPrestamosAprobados} (${utils.formatCurrency(analystKPIs.montoTotalAprobado)})</p><p><strong>Tasa Aprob.:</strong> ${analystKPIs.tasaAprobacionVsRechazoAnalista}</p><p><strong>Moros. Temp:</strong> ${analystKPIs.tasaMorosidadTempranaAnalista}(Pl)|<strong>Incump:</strong> ${analystKPIs.tasaIncumplimientoAnalista}(Pl)</p><p><strong>Art. Val.:</strong> ${analystKPIs.numArticulosValuadosEmpeno}(Pl)|<strong>Prec. Val.:</strong> ${analystKPIs.precisionValuacionEmpenoAnalista}(Pl)|<strong>Redenc:</strong> ${analystKPIs.tasaRedencionEmpenosAnalista}(Pl)</p></div>`;
             // Delegar listeners a nivel de dashboard (por delegación en ui.js)
             container.appendChild(card);
         });
         if (container.innerHTML === '') container.innerHTML = '<p><em>No hay datos de analista para los filtros aplicados.</em></p>';
    };

    // --- Función para leer filtros y actualizar datos globales ---
    const applyDashboardFilters = () => {
        const branch = contentArea.querySelector('#dash-filter-branch')?.value || null;
        const analyst = contentArea.querySelector('#dash-filter-analyst')?.value || null;
        const serviceType = contentArea.querySelector('#dash-filter-service-type')?.value || null;
        const startDate = contentArea.querySelector('#dash-filter-date-start')?.value || null;
        const endDate = contentArea.querySelector('#dash-filter-date-end')?.value || null;

        console.log(`Aplicando Filtros Dash: Suc=${branch||'T'}, Anl=${analyst||'T'}, Tipo=${serviceType||'T'}, Desde=${startDate||'I'}, Hasta=${endDate||'H'}`);

        data.setDashboardFilters({
            branch: branch,
            analyst: analyst,
            serviceType: serviceType,
            dateRange: { start: startDate, end: endDate }
        });
        renderDashboardKPIs();
    };

    // --- Event Listeners para los filtros (aplicación automática) ---
    const filterSelectors = [
        '#dash-filter-branch',
        '#dash-filter-analyst',
        '#dash-filter-service-type',
        '#dash-filter-date-start',
        '#dash-filter-date-end'
    ];
    filterSelectors.forEach(sel => {
        const el = contentArea.querySelector(sel);
        if (el) {
            el.addEventListener('change', applyDashboardFilters);
        }
    });

    // Botón limpiar filtros
    contentArea.querySelector('#dash-clear-filters-btn')?.addEventListener('click', () => {
        contentArea.querySelector('#dash-filter-branch').value = '';
        contentArea.querySelector('#dash-filter-analyst').value = '';
        contentArea.querySelector('#dash-filter-service-type').value = '';
        contentArea.querySelector('#dash-filter-date-start').value = '';
        contentArea.querySelector('#dash-filter-date-end').value = data.HOY_SIMULADO;
        applyDashboardFilters();
    });

    // Aplicar filtros iniciales al cargar
    applyDashboardFilters();

    console.log('Vista Dashboard Dueño/Gerente cargada con filtros. Esperando aplicación.');
}

/**
 * Configura los listeners para los botones de herramientas del panel gerencial
 */
function setupToolButtonListeners(contentArea) {
    contentArea.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-tool');
        if (!btn) return;
        
        e.preventDefault();
        const action = btn.dataset.action;
        
        switch(action) {
            case 'nav-aprobaciones':
                // Usar función existente
                approvals.loadApprovalQueue(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-desembolsos':
                // Usar función existente
                approvals.loadDisbursementRegistration(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-facturas':
                // Nueva función
                loadFacturasSunat(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-calendario-abonos':
                // Nueva función
                loadCalendarioAbonos(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-caja-boveda':
                // Usar función existente en treasury.js
                treasury.loadVaultSection(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-transferencia-efectivo':
                // Nueva función
                loadTransferenciaEfectivo(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-sobrante-faltante':
                // Nueva función
                loadSobranteFaltante(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-admin-agencias':
                // Usar función existente
                branchMgmt.loadBranchManagement(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-equifax':
                // Nueva función
                loadExportacionEquifax(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-cuotas-empeno':
                // Nueva función
                loadGestionCuotasEmpeno(ui.contentArea, ui.currentSectionTitle);
                break;
            case 'nav-gestionar-tasas':
                // Usar función existente del módulo de settings
                import('../components/settings.js').then(settings => {
                    settings.loadInterestRateManagement(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-rrhh':
                // Nueva función
                loadGestionRRHH(ui.contentArea, ui.currentSectionTitle);
                break;
            default:
                console.warn(`Acción no implementada: ${action}`);
                ui.showNotification('warning', 'Funcionalidad en desarrollo', 3000);
        }
    });
}

// Función de carga para Gerente General (sin cambios)
export function loadGmDashboard(contentArea, sectionTitleElement) {
    console.log("Cargando Dashboard Gerente General...");
    loadOwnerDashboard(contentArea, sectionTitleElement);
}

// --- NUEVAS FUNCIONES PARA PANEL GERENCIAL ---

/**
 * Carga la interfaz para generar facturas/boletas para SUNAT
 */
export function loadFacturasSunat(contentArea, sectionTitleElement) {
    console.log("Cargando vista Generación Factura/Boleta SUNAT...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Generación de Comprobantes SUNAT';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-file-invoice"></i> Generación de Facturas y Boletas Electrónicas (SUNAT)</h3>
        
        <div class="app-form">
            <div class="row">
                <div class="col-md-6">
                    <h4>Datos del Comprobante</h4>
                    <div class="input-group">
                        <label for="sunat-tipo-doc">Tipo de Comprobante:</label>
                        <select id="sunat-tipo-doc" name="tipoDoc" required>
                            <option value="">-- Seleccione --</option>
                            <option value="factura">Factura Electrónica</option>
                            <option value="boleta">Boleta de Venta Electrónica</option>
                            <option value="nota-credito">Nota de Crédito</option>
                            <option value="nota-debito">Nota de Débito</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-serie">Serie:</label>
                        <input type="text" id="sunat-serie" name="serie" placeholder="Ej: F001, B001" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-correlativo">Correlativo:</label>
                        <input type="number" id="sunat-correlativo" name="correlativo" min="1" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-fecha-emision">Fecha de Emisión:</label>
                        <input type="date" id="sunat-fecha-emision" name="fechaEmision" value="${data.HOY_SIMULADO}" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-moneda">Moneda:</label>
                        <select id="sunat-moneda" name="moneda" required>
                            <option value="PEN">Soles (PEN)</option>
                            <option value="USD">Dólares (USD)</option>
                        </select>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h4>Datos del Cliente</h4>
                    <div class="input-group">
                        <label for="sunat-tipo-doc-cliente">Tipo de Documento:</label>
                        <select id="sunat-tipo-doc-cliente" name="tipoDocCliente" required>
                            <option value="">-- Seleccione --</option>
                            <option value="6">RUC</option>
                            <option value="1">DNI</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-nro-doc-cliente">Número de Documento:</label>
                        <input type="text" id="sunat-nro-doc-cliente" name="nroDocCliente" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-razon-social">Razón Social / Nombres:</label>
                        <input type="text" id="sunat-razon-social" name="razonSocial" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-direccion">Dirección:</label>
                        <input type="text" id="sunat-direccion" name="direccion">
                    </div>
                    
                    <div class="input-group">
                        <label for="sunat-email">Email:</label>
                        <input type="email" id="sunat-email" name="email" placeholder="Para envío del comprobante">
                    </div>
                </div>
            </div>
            
            <h4>Detalle del Comprobante</h4>
            <div class="table-responsive">
                <table class="styled-table" id="items-factura-table">
                    <thead>
                        <tr>
                            <th>Cantidad</th>
                            <th>Descripción</th>
                            <th>Valor Unitario</th>
                            <th>IGV</th>
                            <th>Precio Unitario</th>
                            <th>Importe</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><input type="number" name="cantidad[]" value="1" min="1" step="1" style="width:60px"></td>
                            <td><input type="text" name="descripcion[]" style="width:100%"></td>
                            <td><input type="number" name="valorUnitario[]" value="0.00" min="0" step="0.01" style="width:80px"></td>
                            <td><input type="number" name="igv[]" value="18" min="0" step="0.01" style="width:60px" readonly></td>
                            <td><input type="number" name="precioUnitario[]" value="0.00" min="0" step="0.01" style="width:80px" readonly></td>
                            <td><input type="number" name="importe[]" value="0.00" min="0" step="0.01" style="width:80px" readonly></td>
                            <td><button type="button" class="btn btn-danger btn-sm" data-action="eliminar-item"><i class="fas fa-trash"></i></button></td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7">
                                <button type="button" class="btn btn-secondary btn-sm" id="add-item-factura-btn">
                                    <i class="fas fa-plus"></i> Agregar Ítem
                                </button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="input-group">
                        <label for="sunat-observaciones">Observaciones:</label>
                        <textarea id="sunat-observaciones" name="observaciones" rows="3"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="input-group">
                        <label>Operación Gravada:</label>
                        <input type="text" id="sunat-op-gravada" value="S/ 0.00" readonly>
                    </div>
                    <div class="input-group">
                        <label>IGV (18%):</label>
                        <input type="text" id="sunat-igv" value="S/ 0.00" readonly>
                    </div>
                    <div class="input-group">
                        <label>Importe Total:</label>
                        <input type="text" id="sunat-total" value="S/ 0.00" readonly style="font-weight: bold;">
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="generar-comprobante-btn">
                    <i class="fas fa-file-invoice"></i> Generar Comprobante
                </button>
                <button type="button" class="btn btn-secondary" id="vista-previa-btn">
                    <i class="fas fa-eye"></i> Vista Previa
                </button>
            </div>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle"></i> Esta funcionalidad permite generar comprobantes electrónicos que cumplen con la normativa de SUNAT. Los documentos generados se enviarán automáticamente al servicio de facturación electrónica.
        </div>
    `;
    
    // Configurar listeners para cálculos automáticos y agregar/eliminar ítems
    setupFacturaSunatListeners(contentArea);
}

/**
 * Configura los listeners para la funcionalidad de facturas SUNAT
 */
function setupFacturaSunatListeners(contentArea) {
    // Botón para agregar ítem
    const addItemBtn = contentArea.querySelector('#add-item-factura-btn');
    const itemsTable = contentArea.querySelector('#items-factura-table tbody');
    
    if (addItemBtn && itemsTable) {
        addItemBtn.addEventListener('click', () => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="number" name="cantidad[]" value="1" min="1" step="1" style="width:60px"></td>
                <td><input type="text" name="descripcion[]" style="width:100%"></td>
                <td><input type="number" name="valorUnitario[]" value="0.00" min="0" step="0.01" style="width:80px"></td>
                <td><input type="number" name="igv[]" value="18" min="0" step="0.01" style="width:60px" readonly></td>
                <td><input type="number" name="precioUnitario[]" value="0.00" min="0" step="0.01" style="width:80px" readonly></td>
                <td><input type="number" name="importe[]" value="0.00" min="0" step="0.01" style="width:80px" readonly></td>
                <td><button type="button" class="btn btn-danger btn-sm" data-action="eliminar-item"><i class="fas fa-trash"></i></button></td>
            `;
            itemsTable.appendChild(newRow);
            attachItemListeners(newRow);
            updateTotals();
        });
        
        // Delegación para eliminar ítems
        itemsTable.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-action="eliminar-item"]');
            if (deleteBtn) {
                const row = deleteBtn.closest('tr');
                // No eliminar si es la única fila
                if (itemsTable.querySelectorAll('tr').length > 1) {
                    row.remove();
                    updateTotals();
                } else {
                    ui.showNotification('warning', 'Debe existir al menos un ítem', 2000);
                }
            }
        });
        
        // Listeners para cálculos automáticos en ítems existentes
        itemsTable.querySelectorAll('tr').forEach(row => {
            attachItemListeners(row);
        });
        
        // Botón generar comprobante
        contentArea.querySelector('#generar-comprobante-btn')?.addEventListener('click', () => {
            // Aquí iría la lógica para enviar los datos a SUNAT
            ui.showNotification('success', 'Comprobante generado y enviado a SUNAT correctamente', 4000);
        });
        
        // Botón vista previa
        contentArea.querySelector('#vista-previa-btn')?.addEventListener('click', () => {
            // Aquí iría la lógica para mostrar vista previa
            ui.openModal('Vista Previa del Comprobante', 
                '<p>Aquí se mostraría una vista previa del comprobante tal como se enviará a SUNAT.</p>' +
                '<p style="font-style: italic;">Funcionalidad en desarrollo.</p>',
                false, '', 'large');
        });
    }
    
    // Actualizar totales iniciales
    updateTotals();
}

/**
 * Asigna los listeners a una fila de ítem para cálculos automáticos
 */
function attachItemListeners(row) {
    const cantidadInput = row.querySelector('input[name="cantidad[]"]');
    const valorUnitarioInput = row.querySelector('input[name="valorUnitario[]"]');
    const igvInput = row.querySelector('input[name="igv[]"]');
    const precioUnitarioInput = row.querySelector('input[name="precioUnitario[]"]');
    const importeInput = row.querySelector('input[name="importe[]"]');
    
    const calculateItem = () => {
        const cantidad = parseFloat(cantidadInput.value) || 0;
        const valorUnitario = parseFloat(valorUnitarioInput.value) || 0;
        const igvRate = parseFloat(igvInput.value) / 100 || 0;
        
        const igvMonto = valorUnitario * igvRate;
        const precioUnitario = valorUnitario + igvMonto;
        const importe = cantidad * precioUnitario;
        
        precioUnitarioInput.value = precioUnitario.toFixed(2);
        importeInput.value = importe.toFixed(2);
        
        updateTotals();
    };
    
    cantidadInput.addEventListener('input', calculateItem);
    valorUnitarioInput.addEventListener('input', calculateItem);
    igvInput.addEventListener('input', calculateItem);
}

/**
 * Actualiza los totales del documento
 */
function updateTotals() {
    const itemsTable = document.getElementById('items-factura-table');
    const opGravadaDisplay = document.getElementById('sunat-op-gravada');
    const igvDisplay = document.getElementById('sunat-igv');
    const totalDisplay = document.getElementById('sunat-total');
    
    if (!itemsTable || !opGravadaDisplay || !igvDisplay || !totalDisplay) return;
    
    let opGravada = 0;
    let igvTotal = 0;
    let total = 0;
    
    itemsTable.querySelectorAll('tbody tr').forEach(row => {
        const cantidad = parseFloat(row.querySelector('input[name="cantidad[]"]').value) || 0;
        const valorUnitario = parseFloat(row.querySelector('input[name="valorUnitario[]"]').value) || 0;
        const igvRate = parseFloat(row.querySelector('input[name="igv[]"]').value) / 100 || 0;
        
        const subtotal = cantidad * valorUnitario;
        const igvMonto = subtotal * igvRate;
        
        opGravada += subtotal;
        igvTotal += igvMonto;
        total += subtotal + igvMonto;
    });
    
    opGravadaDisplay.value = utils.formatCurrency(opGravada);
    igvDisplay.value = utils.formatCurrency(igvTotal);
    totalDisplay.value = utils.formatCurrency(total);
}

/**
 * Carga la interfaz para el calendario de abonos
 */
export function loadCalendarioAbonos(contentArea, sectionTitleElement) {
    console.log("Cargando vista Calendario de Abonos...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño', 'Tesorería'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Calendario de Abonos';
    
    // Obtener la fecha actual
    const today = new Date(data.HOY_SIMULADO + 'T00:00:00Z');
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Calcular el primer día del mes actual
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // Obtener el último día del mes actual
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Generar el HTML del calendario
    let calendarHTML = generateCalendarHTML(currentYear, currentMonth, firstDay, lastDate);
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-calendar-alt"></i> Calendario de Abonos</h3>
        
        <div class="filter-bar">
            <div class="filter-group">
                <label for="calendar-month">Mes:</label>
                <select id="calendar-month">
                    <option value="0" ${currentMonth === 0 ? 'selected' : ''}>Enero</option>
                    <option value="1" ${currentMonth === 1 ? 'selected' : ''}>Febrero</option>
                    <option value="2" ${currentMonth === 2 ? 'selected' : ''}>Marzo</option>
                    <option value="3" ${currentMonth === 3 ? 'selected' : ''}>Abril</option>
                    <option value="4" ${currentMonth === 4 ? 'selected' : ''}>Mayo</option>
                    <option value="5" ${currentMonth === 5 ? 'selected' : ''}>Junio</option>
                    <option value="6" ${currentMonth === 6 ? 'selected' : ''}>Julio</option>
                    <option value="7" ${currentMonth === 7 ? 'selected' : ''}>Agosto</option>
                    <option value="8" ${currentMonth === 8 ? 'selected' : ''}>Septiembre</option>
                    <option value="9" ${currentMonth === 9 ? 'selected' : ''}>Octubre</option>
                    <option value="10" ${currentMonth === 10 ? 'selected' : ''}>Noviembre</option>
                    <option value="11" ${currentMonth === 11 ? 'selected' : ''}>Diciembre</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="calendar-year">Año:</label>
                <select id="calendar-year">
                    <option value="2024" ${currentYear === 2024 ? 'selected' : ''}>2024</option>
                    <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>2025</option>
                    <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>2026</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="calendar-branch">Sucursal:</label>
                <select id="calendar-branch">
                    <option value="">Todas</option>
                    ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                        `<option value="${b.name}" ${b.name === currentUser.branch ? 'selected' : ''}>${b.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="calendar-analyst">Analista:</label>
                <select id="calendar-analyst">
                    <option value="">Todos</option>
                    ${data.dummyData.users.filter(u => u.role === 'Analista' && (!currentUser.branch || u.branch === currentUser.branch)).map(a => 
                        `<option value="${a.username}">${a.username}</option>`
                    ).join('')}
                </select>
            </div>
            
            <button id="refresh-calendar-btn" class="btn btn-primary btn-sm">
                <i class="fas fa-sync"></i> Actualizar
            </button>
        </div>
        
        <div class="data-report-section mt-3">
            <div class="dashboard-grid dashboard-grid-financial">
                <div class="kpi-card kpi-success">
                    <h4><i class="fas fa-dollar-sign"></i> Total a Cobrar (Mes)</h4>
                    <div class="kpi-value">S/ 12,500.00</div>
                    <p class="kpi-description">23 cuotas por vencer</p>
                </div>
                <div class="kpi-card kpi-warning">
                    <h4><i class="fas fa-exclamation-circle"></i> Cobros Vencidos</h4>
                    <div class="kpi-value">S/ 3,280.00</div>
                    <p class="kpi-description">8 cuotas atrasadas</p>
                </div>
                <div class="kpi-card kpi-primary">
                    <h4><i class="fas fa-check-circle"></i> Cobros Realizados</h4>
                    <div class="kpi-value">S/ 8,750.00</div>
                    <p class="kpi-description">15 cuotas abonadas</p>
                </div>
                <div class="kpi-card kpi-info">
                    <h4><i class="fas fa-percentage"></i> Efectividad de Cobro</h4>
                    <div class="kpi-value">70%</div>
                    <p class="kpi-description">Del total planificado</p>
                </div>
            </div>
            
            <div class="calendar-container mt-3">
                ${calendarHTML}
            </div>
            
            <div id="day-detail-container" class="mt-3" style="display: none;">
                <h4 id="selected-day-title">Abonos del día</h4>
                <div id="day-detail-content"></div>
            </div>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle"></i> El calendario muestra los abonos programados para cada día. Haga clic en un día para ver el detalle de los abonos.
        </div>
    `;
    
    // Configurar listeners para el calendario
    setupCalendarListeners(contentArea);
}

/**
 * Genera el HTML del calendario para un mes dado
 */
function generateCalendarHTML(year, month, firstDay, lastDate) {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date(data.HOY_SIMULADO + 'T00:00:00Z').getDate();
    const currentMonth = new Date(data.HOY_SIMULADO + 'T00:00:00Z').getMonth();
    const currentYear = new Date(data.HOY_SIMULADO + 'T00:00:00Z').getFullYear();
    const isCurrentMonth = (month === currentMonth && year === currentYear);
    
    // Simulación de datos - obtener cuotas por fecha
    const quotesByDate = generateQuotesByDate(year, month);
    
    let html = `
        <table class="calendar-table">
            <thead>
                <tr>
                    ${daysOfWeek.map(day => `<th>${day}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    let date = 1;
    for (let i = 0; i < 6; i++) { // Máximo 6 semanas en un mes
        if (date > lastDate) break;
        
        html += '<tr>';
        
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDay) {
                // Celdas vacías antes del primer día del mes
                html += '<td></td>';
            } else if (date > lastDate) {
                // Celdas vacías después del último día del mes
                html += '<td></td>';
            } else {
                // Clases para el día actual y días con cuotas
                const isToday = isCurrentMonth && date === today;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                const dayQuotes = quotesByDate[dateStr] || [];
                
                const quotesCount = dayQuotes.length;
                const hasOverdue = dayQuotes.some(quote => quote.status === 'overdue');
                const hasPaid = dayQuotes.some(quote => quote.status === 'paid');
                
                let dayClass = '';
                if (isToday) dayClass += ' today';
                if (quotesCount > 0) {
                    if (hasOverdue) {
                        dayClass += ' has-overdue';
                    } else if (hasPaid) {
                        dayClass += ' has-paid';
                    } else {
                        dayClass += ' has-quotes';
                    }
                }
                
                html += `
                    <td class="calendar-day${dayClass}" data-date="${dateStr}">
                        <div class="day-number">${date}</div>
                        ${quotesCount > 0 ? `<div class="day-quotes-count">${quotesCount}</div>` : ''}
                    </td>
                `;
                
                date++;
            }
        }
        
        html += '</tr>';
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

/**
 * Genera simulación de datos de cuotas por fecha
 */
function generateQuotesByDate(year, month) {
    const quotesByDate = {};
    
    // Simulación de datos (en realidad se obtendría de la BD)
    const services = data.dummyData.services.filter(s => 
        s.nextPayment && ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)
    );
    
    // Crear datos simulados para este mes
    for (let i = 1; i <= 28; i++) {
        // Formatear la fecha como YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Aleatoriamente asignar servicios a algunas fechas
        if (Math.random() > 0.7) {
            const randomServices = services.filter(() => Math.random() > 0.8).slice(0, 3);
            if (randomServices.length > 0) {
                quotesByDate[dateStr] = randomServices.map(service => {
                    const client = data.getClient(service.clientId);
                    return {
                        serviceId: service.id,
                        clientName: client ? client.name : 'Cliente',
                        amount: service.installmentAmount,
                        // Simulación de estado: sobrepasó fecha actual = vencido, caso contrario = pendiente
                        status: new Date(dateStr) < new Date(data.HOY_SIMULADO) ? 'overdue' : 
                               Math.random() > 0.7 ? 'paid' : 'pending',
                        type: service.type
                    };
                });
            }
        }
    }
    
    return quotesByDate;
}

/**
 * Configura los listeners para el calendario
 */
function setupCalendarListeners(contentArea) {
    // Listener para cambio de mes, año o filtros
    const refreshBtn = contentArea.querySelector('#refresh-calendar-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const month = parseInt(contentArea.querySelector('#calendar-month').value);
            const year = parseInt(contentArea.querySelector('#calendar-year').value);
            
            // Calcular nuevo calendario
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            
            const calendarHTML = generateCalendarHTML(year, month, firstDay, lastDate);
            contentArea.querySelector('.calendar-container').innerHTML = calendarHTML;
            
            // Ocultar detalle del día
            const dayDetailContainer = contentArea.querySelector('#day-detail-container');
            if (dayDetailContainer) {
                dayDetailContainer.style.display = 'none';
            }
            
            ui.showNotification('success', 'Calendario actualizado', 2000);
        });
    }
    
    // Delegación para click en días del calendario
    contentArea.querySelector('.calendar-container').addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day');
        if (dayCell) {
            const dateStr = dayCell.dataset.date;
            if (dateStr) {
                showDayDetail(contentArea, dateStr);
            }
        }
    });
}

/**
 * Muestra el detalle de un día seleccionado en el calendario
 */
function showDayDetail(contentArea, dateStr) {
    const dayDetailContainer = contentArea.querySelector('#day-detail-container');
    const dayDetailContent = contentArea.querySelector('#day-detail-content');
    const selectedDayTitle = contentArea.querySelector('#selected-day-title');
    
    if (!dayDetailContainer || !dayDetailContent || !selectedDayTitle) return;
    
    // Formatear la fecha para el título
    const date = new Date(dateStr + 'T00:00:00Z');
    const formattedDate = date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    selectedDayTitle.textContent = `Abonos del ${formattedDate}`;
    
    // Obtener datos de cuotas para este día (simulación)
    const quotesByDate = generateQuotesByDate(date.getFullYear(), date.getMonth());
    const dayQuotes = quotesByDate[dateStr] || [];
    
    if (dayQuotes.length === 0) {
        dayDetailContent.innerHTML = '<p><em>No hay abonos programados para este día.</em></p>';
    } else {
        // Generar tabla de abonos
        let html = `
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Tipo Servicio</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        dayQuotes.forEach(quote => {
            const statusClass = quote.status === 'overdue' ? 'status-danger' : 
                              quote.status === 'paid' ? 'status-success' : 'status-warning';
                              
            const statusText = quote.status === 'overdue' ? 'Vencido' : 
                             quote.status === 'paid' ? 'Pagado' : 'Por Pagar';
            
            html += `
                <tr>
                    <td>${quote.clientName}</td>
                    <td>${quote.type}</td>
                    <td>${utils.formatCurrency(quote.amount)}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-info btn-sm" data-action="ver-detalles-servicio" data-id="${quote.serviceId}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${quote.status !== 'paid' ? `
                            <button class="btn btn-success btn-sm" data-action="registrar-pago" data-id="${quote.serviceId}">
                                <i class="fas fa-money-bill-wave"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        dayDetailContent.innerHTML = html;
    }
    
    dayDetailContainer.style.display = 'block';
}

/**
 * Carga la interfaz para gestionar transferencias de efectivo entre sucursales
 */
export function loadTransferenciaEfectivo(contentArea, sectionTitleElement) {
    console.log("Cargando vista Transferencia Efectivo entre Sucursales...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño', 'Tesorería'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Transferencia de Efectivo entre Sucursales';
    
    // Obtener sucursales para los selectores
    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => 
        `<option value="${b.name}" ${currentUser.branch === b.name ? 'selected' : ''}>${b.name}</option>`
    ).join('');
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-exchange-alt"></i> Transferencia de Efectivo entre Sucursales/Agencias</h3>
        
        <div class="app-form">
            <div class="row">
                <div class="col-md-6">
                    <h4>Datos de la Transferencia</h4>
                    <div class="input-group">
                        <label for="trans-sucursal-origen">Sucursal de Origen:</label>
                        <select id="trans-sucursal-origen" name="sucursalOrigen" required>
                            <option value="">-- Seleccione --</option>
                            ${branchOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-sucursal-destino">Sucursal de Destino:</label>
                        <select id="trans-sucursal-destino" name="sucursalDestino" required>
                            <option value="">-- Seleccione --</option>
                            ${branchOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-responsable-origen">Responsable Origen:</label>
                        <select id="trans-responsable-origen" name="responsableOrigen" required>
                            <option value="">-- Seleccione --</option>
                            <!-- Se llenará dinámicamente -->
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-responsable-destino">Responsable Destino:</label>
                        <select id="trans-responsable-destino" name="responsableDestino" required>
                            <option value="">-- Seleccione --</option>
                            <!-- Se llenará dinámicamente -->
                        </select>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h4>Información de Fondos</h4>
                    <div class="input-group">
                        <label for="trans-monto">Monto a Transferir (S/):</label>
                        <input type="number" id="trans-monto" name="monto" step="0.01" min="0" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-fecha">Fecha:</label>
                        <input type="date" id="trans-fecha" name="fecha" value="${data.HOY_SIMULADO}" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-metodo">Método de Transferencia:</label>
                        <select id="trans-metodo" name="metodo" required>
                            <option value="">-- Seleccione --</option>
                            <option value="efectivo">Efectivo Físico</option>
                            <option value="bancaria">Transferencia Bancaria</option>
                            <option value="caja">Transferencia de Caja</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-motivo">Motivo:</label>
                        <textarea id="trans-motivo" name="motivo" rows="2" required></textarea>
                    </div>
                </div>
            </div>
            
            <h4>Detalle de Denominaciones</h4>
            <div class="row">
                <div class="col-md-6">
                    <table class="styled-table" id="denominaciones-table">
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
                                <td><input type="number" name="denom_200" value="0" min="0" class="denominacion-input" style="width:80px"></td>
                                <td class="subtotal">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 100</td>
                                <td><input type="number" name="denom_100" value="0" min="0" class="denominacion-input" style="width:80px"></td>
                                <td class="subtotal">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 50</td>
                                <td><input type="number" name="denom_50" value="0" min="0" class="denominacion-input" style="width:80px"></td>
                                <td class="subtotal">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 20</td>
                                <td><input type="number" name="denom_20" value="0" min="0" class="denominacion-input" style="width:80px"></td>
                                <td class="subtotal">S/ 0.00</td>
                            </tr>
                            <tr>
                                <td>S/ 10</td>
                                <td><input type="number" name="denom_10" value="0" min="0" class="denominacion-input" style="width:80px"></td>
                                <td class="subtotal">S/ 0.00</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="text-align:right;"><strong>TOTAL:</strong></td>
                                <td id="total-denominaciones">S/ 0.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div class="col-md-6">
                    <div class="input-group">
                        <label for="trans-comprobante">Comprobante:</label>
                        <input type="file" id="trans-comprobante" name="comprobante" accept="image/*,application/pdf">
                        <small>Opcional: Foto del comprobante físico o transferencia.</small>
                    </div>
                    
                    <div class="input-group">
                        <label for="trans-notas">Notas Adicionales:</label>
                        <textarea id="trans-notas" name="notas" rows="3"></textarea>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" id="registrar-transferencia-btn" class="btn btn-primary">
                    <i class="fas fa-save"></i> Registrar Transferencia
                </button>
            </div>
        </div>
        
        <div class="data-report-section mt-3">
            <h3>Movimientos Recientes</h3>
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Origen</th>
                            <th>Destino</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Responsables</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>27/04/2025</td>
                            <td>Sucursal Centro</td>
                            <td>Sucursal Norte</td>
                            <td>S/ 5,000.00</td>
                            <td>Efectivo Físico</td>
                            <td>tesorero1 → tesorero2</td>
                            <td><span class="status status-success">Completo</span></td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>25/04/2025</td>
                            <td>Sucursal Norte</td>
                            <td>Sucursal Centro</td>
                            <td>S/ 3,200.00</td>
                            <td>Transferencia Bancaria</td>
                            <td>tesorero2 → tesorero1</td>
                            <td><span class="status status-success">Completo</span></td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>20/04/2025</td>
                            <td>Sucursal Centro</td>
                            <td>Sucursal Norte</td>
                            <td>S/ 2,500.00</td>
                            <td>Efectivo Físico</td>
                            <td>tesorero1 → tesorero2</td>
                            <td><span class="status status-warning">Pendiente</span></td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-success btn-sm" title="Confirmar Recepción">
                                    <i class="fas fa-check"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Configurar listeners para transferencia de efectivo
    setupTransferenciaListeners(contentArea);
}

/**
 * Configura los listeners para la funcionalidad de transferencia de efectivo
 */
function setupTransferenciaListeners(contentArea) {
    // Actualizar responsables al cambiar sucursal
    const origenSelect = contentArea.querySelector('#trans-sucursal-origen');
    const destinoSelect = contentArea.querySelector('#trans-sucursal-destino');
    const responsableOrigenSelect = contentArea.querySelector('#trans-responsable-origen');
    const responsableDestinoSelect = contentArea.querySelector('#trans-responsable-destino');
    
    if (origenSelect && responsableOrigenSelect) {
        origenSelect.addEventListener('change', () => {
            updateResponsablesOptions(origenSelect.value, responsableOrigenSelect);
        });
    }
    
    if (destinoSelect && responsableDestinoSelect) {
        destinoSelect.addEventListener('change', () => {
            updateResponsablesOptions(destinoSelect.value, responsableDestinoSelect);
        });
    }
    
    // Inicializar responsables si hay sucursales seleccionadas
    if (origenSelect.value) {
        updateResponsablesOptions(origenSelect.value, responsableOrigenSelect);
    }
    if (destinoSelect.value) {
        updateResponsablesOptions(destinoSelect.value, responsableDestinoSelect);
    }
    
    // Cálculos de denominaciones
    const denominacionInputs = contentArea.querySelectorAll('.denominacion-input');
    if (denominacionInputs) {
        denominacionInputs.forEach(input => {
            input.addEventListener('input', () => {
                calculateDenominaciones();
            });
        });
    }
    
    // Botón para registrar transferencia
    const registerBtn = contentArea.querySelector('#registrar-transferencia-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            // Validar campos requeridos
            const requiredFields = [
                origenSelect, destinoSelect, 
                responsableOrigenSelect, responsableDestinoSelect,
                contentArea.querySelector('#trans-monto'),
                contentArea.querySelector('#trans-fecha'),
                contentArea.querySelector('#trans-metodo'),
                contentArea.querySelector('#trans-motivo')
            ];
            
            let valid = true;
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('error');
                    valid = false;
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (!valid) {
                ui.showNotification('error', 'Por favor complete todos los campos requeridos', 3000);
                return;
            }
            
            // Validar que origen y destino sean diferentes
            if (origenSelect.value === destinoSelect.value) {
                ui.showNotification('error', 'La sucursal de origen y destino deben ser diferentes', 3000);
                return;
            }
            
            // Validar que el monto coincida con el total de denominaciones
            const monto = parseFloat(contentArea.querySelector('#trans-monto').value);
            const totalDenom = parseFloat(contentArea.querySelector('#total-denominaciones').textContent.replace('S/ ', '').replace(',', ''));
            
            if (monto !== totalDenom) {
                ui.showNotification('warning', 'El monto a transferir no coincide con el total de denominaciones', 3000);
                return;
            }
            
            // Simulación de registro exitoso
            ui.showNotification('success', 'Transferencia registrada correctamente', 3000);
            
            // Aquí iría la lógica para guardar en la base de datos
            // ...
            
            // Recargar la vista
            setTimeout(() => {
                loadTransferenciaEfectivo(contentArea, ui.currentSectionTitle);
            }, 1000);
        });
    }
}

/**
 * Actualiza las opciones de responsables para una sucursal
 */
function updateResponsablesOptions(branch, selectElement) {
    if (!selectElement) return;
    
    // Limpiar options actuales
    selectElement.innerHTML = '<option value="">-- Seleccione --</option>';
    
    // Obtener tesoreros y gerentes de la sucursal
    const responsables = data.dummyData.users.filter(u => 
        (u.role === 'Tesorería' || u.role === 'Gerente General') && 
        (!u.branch || u.branch === branch || u.role === 'Gerente General')
    );
    
    // Añadir opciones
    responsables.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = `${user.username} (${user.role})`;
        selectElement.appendChild(option);
    });
}

/**
 * Calcula los subtotales y total de denominaciones
 */
function calculateDenominaciones() {
    const table = document.getElementById('denominaciones-table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    let total = 0;
    
    rows.forEach(row => {
        const input = row.querySelector('input');
        const subtotalCell = row.querySelector('.subtotal');
        const denomination = parseInt(input.name.split('_')[1]);
        const count = parseInt(input.value) || 0;
        const subtotal = denomination * count;
        
        subtotalCell.textContent = utils.formatCurrency(subtotal);
        total += subtotal;
    });
    
    const totalCell = document.getElementById('total-denominaciones');
    if (totalCell) {
        totalCell.textContent = utils.formatCurrency(total);
    }
    
    // Actualizar campo de monto automáticamente
    const montoInput = document.getElementById('trans-monto');
    if (montoInput) {
        montoInput.value = total.toFixed(2);
    }
}

/**
 * Carga la interfaz para gestionar sobrantes y faltantes por agencia
 */
export function loadSobranteFaltante(contentArea, sectionTitleElement) {
    console.log("Cargando vista Sobrantes y Faltantes...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño', 'Tesorería'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Gestión de Sobrantes y Faltantes';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-balance-scale"></i> Gestión de Sobrantes y Faltantes por Agencia</h3>
        
        <div class="filter-bar">
            <div class="filter-group">
                <label for="sf-sucursal">Sucursal:</label>
                <select id="sf-sucursal">
                    <option value="">Todas</option>
                    ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                        `<option value="${b.name}" ${b.name === currentUser.branch ? 'selected' : ''}>${b.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="sf-analista">Analista:</label>
                <select id="sf-analista">
                    <option value="">Todos</option>
                    ${data.dummyData.users.filter(u => u.role === 'Analista' && (!currentUser.branch || u.branch === currentUser.branch)).map(a => 
                        `<option value="${a.username}">${a.username}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="sf-fecha-inicio">Desde:</label>
                <input type="date" id="sf-fecha-inicio" value="${data.HOY_SIMULADO.slice(0, 8) + '01'}">
            </div>
            
            <div class="filter-group">
                <label for="sf-fecha-fin">Hasta:</label>
                <input type="date" id="sf-fecha-fin" value="${data.HOY_SIMULADO}">
            </div>
            
            <button id="sf-filtrar-btn" class="btn btn-primary btn-sm">
                <i class="fas fa-filter"></i> Filtrar
            </button>
        </div>
        
        <div class="data-report-section mt-3">
            <div class="dashboard-grid dashboard-grid-financial">
                <div class="kpi-card kpi-primary">
                    <h4><i class="fas fa-money-bill-wave"></i> Movimiento Total</h4>
                    <div class="kpi-value">S/ 125,800.00</div>
                    <p class="kpi-description">42 operaciones</p>
                </div>
                <div class="kpi-card kpi-danger">
                    <h4><i class="fas fa-arrow-down"></i> Faltantes</h4>
                    <div class="kpi-value">S/ 350.00</div>
                    <p class="kpi-description">5 incidencias</p>
                </div>
                <div class="kpi-card kpi-success">
                    <h4><i class="fas fa-arrow-up"></i> Sobrantes</h4>
                    <div class="kpi-value">S/ 180.00</div>
                    <p class="kpi-description">3 incidencias</p>
                </div>
                <div class="kpi-card kpi-warning">
                    <h4><i class="fas fa-percentage"></i> % Discrepancia</h4>
                    <div class="kpi-value">0.14%</div>
                    <p class="kpi-description">del movimiento total</p>
                </div>
            </div>
            
            <h4 class="mt-3">Registro de Sobrantes y Faltantes</h4>
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Sucursal</th>
                            <th>Analista</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Observaciones</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>27/04/2025</td>
                            <td>Sucursal Centro</td>
                            <td>analista1</td>
                            <td><span class="status status-danger">Faltante</span></td>
                            <td>S/ 120.00</td>
                            <td><span class="status status-warning">Pendiente</span></td>
                            <td>Diferencia en cierre de caja</td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-success btn-sm" title="Regularizar">
                                    <i class="fas fa-check"></i>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>26/04/2025</td>
                            <td>Sucursal Norte</td>
                            <td>analista2</td>
                            <td><span class="status status-success">Sobrante</span></td>
                            <td>S/ 50.00</td>
                            <td><span class="status status-success">Regularizado</span></td>
                            <td>Cliente pagó de más, se contactó para devolución</td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>25/04/2025</td>
                            <td>Sucursal Centro</td>
                            <td>analista3</td>
                            <td><span class="status status-danger">Faltante</span></td>
                            <td>S/ 75.00</td>
                            <td><span class="status status-success">Regularizado</span></td>
                            <td>Error en conteo, analista asumió diferencia</td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="form-actions mt-3">
                <button type="button" id="registrar-discrepancia-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Registrar Nueva Discrepancia
                </button>
                <button type="button" id="exportar-sf-btn" class="btn btn-success">
                    <i class="fas fa-file-excel"></i> Exportar Reporte
                </button>
            </div>
        </div>
    `;
    
    // Configurar listeners para sobrantes y faltantes
    setupSobranteFaltanteListeners(contentArea);
}

/**
 * Configura los listeners para la funcionalidad de sobrantes y faltantes
 */
function setupSobranteFaltanteListeners(contentArea) {
    // Botón de filtrar
    const filtrarBtn = contentArea.querySelector('#sf-filtrar-btn');
    if (filtrarBtn) {
        filtrarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para filtrar por sucursal, analista y fecha
            ui.showNotification('success', 'Filtros aplicados', 2000);
        });
    }
    
    // Botón para registrar nueva discrepancia
    const registrarBtn = contentArea.querySelector('#registrar-discrepancia-btn');
    if (registrarBtn) {
        registrarBtn.addEventListener('click', () => {
            // Abrir modal para registrar discrepancia
            showRegistrarDiscrepanciaModal();
        });
    }
    
    // Botón para exportar
    const exportarBtn = contentArea.querySelector('#exportar-sf-btn');
    if (exportarBtn) {
        exportarBtn.addEventListener('click', () => {
            ui.showNotification('success', 'Exportando reporte...', 2000);
        });
    }
}

/**
 * Muestra el modal para registrar una nueva discrepancia
 */
function showRegistrarDiscrepanciaModal() {
    const sucursales = data.dummyData.branches.filter(b => b.status === 'Activa');
    const sucursalOptions = sucursales.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    
    const currentUser = getCurrentUser();
    const preselectedBranch = currentUser.role === 'Tesorería' ? currentUser.branch : '';
    
    const modalHTML = `
        <form id="discrepancia-form">
            <div class="input-group">
                <label for="disc-sucursal">Sucursal:</label>
                <select id="disc-sucursal" name="sucursal" required>
                    <option value="">-- Seleccione --</option>
                    ${sucursalOptions}
                </select>
            </div>
            
            <div class="input-group">
                <label for="disc-analista">Analista:</label>
                <select id="disc-analista" name="analista" required>
                    <option value="">-- Seleccione --</option>
                    <!-- Se llenará automáticamente -->
                </select>
            </div>
            
            <div class="input-group">
                <label for="disc-tipo">Tipo de Discrepancia:</label>
                <select id="disc-tipo" name="tipo" required>
                    <option value="">-- Seleccione --</option>
                    <option value="faltante">Faltante</option>
                    <option value="sobrante">Sobrante</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="disc-monto">Monto (S/):</label>
                <input type="number" id="disc-monto" name="monto" min="0.01" step="0.01" required>
            </div>
            
            <div class="input-group">
                <label for="disc-fecha">Fecha:</label>
                <input type="date" id="disc-fecha" name="fecha" value="${data.HOY_SIMULADO}" required>
            </div>
            
            <div class="input-group">
                <label for="disc-observaciones">Observaciones:</label>
                <textarea id="disc-observaciones" name="observaciones" rows="3" required></textarea>
            </div>
            
            <div class="input-group">
                <label for="disc-evidencia">Evidencia (opcional):</label>
                <input type="file" id="disc-evidencia" name="evidencia" accept="image/*,application/pdf">
            </div>
            
            <div class="input-group">
                <label for="disc-responsabilidad">Asignación de Responsabilidad:</label>
                <select id="disc-responsabilidad" name="responsabilidad" required>
                    <option value="">-- Seleccione --</option>
                    <option value="analista">Analista Asume</option>
                    <option value="empresa">Empresa Asume</option>
                    <option value="pendiente">Pendiente de Investigación</option>
                </select>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('discrepancia-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        // Aquí iría la lógica para guardar la discrepancia
        ui.showNotification('success', 'Discrepancia registrada correctamente', 3000);
        return true;
    };
    
    ui.openModal('Registrar Nueva Discrepancia', modalHTML, true, 'Registrar', 'medium', handleConfirm);
    
    // Configurar evento para actualizar analistas cuando cambia la sucursal
    const sucursalSelect = document.getElementById('disc-sucursal');
    const analistaSelect = document.getElementById('disc-analista');
    
    if (sucursalSelect && analistaSelect) {
        sucursalSelect.addEventListener('change', () => {
            const selectedBranch = sucursalSelect.value;
            analistaSelect.innerHTML = '<option value="">-- Seleccione --</option>';
            
            if (selectedBranch) {
                const analistas = data.dummyData.users.filter(u => 
                    u.role === 'Analista' && u.branch === selectedBranch
                );
                
                analistas.forEach(analista => {
                    const option = document.createElement('option');
                    option.value = analista.username;
                    option.textContent = analista.username;
                    analistaSelect.appendChild(option);
                });
            }
        });
        
        // Preseleccionar sucursal si corresponde
        if (preselectedBranch) {
            sucursalSelect.value = preselectedBranch;
            sucursalSelect.dispatchEvent(new Event('change'));
        }
    }
}

/**
 * Carga la interfaz para gestión de cuotas de empeño
 */
export function loadGestionCuotasEmpeno(contentArea, sectionTitleElement) {
    console.log("Cargando vista Gestión Cuotas de Empeño...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Gestión de Cuotas de Empeño';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-gem"></i> Gestión de Cuotas de Empeño</h3>
        
        <div class="filter-bar">
            <div class="filter-group">
                <label for="empeno-sucursal">Sucursal:</label>
                <select id="empeno-sucursal">
                    <option value="">Todas</option>
                    ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                        `<option value="${b.name}">${b.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="empeno-estado">Estado:</label>
                <select id="empeno-estado">
                    <option value="">Todos</option>
                    <option value="Por Cobrar">Por Cobrar</option>
                    <option value="Moroso">Moroso</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Vencido">Vencido</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="empeno-fecha-inicio">Desde:</label>
                <input type="date" id="empeno-fecha-inicio">
            </div>
            
            <div class="filter-group">
                <label for="empeno-fecha-fin">Hasta:</label>
                <input type="date" id="empeno-fecha-fin" value="${data.HOY_SIMULADO}">
            </div>
            
            <button id="empeno-filtrar-btn" class="btn btn-primary btn-sm">
                <i class="fas fa-filter"></i> Filtrar
            </button>
        </div>
        
        <div class="data-report-section mt-3">
            <div class="dashboard-grid dashboard-grid-financial">
                <div class="kpi-card kpi-primary">
                    <h4><i class="fas fa-gem"></i> Empeños Activos</h4>
                    <div class="kpi-value">32</div>
                    <p class="kpi-description">valorados en S/ 45,200.00</p>
                </div>
                <div class="kpi-card kpi-success">
                    <h4><i class="fas fa-hand-holding-usd"></i> Monto Prestado</h4>
                    <div class="kpi-value">S/ 27,120.00</div>
                    <p class="kpi-description">60% del valor tasado</p>
                </div>
                <div class="kpi-card kpi-warning">
                    <h4><i class="fas fa-exclamation-circle"></i> Próximos a Vencer</h4>
                    <div class="kpi-value">8</div>
                    <p class="kpi-description">en los próximos 7 días</p>
                </div>
                <div class="kpi-card kpi-danger">
                    <h4><i class="fas fa-gavel"></i> En Proceso de Ejecución</h4>
                    <div class="kpi-value">3</div>
                    <p class="kpi-description">valorados en S/ 4,200.00</p>
                </div>
            </div>
            
            <h4 class="mt-3">Listado de Empeños</h4>
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Artículo</th>
                            <th>Valor Tasado</th>
                            <th>Monto Prestado</th>
                            <th>Fecha Empeño</th>
                            <th>Fecha Vencimiento</th>
                            <th>Estado</th>
                            <th>Cuotas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateEmpenoRows()}
                    </tbody>
                </table>
            </div>
            
            <h4 class="mt-3">Configuración de Condiciones de Empeño</h4>
            <div class="app-form">
                <div class="row">
                    <div class="col-md-6">
                        <div class="input-group">
                            <label for="empeno-plazo-max">Plazo Máximo (meses):</label>
                            <input type="number" id="empeno-plazo-max" value="6" min="1" max="24">
                        </div>
                        
                        <div class="input-group">
                            <label for="empeno-tasa-interes">Tasa de Interés Mensual (%):</label>
                            <input type="number" id="empeno-tasa-interes" value="8.0" min="0" step="0.1">
                        </div>
                        
                        <div class="input-group">
                            <label for="empeno-penalidad-demora">Penalidad por Demora (%):</label>
                            <input type="number" id="empeno-penalidad-demora" value="2.0" min="0" step="0.1">
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="input-group">
                            <label for="empeno-dias-gracia">Días de Gracia:</label>
                            <input type="number" id="empeno-dias-gracia" value="3" min="0" max="30">
                        </div>
                        
                        <div class="input-group">
                            <label for="empeno-valor-prestamo-max">Valor Máximo de Préstamo (%):</label>
                            <input type="number" id="empeno-valor-prestamo-max" value="70" min="10" max="100">
                            <small>Porcentaje máximo del valor tasado.</small>
                        </div>
                        
                        <div class="input-group">
                            <label for="empeno-dias-ejecucion">Días para Ejecución Prenda:</label>
                            <input type="number" id="empeno-dias-ejecucion" value="30" min="1">
                            <small>Días después del vencimiento antes de ejecutar.</small>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="guardar-config-empeno-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Configurar listeners para gestión de empeños
    setupEmpenoListeners(contentArea);
}

/**
 * Genera filas de ejemplo para la tabla de empeños
 */
function generateEmpenoRows() {
    // Filtrar servicios de tipo Empeño
    const empenos = data.dummyData.services.filter(s => s.type === 'Empeño');
    
    if (empenos.length === 0) {
        return '<tr><td colspan="10"><em>No hay empeños registrados.</em></td></tr>';
    }
    
    return empenos.map(empeno => {
        const client = data.getClient(empeno.clientId);
        const clientName = client ? client.name : 'Cliente no encontrado';
        
        // Información del artículo
        const articulo = empeno.items && empeno.items.length > 0 
            ? empeno.items[0].article 
            : 'Artículo no especificado';
            
        // Calcular fecha de vencimiento
        let fechaVencimiento = 'N/A';
        if (empeno.disbursementDate) {
            const date = new Date(empeno.disbursementDate + 'T00:00:00Z');
            date.setMonth(date.getMonth() + (empeno.numInstallments || 1));
            fechaVencimiento = date.toISOString().split('T')[0];
        }
        
        // Estado de pago
        const paymentInfo = data.getClientPaymentStatusInfo(empeno.clientId);
        const statusClass = 
            empeno.status === 'Pagado' ? 'status-success' :
            paymentInfo.status === 'deficiente' || paymentInfo.status === 'dudoso' ? 'status-warning' :
            paymentInfo.status === 'perdida' || paymentInfo.status === 'sin-calificacion' ? 'status-danger' :
            'status-info';
            
        const statusText = 
            empeno.status === 'Pagado' ? 'Pagado' :
            empeno.status === 'Moroso' ? 'Moroso' :
            empeno.status === 'Por Cobrar' ? 'Por Cobrar' :
            'En Proceso';
        
        return `
            <tr>
                <td>${empeno.id}</td>
                <td>${clientName}</td>
                <td>${articulo}</td>
                <td>${utils.formatCurrency(empeno.totalValuation || 0)}</td>
                <td>${utils.formatCurrency(empeno.amount || 0)}</td>
                <td>${utils.formatDate(empeno.disbursementDate || empeno.date)}</td>
                <td>${utils.formatDate(fechaVencimiento)}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${getPaymentProgressPercentage(empeno)}%"></div>
                        <span>${getPaymentProgressText(empeno)}</span>
                    </div>
                </td>
                <td>
                    <button class="btn btn-info btn-sm" data-action="ver-detalles-servicio" data-id="${empeno.id}" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" data-action="renovar-empeno" data-id="${empeno.id}" title="Renovar Empeño">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="ejecutar-empeno" data-id="${empeno.id}" title="Ejecutar Prenda">
                        <i class="fas fa-gavel"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Calcula el porcentaje de progreso de pago de un empeño
 */
function getPaymentProgressPercentage(empeno) {
    if (!empeno.paymentPlan || !Array.isArray(empeno.paymentPlan) || empeno.paymentPlan.length === 0) {
        return 0;
    }
    
    const totalPaid = empeno.paymentPlan.filter(p => p.paid).length;
    return Math.round((totalPaid / empeno.paymentPlan.length) * 100);
}

/**
 * Genera texto de progreso de pago de un empeño
 */
function getPaymentProgressText(empeno) {
    if (!empeno.paymentPlan || !Array.isArray(empeno.paymentPlan) || empeno.paymentPlan.length === 0) {
        return "Sin cuotas";
    }
    
    const totalPaid = empeno.paymentPlan.filter(p => p.paid).length;
    return `${totalPaid}/${empeno.paymentPlan.length}`;
}

/**
 * Configura los listeners para la gestión de empeños
 */
function setupEmpenoListeners(contentArea) {
    // Botón de filtrar
    const filtrarBtn = contentArea.querySelector('#empeno-filtrar-btn');
    if (filtrarBtn) {
        filtrarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para filtrar los empeños
            ui.showNotification('success', 'Filtros aplicados', 2000);
        });
    }
    
    // Botón para guardar configuración
    const guardarConfigBtn = contentArea.querySelector('#guardar-config-empeno-btn');
    if (guardarConfigBtn) {
        guardarConfigBtn.addEventListener('click', () => {
            // Aquí iría la lógica para guardar la configuración
            ui.showNotification('success', 'Configuración guardada correctamente', 3000);
        });
    }
    
    // Delegación para botones de acción
    contentArea.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id);
        
        if (action === 'renovar-empeno') {
            showRenovarEmpenoModal(id);
        } else if (action === 'ejecutar-empeno') {
            showEjecutarEmpenoModal(id);
        }
        // El botón de ver detalles ya está manejado por la delegación global
    });
}

/**
 * Muestra el modal para renovar un empeño
 */
function showRenovarEmpenoModal(empenoId) {
    const empeno = data.getService(empenoId);
    if (!empeno || empeno.type !== 'Empeño') {
        ui.showNotification('error', 'Empeño no encontrado', 3000);
        return;
    }
    
    const client = data.getClient(empeno.clientId);
    const clientName = client ? client.name : 'Cliente no encontrado';
    
    const modalHTML = `
        <form id="renovar-empeno-form">
            <p>Está por renovar el empeño del cliente <strong>${clientName}</strong>.</p>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="input-group">
                        <label>ID Empeño:</label>
                        <input type="text" value="${empeno.id}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Artículo:</label>
                        <input type="text" value="${empeno.items && empeno.items.length > 0 ? empeno.items[0].article : 'N/A'}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Monto Original:</label>
                        <input type="text" value="${utils.formatCurrency(empeno.amount || 0)}" readonly>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="input-group">
                        <label>Saldo Pendiente:</label>
                        <input type="text" id="saldo-pendiente" value="${utils.formatCurrency(calcularSaldoPendiente(empeno))}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Intereses Acumulados:</label>
                        <input type="text" id="intereses-acumulados" value="${utils.formatCurrency(calcularInteresesAcumulados(empeno))}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Total a Pagar para Renovar:</label>
                        <input type="text" id="total-renovacion" value="${utils.formatCurrency(calcularTotalRenovacion(empeno))}" readonly>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-3">Opciones de Renovación</h4>
            
            <div class="input-group">
                <label for="renovar-pago-inicial">Pago Inicial (S/):</label>
                <input type="number" id="renovar-pago-inicial" name="pagoInicial" value="${calcularPagoMinimoRenovacion(empeno).toFixed(2)}" min="${calcularPagoMinimoRenovacion(empeno).toFixed(2)}" step="0.01" required>
                <small>Mínimo: S/ ${calcularPagoMinimoRenovacion(empeno).toFixed(2)} (intereses acumulados)</small>
            </div>
            
            <div class="input-group">
                <label for="renovar-plazo">Nuevo Plazo (meses):</label>
                <select id="renovar-plazo" name="plazo" required>
                    <option value="1">1 mes</option>
                    <option value="3" selected>3 meses</option>
                    <option value="6">6 meses</option>
                    <option value="12">12 meses</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="renovar-tasa">Tasa de Interés (%):</label>
                <input type="number" id="renovar-tasa" name="tasa" value="${empeno.interestRatePawn || 8}" min="0" step="0.1" required>
            </div>
            
            <div class="input-group">
                <label>Nuevo Monto Total:</label>
                <input type="text" id="nuevo-monto-total" readonly>
            </div>
            
            <div class="input-group">
                <label>Nueva Cuota Mensual:</label>
                <input type="text" id="nueva-cuota-mensual" readonly>
            </div>
            
            <div class="input-group">
                <label for="renovar-forma-pago">Forma de Pago Inicial:</label>
                <select id="renovar-forma-pago" name="formaPago" required>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="yape">Yape/Plin</option>
                </select>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('renovar-empeno-form');
        if (!form) return false;
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        // Aquí iría la lógica para procesar la renovación
        ui.showNotification('success', 'Empeño renovado correctamente', 3000);
        return true;
    };
    
    ui.openModal('Renovación de Empeño', modalHTML, true, 'Procesar Renovación', 'large', handleConfirm);
    
    // Configurar cálculos dinámicos
    const pagoInicialInput = document.getElementById('renovar-pago-inicial');
    const plazoSelect = document.getElementById('renovar-plazo');
    const tasaInput = document.getElementById('renovar-tasa');
    const nuevoMontoTotalInput = document.getElementById('nuevo-monto-total');
    const nuevaCuotaInput = document.getElementById('nueva-cuota-mensual');
    
    const calcularNuevoMonto = () => {
        if (!pagoInicialInput || !plazoSelect || !tasaInput || !nuevoMontoTotalInput || !nuevaCuotaInput) return;
        
        const pagoInicial = parseFloat(pagoInicialInput.value) || 0;
        const plazo = parseInt(plazoSelect.value) || 3;
        const tasa = parseFloat(tasaInput.value) || 8;
        
        // Saldo después del pago inicial
        const saldoPendiente = calcularSaldoPendiente(empeno);
        const nuevoSaldo = Math.max(0, saldoPendiente - pagoInicial);
        
        // Interés total para el nuevo plazo
        const interesMensual = nuevoSaldo * (tasa / 100);
        const interesTotal = interesMensual * plazo;
        
        // Nuevo monto total y cuota
        const nuevoTotal = nuevoSaldo + interesTotal;
        const nuevaCuota = nuevoTotal / plazo;
        
        nuevoMontoTotalInput.value = utils.formatCurrency(nuevoTotal);
        nuevaCuotaInput.value = utils.formatCurrency(nuevaCuota);
    };
    
    // Agregar listeners para recalcular cuando cambian los valores
    if (pagoInicialInput && plazoSelect && tasaInput) {
        pagoInicialInput.addEventListener('input', calcularNuevoMonto);
        plazoSelect.addEventListener('change', calcularNuevoMonto);
        tasaInput.addEventListener('input', calcularNuevoMonto);
        
        // Cálculo inicial
        calcularNuevoMonto();
    }
}

/**
 * Calcula el saldo pendiente de un empeño
 */
function calcularSaldoPendiente(empeno) {
    if (!empeno) return 0;
    
    // Si tiene payments, sumar los pagos realizados
    const totalPagado = empeno.payments 
        ? empeno.payments.reduce((sum, p) => sum + (p.amount || 0), 0) 
        : 0;
    
    // Saldo pendiente = monto original - pagos realizados
    return Math.max(0, (empeno.amount || 0) - totalPagado);
}

/**
 * Calcula los intereses acumulados de un empeño
 */
function calcularInteresesAcumulados(empeno) {
    if (!empeno) return 0;
    
    // Simulación simple: 
    // Intereses = Tasa mensual * monto * meses transcurridos desde desembolso
    const tasaMensual = (empeno.interestRatePawn || 8) / 100;
    const fechaDesembolso = new Date(empeno.disbursementDate || empeno.date);
    const fechaActual = new Date(data.HOY_SIMULADO);
    
    // Calcular meses transcurridos
    const mesesTranscurridos = 
        (fechaActual.getFullYear() - fechaDesembolso.getFullYear()) * 12 + 
        fechaActual.getMonth() - fechaDesembolso.getMonth();
    
    return empeno.amount * tasaMensual * Math.max(1, mesesTranscurridos);
}

/**
 * Calcula el total necesario para renovación (saldo + intereses)
 */
function calcularTotalRenovacion(empeno) {
    return calcularSaldoPendiente(empeno) + calcularInteresesAcumulados(empeno);
}

/**
 * Calcula el pago mínimo para renovación (solo intereses)
 */
function calcularPagoMinimoRenovacion(empeno) {
    return calcularInteresesAcumulados(empeno);
}

/**
 * Muestra el modal para ejecutar la prenda de un empeño
 */
function showEjecutarEmpenoModal(empenoId) {
    const empeno = data.getService(empenoId);
    if (!empeno || empeno.type !== 'Empeño') {
        ui.showNotification('error', 'Empeño no encontrado', 3000);
        return;
    }
    
    const client = data.getClient(empeno.clientId);
    const clientName = client ? client.name : 'Cliente no encontrado';
    
    const modalHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> 
            <strong>ADVERTENCIA:</strong> Está por ejecutar la prenda del empeño #${empeno.id}. 
            Esta acción NO SE PUEDE DESHACER y resultará en la apropiación definitiva del artículo empeñado.
        </div>
        
        <form id="ejecutar-empeno-form">
            <p>Cliente: <strong>${clientName}</strong></p>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="input-group">
                        <label>Artículo Empeñado:</label>
                        <input type="text" value="${empeno.items && empeno.items.length > 0 ? empeno.items[0].article : 'N/A'}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Valor Tasado:</label>
                        <input type="text" value="${utils.formatCurrency(empeno.totalValuation || 0)}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Monto Prestado:</label>
                        <input type="text" value="${utils.formatCurrency(empeno.amount || 0)}" readonly>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="input-group">
                        <label>Fecha de Empeño:</label>
                        <input type="text" value="${utils.formatDate(empeno.disbursementDate || empeno.date)}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Días de Atraso:</label>
                        <input type="text" value="${calcularDiasAtraso(empeno)}" readonly>
                    </div>
                    
                    <div class="input-group">
                        <label>Saldo Pendiente Total:</label>
                        <input type="text" value="${utils.formatCurrency(calcularTotalRenovacion(empeno))}" readonly>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-3">Detalles de Ejecución</h4>
            
            <div class="input-group">
                <label for="ejecutar-motivo">Motivo de Ejecución:</label>
                <select id="ejecutar-motivo" required>
                    <option value="vencimiento">Vencimiento sin pago/renovación</option>
                    <option value="acuerdo">Acuerdo con cliente</option>
                    <option value="abandono">Abandono de prenda</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="ejecutar-documentacion">Documentación de Respaldo:</label>
                <input type="file" id="ejecutar-documentacion" accept="image/*,application/pdf">
                <small>Adjunte notificaciones previas, carta de ejecución, etc.</small>
            </div>
            
            <div class="input-group">
                <label for="ejecutar-observaciones">Observaciones:</label>
                <textarea id="ejecutar-observaciones" rows="3" required></textarea>
            </div>
            
            <div class="form-check mt-3">
                <input class="form-check-input" type="checkbox" id="ejecutar-confirmacion" required>
                <label class="form-check-label" for="ejecutar-confirmacion">
                    Confirmo que se han realizado todos los intentos de contacto con el cliente y que la ejecución de esta prenda cumple con las políticas de la empresa y las normas legales vigentes.
                </label>
            </div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('ejecutar-empeno-form');
        const confirmCheck = document.getElementById('ejecutar-confirmacion');
        
        if (!form || !confirmCheck) return false;
        
        if (!form.checkValidity() || !confirmCheck.checked) {
            if (!confirmCheck.checked) {
                ui.showNotification('warning', 'Debe confirmar la casilla de verificación', 3000);
            }
            form.reportValidity();
            return false;
        }
        
        // Aquí iría la lógica para ejecutar la prenda
        ui.showNotification('success', 'Prenda ejecutada correctamente', 3000);
        
        // Actualizar el estado del empeño
        data.updateService(empenoId, {
            status: 'Ejecutado',
            executionDate: data.HOY_SIMULADO,
            executionReason: document.getElementById('ejecutar-motivo').value,
            executionObservations: document.getElementById('ejecutar-observaciones').value
        });
        
        return true;
    };
    
    ui.openModal('Ejecutar Prenda de Empeño', modalHTML, true, 'Confirmar Ejecución', 'large', handleConfirm);
}

/**
 * Calcula los días de atraso de un empeño
 */
function calcularDiasAtraso(empeno) {
    if (!empeno || !empeno.nextPayment) return 'N/A';
    
    const fechaVencimiento = new Date(empeno.nextPayment + 'T00:00:00Z');
    const fechaActual = new Date(data.HOY_SIMULADO + 'T00:00:00Z');
    
    if (fechaVencimiento >= fechaActual) return '0';
    
    const diferencia = fechaActual - fechaVencimiento;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Carga la interfaz para exportación de datos para Equifax
 */
export function loadExportacionEquifax(contentArea, sectionTitleElement) {
    console.log("Cargando vista Exportación de Datos para Equifax...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Exportación de Datos para Equifax';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-database"></i> Exportación de Datos para Equifax</h3>
        
        <div class="app-form">
            <div class="row">
                <div class="col-md-6">
                    <h4>Configuración de Exportación</h4>
                    <div class="input-group">
                        <label for="equifax-periodo">Periodo a Reportar:</label>
                        <select id="equifax-periodo" required>
                            <option value="">-- Seleccione --</option>
                            <option value="202501">Enero 2025</option>
                            <option value="202502">Febrero 2025</option>
                            <option value="202503">Marzo 2025</option>
                            <option value="202504" selected>Abril 2025</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="equifax-tipo-reporte">Tipo de Reporte:</label>
                        <select id="equifax-tipo-reporte" required>
                            <option value="RCC">Reporte Crediticio Consolidado (RCC)</option>
                            <option value="RDT">Reporte Deuda Total (RDT)</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="equifax-formato">Formato de Archivo:</label>
                        <select id="equifax-formato" required>
                            <option value="TXT">Archivo de Texto (.TXT)</option>
                            <option value="XML">XML Estructurado (.XML)</option>
                            <option value="XLSX">Excel (.XLSX)</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="equifax-codigo-entidad">Código de Entidad:</label>
                        <input type="text" id="equifax-codigo-entidad" value="CASA001" required>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h4>Filtros de Datos</h4>
                    <div class="input-group">
                        <label for="equifax-sucursal">Sucursal:</label>
                        <select id="equifax-sucursal">
                            <option value="">Todas</option>
                            ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                                `<option value="${b.name}">${b.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="equifax-estado-deuda">Estado de Deuda:</label>
                        <select id="equifax-estado-deuda">
                            <option value="">Todos</option>
                            <option value="vigente">Vigente</option>
                            <option value="vencida">Vencida (> 30 días)</option>
                            <option value="castigada">Castigada (> 120 días)</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="equifax-monto-minimo">Monto Mínimo (S/):</label>
                        <input type="number" id="equifax-monto-minimo" value="0" min="0" step="0.01">
                    </div>
                    
                    <div class="form-check mt-3">
                        <input class="form-check-input" type="checkbox" id="equifax-incluir-cancelados" checked>
                        <label class="form-check-label" for="equifax-incluir-cancelados">
                            Incluir créditos cancelados en el periodo
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="form-actions mt-3">
                <button type="button" id="generar-preview-btn" class="btn btn-secondary">
                    <i class="fas fa-eye"></i> Vista Previa
                </button>
                <button type="button" id="generar-equifax-btn" class="btn btn-primary">
                    <i class="fas fa-file-export"></i> Generar Archivo
                </button>
            </div>
        </div>
        
        <div class="data-report-section mt-3">
            <h4>Previsualización de Datos</h4>
            <div id="equifax-preview-container">
                <p class="text-center"><em>Seleccione un periodo y haga clic en "Vista Previa" para ver los datos que se exportarán.</em></p>
            </div>
        </div>
        
        <div class="data-report-section mt-3">
            <h4>Historial de Reportes Enviados</h4>
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Fecha de Envío</th>
                            <th>Periodo</th>
                            <th>Tipo</th>
                            <th>Cantidad Registros</th>
                            <th>Usuario</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>28/03/2025</td>
                            <td>Marzo 2025</td>
                            <td>RCC</td>
                            <td>124</td>
                            <td>gerente</td>
                            <td><span class="status status-success">Enviado</span></td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm" title="Descargar">
                                    <i class="fas fa-download"></i>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>25/02/2025</td>
                            <td>Febrero 2025</td>
                            <td>RCC</td>
                            <td>98</td>
                            <td>gerente</td>
                            <td><span class="status status-success">Enviado</span></td>
                            <td>
                                <button class="btn btn-info btn-sm" title="Ver Detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm" title="Descargar">
                                    <i class="fas fa-download"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle"></i> Los datos exportados cumplen con el formato requerido por Equifax para el reporte de deudores. Asegúrese de verificar la información antes de enviarla.
        </div>
    `;
    
    // Configurar listeners para la exportación de datos
    setupEquifaxListeners(contentArea);
}

/**
 * Configura los listeners para la exportación de datos a Equifax
 */
function setupEquifaxListeners(contentArea) {
    // Botón de vista previa
    const previewBtn = contentArea.querySelector('#generar-preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const periodo = contentArea.querySelector('#equifax-periodo').value;
            if (!periodo) {
                ui.showNotification('warning', 'Seleccione un periodo para la vista previa', 3000);
                return;
            }
            
            // Mostrar spinner mientras se "carga" la vista previa
            contentArea.querySelector('#equifax-preview-container').innerHTML = `
                <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Generando vista previa...</p>
            `;
            
            // Simular carga
            setTimeout(() => {
                generateEquifaxPreview(contentArea);
            }, 1000);
        });
    }
    
    // Botón para generar archivo
    const generateBtn = contentArea.querySelector('#generar-equifax-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const periodo = contentArea.querySelector('#equifax-periodo').value;
            if (!periodo) {
                ui.showNotification('warning', 'Seleccione un periodo para generar el archivo', 3000);
                return;
            }
            
            // Mostrar confirmación
            const confirmMessage = `¿Está seguro de generar el archivo para el periodo ${getPeriodoLabel(periodo)}? Esta acción no se puede deshacer.`;
            
            if (confirm(confirmMessage)) {
                ui.showNotification('success', 'Archivo generado correctamente. Listo para descargar.', 3000);
                
                // Simular descarga
                setTimeout(() => {
                    const formato = contentArea.querySelector('#equifax-formato').value;
                    const tipoReporte = contentArea.querySelector('#equifax-tipo-reporte').value;
                    const a = document.createElement('a');
                    a.href = '#';
                    a.download = `Equifax_${tipoReporte}_${periodo}.${formato.toLowerCase()}`;
                    a.click();
                }, 500);
            }
        });
    }
}

/**
 * Genera la vista previa de datos para Equifax
 */
function generateEquifaxPreview(contentArea) {
    const previewContainer = contentArea.querySelector('#equifax-preview-container');
    if (!previewContainer) return;
    
    const periodo = contentArea.querySelector('#equifax-periodo').value;
    const estadoDeuda = contentArea.querySelector('#equifax-estado-deuda').value;
    const sucursal = contentArea.querySelector('#equifax-sucursal').value;
    
    // Filtrar servicios según los criterios
    let servicios = data.dummyData.services.filter(s => 
        (!sucursal || s.branch === sucursal) &&
        (s.status === 'Por Cobrar' || s.status === 'Moroso')
    );
    
    // Aplicar filtro de estado de deuda
    if (estadoDeuda) {
        servicios = servicios.filter(s => {
            const diasAtraso = s.nextPayment ? calcularDiasAtraso(s) : 0;
            
            if (estadoDeuda === 'vigente') return diasAtraso < 30;
            if (estadoDeuda === 'vencida') return diasAtraso >= 30 && diasAtraso < 120;
            if (estadoDeuda === 'castigada') return diasAtraso >= 120;
            
            return true;
        });
    }
    
    if (servicios.length === 0) {
        previewContainer.innerHTML = `<p class="text-center"><em>No hay datos que cumplan con los criterios seleccionados.</em></p>`;
        return;
    }
    
    // Generar tabla de vista previa
    let html = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> Se encontraron ${servicios.length} registros para el periodo ${getPeriodoLabel(periodo)}.
        </div>
        
        <div class="table-responsive">
            <table class="styled-table">
                <thead>
                    <tr>
                        <th>Tipo Doc.</th>
                        <th>Documento</th>
                        <th>Nombre Cliente</th>
                        <th>Tipo Crédito</th>
                        <th>Fecha Desem.</th>
                        <th>Monto</th>
                        <th>Días Atraso</th>
                        <th>Calif.</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    servicios.slice(0, 10).forEach(servicio => {
        const cliente = data.getClient(servicio.clientId);
        const diasAtraso = servicio.nextPayment ? calcularDiasAtraso(servicio) : 0;
        
        // Determinar calificación según días de atraso
        let calificacion = 'Normal';
        if (diasAtraso >= 120) calificacion = 'Pérdida';
        else if (diasAtraso >= 60) calificacion = 'Dudoso';
        else if (diasAtraso >= 30) calificacion = 'Deficiente';
        else if (diasAtraso >= 8) calificacion = 'CPP';
        
        // Calcular saldo pendiente
        const saldoPendiente = calcularSaldoPendiente(servicio);
        
        html += `
            <tr>
                <td>DNI</td>
                <td>${cliente ? cliente.dni : 'N/A'}</td>
                <td>${cliente ? cliente.name : 'N/A'}</td>
                <td>${servicio.type}</td>
                <td>${utils.formatDate(servicio.disbursementDate || servicio.date)}</td>
                <td>${utils.formatCurrency(servicio.amount || 0)}</td>
                <td>${diasAtraso}</td>
                <td>${calificacion}</td>
                <td>${utils.formatCurrency(saldoPendiente)}</td>
            </tr>
        `;
    });
    
    if (servicios.length > 10) {
        html += `
            <tr>
                <td colspan="9" class="text-center">
                    <em>Mostrando 10 de ${servicios.length} registros. El archivo exportado contendrá todos los datos.</em>
                </td>
            </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    previewContainer.innerHTML = html;
}

/**
 * Devuelve una etiqueta legible para un periodo en formato YYYYMM
 */
function getPeriodoLabel(periodo) {
    if (!periodo || periodo.length !== 6) return periodo;
    
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${months[month - 1]} ${year}`;
}

/**
 * Carga la interfaz para gestión de RRHH
 */
export function loadGestionRRHH(contentArea, sectionTitleElement) {
    console.log("Cargando vista Gestión RRHH...");
    const currentUser = getCurrentUser();
    if (!['Gerente General', 'Dueño'].includes(currentUser?.role)) {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Gestión de Recursos Humanos';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-users-cog"></i> Gestión de Recursos Humanos</h3>
        
        <div class="dashboard-tools-grid">
            <div class="tool-card">
                <a href="#" class="btn-tool" data-action="nav-usuarios">
                    <i class="fas fa-user-cog"></i>
                    <span>Gestión de Usuarios</span>
                </a>
            </div>
            <div class="tool-card">
                <a href="#" class="btn-tool" data-action="nav-planillas">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <span>Gestión de Planillas</span>
                </a>
            </div>
            <div class="tool-card">
                <a href="#" class="btn-tool" data-action="nav-permisos">
                    <i class="fas fa-key"></i>
                    <span>Permisos y Roles</span>
                </a>
            </div>
            <div class="tool-card">
                <a href="#" class="btn-tool" data-action="nav-asistencia">
                    <i class="fas fa-calendar-check"></i>
                    <span>Control de Asistencia</span>
                </a>
            </div>
        </div>
        
        <div class="data-report-section mt-3">
            <h4>Personal Activo por Sucursal</h4>
            <div class="dashboard-grid dashboard-grid-branch">
                ${generateBranchPersonnelCards()}
            </div>
            
            <h4 class="mt-3">Listado de Personal</h4>
            <div class="filter-bar">
                <div class="filter-group">
                    <label for="rrhh-sucursal">Sucursal:</label>
                    <select id="rrhh-sucursal">
                        <option value="">Todas</option>
                        ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                            `<option value="${b.name}">${b.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="rrhh-rol">Rol:</label>
                    <select id="rrhh-rol">
                        <option value="">Todos</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Analista">Analista</option>
                        <option value="Tesorería">Tesorería</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="rrhh-estado">Estado:</label>
                    <select id="rrhh-estado">
                        <option value="">Todos</option>
                        <option value="activo" selected>Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>
                
                <button id="rrhh-filtrar-btn" class="btn btn-primary btn-sm">
                    <i class="fas fa-filter"></i> Filtrar
                </button>
            </div>
            
            <div class="table-responsive mt-3">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre Completo</th>
                            <th>Rol</th>
                            <th>Sucursal</th>
                            <th>Fecha Registro</th>
                            <th>Último Acceso</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generatePersonnelRows()}
                    </tbody>
                </table>
            </div>
            
            <div class="form-actions mt-3">
                <button type="button" class="btn btn-primary" data-action="add-user">
                    <i class="fas fa-user-plus"></i> Agregar Nuevo Usuario
                </button>
                <button type="button" class="btn btn-success">
                    <i class="fas fa-file-excel"></i> Exportar Personal
                </button>
            </div>
        </div>
    `;
    
    // Configurar listeners para gestión RRHH
    setupRRHHListeners(contentArea);
}

/**
 * Genera tarjetas de personal por sucursal
 */
function generateBranchPersonnelCards() {
    const branches = data.dummyData.branches.filter(b => b.status === 'Activa');
    
    return branches.map(branch => {
        const personnel = data.dummyData.users.filter(u => u.branch === branch.name && u.active !== false);
        const analistas = personnel.filter(u => u.role === 'Analista').length;
        const supervisores = personnel.filter(u => u.role === 'Supervisor').length;
        const tesoreros = personnel.filter(u => u.role === 'Tesorería').length;
        
        return `
            <div class="kpi-card">
                <h4><i class="fas fa-store"></i> ${branch.name}</h4>
                <div class="kpi-value">${personnel.length}</div>
                <p class="kpi-description">
                    <span class="badge badge-primary">${supervisores} Supervisor${supervisores !== 1 ? 'es' : ''}</span>
                    <span class="badge badge-info">${analistas} Analista${analistas !== 1 ? 's' : ''}</span>
                    <span class="badge badge-secondary">${tesoreros} Tesorero${tesoreros !== 1 ? 's' : ''}</span>
                </p>
            </div>
        `;
    }).join('');
}

/**
 * Genera filas para la tabla de personal
 */
function generatePersonnelRows() {
    const users = data.dummyData.users.filter(u => 
        u.role !== 'Dueño' && u.role !== 'Gerente General'
    );
    
    if (users.length === 0) {
        return '<tr><td colspan="8"><em>No hay personal registrado.</em></td></tr>';
    }
    
    return users.map(user => {
        const statusClass = user.active !== false ? 'status-success' : 'status-danger';
        const statusText = user.active !== false ? 'Activo' : 'Inactivo';
        
        // Valores simulados para los campos que no existen en el modelo actual
        const nombreCompleto = 'Nombre ' + user.username.charAt(0).toUpperCase() + user.username.slice(1);
        const fechaRegistro = '2025-01-15';
        const ultimoAcceso = user.lastLogin || '2025-04-20';
        
        return `
            <tr>
                <td>${user.username}</td>
                <td>${nombreCompleto}</td>
                <td>${user.role}</td>
                <td>${user.branch || 'N/A'}</td>
                <td>${utils.formatDate(fechaRegistro)}</td>
                <td>${utils.formatDate(ultimoAcceso)}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-info btn-sm" data-action="editar-usuario" data-id="${user.username}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" data-action="reset-password" data-id="${user.username}" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="eliminar-usuario" data-id="${user.username}" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Configura los listeners para la gestión de RRHH
 */
function setupRRHHListeners(contentArea) {
    // Botón de filtrar
    const filtrarBtn = contentArea.querySelector('#rrhh-filtrar-btn');
    if (filtrarBtn) {
        filtrarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para filtrar el personal
            ui.showNotification('success', 'Filtros aplicados', 2000);
        });
    }
    
    // Delegación para botones de herramientas
    contentArea.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-tool, button[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        
        switch (action) {
            case 'nav-usuarios':
                // Usar la función existente
                import('./userManagement.js').then(userMgmt => {
                    userMgmt.loadUserManagement(contentArea, ui.currentSectionTitle);
                });
                break;
                
            case 'nav-planillas':
                // Mostrar vista de planillas (simulación)
                loadPlanillasView(contentArea, ui.currentSectionTitle);
                break;
                
            case 'nav-permisos':
            case 'nav-asistencia':
                ui.showNotification('info', 'Funcionalidad en desarrollo', 3000);
                break;
                
            case 'reset-password':
                if (id) {
                    showResetPasswordModal(id);
                }
                break;
        }
    });
}

/**
 * Muestra el modal para resetear la contraseña de un usuario
 */
function showResetPasswordModal(username) {
    const user = data.getUser(username);
    if (!user) {
        ui.showNotification('error', 'Usuario no encontrado', 3000);
        return;
    }
    
    const modalHTML = `
        <form id="reset-password-form">
            <p>Está por resetear la contraseña del usuario <strong>${username}</strong> (${user.role}).</p>
            
            <div class="input-group">
                <label for="reset-new-password">Nueva Contraseña:</label>
                <input type="password" id="reset-new-password" required>
            </div>
            
            <div class="input-group">
                <label for="reset-confirm-password">Confirmar Contraseña:</label>
                <input type="password" id="reset-confirm-password" required>
            </div>
            
            <div class="form-check mt-3">
                <input class="form-check-input" type="checkbox" id="reset-force-change">
                <label class="form-check-label" for="reset-force-change">
                    Forzar cambio de contraseña en el próximo inicio de sesión
                </label>
            </div>
            
            <div id="reset-error" class="error-message mt-2" style="display: none;"></div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('reset-password-form');
        const errorDiv = document.getElementById('reset-error');
        const newPassword = document.getElementById('reset-new-password').value;
        const confirmPassword = document.getElementById('reset-confirm-password').value;
        
        if (!form || !errorDiv) return false;
        
        errorDiv.style.display = 'none';
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Las contraseñas no coinciden';
            errorDiv.style.display = 'block';
            return false;
        }
        
        // Actualizar la contraseña del usuario
        try {
            data.updateUser(username, { 
                password: newPassword,
                passwordResetFlag: document.getElementById('reset-force-change').checked
            });
            
            ui.showNotification('success', 'Contraseña restablecida correctamente', 3000);
            return true;
        } catch (error) {
            errorDiv.textContent = `Error al restablecer la contraseña: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    
    ui.openModal('Restablecer Contraseña', modalHTML, true, 'Guardar Nueva Contraseña', 'small', handleConfirm);
}

/**
 * Carga la vista de gestión de planillas
 */
function loadPlanillasView(contentArea, sectionTitleElement) {
    console.log("Cargando vista Gestión de Planillas...");
    
    sectionTitleElement.textContent = 'Gestión de Planillas';
    
    contentArea.innerHTML = `
        <h3><i class="fas fa-file-invoice-dollar"></i> Gestión de Planillas</h3>
        
        <div class="filter-bar">
            <div class="filter-group">
                <label for="planilla-periodo">Periodo:</label>
                <select id="planilla-periodo">
                    <option value="202504" selected>Abril 2025</option>
                    <option value="202503">Marzo 2025</option>
                    <option value="202502">Febrero 2025</option>
                    <option value="202501">Enero 2025</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="planilla-sucursal">Sucursal:</label>
                <select id="planilla-sucursal">
                    <option value="">Todas</option>
                    ${data.dummyData.branches.filter(b => b.status === 'Activa').map(b => 
                        `<option value="${b.name}">${b.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="planilla-tipo">Tipo:</label>
                <select id="planilla-tipo">
                    <option value="todos" selected>Todos</option>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                </select>
            </div>
            
            <button id="planilla-filtrar-btn" class="btn btn-primary btn-sm">
                <i class="fas fa-filter"></i> Filtrar
            </button>
        </div>
        
        <div class="data-report-section mt-3">
            <div class="dashboard-grid dashboard-grid-financial">
                <div class="kpi-card kpi-primary">
                    <h4><i class="fas fa-users"></i> Empleados</h4>
                    <div class="kpi-value">12</div>
                    <p class="kpi-description">en planilla activa</p>
                </div>
                <div class="kpi-card kpi-info">
                    <h4><i class="fas fa-money-bill-wave"></i> Remuneración Base</h4>
                    <div class="kpi-value">S/ 32,500.00</div>
                    <p class="kpi-description">total mensual</p>
                </div>
                <div class="kpi-card kpi-success">
                    <h4><i class="fas fa-chart-line"></i> Comisiones</h4>
                    <div class="kpi-value">S/ 8,750.00</div>
                    <p class="kpi-description">según rendimiento</p>
                </div>
                <div class="kpi-card kpi-warning">
                    <h4><i class="fas fa-file-invoice"></i> Total Planilla</h4>
                    <div class="kpi-value">S/ 41,250.00</div>
                    <p class="kpi-description">incluye todos los conceptos</p>
                </div>
            </div>
            
            <h4 class="mt-3">Resumen de Planilla</h4>
            <div class="table-responsive">
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Cargo</th>
                            <th>Sucursal</th>
                            <th>Días Lab.</th>
                            <th>Sueldo Base</th>
                            <th>Comisiones</th>
                            <th>Bonificaciones</th>
                            <th>Descuentos</th>
                            <th>Total Neto</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generatePlanillaRows()}
                    </tbody>
                    <tfoot>
                        <tr class="table-totals-row">
                            <td colspan="4" style="text-align: right;"><strong>TOTALES:</strong></td>
                            <td>S/ 32,500.00</td>
                            <td>S/ 8,750.00</td>
                            <td>S/ 2,500.00</td>
                            <td>S/ 2,500.00</td>
                            <td>S/ 41,250.00</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="form-actions mt-3">
                <button type="button" class="btn btn-primary" id="generar-planilla-btn">
                    <i class="fas fa-cogs"></i> Generar Planilla
                </button>
                <button type="button" class="btn btn-success" id="exportar-planilla-btn">
                    <i class="fas fa-file-excel"></i> Exportar a Excel
                </button>
                <button type="button" class="btn btn-info" id="generar-boletas-btn">
                    <i class="fas fa-envelope"></i> Generar Boletas
                </button>
            </div>
        </div>
    `;
    
    // Configurar listeners para gestión de planillas
    setupPlanillaListeners(contentArea);
}

/**
 * Genera filas para la tabla de planilla
 */
function generatePlanillaRows() {
    const users = data.dummyData.users.filter(u => 
        u.role !== 'Dueño' && u.role !== 'Gerente General' && u.active !== false
    );
    
    if (users.length === 0) {
        return '<tr><td colspan="10"><em>No hay empleados en planilla.</em></td></tr>';
    }
    
    // Datos simulados para la planilla
    return users.map(user => {
        // Generar valores aleatorios pero coherentes para cada usuario
        const sueldoBase = getSueldoBasePorRol(user.role);
        const comisiones = Math.floor(Math.random() * 1000) * 5;
        const bonificaciones = Math.floor(Math.random() * 500);
        const descuentos = Math.floor(Math.random() * 300);
        const neto = sueldoBase + comisiones + bonificaciones - descuentos;
        
        // Nombre simulado basado en username
        const nombreCompleto = 'Nombre ' + user.username.charAt(0).toUpperCase() + user.username.slice(1);
        
        return `
            <tr>
                <td>${nombreCompleto}</td>
                <td>${user.role}</td>
                <td>${user.branch || 'N/A'}</td>
                <td>30</td>
                <td>${utils.formatCurrency(sueldoBase)}</td>
                <td>${utils.formatCurrency(comisiones)}</td>
                <td>${utils.formatCurrency(bonificaciones)}</td>
                <td>${utils.formatCurrency(descuentos)}</td>
                <td>${utils.formatCurrency(neto)}</td>
                <td>
                    <button class="btn btn-info btn-sm" title="Ver Boleta">
                        <i class="fas fa-file-alt"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Obtiene un sueldo base simulado según el rol
 */
function getSueldoBasePorRol(role) {
    switch (role) {
        case 'Supervisor': return 3500;
        case 'Analista': return 2500;
        case 'Tesorería': return 3000;
        default: return 2000;
    }
}

/**
 * Configura los listeners para la gestión de planillas
 */
function setupPlanillaListeners(contentArea) {
    // Botón de filtrar
    const filtrarBtn = contentArea.querySelector('#planilla-filtrar-btn');
    if (filtrarBtn) {
        filtrarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para filtrar la planilla
            ui.showNotification('success', 'Filtros aplicados', 2000);
        });
    }
    
    // Botón para generar planilla
    const generarBtn = contentArea.querySelector('#generar-planilla-btn');
    if (generarBtn) {
        generarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para generar la planilla
            ui.showNotification('success', 'Planilla generada correctamente', 3000);
        });
    }
    
    // Botón para exportar planilla
    const exportarBtn = contentArea.querySelector('#exportar-planilla-btn');
    if (exportarBtn) {
        exportarBtn.addEventListener('click', () => {
            // Aquí iría la lógica para exportar la planilla
            ui.showNotification('success', 'Exportando planilla a Excel...', 2000);
        });
    }
    
    // Botón para generar boletas
    const boletasBtn = contentArea.querySelector('#generar-boletas-btn');
    if (boletasBtn) {
        boletasBtn.addEventListener('click', () => {
            // Aquí iría la lógica para generar boletas
            ui.showNotification('success', 'Generando boletas de pago...', 2000);
            
            // Simular procesamiento
            setTimeout(() => {
                ui.showNotification('success', 'Boletas generadas y enviadas por correo', 3000);
            }, 2000);
        });
    }
}

// Agregar función para el dashboard del analista
/**
 * Carga el dashboard del analista con resumen diario y cartera de clientes
 * NUEVA FUNCIÓN según PDF "USUARIO ANALISTA.pdf"
 */
export function loadAnalystDashboard(contentArea, sectionTitleElement) {
    console.log("Cargando Dashboard personalizado para Analista...");
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Analista') {
        return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
    }
    
    sectionTitleElement.textContent = 'Dashboard Analista';
    
    // Obtener la fecha actual formateada
    const today = utils.formatDate(data.HOY_SIMULADO);
    
    // Obtener datos relevantes para el analista
    const myClients = data.dummyData.clients.filter(c => c.analyst === currentUser.username);
    const myServices = data.dummyData.services.filter(s => s.analyst === currentUser.username);
    const pendingServices = myServices.filter(s => s.status === 'Pendiente' || s.status === 'Verificado');
    const approvedServices = myServices.filter(s => s.status === 'Aprobado');
    const disbursedServices = myServices.filter(s => s.status === 'Desembolsado' || s.status === 'Por Cobrar');
    const latePayments = myServices.filter(s => s.status === 'Moroso');
    
    // Calcular totales de cartera
    const totalPortfolioAmount = disbursedServices.reduce((total, s) => total + (s.amount || 0), 0);
    const totalExpectedInterest = disbursedServices.reduce((total, s) => total + (s.totalInterest || 0), 0);
    
    // Cobranza del día
    const todaysPayments = getTodaysPayments(currentUser.username);
    const todaysPaymentsAmount = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Próximos vencimientos (7 días)
    const upcomingPayments = getUpcomingPayments(currentUser.username, 7);
    
    contentArea.innerHTML = `
        <div class="analyst-dashboard">
            <div class="data-report-section">
                <h3><i class="fas fa-chart-line"></i> Resumen Diario - ${today}</h3>
                <div class="dashboard-grid dashboard-grid-analyst">
                    <div class="kpi-card kpi-primary">
                        <h4><i class="fas fa-users"></i> Total Clientes</h4>
                        <div class="kpi-value">${myClients.length}</div>
                        <p class="kpi-description">Asignados a mi cartera</p>
                    </div>
                    <div class="kpi-card kpi-info">
                        <h4><i class="fas fa-file-alt"></i> Solicitudes Pendientes</h4>
                        <div class="kpi-value">${pendingServices.length}</div>
                        <p class="kpi-description">Esperando aprobación</p>
                    </div>
                    <div class="kpi-card kpi-success">
                        <h4><i class="fas fa-check-circle"></i> Por Desembolsar</h4>
                        <div class="kpi-value">${approvedServices.length}</div>
                        <p class="kpi-description">Aprobados, pendientes de desembolso</p>
                    </div>
                    <div class="kpi-card kpi-warning">
                        <h4><i class="fas fa-calendar-day"></i> Cobros Hoy</h4>
                        <div class="kpi-value">${utils.formatCurrency(todaysPaymentsAmount)}</div>
                        <p class="kpi-description">${todaysPayments.length} pago(s) registrado(s)</p>
                    </div>
                    <div class="kpi-card kpi-info">
                        <h4><i class="fas fa-hand-holding-usd"></i> Cartera Total</h4>
                        <div class="kpi-value">${utils.formatCurrency(totalPortfolioAmount)}</div>
                        <p class="kpi-description">${disbursedServices.length} crédito(s) activo(s)</p>
                    </div>
                    <div class="kpi-card kpi-success">
                        <h4><i class="fas fa-percentage"></i> Intereses Esperados</h4>
                        <div class="kpi-value">${utils.formatCurrency(totalExpectedInterest)}</div>
                        <p class="kpi-description">De créditos activos</p>
                    </div>
                    <div class="kpi-card kpi-danger">
                        <h4><i class="fas fa-exclamation-triangle"></i> Pagos Atrasados</h4>
                        <div class="kpi-value">${latePayments.length}</div>
                        <p class="kpi-description">Requieren seguimiento</p>
                    </div>
                </div>
            </div>
            
            <div class="data-report-section mt-3">
                <h3><i class="fas fa-tasks"></i> Tareas Pendientes</h3>
                <div class="row">
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-file-invoice-dollar"></i> Solicitudes Recientes</h4>
                            </div>
                            <div class="panel-body">
                                ${renderRecentServiceRequests(pendingServices)}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-calendar-alt"></i> Próximos Vencimientos (7 días)</h4>
                            </div>
                            <div class="panel-body">
                                ${renderUpcomingPayments(upcomingPayments)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="data-report-section mt-3">
                <h3><i class="fas fa-wallet"></i> Historial de Crédito</h3>
                ${renderCreditHistory(myServices)}
            </div>
            
            <div class="data-report-section mt-3">
                <h3><i class="fas fa-clipboard-list"></i> Accesos Rápidos</h3>
                <div class="quick-actions-grid">
                    <a href="#" class="quick-action-btn" data-action="nav-registrar-cliente">
                        <i class="fas fa-user-plus"></i>
                        <span>Registrar Cliente</span>
                    </a>
                    <a href="#" class="quick-action-btn" data-action="nav-credito">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Solicitar Préstamo</span>
                    </a>
                    <a href="#" class="quick-action-btn" data-action="nav-empeno">
                        <i class="fas fa-gem"></i>
                        <span>Solicitar Empeño</span>
                    </a>
                    <a href="#" class="quick-action-btn" data-action="nav-abonar">
                        <i class="fas fa-donate"></i>
                        <span>Registrar Abono</span>
                    </a>
                    <a href="#" class="quick-action-btn" data-action="nav-contrato">
                        <i class="fas fa-file-signature"></i>
                        <span>Generar Contrato</span>
                    </a>
                    <a href="#" class="quick-action-btn" data-action="nav-caja">
                        <i class="fas fa-cash-register"></i>
                        <span>Abrir/Cerrar Caja</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Añadir manejadores para los botones de acciones rápidas
    setupQuickActionHandlers(contentArea);
}

/**
 * Obtiene los pagos registrados hoy para el analista
 */
function getTodaysPayments(analystUsername) {
    const today = data.HOY_SIMULADO;
    const analyistServices = data.dummyData.services.filter(s => s.analyst === analystUsername);
    
    // Filtrar pagos realizados hoy en cualquiera de los servicios del analista
    const todayPayments = [];
    
    analyistServices.forEach(service => {
        if (service.payments && Array.isArray(service.payments)) {
            const paymentsToday = service.payments.filter(p => p.date === today);
            paymentsToday.forEach(payment => {
                todayPayments.push({
                    serviceId: service.id,
                    clientId: service.clientId,
                    amount: payment.amount,
                    method: payment.method,
                    notes: payment.notes
                });
            });
        }
    });
    
    return todayPayments;
}

/**
 * Obtiene los pagos próximos a vencer en los siguientes días
 */
function getUpcomingPayments(analystUsername, daysAhead) {
    const today = new Date(data.HOY_SIMULADO);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAhead);
    
    const endDateStr = endDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    const analyistServices = data.dummyData.services.filter(s => 
        s.analyst === analystUsername && 
        (s.status === 'Desembolsado' || s.status === 'Por Cobrar' || s.status === 'Moroso') &&
        s.nextPayment && 
        s.nextPayment >= todayStr && 
        s.nextPayment <= endDateStr
    );
    
    return analyistServices.map(service => {
        const client = data.getClient(service.clientId);
        return {
            serviceId: service.id,
            clientId: service.clientId,
            clientName: client ? client.name : 'Cliente ID: ' + service.clientId,
            dueDate: service.nextPayment,
            amount: service.installmentAmount || 0,
            type: service.type
        };
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); // Ordenar por fecha de vencimiento
}

/**
 * Renderiza la lista de solicitudes recientes
 */
function renderRecentServiceRequests(services) {
    if (!services || services.length === 0) {
        return '<p class="text-center"><em>No hay solicitudes pendientes.</em></p>';
    }
    
    // Mostrar las 5 solicitudes más recientes
    const recentServices = services.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    let html = '<ul class="list-group">';
    
    recentServices.forEach(service => {
        const client = data.getClient(service.clientId);
        const clientName = client ? client.name : 'Cliente ID: ' + service.clientId;
        const date = utils.formatDate(service.date);
        const amount = utils.formatCurrency(service.amount);
        
        html += `
            <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${clientName}</strong> - ${service.type}
                        <br>
                        <small>Fecha: ${date} | Monto: ${amount}</small>
                    </div>
                    <button class="btn btn-info btn-sm" data-action="ver-detalles-servicio" data-id="${service.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    
    if (services.length > 5) {
        html += `
            <div class="text-center mt-2">
                <a href="#" data-action="nav-credito-solicitudes" class="btn btn-link">
                    Ver todas (${services.length})
                </a>
            </div>
        `;
    }
    
    return html;
}

/**
 * Renderiza la lista de pagos próximos
 */
function renderUpcomingPayments(payments) {
    if (!payments || payments.length === 0) {
        return '<p class="text-center"><em>No hay pagos próximos en los siguientes 7 días.</em></p>';
    }
    
    let html = '<ul class="list-group">';
    
    payments.forEach(payment => {
        const dueDate = utils.formatDate(payment.dueDate);
        const amount = utils.formatCurrency(payment.amount);
        const daysLeft = calculateDaysLeft(payment.dueDate);
        const badgeClass = daysLeft === 0 ? 'badge-danger' : (daysLeft <= 2 ? 'badge-warning' : 'badge-primary');
        
        html += `
            <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${payment.clientName}</strong> - ${payment.type}
                        <br>
                        <small>Vencimiento: ${dueDate} | Monto: ${amount}</small>
                    </div>
                    <div>
                        <span class="badge ${badgeClass}">${formatDaysLeftText(daysLeft)}</span>
                        <button class="btn btn-success btn-sm" data-action="registrar-pago" data-id="${payment.serviceId}">
                            <i class="fas fa-hand-holding-dollar"></i>
                        </button>
                    </div>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    
    if (payments.length > 5) {
        html += `
            <div class="text-center mt-2">
                <a href="#" data-action="nav-abonar" class="btn btn-link">
                    Ver todos (${payments.length})
                </a>
            </div>
        `;
    }
    
    return html;
}

/**
 * Calcula los días restantes hasta una fecha
 */
function calculateDaysLeft(dateStr) {
    const today = new Date(data.HOY_SIMULADO);
    const dueDate = new Date(dateStr);
    
    // Quitar las horas para comparar solo fechas
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

/**
 * Formatea el texto para días restantes
 */
function formatDaysLeftText(days) {
    if (days === 0) return 'HOY';
    if (days === 1) return 'MAÑANA';
    return `${days} DÍAS`;
}

/**
 * Renderiza el historial de crédito
 */
function renderCreditHistory(services) {
    if (!services || services.length === 0) {
        return '<p class="text-center"><em>No hay historial de créditos.</em></p>';
    }
    
    // Agrupar servicios por estado
    const servicesMap = services.reduce((groups, service) => {
        const status = service.status || 'Otro';
        if (!groups[status]) {
            groups[status] = [];
        }
        groups[status].push(service);
        return groups;
    }, {});
    
    // Columnas para la tabla resumida
    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'clientId', label: 'Cliente', format: (cid) => {
            const client = data.getClient(cid);
            return client ? client.name : 'Cliente ID: ' + cid;
        }},
        { key: 'type', label: 'Tipo' },
        { key: 'amount', label: 'Monto', format: 'currency', numeric: true },
        { key: 'date', label: 'Fecha', format: 'date' },
        { key: 'status', label: 'Estado' }
    ];
    
    // Acciones para la tabla
    const actions = [
        { label: 'Ver Detalles', class: 'btn-info btn-sm', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' }
    ];
    
    const statusOrder = [
        'Pendiente', 'Verificado', 'Aprobado', 'Desembolsado', 'Por Cobrar', 'Moroso', 'Pagado', 'Rechazado'
    ];
    
    let html = '<ul class="nav nav-tabs" id="creditHistoryTabs" role="tablist">';
    let tabContent = '<div class="tab-content" id="creditHistoryTabContent">';
    
    // Crear pestañas para los diferentes estados
    let firstTab = true;
    statusOrder.forEach((status, index) => {
        if (servicesMap[status] && servicesMap[status].length > 0) {
            const tabId = `creditHistory-${status.replace(/\s+/g, '-').toLowerCase()}`;
            html += `
                <li class="nav-item" role="presentation">
                    <a class="nav-link ${firstTab ? 'active' : ''}" id="${tabId}-tab" data-toggle="tab" href="#${tabId}" role="tab" aria-controls="${tabId}" aria-selected="${firstTab ? 'true' : 'false'}">
                        ${status} (${servicesMap[status].length})
                    </a>
                </li>
            `;
            
            tabContent += `
                <div class="tab-pane fade ${firstTab ? 'show active' : ''}" id="${tabId}" role="tabpanel" aria-labelledby="${tabId}-tab">
                    ${ui.renderTable(servicesMap[status], columns, actions, { defaultMessage: `No hay servicios en estado ${status}.`, tableId: `creditHistory-${status}-table` })}
                </div>
            `;
            
            firstTab = false;
        }
    });
    
    html += '</ul>';
    tabContent += '</div>';
    
    // Si no hay pestañas (caso improbable si hay servicios), mostrar todo en una tabla
    if (firstTab) {
        return ui.renderTable(services, columns, actions, { defaultMessage: 'No hay historial de créditos.', tableId: 'creditHistory-all-table' });
    }
    
    return html + tabContent;
}

/**
 * Configura los manejadores para los botones de acciones rápidas
 */
function setupQuickActionHandlers(contentArea) {
    contentArea.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-action-btn');
        if (!btn) return;
        
        e.preventDefault();
        const action = btn.getAttribute('data-action');
        
        switch (action) {
            case 'nav-registrar-cliente':
                import('./clientManagement.js').then(module => {
                    module.loadClientRegistration(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-credito':
                import('./serviceManagement.js').then(module => {
                    module.loadLoanRequest(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-empeno':
                import('./serviceManagement.js').then(module => {
                    module.loadPawnRequest(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-abonar':
                import('./treasury.js').then(module => {
                    module.loadAbonarView(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-contrato':
                import('./serviceManagement.js').then(module => {
                    module.loadContractGenerator(ui.contentArea, ui.currentSectionTitle);
                });
                break;
            case 'nav-caja':
                // Esta función debe estar en el módulo treasury.js
                import('./treasury.js').then(module => {
                    if (typeof module.loadOpenCloseCashBoxView === 'function') {
                        module.loadOpenCloseCashBoxView(ui.contentArea, ui.currentSectionTitle);
                    } else {
                        ui.showNotification('warning', 'Funcionalidad en desarrollo', 2000);
                    }
                });
                break;
            case 'nav-credito-solicitudes':
                import('./serviceManagement.js').then(module => {
                    module.loadCreditRequestsView(ui.contentArea, ui.currentSectionTitle);
                });
                break;
        }
    });
}