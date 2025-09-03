const API = "/tareas";
let currentUserId = null;

// --- Notificaciones ---
function mostrarNotificacion(mensaje, tipo = "exito") {
    const cont = document.getElementById("notificaciones");
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    cont.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

// --- Login ---
document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const data = new URLSearchParams();
    data.append("username", username);
    data.append("password", password);

    const res = await fetch("/login", { method: "POST", body: data });
    if (res.ok) {
        const resp = await res.json();
        currentUserId = resp.user_id;
        document.getElementById("loginContainer").style.display = "none";
        document.getElementById("tareasContainer").style.display = "block";
        mostrarNotificacion("Bienvenido/a " + username, "exito");
        await cargarCategorias(); 
        await cargarEstados();
        cargarTareas();
    } else {
        mostrarNotificacion("Usuario o contraseña incorrectos", "error");
    }
});

// --- Registro ---
document.getElementById("registroForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const password = document.getElementById("regPassword").value;

    const res = await fetch("/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        mostrarNotificacion("Usuario registrado ✅", "exito");
        document.getElementById("regUsername").value = "";
        document.getElementById("regPassword").value = "";
    } else {
        const err = await res.json();
        mostrarNotificacion(err.detail || "Error al registrar", "error");
    }
});

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUserId = null;
    document.getElementById("tareasContainer").style.display = "none";
    document.getElementById("loginContainer").style.display = "block";
});

// --- Fecha mínima ---
const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

// --- Funciones de tareas ---
async function cargarTareas() {
    if (!currentUserId) return;
    const res = await fetch(`${API}/${currentUserId}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

async function cargarCategorias() {
    const res = await fetch("/categorias");
    if (!res.ok) return;
    const categorias = await res.json(); // ["Trabajo", "Personal", ...]
    
    // Formulario nueva tarea
    const selectNueva = document.querySelector("#formTarea select[name='categorias']");
    selectNueva.innerHTML = ""; // limpiar
    categorias.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        selectNueva.appendChild(option);
    });
}

async function cargarEstados() {
    const res = await fetch("/estados_tarea");
    if (!res.ok) return;
    const estados = await res.json(); // [{id:0,nombre:"Pendiente"}, {id:1,nombre:"Completada"}]
    
    const select = document.getElementById("buscarCompletada");
    select.innerHTML = '<option value="">Todos</option>'; // opción por defecto
    
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        select.appendChild(option);
    });
}


function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (tareas.length === 0) {
        div.innerHTML = "<p>No hay tareas.</p>";
        return;
    }

    tareas.forEach(t => {
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad);
        if (t.completada) tareaDiv.classList.add("completada");

        tareaDiv.innerHTML = `
            <input type="checkbox" class="check-completada" ${t.completada ? "checked" : ""} title="Marcar como completada">
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <span class="editar" title="Editar tarea">✏️</span>
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
        `;

        // Checkbox completada
        tareaDiv.querySelector(".check-completada").addEventListener("change", async (e) => {
            const res = await fetch(`${API}/${currentUserId}/${t.id}/completada?completada=${e.target.checked}`, {
                method: "PATCH"
            });
            if (res.ok) {
                tareaDiv.classList.toggle("completada", e.target.checked);
                mostrarNotificacion(e.target.checked ? "Tarea completada ✅" : "Tarea marcada como pendiente ⚠️", "exito");
            } else {
                mostrarNotificacion("Error al actualizar ❌", "error");
                e.target.checked = !e.target.checked; // revertir
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

    // Validar fecha mínima
    const fechaEditarInput = document.getElementById("fechaEditar");
    const hoy = new Date().toISOString().split("T")[0];
    fechaEditarInput.min = hoy;

    // Crear select de categorías dinámico
    const selectCategorias = document.createElement("select");
    selectCategorias.name = "categorias";
    selectCategorias.multiple = true;

    const categoriasDB = await fetch("/categorias").then(r => r.json());
    categoriasDB.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        if (tarea.categorias.includes(cat)) option.selected = true;
        selectCategorias.appendChild(option);
    });

    // Insertar select antes del input de fecha
    modal.querySelector("form").insertBefore(selectCategorias, fechaEditarInput);

    document.getElementById("cancelarEditar").addEventListener("click", () => overlay.remove());

    document.getElementById("formEditar").addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        // Extraer categorías seleccionadas
        const categorias = Array.from(e.target.querySelector('[name="categorias"]').selectedOptions).map(o => o.value);
        data.categorias = categorias;

        // Validación
        if (!data.titulo.trim()) {
            mostrarNotificacion("El título es obligatorio ❌", "error");
            return;
        }
        if (data.fecha_vencimiento < hoy) {
            mostrarNotificacion("La fecha no puede ser en el pasado ❌", "error");
            return;
        }

        const res = await fetch(`${API}/${currentUserId}/${tarea.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            mostrarNotificacion("Tarea actualizada ✅", "exito");
            cargarTareas();
        } else {
            const err = await res.json();
            mostrarNotificacion(err.detail || "Error al editar ❌", "error");
        }
        overlay.remove();
    });
}



function confirmarEliminar(idTarea) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
        <p>¿Seguro que querés eliminar esta tarea?</p>
        <div class="actions">
            <button id="confirm-si">Sí</button>
            <button id="confirm-no">No</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    document.getElementById("confirm-si").addEventListener("click", async () => {
        const res = await fetch(`${API}/${currentUserId}/${idTarea}`, { method: "DELETE" });
        if (res.ok) mostrarNotificacion("Tarea eliminada ✅", "exito");
        else mostrarNotificacion("Error al eliminar ❌", "error");
        cargarTareas();
        overlay.remove();
    });
    document.getElementById("confirm-no").addEventListener("click", () => overlay.remove());
}

// --- Crear tarea ---
document.getElementById("formTarea").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUserId) return;

    const data = Object.fromEntries(new FormData(e.target).entries());

    // --- Esto extrae las categorías seleccionadas ---
    const categorias = Array.from(e.target.querySelector('[name="categorias"]').selectedOptions).map(o => o.value);
    data.categorias = categorias;

    const res = await fetch(`${API}/${currentUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        mostrarNotificacion("Tarea agregada ✅", "exito");
        e.target.reset();
        cargarTareas();
    } else mostrarNotificacion("Error al agregar ❌", "error");
});


// --- Buscar ---
async function buscar() {
    if (!currentUserId) return;

    const titulo = document.getElementById("buscarTitulo").value.trim();
    const fecha = document.getElementById("buscarFecha").value;
    const completada = document.getElementById("buscarCompletada").value;

    const params = new URLSearchParams();

    if (titulo) params.append("titulo", titulo);
    if (fecha) params.append("fecha", fecha);
    if (completada !== "") params.append("completada", completada);

    const res = await fetch(`${API}/${currentUserId}?${params.toString()}`);
    if (!res.ok) {
        mostrarNotificacion("Error al buscar tareas ❌", "error");
        return;
    }

    const tareas = await res.json();
    mostrarTareas(tareas);
}

// --- Limpiar búsqueda ---
function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}
