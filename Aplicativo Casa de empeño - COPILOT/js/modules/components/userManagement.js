// js/modules/components/userManagement.js
import * as ui from '../ui.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';

console.log('Modulo userManagement.js cargado.');

// Roles disponibles y si requieren sucursal
const ROLES = {
    'Dueño': { requiresBranch: false, unique: true },
    'Gerente General': { requiresBranch: false },
    'Supervisor': { requiresBranch: true },
    'Analista': { requiresBranch: true },
    'Tesorería': { requiresBranch: true }
};

export function loadUserManagement(contentArea, sectionTitleElement) {
    console.log("Cargando Gestión de Usuarios...");
    sectionTitleElement.textContent = 'Gestión de Usuarios';

    const loadUsers = () => {
        const users = data.dummyData.users; // Obtener usuarios actualizados
        const columns = [
            { key: 'username', label: 'Usuario'},
            { key: 'role', label: 'Rol'},
            {
                key: 'branch',
                label: 'Sucursal',
                format: (branch) => branch || 'N/A' // Mostrar N/A si es null
            },
            { key: 'createdAt', label: 'Fec. Creación', format: (d) => d ? utils.formatDate(d) : 'N/A' },
            { key: 'lastLogin', label: 'Últ. Acceso', format: (d) => d ? utils.formatDate(d) : 'N/A' },
            { key: 'active', label: 'Estado', format: (a) => a === false ? '<span class="status status-inactivo">Inactivo</span>' : '<span class="status status-activo">Activo</span>' }
        ];
        const actions = [
            {
                label: 'Editar',
                class: 'btn-warning',
                icon: 'fa-edit',
                actionKey: 'editar-usuario',
                idKey: 'username',
                hideIf: (user) => user.username === getCurrentUser()?.username
            },
            {
                label: 'Eliminar',
                class: 'btn-danger',
                icon: 'fa-trash-alt',
                actionKey: 'eliminar-usuario',
                idKey: 'username',
                hideIf: (user) => user.username === getCurrentUser()?.username
            }
        ];

        contentArea.innerHTML = `
            <h3>Gestión de Usuarios</h3>
            <button class="btn btn-primary mb-3" data-action="add-user">
                <i class="fas fa-user-plus"></i> Crear Nuevo Usuario
            </button>
            <div id="user-management-table-container">
                ${ui.renderTable(users, columns, actions, {
                    defaultMessage: 'No hay usuarios registrados.',
                    tableId: 'user-management-table'
                })}
            </div>
        `;

        // Listener para el botón de agregar (ya delegado en ui.js, pero podemos ser explícitos si queremos)
         contentArea.querySelector('button[data-action="add-user"]')?.addEventListener('click', (e) => {
             e.preventDefault(); // Prevenir comportamiento por defecto si es necesario
             addUser();
         });

        // Delegar acción editar usuario
        contentArea.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="editar-usuario"]');
            if (btn) {
                e.preventDefault();
                editUser(btn.dataset.id);
            }
        });
    };

    loadUsers(); // Carga inicial
}

/**
 * Abre un modal con un formulario para crear un nuevo usuario.
 */
export function addUser() {
    console.log("Abriendo modal para agregar usuario...");

    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    const roleOptions = Object.keys(ROLES).map(role => `<option value="${role}">${role}</option>`).join('');

    const formHTML = `
        <form id="add-user-form">
            <div class="input-group">
                <label for="new-username">Nombre de Usuario:</label>
                <input type="text" id="new-username" name="username" required autocomplete="off">
            </div>
            <div class="input-group">
                <label for="new-password">Contraseña:</label>
                <input type="password" id="new-password" name="password" required autocomplete="new-password">
            </div>
            <div class="input-group">
                <label for="new-role">Rol:</label>
                <select id="new-role" name="role" required>
                    <option value="">-- Seleccione Rol --</option>
                    ${roleOptions}
                </select>
            </div>
            <div class="input-group" id="new-branch-group" style="display: none;"> <label for="new-branch">Sucursal Asignada:</label>
                <select id="new-branch" name="branch">
                    <option value="">-- Seleccione Sucursal --</option>
                    ${branchOptions}
                </select>
                <small>Requerido para roles de Analista, Tesorería y Supervisor.</small>
            </div>
             <div id="add-user-error" class="error-message" style="display: none;"></div>
        </form>
    `;

    const handleConfirm = () => {
        const form = document.getElementById('add-user-form');
        const errorDiv = document.getElementById('add-user-error');
        if (!form || !errorDiv) return false;

        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        if (!form.checkValidity()) {
            errorDiv.textContent = 'Por favor, completa todos los campos requeridos.';
            errorDiv.style.display = 'block';
            form.reportValidity();
            return false;
        }

        const formData = new FormData(form);
        const role = formData.get('role');
        const requiresBranch = ROLES[role]?.requiresBranch;
        const isUnique = ROLES[role]?.unique;
        const selectedBranch = formData.get('branch');

        // Validar único dueño
        if (isUnique && data.dummyData.users.some(u => u.role === 'Dueño')) {
            errorDiv.textContent = 'Solo puede existir una cuenta de Dueño.';
            errorDiv.style.display = 'block';
            return false;
        }

        // Validar sucursal si es requerida
        if (requiresBranch && !selectedBranch) {
            errorDiv.textContent = 'Debe seleccionar una sucursal para este rol.';
            errorDiv.style.display = 'block';
            document.getElementById('new-branch').focus();
            return false;
        }

        // Validar que el username no exista ya
        if (data.getUser(formData.get('username'))) {
             errorDiv.textContent = 'El nombre de usuario ya existe.';
             errorDiv.style.display = 'block';
             document.getElementById('new-username').focus();
             return false;
        }


        const newUser = {
            username: formData.get('username'),
            password: formData.get('password'), // En una app real, hashear la contraseña en el backend
            role: role,
            branch: requiresBranch ? selectedBranch : null
        };

        try {
            console.log("Intentando agregar usuario:", newUser);
            const addedUser = data.addUser(newUser); // Usar función de data.js
            console.log("Usuario agregado:", addedUser);
            alert("Usuario creado correctamente.");
            ui.closeModal();
            // Recargar la vista de gestión de usuarios si es la actual
            if (ui.getCurrentLoadFunction() === loadUserManagement) {
                 ui.reloadCurrentView();
            }
            return true; // Cerrar modal
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            errorDiv.textContent = `Error al guardar: ${error.message}`;
            errorDiv.style.display = 'block';
            return false; // No cerrar modal
        }
    };

    ui.openModal('Crear Nuevo Usuario', formHTML, true, 'Crear Usuario', 'medium', handleConfirm);

    // Lógica para mostrar/ocultar y requerir sucursal según el rol seleccionado
    const roleSelect = document.getElementById('new-role');
    const branchGroup = document.getElementById('new-branch-group');
    const branchSelect = document.getElementById('new-branch');
    if (roleSelect && branchGroup && branchSelect) {
        roleSelect.addEventListener('change', () => {
            const selectedRole = roleSelect.value;
            if (ROLES[selectedRole]?.requiresBranch) {
                branchGroup.style.display = 'block';
                branchSelect.required = true;
            } else {
                branchGroup.style.display = 'none';
                branchSelect.required = false;
                branchSelect.value = ''; // Limpiar selección si no es requerida
            }
        });
    }
}

/**
 * Edita un usuario existente.
 * @param {string} username - El nombre de usuario a editar.
 */
export function editUser(username) {
    const user = data.getUser(username);
    if (!user) { alert('Usuario no encontrado.'); return; }
    const activeBranches = data.dummyData.branches.filter(b => b.status === 'Activa');
    const branchOptions = activeBranches.map(b => `<option value="${b.name}" ${user.branch === b.name ? 'selected' : ''}>${b.name}</option>`).join('');
    const roleOptions = Object.keys(ROLES).map(role => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`).join('');
    const formHTML = `
        <form id="edit-user-form">
            <div class="input-group">
                <label for="edit-username">Usuario:</label>
                <input type="text" id="edit-username" value="${user.username}" readonly>
            </div>
            <div class="input-group">
                <label for="edit-password">Nueva Contraseña:</label>
                <input type="password" id="edit-password" placeholder="(Dejar vacío para no cambiar)" autocomplete="new-password">
            </div>
            <div class="input-group">
                <label for="edit-role">Rol:</label>
                <select id="edit-role" required>
                    <option value="">-- Seleccione Rol --</option>
                    ${roleOptions}
                </select>
            </div>
            <div class="input-group" id="edit-branch-group" style="display: none;">
                <label for="edit-branch">Sucursal Asignada:</label>
                <select id="edit-branch">
                    <option value="">-- Seleccione Sucursal --</option>
                    ${branchOptions}
                </select>
                <small>Requerido para roles de Analista, Tesorería y Supervisor.</small>
            </div>
            <div class="input-group">
                <label for="edit-active">Estado:</label>
                <select id="edit-active">
                    <option value="true" ${user.active !== false ? 'selected' : ''}>Activo</option>
                    <option value="false" ${user.active === false ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
            <div id="edit-user-error" class="error-message" style="display: none;"></div>
        </form>
    `;
    const handleConfirm = () => {
        const form = document.getElementById('edit-user-form');
        const errorDiv = document.getElementById('edit-user-error');
        if (!form || !errorDiv) return false;
        errorDiv.style.display = 'none';
        const role = form.querySelector('#edit-role').value;
        const requiresBranch = ROLES[role]?.requiresBranch;
        const isUnique = ROLES[role]?.unique;
        const branch = form.querySelector('#edit-branch').value;
        const password = form.querySelector('#edit-password').value;
        const active = form.querySelector('#edit-active').value === 'true';
        // Validar único dueño
        if (isUnique && data.dummyData.users.some(u => u.role === 'Dueño' && u.username !== user.username)) {
            errorDiv.textContent = 'Solo puede existir una cuenta de Dueño.';
            errorDiv.style.display = 'block';
            return false;
        }
        if (requiresBranch && !branch) {
            errorDiv.textContent = 'Debe seleccionar una sucursal para este rol.';
            errorDiv.style.display = 'block';
            return false;
        }
        // Actualizar usuario
        const updatedData = {
            role,
            branch: requiresBranch ? branch : null,
            active
        };
        if (password) updatedData.password = password;
        try {
            data.updateUser(user.username, updatedData);
            alert('Usuario actualizado correctamente.');
            ui.closeModal();
            if (ui.getCurrentLoadFunction() === loadUserManagement) ui.reloadCurrentView();
            return true;
        } catch (error) {
            errorDiv.textContent = `Error al actualizar: ${error.message}`;
            errorDiv.style.display = 'block';
            return false;
        }
    };
    ui.openModal('Editar Usuario', formHTML, true, 'Guardar Cambios', 'medium', handleConfirm);
    // Mostrar/ocultar sucursal según rol
    const roleSelect = document.getElementById('edit-role');
    const branchGroup = document.getElementById('edit-branch-group');
    const branchSelect = document.getElementById('edit-branch');
    if (roleSelect && branchGroup && branchSelect) {
        const toggleBranch = () => {
            if (ROLES[roleSelect.value]?.requiresBranch) {
                branchGroup.style.display = 'block';
                branchSelect.required = true;
            } else {
                branchGroup.style.display = 'none';
                branchSelect.required = false;
                branchSelect.value = '';
            }
        };
        roleSelect.addEventListener('change', toggleBranch);
        toggleBranch();
    }
}

/**
 * Elimina un usuario después de confirmación.
 * @param {string} username - El nombre de usuario a eliminar.
 */
export function deleteUser(username) {
    console.log(`Intentando eliminar usuario: ${username}`);
    const currentUser = getCurrentUser();
    const userToDelete = data.getUser(username);

    if (!userToDelete) {
        alert(`Error: Usuario "${username}" no encontrado.`);
        return;
    }

    if (currentUser && currentUser.username === username) {
        alert("No puedes eliminar tu propia cuenta.");
        return;
    }

    // Validar dependencias antes de eliminar
    if (userToDelete.role === 'Analista') {
        const assignedServices = data.dummyData.services.filter(s => s.analyst === username);
        if (assignedServices.length > 0) {
            alert(`No se puede eliminar el analista porque tiene servicios asignados. Reasigne o cierre los servicios antes de eliminar.`);
            return;
        }
    }

    const confirmationMessage = `
        <p>¿Estás seguro de que deseas eliminar al usuario <strong>${username}</strong> (Rol: ${userToDelete.role})?</p>
        <p class="text-danger"><strong>Esta acción no se puede deshacer.</strong></p>
        <div id="delete-user-error" class="error-message" style="display: none;"></div>
    `;

    const handleConfirmDelete = () => {
        const errorDiv = document.getElementById('delete-user-error'); // Asegurarse que el div de error exista en el modal
        if(errorDiv) errorDiv.style.display = 'none';

        try {
            const success = data.deleteUserByUsername(username); // Usar función de data.js
            if (success) {
                console.log(`Usuario ${username} eliminado.`);
                alert("Usuario eliminado correctamente.");
                ui.closeModal();
                // Recargar la vista de gestión de usuarios si es la actual
                if (ui.getCurrentLoadFunction() === loadUserManagement) {
                    ui.reloadCurrentView();
                }
                return true; // Cerrar modal
            } else {
                console.error(`Error al eliminar usuario ${username}: No encontrado en data.js.`);
                if(errorDiv) {
                    errorDiv.textContent = "Error: No se pudo eliminar el usuario (no se encontró).";
                    errorDiv.style.display = 'block';
                } else {
                    alert("Error: No se pudo eliminar el usuario (no se encontró).");
                }
                return false; // No cerrar modal
            }
        } catch (error) {
            console.error("Error durante la eliminación del usuario:", error);
            if(errorDiv) {
                errorDiv.textContent = `Error inesperado: ${error.message}`;
                errorDiv.style.display = 'block';
            } else {
                alert(`Error inesperado al eliminar usuario: ${error.message}`);
            }
            return false; // No cerrar modal
        }
    };

    ui.openModal(
        'Confirmar Eliminación de Usuario',
        confirmationMessage,
        true, // showConfirm
        'Eliminar Usuario', // confirmText
        'small', // modalSize
        handleConfirmDelete // onConfirm
    );
}