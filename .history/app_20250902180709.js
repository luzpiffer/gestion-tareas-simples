const API = "/tareas";
let currentUserId = null;

// --- Notificaciones flotantes ---
function mostrarNotificacion(mensaje, tipo = "exito") {
    const contenedor = document.getElementById("notificaciones");
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    contenedor.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

// --- Fecha mínima hoy ---
const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

// --- Login y Registro ---
async function login(username, password) {
    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    if(res.ok){
        const resp = await res.json();
        currentUserId = resp.user_id;
        localStorage.setItem("user_id", currentUserId);
        document.getElementById("loginContainer").style.display = "none";
        document.getElementById("tareasContainer").style.display = "block";
        mostrarNotificacion("Bienvenido/a " + username, "exito");
        cargarTareas();
    } else {
        mostrarNotificacion("Usuario o contraseña incorrectos", "error");
    }
}

async function register(username, password) {
    const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    if(res.ok){
        mostrarNotificacion("Usuario registrado correctamente ✅", "exito");
    } else {
        mostrarNotificacion("Error al registrar usuario ❌", "error");
    }
}

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUserId = null;
    localStorage.removeItem("user_id");
    document.getElementById("tareasContainer").style.display = "none";
    document.getElementById("loginContainer").style.display = "block";
});

// --- Confirmar eliminar tarea ---
function confirmarEliminar(idTarea) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
        <p>¿Seguro que quieres eliminar esta tarea?</p>
        <div class="actions">
            <button id="confirm-si">Sí</button>
            <button id="confirm-no">No</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    document.getElementById("confirm-si").addEventListener("click", async () => {
        const res = await fetch(`${API}/${idTarea}?user_id=${currentUserId}`, { method: "DELETE" });
        if(res.ok){
            mostrarNotificacion("Tarea eliminada", "exito");
            cargarTareas();
        } else {
            mostrarNotificacion("Error al eliminar la tarea", "error");
        }
        overlay.remove();
    });

    document.getElementById("confirm-no").addEventListener("click", () => overlay.remove());
}

// --- Cargar tareas ---
async function cargarTareas() {
    if(!currentUserId) return;
    const res = await fetch(`${API}?user_id=${currentUserId}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

// --- Mostrar tareas ---
function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if(tareas.length === 0){ div.innerHTML = "<p>No hay tareas encontradas.</p>"; return; }

    tareas.forEach(t => {
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad);

        tareaDiv.innerHTML = `
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
        `;

        tareaDiv.querySelector(".cerrar").addEventListener("click", () => confirmarEliminar(t.id));
        div.appendChild(tareaDiv);
    });
}

// --- Agregar tarea ---
document.getElementById("formTarea").addEventListener("submit", async e => {
    e.preventDefault();
    if(!currentUserId) return;
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.usuario_id = currentUserId;

    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if(res.ok){
        mostrarNotificacion("Tarea agregada correctamente", "exito");
        e.target.reset();
        cargarTareas();
    } else {
        mostrarNotificacion("Error al agregar la tarea", "error");
    }
});

// --- Buscar tareas ---
async function buscar() {
    const titulo = document.getElementById("buscarTitulo").value;
    const fecha = document.getElementById("buscarFecha").value;
    const params = new URLSearchParams();
    if(titulo) params.append("titulo", titulo);
    if(fecha) params.append("fecha", fecha);
    params.append("user_id", currentUserId);

    const res = await fetch(`${API}/buscar?${params.toString()}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

// --- Limpiar búsqueda ---
function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}

// --- Mantener sesión ---
window.addEventListener("load", () => {
    const storedUser = localStorage.getItem("user_id");
    if(storedUser){
        currentUserId = storedUser;
        document.getElementById("loginContainer").style.display="none";
        document.getElementById("tareasContainer").style.display="block";
        cargarTareas();
    }
});
