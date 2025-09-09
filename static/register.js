document.addEventListener("DOMContentLoaded", function () {
    const btnIniciarSesion = document.getElementById("btn__iniciar-sesion");
    const btnRegistrarse = document.getElementById("btn__registrarse");
    const formularioLogin = document.querySelector(".formulario__login");
    const formularioRegister = document.querySelector(".formulario__register");
    const contenedorLoginRegister = document.querySelector(".contenedor__login-register");
    const cajaTrasera = document.querySelector(".caja__trasera");
    


    // --- Event listeners para cambiar entre formularios ---
    if (btnIniciarSesion) {
        btnIniciarSesion.addEventListener("click", iniciarSesion);
    }
    if (btnRegistrarse) {
        btnRegistrarse.addEventListener("click", register);
    }

    // --- Funciones para cambiar formularios ---
    function iniciarSesion() {
        if (window.innerWidth > 850) {
            formularioLogin.style.display = "block";
            contenedorLoginRegister.style.left = "10px";
            formularioRegister.style.display = "none";
            cajaTrasera.style.left = "410px";
            formularioLogin.style.opacity = "1";
            formularioRegister.style.opacity = "0";
        } else {
            formularioLogin.style.display = "block";
            contenedorLoginRegister.style.left = "0px";
            formularioRegister.style.display = "none";
            formularioLogin.style.opacity = "1";
            formularioRegister.style.opacity = "0";
        }
    }

    function register() {
        if (window.innerWidth > 850) {
            formularioRegister.style.display = "block";
            contenedorLoginRegister.style.left = "410px";
            formularioLogin.style.display = "none";
            cajaTrasera.style.left = "10px";
            formularioRegister.style.opacity = "1";
            formularioLogin.style.opacity = "0";
        } else {
            formularioRegister.style.display = "block";
            contenedorLoginRegister.style.left = "0px";
            formularioLogin.style.display = "none";
            formularioRegister.style.opacity = "1";
            formularioLogin.style.opacity = "0";
        }
    }

    // --- Funcionalidad de mostrar/ocultar contraseña ---
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // --- API Configuration ---
    const API_USERS = "/usuarios";

    // --- Notificaciones ---
    function mostrarNotificacion(mensaje, tipo = "exito") {
        const cont = document.getElementById("notificaciones") || createNotificationContainer();
        const div = document.createElement("div");
        div.className = `notificacion ${tipo}`;
        div.innerHTML = `
            <div class="notificacion-content">
                <span class="notificacion-icon">${tipo === 'exito' ? '✅' : '❌'}</span>
                <span class="notificacion-mensaje">${mensaje}</span>
            </div>
        `;
        cont.appendChild(div);

        // Animación de entrada
        setTimeout(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateX(0)';
        }, 10);

        // Eliminar después de 3.5 segundos
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(100%)';
            setTimeout(() => div.remove(), 300);
        }, 3500);
    }

    function createNotificationContainer() {
        const cont = document.createElement("div");
        cont.id = "notificaciones";
        cont.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(cont);

        // Agregar estilos CSS para las notificaciones
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notificacion {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    border-left: 4px solid;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    font-family: 'Poppins', sans-serif;
                }
                .notificacion.exito {
                    border-left-color: #10B981;
                    background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%);
                }
                .notificacion.error {
                    border-left-color: #EF4444;
                    background: linear-gradient(135deg, #FEF2F2 0%, #FEFEFE 100%);
                }
                .notificacion-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .notificacion-icon {
                    font-size: 18px;
                }
                .notificacion-mensaje {
                    font-weight: 500;
                    color: #374151;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }

        return cont;
    }

    // --- Registro ---
  const formRegister = document.getElementById("registroForm");
  if (formRegister) {
    formRegister.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = document.getElementById("regUsername").value.trim();
      const password = document.getElementById("regPassword").value.trim();

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

        // FastAPI siempre responde JSON (ok o error)
        const result = await res.json();

        if (res.ok) {
          localStorage.setItem(
            "currentUser",
            JSON.stringify({ id: result.id, username: result.username })
          );
          mostrarNotificacion("¡Registro exitoso! Redirigiendo...", "exito");
          setTimeout(() => (window.location.href = "/index.html"), 1500);
        } else {
          // 400 por usuario existente, 422 por payload inválido, etc.
          mostrarNotificacion(result.detail || "Error al registrar", "error");
        }
      } catch (err) {
        console.error("Error:", err);
        mostrarNotificacion("Error al conectar con el servidor", "error");
      }
    });
  }

    // --- Login ---
    const formLogin = document.getElementById("loginForm");
    if (formLogin) {
        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault();

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            if (!username.trim() || !password.trim()) {
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
                    // Guardar usuario completo
                    localStorage.setItem("currentUser", JSON.stringify({
                        id: result.id,
                        username: result.username
                    }));
                    mostrarNotificacion("Login exitoso! Redirigiendo...", "exito");
                    setTimeout(() => {
                        window.location.href = "/index.html";
                    }, 2000);
                } else {
                    mostrarNotificacion(result.detail || "Usuario o contraseña incorrecta", "error");
                }
            } catch (err) {
                console.error("Error:", err);
                mostrarNotificacion("Error al conectar con el servidor", "error");
            }
        });
    }

    // --- Responsive behavior ---
    window.addEventListener("resize", function () {
        if (window.innerWidth > 850) {
            // Reset styles for desktop
            cajaTrasera.style.left = "";
            contenedorLoginRegister.style.left = "";
        }
    });

    // Inicializar con el formulario de registro visible por defecto
    if (window.innerWidth > 850) {
        register();
    }
});