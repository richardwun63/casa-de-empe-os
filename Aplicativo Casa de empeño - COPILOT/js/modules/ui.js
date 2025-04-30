// js/modules/ui.js
import { getCurrentUser } from './auth.js';
import * as utils from './utils.js';
import * as data from './data.js';
import * as dashboard from './components/dashboard.js';
import * as clientMgmt from './components/clientManagement.js';
import * as serviceMgmt from './components/serviceManagement.js';
import * as userMgmt from './components/userManagement.js';
import * as branchMgmt from './components/branchManagement.js';
import * as reports from './components/reports.js';
import * as treasury from './components/treasury.js';
import * as approvals from './components/approvals.js';
import * as settings from './components/settings.js';
import * as fieldMonitor from './components/fieldMonitoring.js';
// Añadir import si se crea módulo de contratos
// import * as contract from './components/contract.js';

console.log('Modulo ui.js cargado.');

let currentLoadFunction = null;
let currentActionArgs = {};

// Exportar elementos necesarios
const mainNav = document.getElementById('main-nav');
export const contentArea = document.getElementById('content-area'); // Exportar
export const currentSectionTitle = document.getElementById('current-section-title'); // Exportar
const genericModal = document.getElementById('generic-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirmBtnGlobal = document.getElementById('modal-confirm-btn');
const closeModalBtns = document.querySelectorAll('.close-modal-btn');
const usernameDisplay = document.getElementById('username-display');
const userRoleDisplay = document.getElementById('user-role-display');
const branchDisplay = document.getElementById('branch-display');

export function showError(container, titleElement, message) {
    if(titleElement) titleElement.textContent = 'Error';
    const errorHTML = `<div class="alert alert-danger">${message}</div>`;
    if(container) { container.innerHTML = errorHTML; } else { alert(`Error: ${message}`); }
    console.error(message);
}

function setCurrentView(loadFn, args = {}) {
    currentLoadFunction = loadFn; currentActionArgs = args;
    console.log(`Vista actual establecida: ${loadFn?.name || 'ninguna'}`);
}

export function reloadCurrentView() {
    console.log('Recargando vista actual...');
    if (typeof currentLoadFunction === 'function') {
        if (!contentArea || !currentSectionTitle) { return console.error("Error recarga: UI elements missing."); }
        cleanContentAreaListeners(); // Limpia listeners antes de recargar
        contentArea.innerHTML = '<p>Recargando...</p>';
        try { currentLoadFunction(contentArea, currentSectionTitle, currentActionArgs); console.log('Vista recargada.'); }
        catch (error) { console.error("Error al recargar vista:", error); showError(contentArea, currentSectionTitle, `Error al recargar: ${error.message}`); }
    } else { console.warn('No hay vista actual para recargar.'); loadInitialContent(); }
}


/**
 * Configura el menú de navegación lateral según el rol del usuario.
 * MODIFICADO: Menú Analista actualizado con nuevas secciones y Bóveda como submenú.
 */
export function setupUIForRole(role) {
    console.log(`Configurando UI para rol: ${role}`);
    if (!mainNav) { return console.error("Error crítico: #main-nav no encontrado."); }
    mainNav.innerHTML = ''; const navList = document.createElement('ul');

    // Definición de menús por rol (MODIFICADO Analista según PDF)
    const menuItemsConfig = {
        'Dueño': [
            { label: 'Dashboard General', icon: 'fa-tachometer-alt', action: dashboard.loadOwnerDashboard },
            { label: 'Gestión Sucursales', icon: 'fa-store', action: branchMgmt.loadBranchManagement },
            { label: 'Gestión Usuarios', icon: 'fa-users-cog', action: userMgmt.loadUserManagement },
            { label: 'Cartera de clientes', icon: 'fa-address-book', action: clientMgmt.loadClientManagement },
            { label: 'Reporte Diario', icon: 'fa-clipboard-list', action: reports.loadServicesReport },
            { label: 'Reportes Tesorería', icon: 'fa-landmark', action: treasury.loadTreasuryReports }
        ],
        'Gerente General': [
            { label: 'Dashboard General', icon: 'fa-chart-line', action: dashboard.loadGmDashboard },
            { label: 'Aprobar Servicios', icon: 'fa-check-double', action: approvals.loadApprovalQueue },
            { label: 'Registrar Desembolsos', icon: 'fa-receipt', action: approvals.loadDisbursementRegistration },
            { label: 'Gestión Tasas', icon: 'fa-percentage', action: settings.loadInterestRateManagement },
            { label: 'Cartera de clientes', icon: 'fa-address-book', action: clientMgmt.loadClientManagement },
            { label: 'Reporte Diario', icon: 'fa-clipboard-list', action: reports.loadServicesReport },
            { label: 'Reportes Tesorería', icon: 'fa-landmark', action: treasury.loadTreasuryReports }
        ],
        'Supervisor': [
            { label: 'Dashboard Supervisor', icon: 'fa-tachometer-alt', action: fieldMonitor.loadSupervisorDashboard },
            { label: 'Verificar Servicios', icon: 'fa-file-signature', action: approvals.loadSupervisorServiceVerification },
            { label: 'Clientes por Cobrar', icon: 'fa-motorcycle', action: reports.loadSupervisorCollection },
            { label: 'Ver Todos Clientes', icon: 'fa-users', action: clientMgmt.loadAllClientsForSupervisor },
            { label: 'Monitoreo Campo (Sim.)', icon: 'fa-map-marked-alt', action: fieldMonitor.loadSupervisorFieldMonitoring }
        ],
        'Analista': [
            // Dashboard (NUEVO según PDF)
            { label: 'Dashboard', icon: 'fa-tachometer-alt', action: dashboard.loadAnalystDashboard },
            
            // Flujo Cliente/Solicitud
            { label: 'Clientes', icon: 'fa-users', isParent: true, children: [
                { label: 'Registrar Cliente', icon: 'fa-user-plus', action: clientMgmt.loadClientRegistration },
                { label: 'Cartera de Clientes', icon: 'fa-address-book', action: clientMgmt.loadClientManagement }
            ]},
            
            // Solicitudes (grupo nuevo según PDF)
            { label: 'Solicitudes', icon: 'fa-file-alt', isParent: true, children: [
                { label: 'Solicitud de Crédito', icon: 'fa-file-contract', action: serviceMgmt.loadLoanRequest },
                { label: 'Solicitud de Empeño', icon: 'fa-gem', action: serviceMgmt.loadPawnRequest },
                { label: 'Créditos Ingresados', icon: 'fa-list-alt', action: serviceMgmt.loadCreditRequestsView },
                { label: 'Empeños Ingresados', icon: 'fa-list-alt', action: serviceMgmt.loadPawnRequestsView }
            ]},
            
            // Créditos (grupo nuevo según PDF)
            { label: 'Créditos', icon: 'fa-hand-holding-usd', isParent: true, children: [
                { label: 'Créditos Desembolsados', icon: 'fa-receipt', action: serviceMgmt.loadDisbursementsView },
                { label: 'Registrar Abono', icon: 'fa-donate', action: treasury.loadAbonarView },
                { label: 'Generar Contrato', icon: 'fa-file-signature', action: serviceMgmt.loadContractGenerator }
            ]},
            
            // Bóveda/Caja (Grupo nuevo según PDF)
            { label: 'Caja - Bancos', icon: 'fa-cash-register', isParent: true, children: [
                 { label: 'Abrir/Cerrar Caja', icon: 'fa-door-open', action: treasury.loadOpenCloseCashBoxView },
                 { label: 'Solicitar Efectivo', icon: 'fa-hand-holding-dollar', action: treasury.loadRequestCashView },
                 { label: 'Registrar Egreso', icon: 'fa-receipt', action: treasury.loadRequestExpenseView }
            ]},
            
            // Información Personal (RRHH) según PDF
            { label: 'RRHH - Usuario', icon: 'fa-id-card', action: loadUserProfile }
        ],
        'Tesorería': [
             { label: 'Cuadre Caja Analista', icon: 'fa-cash-register', action: treasury.loadAnalystCashReconciliation },
             { label: 'Cuadre Caja Sucursal', icon: 'fa-calculator', action: treasury.loadBranchCashReconciliation },
             { label: 'Gestión de Gastos Suc.', icon: 'fa-file-invoice-dollar', action: treasury.loadExpenseManagement },
             { label: 'Entregar Dinero Analista', icon: 'fa-hand-holding-usd', action: treasury.loadRecordMoneyGiven },
             { label: 'Recibir Dinero Analista', icon: 'fa-receipt', action: treasury.loadRecordMoneyReceived },
             { label: 'Historial Transferencias', icon: 'fa-folder-open', action: treasury.loadTreasuryDataManagement },
             { label: 'Reportes de Caja', icon: 'fa-chart-pie', action: treasury.loadCashReports },
             { label: 'Gestión de Proveedores', icon: 'fa-truck', action: treasury.loadProviderManagement },
             { label: 'Bóveda', icon: 'fa-vault', action: treasury.loadVaultSection }
        ]
    };

    /// Función para crear items de menú (MODIFICADA para manejar submenús con clase 'open')
    const createMenuItem = (item, isSubmenu = false) => {
        const li = document.createElement('li');
        if (item.isParent) li.classList.add('has-submenu'); // Añadir clase para identificar padres
        if (isSubmenu) li.classList.add('submenu-item');

        const a = document.createElement('a'); a.href = '#';
        a.innerHTML = `<i class="fas ${item.icon || 'fa-circle-notch'}"></i> ${item.label}`;

        if (item.action) {
            // Listener de clic para acciones normales
            a.onclick = (e) => {
                 e.preventDefault();
                 console.log(`Navegando a: ${item.label}`);

                 // Quitar clase activa de todos los enlaces y padres
                 document.querySelectorAll('#main-nav a.active, #main-nav li.open').forEach(el => {
                      el.classList.remove('active');
                      if(el.tagName === 'LI') el.classList.remove('open'); // Quitar 'open' de LIs
                 });
                 // Quitar clase de padre activo (por si acaso)
                 document.querySelectorAll('#main-nav li.has-submenu > a.active-parent').forEach(p => p.classList.remove('active-parent'));

                 // Añadir clase activa al enlace actual
                 a.classList.add('active');
                 // Si es un subitem, marcar al padre como activo también
                 const parentLi = a.closest('li.has-submenu');
                 if(parentLi) {
                      parentLi.classList.add('open'); // Asegurar que el padre esté expandido
                      parentLi.querySelector(':scope > a')?.classList.add('active-parent');
                 }


                 setCurrentView(item.action, item.args || {});
                 if (!contentArea || !currentSectionTitle) { return console.error("Error nav: UI elements missing."); }
                 contentArea.innerHTML = '<p>Cargando...</p>'; currentSectionTitle.textContent = item.label;
                 try { item.action(contentArea, currentSectionTitle, item.args || {}); console.log(`Contenido "${item.label}" cargado.`); }
                 catch (error) { console.error(`Error cargando "${item.label}":`, error); showError(contentArea, currentSectionTitle, `Error cargando ${item.label}: ${error.message}<pre>${error.stack || ''}</pre>`); }
            };
        } else if (item.isParent && item.children) {
             // Si es un padre con hijos (submenú)
             a.innerHTML += ' <i class="fas fa-chevron-down submenu-arrow"></i>';
             const subList = document.createElement('ul');
             subList.classList.add('submenu');
             // subList.style.display = 'none'; // Controlado por max-height ahora
             item.children.forEach(child => subList.appendChild(createMenuItem(child, true)));
             li.appendChild(subList);

             // Listener de clic para expandir/colapsar
             a.onclick = (e) => {
                  e.preventDefault();
                  const parentLi = e.currentTarget.closest('li.has-submenu');
                  if (!parentLi) return;

                  // Cerrar otros submenús abiertos al mismo nivel (opcional)
                   parentLi.parentElement?.querySelectorAll(':scope > li.has-submenu.open').forEach(otherLi => {
                       if (otherLi !== parentLi) {
                           otherLi.classList.remove('open');
                           // otherLi.querySelector(':scope > a > .submenu-arrow')?.classList.replace('fa-chevron-up', 'fa-chevron-down');
                       }
                   });

                  // Abrir/cerrar el submenú actual
                  parentLi.classList.toggle('open');

                  // Actualizar flecha (opcional visual)
                  // const arrow = a.querySelector('.submenu-arrow');
                  // if (arrow) {
                  //     arrow.classList.toggle('fa-chevron-down', !parentLi.classList.contains('open'));
                  //     arrow.classList.toggle('fa-chevron-up', parentLi.classList.contains('open'));
                  // }
             };
        }
        li.appendChild(a); return li;
    };
    const userMenu = menuItemsConfig[role];
    if (userMenu?.length) { userMenu.forEach(item => navList.appendChild(createMenuItem(item))); }
    else { navList.innerHTML = '<li>Menú no disponible</li>'; console.warn(`Menú no definido para rol: ${role}`); }
    mainNav.appendChild(navList); console.log('Menú construido.');
}


export function loadInitialContent() {
    console.log(`Cargando contenido inicial...`); const firstLink = mainNav?.querySelector('ul li a'); if (firstLink && !firstLink.closest('ul.submenu')) { console.log('Clic en primer enlace del menú principal.'); firstLink.click(); } else { const firstSubmenuLink = mainNav?.querySelector('ul ul.submenu li a'); 
        if (firstSubmenuLink) { console.log('Clic en primer enlace de submenú.'); firstSubmenuLink.click(); } else if(firstLink) { console.log('Clic en primer enlace (posiblemente padre de submenú).'); firstLink.click(); } else { if (!contentArea || !currentSectionTitle) return; contentArea.innerHTML = '<p>Bienvenido.</p>'; currentSectionTitle.textContent = 'Inicio'; setCurrentView(null); console.warn('No se encontró primer enlace de menú.'); } }
}
export function clearUI() {
     console.log('Limpiando UI...'); if(mainNav) mainNav.innerHTML = ''; if(contentArea) contentArea.innerHTML = ''; if(currentSectionTitle) currentSectionTitle.textContent = ''; if(usernameDisplay) usernameDisplay.textContent = ''; if(userRoleDisplay) userRoleDisplay.textContent = ''; if(branchDisplay) branchDisplay.textContent = ''; setCurrentView(null);
}
export function getCurrentLoadFunction() { return currentLoadFunction; }
export function getCurrentActionArgs() { return currentActionArgs; }

// Funciones de Modal
let currentConfirmHandler = null;
export function openModal(title, bodyHTML, showConfirm = true, confirmText = 'Confirmar', modalSize = 'medium', onConfirm = null) { if (!genericModal || !modalTitle || !modalBody || !modalConfirmBtnGlobal) { console.error("Elementos modal no encontrados."); return; } modalTitle.textContent = title; modalBody.innerHTML = bodyHTML; if (currentConfirmHandler) { modalConfirmBtnGlobal.removeEventListener('click', currentConfirmHandler); currentConfirmHandler = null; } modalConfirmBtnGlobal.textContent = confirmText; modalConfirmBtnGlobal.style.display = showConfirm ? 'inline-block' : 'none'; modalConfirmBtnGlobal.disabled = false; if (showConfirm && typeof onConfirm === 'function') { currentConfirmHandler = async function confirmHandlerInternal() { modalConfirmBtnGlobal.disabled = true; modalConfirmBtnGlobal.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Procesando...`; let shouldClose = false; try { const result = onConfirm(); shouldClose = (result instanceof Promise) ? await result : result; if (shouldClose === true || shouldClose === undefined) closeModal(); } catch (error) { console.error("Error en callback onConfirm:", error); const errorDiv = modalBody.querySelector('.error-message'); if (errorDiv) { errorDiv.textContent = `Error: ${error.message || error}`; errorDiv.style.display = 'block'; } else { /* alert(`Error: ${error.message || error}`); */ console.error(`Error no mostrado en modal: ${error.message || error}`); } shouldClose = false; } finally { const btnStillExists = document.getElementById('modal-confirm-btn'); if (!shouldClose && btnStillExists) { btnStillExists.disabled = false; btnStillExists.textContent = confirmText; } } }; modalConfirmBtnGlobal.addEventListener('click', currentConfirmHandler); } const modalContent = genericModal.querySelector('.modal-content'); if(modalContent) { let maxWidth = '700px'; if (modalSize === 'large') maxWidth = '1000px'; 
    else if (modalSize === 'medium') maxWidth = '800px'; else if (modalSize === 'small') maxWidth = '500px'; else if (modalSize === 'xlarge') maxWidth = '1200px'; modalContent.style.maxWidth = maxWidth; } genericModal.style.display = 'block'; document.body.style.overflow = 'hidden'; setTimeout(() => { const firstFocusable = modalBody.querySelector('input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled):not([readonly]), button:not(:disabled)'); if (firstFocusable) { try { firstFocusable.focus(); } catch(e){} } else { genericModal.querySelector('.close-modal-btn')?.focus(); } }, 150); }
export function closeModal() { if (genericModal) { genericModal.style.display = 'none'; if(modalBody) modalBody.innerHTML = ''; if(modalTitle) modalTitle.textContent = ''; document.body.style.overflow = ''; if (currentConfirmHandler && modalConfirmBtnGlobal) { modalConfirmBtnGlobal.removeEventListener('click', currentConfirmHandler); currentConfirmHandler = null; modalConfirmBtnGlobal.disabled = false; modalConfirmBtnGlobal.innerHTML = 'Confirmar'; } } }
closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal)); genericModal?.addEventListener('click', (event) => { if (event.target === genericModal) closeModal(); }); window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && genericModal?.style.display === 'block') closeModal(); });

// renderTable
export function renderTable(tableData, columns, actions = [], options = {}) { 
     const { defaultMessage = 'No hay datos.', applyPaymentStatusClass = false, showPaymentStatusColumn = false, tableId = `table-${Date.now()}-${Math.random().toString(16).slice(2)}` } = options; if (!Array.isArray(tableData) || tableData.length === 0) { return `<div class="alert alert-info" style="text-align: center;"><em>${defaultMessage}</em></div>`; } let tableHTML = `<div class="table-responsive"><table class="styled-table" id="${tableId}"><thead><tr>`; columns.forEach(col => { if (!col || !col.label) return; const thClassList = []; if (col.numeric) thClassList.push('text-right'); if (col.center) thClassList.push('text-center'); tableHTML += `<th class="${thClassList.join(' ')}">${col.label}</th>`; }); if (actions.length > 0 || showPaymentStatusColumn) tableHTML += '<th style="text-align: center; min-width: 100px;">Acciones</th>'; tableHTML += '</tr></thead><tbody>'; tableData.forEach((item, index) => { let rowClass = ''; let paymentInfo = null; const itemIdForKpi = item.clientId ?? item.id; if ((applyPaymentStatusClass || showPaymentStatusColumn) && itemIdForKpi && (item.clientId !== undefined || item.dni) && item.username === undefined) { try { if (data.dummyData?.kpis?.getClientPaymentStatusInfo) { paymentInfo = data.dummyData.kpis.getClientPaymentStatusInfo(itemIdForKpi); if (applyPaymentStatusClass && paymentInfo?.rowClass) rowClass = paymentInfo.rowClass; } } catch (e) { console.error("Error getting payment status", e); } } tableHTML += `<tr class="${rowClass}" data-index="${index}" data-id="${item.id ?? item.dni ?? item.username ?? ''}">`; columns.forEach(col => { if (!col || !col.key) { tableHTML += `<td>ERR</td>`; return; } let cellValue = col.key.split('.').reduce((o, k) => (o && o[k] !== undefined && o[k] !== null) ? o[k] : null, item); let cellClassList = []; if (col.numeric) cellClassList.push('text-right'); if (col.center) cellClassList.push('text-center'); let formattedValue = ''; if (col.format && typeof col.format === 'function') { try { formattedValue = col.format(cellValue, item); } catch (e) { formattedValue = `ErrFmt`; console.error("Error in custom format function:", e); } } else if (col.format === 'currency') { formattedValue = utils.formatCurrency(cellValue); } else if (col.format === 'date') { formattedValue = utils.formatDate(cellValue); } 
     else if (col.format === 'paymentStatus') { if (paymentInfo) { formattedValue = `<span class="status status-${paymentInfo.status}">${paymentInfo.statusText}</span>`; const client = data.getClient(itemIdForKpi); if (client?.paymentComments?.length > 0) { const lastComment = client.paymentComments[client.paymentComments.length - 1]; formattedValue += `<span class="payment-comment" title="${client.paymentComments.join('\n')}"><i class="fas fa-comment-dots"></i> ${lastComment.length > 15 ? lastComment.substring(0, 15) + '...' : lastComment}</span>`; } } 
     else { formattedValue = (itemIdForKpi && (item.clientId !== undefined || item.dni)) ? 'N/A' : ''; } } else if (col.key === 'status') { const statusText = cellValue ?? 'Desconocido'; const statusClass = String(statusText).toLowerCase().replace(/ /g, '-').replace(/[áéíóúü]/g, c => 'aeiouu'['áéíóúü'.indexOf(c)]).replace(/[^a-z0-9-]/g, ''); const branchStatusClass = statusText === 'Activa' ? 'status-branch-activa' : (statusText === 'Inactiva' ? 'status-branch-inactiva' : ''); formattedValue = `<span class="status status-${statusClass} ${branchStatusClass}">${statusText}</span>`; } else if (col.key.endsWith('File') || col.key.endsWith('PhotoUrl') || col.format === 'fileLink') { if (cellValue && typeof cellValue === 'string') { const isImage = /\.(jpg|jpeg|png|gif)$/i.test(cellValue); const isPdf = /\.pdf$/i.test(cellValue); const iconClass = isImage ? 'fa-file-image' : (isPdf ? 'fa-file-pdf' : 'fa-paperclip'); const shortName = cellValue.split('/').pop(); formattedValue = `<a href="#" class="icon-link view-file-link" data-action="view-file" data-filename="${encodeURIComponent(cellValue)}" title="Ver ${shortName}"><i class="fas ${iconClass}"></i></a>`; } else { formattedValue = 'N/A'; } } else if (col.key === 'plusCode' && cellValue) { formattedValue = `<a href="https://plus.codes/${encodeURIComponent(cellValue)}" target="_blank" title="Ver en mapa">${cellValue} <i class="fas fa-map-marked-alt"></i></a>`; } else if (col.format === 'boolean') { formattedValue = cellValue ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-times-circle text-danger"></i>'; cellClassList.push('text-center'); } else { formattedValue = (cellValue !== null && cellValue !== undefined) ? String(cellValue) : 'N/A'; } tableHTML += `<td class="${cellClassList.join(' ')}">${formattedValue}</td>`; }); if (actions.length > 0 || showPaymentStatusColumn) { tableHTML += '<td class="action-buttons">'; if (showPaymentStatusColumn && itemIdForKpi && (item.clientId !== undefined || item.dni) && item.username === undefined) { tableHTML += `<button class="btn btn-secondary btn-sm add-comment-btn" data-action="add-comment" data-client-id="${itemIdForKpi}" title="Añadir Comentario Pago"><i class="fas fa-comment-medical"></i></button>`; } actions.forEach(action => { if (!action || !action.actionKey || !action.label) return; const actionItemId = item[action.idKey || 'id'] ?? item.id ?? item.dni ?? item.username ?? index; 
        const hideButton = action.hideIf && typeof action.hideIf === 'function' && action.hideIf(item); if (!hideButton) { const actionClass = action.class || 'btn-secondary'; const actionIcon = action.icon || 'fa-question-circle'; const actionIdentifier = action.actionKey; tableHTML += `<button class="btn ${actionClass} btn-sm" data-action="${actionIdentifier}" data-id="${actionItemId}" title="${action.label}"><i class="fas ${actionIcon}"></i></button>`; } }); tableHTML += '</td>'; } tableHTML += '</tr>'; }); tableHTML += '</tbody></table></div>'; return tableHTML;
}
// Delegación de Eventos y Manejo de Acciones (MODIFICADO: Añadida acción 'verificar-listo')
export function setupEventListeners(containerElement) {
    if (!containerElement) { console.error("Contenedor listeners no encontrado."); return; } containerElement.addEventListener('click', (e) => { const targetElement = e.target.closest('button[data-action], a[data-action]'); if (targetElement) { const action = targetElement.dataset.action; const id = targetElement.dataset.id ?? targetElement.dataset.clientId ?? targetElement.dataset.filename; console.log(`Click -> Acción: ${action}, ID/Data: ${id}`); if (action) { if (targetElement.tagName === 'A' && action !== 'view-file' && !targetElement.href?.includes('plus.codes')) e.preventDefault(); handleActionClick(action, id, targetElement); } else console.warn("Elemento clickeado sin data-action:", targetElement); } }); containerElement.addEventListener('submit', (e) => { const form = e.target; const formAction = form.dataset.formAction; if (formAction) { console.log(`Submit -> Form: ${formAction}`); e.preventDefault(); handleFormSubmission(formAction, form); } }); console.log('Listeners UI configurados en:', containerElement);
}

function handleActionClick(action, id, element) {
    console.log(`Manejando acción: ${action} para ID/Data: ${id}`);
    const numericId = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;

    // Mapa de acciones actualizado
    const actionMap = {
        // Client Management
        'ver-editar-cliente': () => clientMgmt.viewEditClient(numericId, false),
        'ver-cliente': () => clientMgmt.viewEditClient(numericId, true),
        'add-comment': () => clientMgmt.addPaymentComment(numericId),
        'add-comment-modal': () => clientMgmt.addPaymentComment(numericId),
        'nuevo-préstamo-cliente': () => clientMgmt.startLoanForClient(numericId),
        'nuevo-empeño-cliente': () => clientMgmt.startPawnForClient(numericId),
        'nav-registrar-cliente': () => clientMgmt.loadClientRegistration(contentArea, currentSectionTitle),

        // Service Management & Details
        'ver-detalles-servicio': () => serviceMgmt.viewServiceDetails(numericId),
        'ver-detalles-servicio-modal': () => serviceMgmt.viewServiceDetails(numericId),
        'adjuntar-doc': () => serviceMgmt.attachDocument(numericId),
        'ver-plan-pagos': () => serviceMgmt.viewPaymentPlan(numericId), // Nueva acción
        'ver-abonos': () => treasury.viewPaymentsHistory(numericId), // Nueva acción (en treasury?)

        // Approvals
        'aprobar-servicio': () => approvals.approveService(numericId),
        'rechazar-servicio': () => approvals.rejectService(numericId),
        'registrar-desembolso': () => approvals.registerDisbursement(numericId),
        'verificar-docs': () => approvals.verifyDocuments(numericId),
        'verificar-listo': () => approvals.verifyService(numericId),

        // Treasury & Boveda
        'registrar-pago': () => treasury.registerPayment(numericId), // Acción de Abono desde tabla Abonar
        'eliminar-gasto': () => treasury.deleteExpense(numericId),
        'eliminar-gasto-analista': () => treasury.deleteAnalystExpense(numericId, getCurrentUser()?.username),
        'abrir-caja': () => treasury.openCashBox(element), // Asociado a botón en loadOpenCloseCashBoxView
        'cerrar-caja': () => treasury.closeCashBox(element), // Asociado a botón en loadOpenCloseCashBoxView
        'nav-caja': () => treasury.loadOpenCloseCashBoxView(contentArea, currentSectionTitle), // Nueva acción para Abrir Caja

        // File Viewer (universal)
        'view-file': () => viewFile(decodeURIComponent(id))
    };

    // Intenta ejecutar la acción o muestra error
    try {
         const actionFn = actionMap[action];
         if(actionFn) {
             actionFn();
         } else {
             console.error(`Acción no implementada: "${action}"`);
             showError(null, null, `Acción "${action}" no implementada.`);
         }
    } catch (error) {
         console.error(`Error ejecutando acción "${action}":`, error);
         showError(null, null, `Error al ejecutar la acción "${action}": ${error.message}`);
    }
}

function handleFormSubmission(formAction, form) {
    // Manejo de envío de formularios - aquí se puede implementar según se necesite
}

function viewFile(filename) {
    // Función para ver archivos adjuntos (simulada en este punto)
    console.log(`Viendo archivo: ${filename}`);
    // Lógica simplificada para determinar tipo
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filename);
    const isPdf = /\.pdf$/i.test(filename);
    
    let modalContent;
    if (isImage) {
        // Modal con visualizador de imágenes
        modalContent = `<div class="text-center"><img src="images/sample.jpg" alt="${filename}" style="max-width: 100%; max-height: 70vh;"><div class="mt-2"><em>${filename}</em></div></div>`;
    } else if (isPdf) {
        // Modal con mensaje de PDF (en una implementación real usaría iframe o similar)
        modalContent = `<div class="text-center"><i class="fas fa-file-pdf" style="font-size: 5em; color: #c62828;"></i><div class="mt-3">Documento PDF: ${filename}</div><div class="mt-2"><em>Vista previa PDF no disponible en esta versión.</em></div></div>`;
    } else {
        // Otro tipo de archivo
        modalContent = `<div class="text-center"><i class="fas fa-file" style="font-size: 5em; color: #607d8b;"></i><div class="mt-3">Archivo: ${filename}</div><div class="mt-2"><em>Vista previa no disponible para este tipo de archivo.</em></div></div>`;
    }
    
    openModal(`Vista Previa: ${filename.split('/').pop()}`, modalContent, false);
}

// Limpieza de listeners para evitar duplicados al recargar vistas
function cleanContentAreaListeners() {
    const contentElement = contentArea;
    if (!contentElement) {
        console.warn('No se puede limpiar listeners: contentArea undefined');
        return;
    }
    // Simplemente reemplazamos el elemento con un clon para eliminar todos los listeners
    // Es más seguro que intentar eliminar listeners individuales
    const clone = contentElement.cloneNode(true);
    contentElement.parentNode.replaceChild(clone, contentElement);
    console.log('Listeners del área de contenido limpiados.');
}


export function showNotification(type, message, duration = 3000) {
    // Crear un div para la notificación si no existe ya
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.style.cssText = `
        margin-bottom: 10px;
        padding: 10px 15px;
        min-width: 250px;
        max-width: 350px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transform: translateX(400px);
        transition: transform 0.3s ease-out;
    `;
    notification.innerHTML = message;
    
    // Agregar la notificación al contenedor
    notificationContainer.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Configurar cierre automático
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300); // tiempo para que termine la animación
    }, duration);
}

/**
 * Carga la vista del perfil del usuario actual (RRHH-Usuario en PDF)
 * NUEVA FUNCIÓN para el ítem RRHH-Usuario del Analista
 */
function loadUserProfile(contentArea, sectionTitleElement) {
    console.log("Cargando información de usuario (RRHH)...");
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return showError(contentArea, sectionTitleElement, 'Usuario no disponible.');
    }
    
    sectionTitleElement.textContent = 'Información Personal';
    
    // Obtener los datos del usuario
    const user = data.getUser(currentUser.username);
    
    // Simular datos adicionales del usuario (no están en la estructura base)
    const userExtendedData = {
        fullName: `${currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)} Apellido Simulado`,
        dni: '12345678',
        birthDate: '1990-01-01',
        phone: '987654321',
        email: `${currentUser.username}@casaempeno.com`,
        address: 'Av. Ejemplo 123, Lima',
        startDate: '2024-01-01',
        position: currentUser.role,
        department: 'Operaciones',
        supervisor: currentUser.role === 'Analista' ? 'supervisorA' : 'Gerente General',
        bankAccount: 'BBVA - 0011-123456789',
        salary: 'INFORMACIÓN RESTRINGIDA',
        vacationDays: 15,
        nextEvaluation: '2025-06-30',
        lastLogin: data.HOY_SIMULADO + ' 08:30:00'
    };
    
    // Datos de cartera (para analistas)
    const clientsCount = currentUser.role === 'Analista' ? data.dummyData.clients.filter(c => c.analyst === currentUser.username).length : 'N/A';
    const servicesCount = currentUser.role === 'Analista' ? data.dummyData.services.filter(s => s.analyst === currentUser.username).length : 'N/A';
    
    contentArea.innerHTML = `
        <div class="user-profile-container">
            <div class="data-report-section">
                <h3><i class="fas fa-id-card"></i> Información de Usuario</h3>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-user-circle"></i> Datos Personales</h4>
                            </div>
                            <div class="panel-body">
                                <div class="user-info-group">
                                    <label>Nombre Completo:</label>
                                    <div class="user-info">${userExtendedData.fullName}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>DNI:</label>
                                    <div class="user-info">${userExtendedData.dni}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Fecha de Nacimiento:</label>
                                    <div class="user-info">${utils.formatDate(userExtendedData.birthDate)}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Dirección:</label>
                                    <div class="user-info">${userExtendedData.address}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Teléfono:</label>
                                    <div class="user-info">${userExtendedData.phone}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Email Corporativo:</label>
                                    <div class="user-info">${userExtendedData.email}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-briefcase"></i> Información Laboral</h4>
                            </div>
                            <div class="panel-body">
                                <div class="user-info-group">
                                    <label>Cargo:</label>
                                    <div class="user-info">${userExtendedData.position}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Departamento:</label>
                                    <div class="user-info">${userExtendedData.department}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Sucursal:</label>
                                    <div class="user-info">${user.branch || 'General'}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Supervisor:</label>
                                    <div class="user-info">${userExtendedData.supervisor}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Fecha de Ingreso:</label>
                                    <div class="user-info">${utils.formatDate(userExtendedData.startDate)}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Cuenta Bancaria:</label>
                                    <div class="user-info">${userExtendedData.bankAccount}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-chart-bar"></i> Desempeño</h4>
                            </div>
                            <div class="panel-body">
                                <div class="user-info-group">
                                    <label>Próxima Evaluación:</label>
                                    <div class="user-info">${utils.formatDate(userExtendedData.nextEvaluation)}</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Días de Vacaciones:</label>
                                    <div class="user-info">${userExtendedData.vacationDays} días disponibles</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Último Acceso:</label>
                                    <div class="user-info">${userExtendedData.lastLogin}</div>
                                </div>
                                ${currentUser.role === 'Analista' ? `
                                <div class="user-info-group">
                                    <label>Clientes Asignados:</label>
                                    <div class="user-info">${clientsCount} cliente(s)</div>
                                </div>
                                <div class="user-info-group">
                                    <label>Servicios Gestionados:</label>
                                    <div class="user-info">${servicesCount} servicio(s)</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="panel panel-default">
                            <div class="panel-heading">
                                <h4 class="panel-title"><i class="fas fa-cogs"></i> Gestión de Cuenta</h4>
                            </div>
                            <div class="panel-body">
                                <p>Desde aquí puedes gestionar tu cuenta de usuario en el sistema.</p>
                                
                                <div class="form-actions">
                                    <button class="btn btn-primary" id="change-password-btn">
                                        <i class="fas fa-key"></i> Cambiar Contraseña
                                    </button>
                                    
                                    <button class="btn btn-secondary" id="update-contact-info-btn">
                                        <i class="fas fa-edit"></i> Actualizar Información de Contacto
                                    </button>
                                </div>
                                
                                <div class="alert alert-info mt-3">
                                    <i class="fas fa-info-circle"></i> Para actualizar información personal o laboral, contacta al departamento de RRHH.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar listeners para los botones
    const changePasswordBtn = contentArea.querySelector('#change-password-btn');
    const updateContactInfoBtn = contentArea.querySelector('#update-contact-info-btn');
    
    changePasswordBtn?.addEventListener('click', () => {
        showChangePasswordModal(currentUser);
    });
    
    updateContactInfoBtn?.addEventListener('click', () => {
        showUpdateContactInfoModal(currentUser, userExtendedData);
    });
}

/**
 * Muestra el modal para cambiar la contraseña
 */
function showChangePasswordModal(currentUser) {
    const modalHTML = `
        <form id="change-password-form">
            <div class="input-group">
                <label for="current-password">Contraseña Actual:</label>
                <input type="password" id="current-password" name="currentPassword" required>
            </div>
            <div class="input-group">
                <label for="new-password">Nueva Contraseña:</label>
                <input type="password" id="new-password" name="newPassword" required>
                <small>Debe tener al menos 6 caracteres.</small>
            </div>
            <div class="input-group">
                <label for="confirm-password">Confirmar Nueva Contraseña:</label>
                <input type="password" id="confirm-password" name="confirmPassword" required>
            </div>
            <div id="password-error" class="error-message" style="display: none;"></div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('change-password-form');
        const errorDiv = document.getElementById('password-error');
        
        if (!form || !errorDiv) return false;
        
        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;
        
        // Validaciones
        if (!form.checkValidity()) {
            errorDiv.textContent = 'Por favor, complete todos los campos.';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return false;
        }
        
        // Verificar contraseña actual
        const user = data.getUser(currentUser.username);
        if (!user || user.password !== currentPassword) {
            errorDiv.textContent = 'La contraseña actual es incorrecta.';
            errorDiv.style.display = 'block';
            return false;
        }
        
        // Verificar que la nueva contraseña tenga al menos 6 caracteres
        if (newPassword.length < 6) {
            errorDiv.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
            errorDiv.style.display = 'block';
            return false;
        }
        
        // Verificar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Las nuevas contraseñas no coinciden.';
            errorDiv.style.display = 'block';
            return false;
        }
        
        try {
            // Actualizar la contraseña
            data.updateUser(currentUser.username, { password: newPassword });
            showNotification('success', 'Contraseña actualizada correctamente.', 3000);
            return true;
        } catch (error) {
            errorDiv.textContent = `Error al actualizar la contraseña: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    
    openModal('Cambiar Contraseña', modalHTML, true, 'Cambiar Contraseña', 'small', handleConfirm);
}

/**
 * Muestra el modal para actualizar la información de contacto
 */
function showUpdateContactInfoModal(currentUser, userExtendedData) {
    const modalHTML = `
        <form id="update-contact-form">
            <div class="input-group">
                <label for="update-phone">Teléfono:</label>
                <input type="tel" id="update-phone" name="phone" value="${userExtendedData.phone}" required>
            </div>
            <div class="input-group">
                <label for="update-email">Email:</label>
                <input type="email" id="update-email" name="email" value="${userExtendedData.email}" required>
            </div>
            <div class="input-group">
                <label for="update-address">Dirección:</label>
                <input type="text" id="update-address" name="address" value="${userExtendedData.address}" required>
            </div>
            <div id="contact-error" class="error-message" style="display: none;"></div>
        </form>
    `;
    
    const handleConfirm = () => {
        const form = document.getElementById('update-contact-form');
        const errorDiv = document.getElementById('contact-error');
        
        if (!form || !errorDiv) return false;
        
        // Validaciones
        if (!form.checkValidity()) {
            errorDiv.textContent = 'Por favor, complete todos los campos correctamente.';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return false;
        }
        
        // Simulación de actualización (en una aplicación real esto actualizaría el perfil del usuario)
        userExtendedData.phone = form.phone.value;
        userExtendedData.email = form.email.value;
        userExtendedData.address = form.address.value;
        
        showNotification('success', 'Información de contacto actualizada correctamente.', 3000);
        setTimeout(() => {
            reloadCurrentView();
        }, 1000);
        
        return true;
    };
    
    openModal('Actualizar Información de Contacto', modalHTML, true, 'Actualizar', 'medium', handleConfirm);
}