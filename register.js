const API_USERS = "/usuarios";

// --- Formularios ---
const formRegister = document.getElementById("formRegister");
const formLogin = document.getElementById("formLogin");

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

// --- Registro ---
if (formRegister) {
    formRegister.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        if (!data.username.trim() || !data.password.trim()) {
            mostrarNotificacion("Todos los campos son obligatorios ❌", "error");
            return;
        }

        try {
            const res = await fetch(`${API_USERS}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                // Guardar usuario completo
                localStorage.setItem("currentUser", JSON.stringify({ id: result.id, username: result.username }));
                mostrarNotificacion("Registro exitoso ✅");
                window.location.href = "index.html";
            } else {
                mostrarNotificacion(result.detail || "Error al registrar ❌", "error");
            }
        } catch (err) {
            mostrarNotificacion("Error al conectar con el servidor ❌", "error");
        }
    });
}

// --- Login ---
if (formLogin) {
    formLogin.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        if (!data.username.trim() || !data.password.trim()) {
            mostrarNotificacion("Todos los campos son obligatorios ❌", "error");
            return;
        }

        try {
            const res = await fetch(`${API_USERS}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                // Guardar usuario completo
                localStorage.setItem("currentUser", JSON.stringify({ id: result.id, username: result.username }));
                mostrarNotificacion("Login exitoso ✅");
                window.location.href = "index.html";
            } else {
                mostrarNotificacion(result.detail || "Usuario o contraseña incorrecta ❌", "error");
            }
        } catch (err) {
            mostrarNotificacion("Error al conectar con el servidor ❌", "error");
        }
    });
}
