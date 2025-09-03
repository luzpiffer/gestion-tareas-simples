const API = "/tareas";
let currentUserId = null;

// --- Funcionalidad de Paneles de Login/Registro ---
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('mainContainer');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    if (mainContainer && signInBtn && signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            mainContainer.classList.add("right-panel-active");
        });

        signInBtn.addEventListener('click', () => {
            mainContainer.classList.remove("right-panel-active");
        });
    }

    // Código para la fecha mínima
    const fechaInput = document.getElementById("fecha_vencimiento");
    const hoy = new Date().toISOString().split("T")[0];
    if (fechaInput) {
        fechaInput.min = hoy;
    }
});

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
        document.getElementById("authContainer").style.display = "none";
        document.getElementById("tareasContainer").style.display = "block";
        mostrarNotificacion("Bienvenido/a " + username, "exito");
        cargarTareas();
    } else {
        mostrarNotificacion("Usuario o contraseña incorrectos", "error");
    }
});

// --- Registro ---
document.getElementById("registroForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value; // ¡Aquí el cambio!
    const password = document.getElementById("regPassword").value;

    const res = await fetch("/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }) // ¡Y aquí!
    });

    if (res.ok) {
        mostrarNotificacion("Usuario registrado ✅", "exito");
        document.getElementById("regUsername").value = "";
        document.getElementById("regEmail").value = "";
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
    document.getElementById("authContainer").style.display = "flex";
});

// --- Funciones de tareas ---
async function cargarTareas() {
    if (!currentUserId) return;
    const res = await fetch(`${API}/${currentUserId}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
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
        tareaDiv.innerHTML = `
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
        `;
        tareaDiv.querySelector(".cerrar").addEventListener("click", () => {
            confirmarEliminar(t.id);
        });
        div.appendChild(tareaDiv);
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
        const res = await fetch(`${API}/${currentUserId}/${idTarea}`, {
            method: "DELETE"
        });
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
    const titulo = document.getElementById("buscarTitulo").value;
    const fecha = document.getElementById("buscarFecha").value;
    const params = new URLSearchParams();
    if (titulo) params.append("titulo", titulo);
    if (fecha) params.append("fecha", fecha);
    const res = await fetch(`${API}/${currentUserId}?${params.toString()}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

// --- Limpiar búsqueda ---
function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}