from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import os

app = FastAPI(title="Prueba FastAPI")

# --- Crear carpeta 'static' y HTML de prueba si no existen ---
if not os.path.exists("static"):
    os.makedirs("static")

# register.html
if not os.path.exists("static/register.html"):
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

# index.html
if not os.path.exists("static/index.html"):
    with open("static/index.html", "w", encoding="utf-8") as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head><title>Index</title></head>
        <body>
            <h1>Página de inicio de prueba</h1>
            <p>¡Todo está funcionando!</p>
        </body>
        </html>
        """)

# --- Montar archivos estáticos ---
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Redirección raíz ---
@app.get("/")
def root():
    return RedirectResponse(url="/static/register.html")

# --- Endpoint de prueba JSON ---
@app.get("/ping")
def ping():
    return {"status": "ok"}

# --- Endpoint de saludo ---
@app.get("/saludo/{nombre}")
def saludo(nombre: str, saludo_extra: Optional[str] = None):
    mensaje = f"Hola, {nombre}!"
    if saludo_extra:
        mensaje += f" {saludo_extra}"
    return {"mensaje": mensaje}

# --- Endpoint que devuelve directamente un HTML (opcional) ---
@app.get("/index.html")
def index_page():
    return FileResponse("static/index.html")

# --- Endpoint de error de ejemplo ---
@app.get("/error")
def error_demo():
    return {"error": "Este es un error de prueba"}
