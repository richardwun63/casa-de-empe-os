// js/modules/components/fieldMonitoring.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';

console.log('Modulo fieldMonitoring.js cargado.');

/**
 * Carga el Dashboard del Supervisor con KPIs y monitoreo de analistas de su sucursal.
 * (Renombrada de loadSupervisorAnalystMonitoring)
 */
export function loadSupervisorDashboard(contentArea, sectionTitleElement) {
    console.log("Cargando Dashboard Supervisor...");
    const currentUser = getCurrentUser();
    const supervisorBranch = currentUser?.branch; // Obtener sucursal asignada

    if (currentUser?.role !== 'Supervisor' || !supervisorBranch) {
        ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado o falta sucursal asignada.');
        return;
    }
    sectionTitleElement.textContent = `Dashboard Supervisor (${supervisorBranch})`;

    // --- Calcular KPIs para la Sucursal del Supervisor ---
    const servicesInBranch = data.dummyData.services.filter(s => s.branch === supervisorBranch);
    const clientsInBranch = data.dummyData.clients.filter(c => c.branch === supervisorBranch);

    // 1. Servicios pendientes de verificación
    const pendingVerificationCount = servicesInBranch.filter(s => s.status === 'Pendiente').length;

    // 2. Clientes con mora alta (Deficiente o peor)
    const highRiskStates = ['deficiente', 'dudoso', 'perdida', 'sin-calificacion'];
    let highRiskClientsCount = 0;
    const clientIdsInBranch = new Set(clientsInBranch.map(c => c.id));
    clientIdsInBranch.forEach(clientId => {
         const paymentInfo = data.getClientPaymentStatusInfo(clientId);
         if (paymentInfo && highRiskStates.includes(paymentInfo.status)) {
             highRiskClientsCount++;
         }
    });

    // 3. Monto total pendiente de cobro (Saldo real: totalToPay - abonos)
    const pendingCollectionAmount = servicesInBranch
        .filter(s => ['Por Cobrar', 'Moroso'].includes(s.status))
        .reduce((sum, s) => {
            const pagado = s.payments ? s.payments.reduce((a, p) => a + (p.amount || 0), 0) : 0;
            return sum + ((s.totalToPay || s.amount || 0) - pagado);
        }, 0);

    // --- Datos de Rendimiento de Analistas (SOLO de la sucursal) ---
    const analystsInBranch = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === supervisorBranch);
    const analystPerformanceData = analystsInBranch.map(analyst => {
        const kpis = data.kpiService.getAnalystKPIs(analyst.username); // Obtener KPIs generales del analista
        // Aquí podríamos calcular KPIs más específicos del supervisor si fuera necesario
        return {
            username: analyst.username,
            // branch: analyst.branch, // Ya sabemos que es la del supervisor
            numSolicitudes: kpis?.numSolicitudesProcesadas ?? 'N/A',
            numAprobados: kpis?.numPrestamosAprobados ?? 'N/A',
            montoAprobado: utils.formatCurrency(kpis?.montoTotalAprobado ?? 0),
            tasaAprobacion: kpis?.tasaAprobacionVsRechazoAnalista ?? 'N/A',
            morosidadTemprana: kpis?.tasaMorosidadTempranaAnalista ?? 'N/A (Pl)',
            incumplimiento: kpis?.tasaIncumplimientoAnalista ?? 'N/A (Pl)'
        };
    });

     // Columnas para la tabla de analistas
     const analystColumns = [
         { key: 'username', label: 'Analista' },
         { key: 'numSolicitudes', label: '# Solicitudes', numeric: true },
         { key: 'numAprobados', label: '# Aprobados', numeric: true },
         { key: 'montoAprobado', label: 'Monto Aprob. (S/)', numeric: true },
         { key: 'tasaAprobacion', label: '% Aprob.' },
         { key: 'morosidadTemprana', label: 'Mora Temp. (Pl.)' },
         { key: 'incumplimiento', label: 'Incump. (Pl.)' }
     ];
     const analystActions = [
          { label: 'Ver Servicios', class: 'btn-info', icon: 'fa-list', actionKey: 'ver-servicios-analista', idKey: 'username' }
          // Podría haber acción para ver ruta/gastos del analista si se implementa
     ];

    // --- Renderizar HTML ---
    contentArea.innerHTML = `
        <h3><i class="fas fa-tachometer-alt"></i> Dashboard Supervisor - ${supervisorBranch}</h3>

        <div class="data-report-section">
             <h4>Resumen Sucursal</h4>
             <div class="dashboard-grid dashboard-grid-general-kpi">
                  <div class="kpi-card kpi-warning">
                      <h4><i class="fas fa-file-signature"></i> Pendiente Verificar</h4>
                      <div class="kpi-value">${pendingVerificationCount}</div>
                      <p class="kpi-description">Solicitudes nuevas en espera de revisión.</p>
                  </div>
                   <div class="kpi-card kpi-danger">
                      <h4><i class="fas fa-exclamation-triangle"></i> Clientes Mora Alta</h4>
                      <div class="kpi-value">${highRiskClientsCount}</div>
                      <p class="kpi-description">Clientes en estado Deficiente o peor.</p>
                  </div>
                   <div class="kpi-card kpi-primary">
                      <h4><i class="fas fa-hand-holding-usd"></i> Monto por Cobrar (Sim.)</h4>
                      <div class="kpi-value">${utils.formatCurrency(pendingCollectionAmount)}</div>
                      <p class="kpi-description">Suma de montos originales de créditos por cobrar/morosos.</p>
                  </div>
             </div>
        </div>

        <div class="data-report-section">
            <h4>Rendimiento Analistas (${supervisorBranch})</h4>
            ${ui.renderTable(analystPerformanceData, analystColumns, analystActions, {
                defaultMessage: 'No hay analistas asignados a esta sucursal.',
                tableId: 'supervisor-analyst-monitoring-table'
            })}
            <div class="alert alert-secondary mt-3">
                 <i class="fas fa-info-circle"></i> Algunos KPIs de analista (marcados con 'Pl.') son placeholders.
            </div>
        </div>
    `;
    console.log('Dashboard Supervisor renderizado.');
}

/**
 * Carga una vista simulada de monitoreo de campo para el Supervisor.
 */
export function loadSupervisorFieldMonitoring(contentArea, sectionTitleElement) {
    console.log("Cargando Monitoreo de Campo (Supervisor)..."); const currentUser = getCurrentUser(); if (currentUser?.role !== 'Supervisor') { ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.'); return; } sectionTitleElement.textContent = 'Monitoreo de Campo (Simulado)'; const analysts = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === currentUser.branch); // Filtrar por sucursal
    const fieldData = analysts.map(analyst => { const statuses = ['En ruta - Zona Norte', 'Visitando cliente (ID: 103)', `En Sucursal ${analyst.branch}`, 'Almuerzo', 'Registrando Gasto', 'En ruta - Zona Sur']; const lastCheckIn = new Date(Date.now() - Math.random() * 60 * 60 * 1000); return { username: analyst.username, branch: analyst.branch, simulatedStatus: statuses[Math.floor(Math.random() * statuses.length)], lastCheckIn: `${lastCheckIn.getHours().toString().padStart(2,'0')}:${lastCheckIn.getMinutes().toString().padStart(2,'0')}` }; }); const columns = [ { key: 'username', label: 'Analista' }, { key: 'simulatedStatus', label: 'Estado/Ubicación (Sim.)' }, { key: 'lastCheckIn', label: 'Últ. Check-in (Sim.)' } ]; const actions = [ { label: 'Ver Servicios Pendientes', class: 'btn-warning', icon: 'fa-motorcycle', actionKey: 'ver-servicios-analista', idKey: 'username' }];
    contentArea.innerHTML = `<h3><i class="fas fa-map-marked-alt"></i> Seguimiento de Analistas en Campo (${currentUser.branch} - Simulación)</h3> <p>Esta es una vista simulada del estado y ubicación de los analistas de tu sucursal.</p> <div class="alert alert-warning"> <i class="fas fa-exclamation-triangle"></i> ¡Funcionalidad Simulada! Los datos son aleatorios. </div> ${ui.renderTable(fieldData, columns, actions, { defaultMessage: 'No hay analistas en tu sucursal para mostrar.', tableId: 'field-monitoring-table' })}`;
}

 /**
  * Muestra los servicios asignados a un analista específico en un modal.
  */
 export function showAnalystServices(analystUsername) {
      console.log(`Mostrando servicios para analista: ${analystUsername}`); const analyst = data.getUser(analystUsername); if (!analyst) { alert("Error: Analista no encontrado."); return; } const analystServices = data.dummyData.services.filter(s => s.analyst === analystUsername).sort((a,b) => new Date(b.date) - new Date(a.date)); const columns = [ { key: 'id', label: 'ID' }, { key: 'type', label: 'Tipo' }, { key: 'clientId', label: 'Cliente', format: (cid) => data.getClient(cid)?.name ?? 'N/A' }, { key: 'amount', label: 'Monto/Valor', format: 'currency', numeric: true }, { key: 'date', label: 'Fec. Reg.', format: 'date' }, { key: 'status', label: 'Estado' }, { key: 'clientId', label: 'Estado Pago', format: (cid) => { const info = data.getClientPaymentStatusInfo(cid); return `<span class="status status-${info.status}">${info.statusText}</span>`; }}, { key: 'id', label: 'Plan Pagos', center: true, format: (id) => `<button class="btn btn-link btn-sm" data-action="ver-plan-pagos" data-id="${id}" title="Ver Plan de Pagos"><i class="fas fa-calendar-alt"></i></button>` }, { key: 'id', label: 'Abonos', center: true, format: (id) => `<button class="btn btn-link btn-sm" data-action="ver-abonos" data-id="${id}" title="Ver Abonos"><i class="fas fa-money-bill-wave"></i></button>` } ]; const actions = [ { label: 'Ver Detalles', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-servicio', idKey: 'id' } ]; const modalBodyHTML = ` <p>Mostrando todos los servicios registrados/asignados a <strong>${analystUsername}</strong> (${analyst.branch || 'Sin Suc.'}).</p> ${ui.renderTable(analystServices, columns, actions, { defaultMessage: 'Este analista no tiene servicios registrados o asignados.', tableId: `analyst-services-modal-table-${analystUsername}` })} `; ui.openModal( `Servicios de ${analystUsername}`, modalBodyHTML, false, '', 'large' );
      // Listeners para ver plan de pagos y abonos
      const modalBody = document.getElementById('modal-body');
      modalBody?.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          if (action === 'ver-plan-pagos') {
              if (window.serviceMgmt && typeof window.serviceMgmt.viewPaymentPlan === 'function') {
                  window.serviceMgmt.viewPaymentPlan(parseInt(id));
              }
          } else if (action === 'ver-abonos') {
              if (window.serviceMgmt && typeof window.serviceMgmt.viewPaymentsHistory === 'function') {
                  window.serviceMgmt.viewPaymentsHistory(parseInt(id));
              }
          }
      });
 }