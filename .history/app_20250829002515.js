const API = "/tareas";

// --- Notificaciones flotantes ---
function mostrarNotificacion(mensaje, tipo = "exito") {
    const contenedor = document.getElementById("notificaciones");
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    contenedor.appendChild(div);

    // Eliminar después de 3.5 segundos
    setTimeout(() => {
        div.remove();
    }, 3500);
}

// --- Fecha mínima hoy ---
const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

// --- Cargar tareas ---
async function cargarTareas() {
    const res = await fetch(API);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

// --- Mostrar tareas ---
function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (tareas.length === 0) {
        div.innerHTML = "<p>No hay tareas encontradas.</p>";
        return;
    }

    tareas.forEach(t => {
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad);

        const rotacion = Math.random() * 4 - 2;
        tareaDiv.style.setProperty('--rotacion', `${rotacion}deg`);

        tareaDiv.innerHTML = `
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
            <button class="eliminar" data-id="${t.id}">🗑️ Eliminar</button>
        `;

        // Botón eliminar
        tareaDiv.querySelector(".eliminar").addEventListener("click", async () => {
            if(confirm("¿Seguro que querés eliminar esta tarea?")) {
                const res = await fetch(`${API}/${t.id}`, { method: "DELETE" });
                if(res.ok){
                    mostrarNotificacion("Tarea eliminada 🗑️", "exito");
                    cargarTareas();
                } else {
                    mostrarNotificacion("Error al eliminar la tarea ❌", "error");
                }
            }
        });

        div.appendChild(tareaDiv);
    });
}

// --- Agregar tarea ---
document.getElementById("formTarea").addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        mostrarNotificacion("Tarea agregada correctamente ✅", "exito");
        e.target.reset();
        cargarTareas();
    } else {
        mostrarNotificacion("Error al agregar la tarea ❌", "error");
    }
});

// --- Buscar tareas ---
async function buscar() {
    const titulo = document.getElementById("buscarTitulo").value;
    const fecha = document.getElementById("buscarFecha").value;
    const params = new URLSearchParams();
    if (titulo) params.append("titulo", titulo);
    if (fecha) params.append("fecha", fecha);
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

// --- Cargar al inicio ---
cargarTareas();
