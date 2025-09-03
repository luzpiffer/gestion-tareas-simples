const API = "/tareas"; 
let currentUserId = null;

// --- Funcionalidad de Paneles de Login/Registro ---
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('mainContainer');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    if (mainContainer && signInBtn && signUpBtn) {
        signUpBtn.addEventListener('click', () => mainContainer.classList.add("right-panel-active"));
        signInBtn.addEventListener('click', () => mainContainer.classList.remove("right-panel-active"));
    }

    const fechaInput = document.getElementById("fecha_vencimiento");
    const hoy = new Date().toISOString().split("T")[0];
    if (fechaInput) fechaInput.min = hoy;
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

// --- Registro ---
document.getElementById("registroForm").addEventListener("submit", e => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    if (!username || !password) return mostrarNotificacion("Completa todos los campos", "error");

    // Guardar en localStorage
    let usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    if (usuarios.find(u => u.username === username)) {
        return mostrarNotificacion("Usuario ya existe", "error");
    }

    const userId = Date.now();
    usuarios.push({ userId, username, password });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    mostrarNotificacion("Usuario registrado ✅", "exito");
    document.getElementById("regUsername").value = "";
    document.getElementById("regPassword").value = "";
});

// --- Login ---
document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    let usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    const user = usuarios.find(u => u.username === username && u.password === password);

    if (user) {
        currentUserId = user.userId;
        document.getElementById("authContainer").style.display = "none";
        document.getElementById("tareasContainer").style.display = "grid";
        mostrarNotificacion(`Bienvenido/a ${username}`, "exito");
        cargarTareas();
    } else {
        mostrarNotificacion("Usuario o contraseña incorrectos", "error");
    }
});

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUserId = null;
    document.getElementById("tareasContainer").style.display = "none";
    document.getElementById("authContainer").style.display = "flex";
});

// --- Tareas ---
function cargarTareas() {
    if (!currentUserId) return;
    const tareas = JSON.parse(localStorage.getItem("tareas") || "[]")
                     .filter(t => t.userId === currentUserId);
    mostrarTareas(tareas);
}

function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (tareas.length === 0) return div.innerHTML = "<p>No hay tareas.</p>";

    tareas.forEach(t => {
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad);
        tareaDiv.innerHTML = `
            <span class="cerrar" title="Eliminar tarea">✖</span>
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
        `;
        tareaDiv.querySelector(".cerrar").addEventListener("click", () => eliminarTarea(t.id));
        div.appendChild(tareaDiv);
    });
}

function eliminarTarea(id) {
    let tareas = JSON.parse(localStorage.getItem("tareas") || "[]");
    tareas = tareas.filter(t => t.id !== id);
    localStorage.setItem("tareas", JSON.stringify(tareas));
    mostrarNotificacion("Tarea eliminada ✅", "exito");
    cargarTareas();
}

// Crear tarea
document.getElementById("formTarea").addEventListener("submit", e => {
    e.preventDefault();
    if (!currentUserId) return;

    const data = Object.fromEntries(new FormData(e.target).entries());
    data.userId = currentUserId;
    data.id = Date.now();
    let tareas = JSON.parse(localStorage.getItem("tareas") || "[]");
    tareas.push(data);
    localStorage.setItem("tareas", JSON.stringify(tareas));

    mostrarNotificacion("Tarea agregada ✅", "exito");
    e.target.reset();
    cargarTareas();
});

// Buscar tareas
function buscar() {
    if (!currentUserId) return;
    const titulo = document.getElementById("buscarTitulo").value.toLowerCase();
    const fecha = document.getElementById("buscarFecha").value;

    let tareas = JSON.parse(localStorage.getItem("tareas") || "[]")
                     .filter(t => t.userId === currentUserId);

    if (titulo) tareas = tareas.filter(t => t.titulo.toLowerCase().includes(titulo));
    if (fecha) tareas = tareas.filter(t => t.fecha_vencimiento === fecha);

    mostrarTareas(tareas);
}

// Limpiar búsqueda
function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}
