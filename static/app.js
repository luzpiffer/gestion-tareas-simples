const API = "/tareas";
let currentUser = JSON.parse(localStorage.getItem("currentUser")); // Debe guardar {id, username}

// --- Verificar login ---
if (!currentUser) {
    window.location.href = "register.html";
}

// --- Notificaciones ---
function mostrarNotificacion(mensaje, tipo = "exito") {
    const cont = document.getElementById("notificaciones") || createNotificationContainer();
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    cont.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

function createNotificationContainer() {
    const cont = document.createElement("div");
    cont.id = "notificaciones";
    document.body.appendChild(cont);
    return cont;
}

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "register.html";
});

// --- Fecha mínima ---
const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

// --- Cargar categorías ---
let categoriasGlobal = []; // Guardaremos todas las categorías con ID y nombre

async function cargarCategorias() {
    const res = await fetch("/categorias");
    if (!res.ok) return;
    categoriasGlobal = await res.json(); // Debe devolver [{id:1,nombre:"Trabajo"},...]
    const selectNueva = document.querySelector("#formTarea select[name='categorias']");
    selectNueva.innerHTML = "";
    categoriasGlobal.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id; // Guardamos ID
        option.textContent = cat.nombre;
        selectNueva.appendChild(option);
    });
}

// --- Cargar estados ---
async function cargarEstados() {
    const res = await fetch("/estados_tarea");
    if (!res.ok) return;
    const estados = await res.json();
    const select = document.getElementById("buscarCompletada");
    select.innerHTML = '<option value="">Todos</option>';
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        select.appendChild(option);
    });
}

// --- Cargar tareas ---
async function cargarTareas() {
    if (!currentUser) return;
    const res = await fetch(`${API}/${currentUser.id}`);
    if (!res.ok) {
        mostrarNotificacion("Error al cargar tareas ❌", "error");
        return;
    }
    const tareas = await res.json();
    mostrarTareas(Array.isArray(tareas) ? tareas : []);
}

// --- Mostrar tareas ---
function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (!tareas || tareas.length === 0) {
        div.innerHTML = "<p>No hay tareas.</p>";
        return;
    }


    tareas.forEach(t => {
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad || "baja");
        if (t.completada) tareaDiv.classList.add("completada");

        tareaDiv.innerHTML = `
            <input type="checkbox" class="check-completada" ${t.completada ? "checked" : ""}>
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <span class="editar" title="Editar tarea">✏️</span>
            <h3>${t.titulo} <small>(${t.prioridad || "Baja"})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento || "N/A"}</small>
        `;

        // Completar
        tareaDiv.querySelector(".check-completada").addEventListener("change", async (e) => {
            const res = await fetch(`${API}/${currentUser.id}/${t.id}/completada?completada=${e.target.checked}`, {
                method: "PATCH"
            });
            if (res.ok) {
                tareaDiv.classList.toggle("completada", e.target.checked);
                mostrarNotificacion(e.target.checked ? "Tarea completada ✅" : "Tarea pendiente ⚠️");
            } else {
                mostrarNotificacion("Error al actualizar ❌", "error");
                e.target.checked = !e.target.checked;
            }
        });

        // Eliminar
        tareaDiv.querySelector(".cerrar").addEventListener("click", () => {
            confirmarEliminar(t.id);
        });


        // Editar
        tareaDiv.querySelector(".editar").addEventListener("click", () => {
            editarTareaForm(t);
        });

        div.appendChild(tareaDiv);
    });
}

// --- Crear tarea ---
document.getElementById("formTarea").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser) return;

    const data = Object.fromEntries(new FormData(e.target).entries());
    const categoriasIds = Array.from(e.target.querySelector('[name="categorias"]').selectedOptions).map(o => parseInt(o.value));
    data.usuario_id = currentUser.id;
    data.categorias = categoriasIds;

    // Convertir prioridad a valor por defecto si está vacío
    if (!data.prioridad) data.prioridad = "baja";

    console.log("📤 Enviando tarea:", data);

    const res = await fetch(`${API}/${currentUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        mostrarNotificacion("Tarea agregada ✅");
        e.target.reset();
        cargarTareas();
    } else {
        const err = await res.json();
        mostrarNotificacion(err.detail || "Error al agregar ❌", "error");
    }
});

// --- Buscar ---
async function buscar() {
    if (!currentUser) return;

    const titulo = document.getElementById("buscarTitulo").value.trim();
    const fecha = document.getElementById("buscarFecha").value;
    const completada = document.getElementById("buscarCompletada").value;

    const params = new URLSearchParams();
    if (titulo) params.append("titulo", titulo);
    if (fecha) params.append("fecha", fecha);
    if (completada !== "") params.append("completada", completada);

    const res = await fetch(`${API}/${currentUser.id}?${params.toString()}`);
    if (!res.ok) {
        mostrarNotificacion("Error al buscar tareas ❌", "error");
        return;
    }
    const tareas = await res.json();
    mostrarTareas(Array.isArray(tareas) ? tareas : []);
}

// --- Limpiar búsqueda ---
function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}

// --- Confirmar eliminar ---
async function confirmarEliminar(idTarea) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esto",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API}/${currentUser.id}/${idTarea}`, { method: "DELETE" });
            if (res.ok) {
                Swal.fire('Eliminado!', 'La tarea ha sido eliminada.', 'success');
                cargarTareas(); // recarga la lista actualizada
            } else {
                const error = await res.json();
                Swal.fire('Error', error.detail || 'No se pudo eliminar la tarea.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
        }
    }
}

// --- Editar tarea ---
async function editarTareaForm(tarea) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
        <h3>Editar tarea</h3>
        <form id="formEditar">
            <input type="text" name="titulo" value="${tarea.titulo}" required>
            <textarea name="descripcion">${tarea.descripcion || ""}</textarea>
            <select name="prioridad" required>
                <option value="baja" ${tarea.prioridad === "baja" ? "selected" : ""}>Baja</option>
                <option value="media" ${tarea.prioridad === "media" ? "selected" : ""}>Media</option>
                <option value="alta" ${tarea.prioridad === "alta" ? "selected" : ""}>Alta</option>
            </select>
            <input type="date" id="fechaEditar" name="fecha_vencimiento" value="${tarea.fecha_vencimiento}" required>
            <div class="actions">
                <button type="submit">Guardar</button>
                <button type="button" id="cancelarEditar">Cancelar</button>
            </div>
        </form>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    const fechaEditarInput = document.getElementById("fechaEditar");
    fechaEditarInput.min = hoy;

    // Categorías
    const selectCategorias = document.createElement("select");
    selectCategorias.name = "categorias";
    selectCategorias.multiple = true;
    categoriasGlobal.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nombre;
        if (tarea.categorias_ids?.includes(cat.id)) option.selected = true;
        selectCategorias.appendChild(option);
    });
    modal.querySelector("form").insertBefore(selectCategorias, fechaEditarInput);

    document.getElementById("cancelarEditar").addEventListener("click", () => overlay.remove());

    document.getElementById("formEditar").addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.usuario_id = currentUser.id;
        const categoriasIds = Array.from(e.target.querySelector('[name="categorias"]').selectedOptions).map(o => parseInt(o.value));
        data.categorias = categoriasIds;

        if (!data.titulo.trim()) {
            mostrarNotificacion("El título es obligatorio ❌", "error");
            return;
        }
        if (data.fecha_vencimiento < hoy) {
            mostrarNotificacion("La fecha no puede ser en el pasado ❌", "error");
            return;
        }

        const res = await fetch(`${API}/${currentUser.id}/${tarea.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            mostrarNotificacion("Tarea actualizada ✅");
            cargarTareas();
        } else {
            mostrarNotificacion("Error al editar ❌", "error");
        }
        overlay.remove();
    });
}


// --- Inicial ---
cargarCategorias();
cargarEstados();
cargarTareas();
