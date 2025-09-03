const API = "/tareas";
let currentUser = null;

// --- Notificaciones ---
function mostrarNotificacion(mensaje, tipo = "exito") {
    const cont = document.getElementById("notificaciones");
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    cont.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

// --- Paneles Login/Registro ---
const mainContainer = document.getElementById("mainContainer");
const showRegisterPanelBtn = document.getElementById("showRegisterPanel");
const showLoginPanelBtn = document.getElementById("showLoginPanel");
const signInButton = document.getElementById("signInButton");
const signUpButton = document.getElementById("signUpButton");

showRegisterPanelBtn.addEventListener("click", () => {
    mainContainer.classList.add("right-panel-active");
});
showLoginPanelBtn.addEventListener("click", () => {
    mainContainer.classList.remove("right-panel-active");
});
signInButton.addEventListener("click", () => {
    mainContainer.classList.remove("right-panel-active");
});
signUpButton.addEventListener("click", () => {
    mainContainer.classList.add("right-panel-active");
});

// --- Login ---
document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        const resp = await res.json();
        currentUser = resp;
        document.getElementById("authContainer").style.display = "none";
        document.getElementById("tareasContainer").style.display = "grid";
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
    const password = document.getElementById("regPassword").value;

    const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        mostrarNotificacion("Usuario registrado ✅", "exito");
        document.getElementById("regUsername").value = "";
        document.getElementById("regPassword").value = "";
        mainContainer.classList.remove("right-panel-active");
    } else {
        const err = await res.json();
        mostrarNotificacion(err.detail || "Error al registrar", "error");
    }
});

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = null;
    document.getElementById("tareasContainer").style.display = "none";
    document.getElementById("authContainer").style.display = "flex";
    mainContainer.classList.remove("right-panel-active");
});

// --- Fecha mínima ---
const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

// --- Funciones de tareas ---
async function cargarTareas() {
    if (!currentUser) return;
    const res = await fetch(`${API}?usuario_id=${currentUser.id}`);
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
        tareaDiv.classList.add("tarea", t.prioridad || "baja");
        tareaDiv.innerHTML = `
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <h3>${t.titulo} <small>(${t.prioridad || "sin prioridad"})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento || "Sin fecha"}</small>
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
        const res = await fetch(`${API}/${idTarea}?usuario_id=${currentUser.id}`, { method: "DELETE" });
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
    if (!currentUser) return;
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch(`${API}?usuario_id=${currentUser.id}`, {
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
    if (!currentUser) return;
    const titulo = document.getElementById("buscarTitulo").value;
    const fecha = document.getElementById("buscarFecha").value;
    const params = new URLSearchParams({ usuario_id: currentUser.id });
    if (titulo) params.append("titulo", titulo);
    if (fecha) params.append("fecha", fecha);

    const res = await fetch(`${API}?${params.toString()}`);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}
