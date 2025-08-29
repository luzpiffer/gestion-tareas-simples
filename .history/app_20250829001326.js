const API = "/tareas";

async function cargarTareas() {
    const res = await fetch(API);
    const tareas = await res.json();
    mostrarTareas(tareas);
}

function mostrarTareas(tareas) {
    const div = document.getElementById("listaTareas");
    div.innerHTML = "";
    if (tareas.length === 0) {
        div.innerHTML = "<p>No hay tareas encontradas.</p>";
        return;
    }
    
    tareas.forEach(t => {
        // Crear el elemento div para cada tarea
        const tareaDiv = document.createElement("div");
        tareaDiv.classList.add("tarea", t.prioridad);

        // Generar una rotación aleatoria entre -2 y 2 grados
        const rotacion = Math.random() * 4 - 2;
        tareaDiv.style.setProperty('--rotacion', `${rotacion}deg`);

        // Insertar el contenido HTML en el div
        tareaDiv.innerHTML = `
            <h3>${t.titulo} <small>(${t.prioridad})</small></h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>📅 Vence: ${t.fecha_vencimiento}</small>
        `;
        
        // Agregar el div al contenedor
        div.appendChild(tareaDiv);
    });
}

document.getElementById("formTarea").addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    e.target.reset();
    cargarTareas();
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

// Cargar al inicio
cargarTareas();
