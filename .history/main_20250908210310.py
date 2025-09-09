from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Prueba FastAPI")

# --- Archivos estáticos ---
# Crear carpeta 'static' y poner ahí los HTML
if not os.path.exists("static"):
    os.makedirs("static")
    # Crear un HTML de ejemplo
    with open("static/register.html", "w", encoding="utf-8") as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head><title>Register</title></head>
        <body>
            <h1>Página de registro de prueba</h1>
            <p>FastAPI funciona correctamente!</p>
        </body>
        </html>
        """)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Redirección raíz ---
@app.get("/")
def root():
    return RedirectResponse(url="/static/register.html")

# --- Endpoint de prueba ---
@app.get("/ping")
def ping():
    return {"status": "ok"}

# --- Endpoint de ejemplo para JSON ---
@app.get("/saludo/{nombre}")
def saludo(nombre: str):
    return {"mensaje": f"Hola, {nombre}!"}
