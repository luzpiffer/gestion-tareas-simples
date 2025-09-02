const API = "/tareas";

function mostrarNotificacion(mensaje, tipo = "exito") {
    const contenedor = document.getElementById("notificaciones");
    const div = document.createElement("div");
    div.className = `notificacion ${tipo}`;
    div.textContent = mensaje;
    contenedor.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

const fechaInput = document.getElementById("fecha_vencimiento");
const hoy = new Date().toISOString().split("T")[0];
fechaInput.min = hoy;

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
        const res = await fetch(`${API}/${idTarea}`, { method: "DELETE" });
        if (res.ok) {
            mostrarNotificacion("Tarea eliminada", "exito");
            cargarTareas();
        } else {
            mostrarNotificacion("Error al eliminar la tarea ❌", "error");
        }
        overlay.remove();
    });

    document.getElementById("confirm-no").addEventListener("click", () => {
        overlay.remove();
    });
}

async function cargarTareas() {
    const res = await fetch(API);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (tareas.length === 0) { div.innerHTML = "<p>No hay tareas encontradas.</p>"; return; }

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

function limpiarBusqueda() {
    document.getElementById("buscarTitulo").value = "";
    document.getElementById("buscarFecha").value = "";
    cargarTareas();
}

cargarTareas();