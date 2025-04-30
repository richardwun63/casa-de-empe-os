// js/modules/auth.js
import { getUser, dummyData } from './data.js'; // Importa datos necesarios
import { setupUIForRole, loadInitialContent, clearUI } from './ui.js'; // Importa funciones de UI

console.log('Modulo auth.js cargado.');

let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

// MODIFICADO: Excluir 'Supervisor' de roles que requieren selección de sucursal en login
function toggleBranchSelector(show, role, branchSelectContainer, branchSelect) {
    console.log(`toggleBranchSelector: show=${show}, role=${role}`);
    // Roles que SÍ necesitan seleccionar sucursal en el login
    const rolesRequiringBranchSelection = ['Analista', 'Tesorería'];
    // Excluimos Supervisor, Dueño, Gerente
    const requiresSelection = rolesRequiringBranchSelection.includes(role);

     if (!branchSelectContainer || !branchSelect) {
         console.error("Error en toggleBranchSelector: Elementos container o select no encontrados.");
         return;
     }

    if (show && requiresSelection) {
        console.log('Mostrando selector de sucursal para rol:', role);
        branchSelectContainer.style.display = 'block';
        branchSelect.innerHTML = '<option value="">Selecciona tu sucursal</option>';
         if (dummyData && Array.isArray(dummyData.branches)) {
             dummyData.branches.filter(b => b.status === 'Activa').forEach(branch => {
                 const option = document.createElement('option');
                 option.value = branch.name;
                 option.textContent = branch.name;
                 branchSelect.appendChild(option);
             });
         } else { console.error("Error: dummyData.branches no disponible."); }
        branchSelect.required = true;
    } else {
        console.log('Ocultando selector de sucursal para rol:', role);
        branchSelectContainer.style.display = 'none';
        branchSelect.required = false;
        branchSelect.value = '';
    }
}

export function initAuth(loginForm, usernameInput, passwordInput, branchSelectContainer, branchSelect, loginError, appContainer, loginPage, logoutButton, usernameDisplay, userRoleDisplay, branchDisplay) {
    console.log('Inicializando autenticación...');
    if (!loginForm) { console.error("Error crítico: No se encontró #login-form."); return; }

    loginForm.addEventListener('submit', (event) => {
        console.log('Evento submit del formulario detectado.');
        try {
             event.preventDefault();
             console.log('event.preventDefault() ejecutado correctamente.');
        } catch (e) {
             console.error("¡ERROR CRÍTICO AL EJECUTAR event.preventDefault()!", e);
             return;
        }

        try {
             if (!usernameInput || !passwordInput || !branchSelect || !loginError || !branchSelectContainer ||
                 !loginPage || !appContainer || !usernameDisplay || !userRoleDisplay || !branchDisplay) {
                 console.error("Error: Faltan elementos del DOM dentro del listener de submit.");
                 if(loginError) { loginError.textContent = 'Error interno del formulario. Intente recargar.'; loginError.style.display = 'block'; }
                 return;
             }

            console.log('Intento de login iniciado.');
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            let selectedBranch = branchSelect.value; // Leemos por si acaso (para Analista/Tesorero)
            loginError.textContent = '';
            loginError.style.display = 'none';

            if (!username || !password) {
                console.warn('Login fallido: Usuario o contraseña vacíos.');
                loginError.textContent = 'Por favor, ingresa usuario y contraseña.';
                loginError.style.display = 'block';
                return;
            }

            let user;
             try { user = getUser(username); }
             catch (e) { console.error("Error al llamar a getUser()", e); loginError.textContent = 'Error interno (getUser).'; loginError.style.display = 'block'; return; }

            console.log(`Resultado de búsqueda para ${username}:`, user);

            if (user && user.password === password) {
                console.log(`Usuario ${username} encontrado y contraseña correcta. Rol: ${user.role}`);
                // Roles que necesitan seleccionar sucursal en el login
                const rolesRequiringBranchSelection = ['Analista', 'Tesorería'];
                const requiresBranchSelection = rolesRequiringBranchSelection.includes(user.role);
                // Roles que TIENEN una sucursal asignada en sus datos
                const rolesWithAssignedBranch = ['Analista', 'Tesorería', 'Supervisor'];
                const hasAssignedBranch = rolesWithAssignedBranch.includes(user.role) && user.branch;

                // Lógica de sucursal:
                if (requiresBranchSelection) {
                    // Si requiere selección y el selector está oculto, mostrarlo
                    if (branchSelectContainer.style.display === 'none') {
                         console.log(`Rol ${user.role} requiere selección de sucursal. Mostrando selector.`);
                         toggleBranchSelector(true, user.role, branchSelectContainer, branchSelect);
                         loginError.textContent = 'Por favor, selecciona tu sucursal.';
                         loginError.style.display = 'block';
                         return; // Esperar a que seleccione y vuelva a intentar
                    }
                    // Si requiere y ya está visible, validar que haya seleccionado una
                    if (!selectedBranch) {
                         console.warn('Login fallido: Selección de sucursal requerida pero no realizada.');
                         loginError.textContent = 'Debes seleccionar una sucursal para tu rol.';
                         loginError.style.display = 'block';
                         return;
                    }
                    // Opcional: Validar si la sucursal seleccionada coincide con alguna asignada (si aplica)
                    // if (user.branch && user.branch !== selectedBranch) { ... }

                    // Establecer usuario con sucursal seleccionada
                    currentUser = { ...user, branch: selectedBranch };
                    console.log('Login exitoso con sucursal seleccionada:', selectedBranch);

                } else if (hasAssignedBranch) {
                     // Si NO requiere selección pero TIENE sucursal asignada (Supervisor)
                     console.log(`Rol ${user.role} tiene sucursal asignada: ${user.branch}. No requiere selección.`);
                     toggleBranchSelector(false, user.role, branchSelectContainer, branchSelect); // Asegurar que esté oculto
                     currentUser = { ...user }; // Usar la sucursal asignada en user.branch
                     console.log('Login exitoso con sucursal asignada:', user.branch);
                } else {
                     // Si no requiere selección y no tiene asignada (Dueño, Gerente)
                     console.log(`Rol ${user.role} no requiere/no tiene sucursal asignada.`);
                     toggleBranchSelector(false, user.role, branchSelectContainer, branchSelect); // Asegurar oculto
                     currentUser = { ...user, branch: null }; // Sin sucursal
                     console.log('Login exitoso sin sucursal.');
                }

                // Actualizar UI con datos del usuario logueado
                usernameDisplay.textContent = `Usuario: ${currentUser.username}`;
                userRoleDisplay.textContent = currentUser.role;
                // Mostrar sucursal si existe en currentUser.branch
                if (currentUser.branch) {
                    branchDisplay.textContent = `Sucursal: ${currentUser.branch}`;
                    branchDisplay.style.display = 'inline-block';
                } else {
                    branchDisplay.textContent = 'Acceso General';
                     branchDisplay.style.display = 'inline-block'; // Mostrar 'Acceso General'
                }


                loginPage.style.display = 'none';
                appContainer.style.display = 'flex';

                 try {
                     setupUIForRole(currentUser.role); // Construir menú para el rol
                     loadInitialContent(); // Cargar la primera vista del menú
                 } catch(e) {
                     console.error("Error al configurar UI o cargar contenido.", e);
                     appContainer.innerHTML = `<p class="error-message">Error al cargar interfaz de usuario.</p>`;
                     return; // Detener si la UI falla
                 }

                loginForm.reset(); // Limpiar formulario login
                branchSelect.value = ''; // Limpiar select sucursal
                toggleBranchSelector(false, null, branchSelectContainer, branchSelect); // Ocultar selector
                console.log('Formulario de login reseteado y UI de app mostrada.');

            } else {
                // Usuario no encontrado o contraseña incorrecta
                console.warn('Login fallido: Usuario o contraseña incorrectos.');
                loginError.textContent = 'Usuario o contraseña incorrectos.';
                loginError.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
                toggleBranchSelector(false, null, branchSelectContainer, branchSelect); // Ocultar selector
            }
        } catch (error) {
             console.error("¡Error INESPERADO dentro de la lógica del submit!", error);
             if(loginError) { loginError.textContent = `Error inesperado: ${error.message}`; loginError.style.display = 'block'; }
        }
    });

    // Listener de Logout (sin cambios)
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
             if (!appContainer || !loginPage || !loginForm || !usernameInput || !branchSelectContainer || !branchSelect || !loginError) { console.error("Error logout: Faltan elementos DOM."); return; }
            console.log('Logout iniciado.'); currentUser = null; appContainer.style.display = 'none'; loginPage.style.display = 'flex';
            clearUI(); toggleBranchSelector(false, null, branchSelectContainer, branchSelect); loginForm.reset(); loginError.textContent = ''; loginError.style.display = 'none'; usernameInput.focus();
            console.log('Logout completado.');
        });
    } else { console.error("Error: No se encontró #logout-button."); }

    console.log('Listeners de autenticación configurados.');
}