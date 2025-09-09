document.addEventListener("DOMContentLoaded", function () {
    const API_USERS = "/usuarios";

    const formRegister = document.getElementById("registroForm");
    const formLogin = document.getElementById("loginForm");

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
        cont.style.cssText = "position: fixed; top: 20px; right: 20px; z-index:10000; max-width:400px;";
        document.body.appendChild(cont);
        return cont;
    }

    // --- Registro ---
    if (formRegister) {
        formRegister.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("regUsername").value.trim();
            const password = document.getElementById("regPassword").value.trim();

            if (!username || !password) {
                mostrarNotificacion("Todos los campos son obligatorios", "error");
                return;
            }

            // Validaciones simples
            const usernameRegex = /^[a-zA-Z0-9]{4,15}$/;
            const passwordRegex = /^(?=.*[0-9]).{6,}$/;
            if (!usernameRegex.test(username)) {
                mostrarNotificacion("Usuario inválido ❌", "error");
                return;
            }
            if (!passwordRegex.test(password)) {
                mostrarNotificacion("Contraseña inválida ❌", "error");
                return;
            }

            try {
                const res = await fetch(`${API_USERS}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const result = await res.json();

                if (res.ok) {
                    // Guardar usuario en localStorage
                    localStorage.setItem("currentUser", JSON.stringify({
                        id: result.id,
                        username: result.username
                    }));
                    mostrarNotificacion("Registro exitoso! Redirigiendo...", "exito");
                    setTimeout(() => window.location.href = "/index.html", 1500);
                } else {
                    mostrarNotificacion(result.detail || "Error al registrar", "error");
                }
            } catch (err) {
                console.error(err);
                mostrarNotificacion("Error al conectar con el servidor", "error");
            }
        });
    }

    // --- Login ---
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !password) {
                mostrarNotificacion("Todos los campos son obligatorios", "error");
                return;
            }

            try {
                const res = await fetch(`${API_USERS}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const result = await res.json();

                if (res.ok) {
                    localStorage.setItem("currentUser", JSON.stringify({
                        id: result.id,
                        username: result.username
                    }));
                    mostrarNotificacion("Login exitoso! Redirigiendo...", "exito");
                    setTimeout(() => window.location.href = "/index.html", 1500);
                } else {
                    mostrarNotificacion(result.detail || "Usuario o contraseña incorrecta", "error");
                }
            } catch (err) {
                console.error(err);
                mostrarNotificacion("Error al conectar con el servidor", "error");
            }
        });
    }
});
