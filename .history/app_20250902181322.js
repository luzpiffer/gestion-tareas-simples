const API = "/tareas"
let currentUserId = null

// --- Notificaciones ---
function mostrarNotificacion(mensaje, tipo = "exito") {
  const cont = document.getElementById("notificaciones")
  const div = document.createElement("div")
  div.className = `notificacion ${tipo}`
  div.textContent = mensaje
  cont.appendChild(div)
  setTimeout(() => div.remove(), 3500)
}

// --- Login ---
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  const data = new URLSearchParams()
  data.append("username", username)
  data.append("password", password)

  try {
    const res = await fetch("/login", { method: "POST", body: data })
    if (res.ok) {
      const resp = await res.json()
      currentUserId = resp.user_id
      document.getElementById("userName").textContent = username
      document.getElementById("loginContainer").style.display = "none"
      document.getElementById("tareasContainer").style.display = "block"
      mostrarNotificacion(`¡Bienvenido/a ${username}! 🎉`, "exito")
      cargarTareas()
    } else {
      mostrarNotificacion("Usuario o contraseña incorrectos ❌", "error")
    }
  } catch (error) {
    mostrarNotificacion("Error de conexión ❌", "error")
  }
})

// --- Registro ---
document.getElementById("registroForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const username = document.getElementById("regUsername").value
  const password = document.getElementById("regPassword").value

  try {
    const res = await fetch("/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      mostrarNotificacion("¡Usuario registrado exitosamente! ✅", "exito")
      document.getElementById("regUsername").value = ""
      document.getElementById("regPassword").value = ""
    } else {
      const err = await res.json()
      mostrarNotificacion(err.detail || "Error al registrar ❌", "error")
    }
  } catch (error) {
    mostrarNotificacion("Error de conexión ❌", "error")
  }
})

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
  currentUserId = null
  document.getElementById("tareasContainer").style.display = "none"
  document.getElementById("loginContainer").style.display = "block"
  mostrarNotificacion("Sesión cerrada correctamente 👋", "exito")
})

// --- Fecha mínima ---
const fechaInput = document.getElementById("fecha_vencimiento")
const hoy = new Date().toISOString().split("T")[0]
fechaInput.min = hoy

// --- Funciones de tareas ---
async function cargarTareas() {
  if (!currentUserId) return
  try {
    const res = await fetch(`${API}/${currentUserId}`)
    const tareas = await res.json()
    mostrarTareas(tareas)
  } catch (error) {
    mostrarNotificacion("Error al cargar tareas ❌", "error")
  }
}

function mostrarTareas(tareas) {
  const div = document.getElementById("listaTareas")
  div.innerHTML = ""

  if (tareas.length === 0) {
    div.innerHTML = `
            <div class="empty-state">
                <h3>No hay tareas aún</h3>
                <p>¡Crea tu primera tarea para comenzar!</p>
            </div>
        `
    return
  }

  tareas.forEach((t) => {
    const tareaDiv = document.createElement("div")
    tareaDiv.classList.add("tarea", t.prioridad)

    const prioridadIcon = {
      alta: "🔴",
      media: "🟡",
      baja: "🟢",
    }

    tareaDiv.innerHTML = `
            <button class="cerrar" title="Eliminar tarea">✕</button>
            <h3>${t.titulo}</h3>
            <p>${t.descripcion || "Sin descripción"}</p>
            <small>
                ${prioridadIcon[t.prioridad]} ${t.prioridad.charAt(0).toUpperCase() + t.prioridad.slice(1)} • 
                📅 Vence: ${new Date(t.fecha_vencimiento).toLocaleDateString("es-ES")}
            </small>
        `

    tareaDiv.querySelector(".cerrar").addEventListener("click", () => {
      confirmarEliminar(t.id)
    })
    div.appendChild(tareaDiv)
  })
}

function confirmarEliminar(idTarea) {
  const overlay = document.createElement("div")
  overlay.className = "confirm-modal-overlay"
  const modal = document.createElement("div")
  modal.className = "confirm-modal"
  modal.innerHTML = `
        <p>¿Estás seguro de que quieres eliminar esta tarea?</p>
        <div class="actions">
            <button id="confirm-si" class="btn-primary">Sí, eliminar</button>
            <button id="confirm-no" class="btn-outline">Cancelar</button>
        </div>
    `
  document.body.appendChild(overlay)
  overlay.appendChild(modal)

  document.getElementById("confirm-si").addEventListener("click", async () => {
    try {
      const res = await fetch(`${API}/${currentUserId}/${idTarea}`, { method: "DELETE" })
      if (res.ok) {
        mostrarNotificacion("Tarea eliminada correctamente ✅", "exito")
        cargarTareas()
      } else {
        mostrarNotificacion("Error al eliminar la tarea ❌", "error")
      }
    } catch (error) {
      mostrarNotificacion("Error de conexión ❌", "error")
    }
    overlay.remove()
  })

  document.getElementById("confirm-no").addEventListener("click", () => overlay.remove())
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove()
  })
}

// --- Crear tarea ---
document.getElementById("formTarea").addEventListener("submit", async (e) => {
  e.preventDefault()
  if (!currentUserId) return

  const data = Object.fromEntries(new FormData(e.target).entries())

  try {
    const res = await fetch(`${API}/${currentUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      mostrarNotificacion("¡Tarea creada exitosamente! ✅", "exito")
      e.target.reset()
      fechaInput.min = hoy // Resetear fecha mínima
      cargarTareas()
    } else {
      mostrarNotificacion("Error al crear la tarea ❌", "error")
    }
  } catch (error) {
    mostrarNotificacion("Error de conexión ❌", "error")
  }
})

// --- Buscar ---
async function buscar() {
  if (!currentUserId) return
  const titulo = document.getElementById("buscarTitulo").value
  const fecha = document.getElementById("buscarFecha").value

  const params = new URLSearchParams()
  if (titulo) params.append("titulo", titulo)
  if (fecha) params.append("fecha", fecha)

  try {
    const res = await fetch(`${API}/${currentUserId}?${params.toString()}`)
    const tareas = await res.json()
    mostrarTareas(tareas)

    if (titulo || fecha) {
      mostrarNotificacion(`Se encontraron ${tareas.length} tarea(s) 🔍`, "exito")
    }
  } catch (error) {
    mostrarNotificacion("Error en la búsqueda ❌", "error")
  }
}

// --- Limpiar búsqueda ---
function limpiarBusqueda() {
  document.getElementById("buscarTitulo").value = ""
  document.getElementById("buscarFecha").value = ""
  cargarTareas()
  mostrarNotificacion("Búsqueda limpiada ✨", "exito")
}

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
  // Configurar fecha mínima al cargar
  fechaInput.min = hoy
})
