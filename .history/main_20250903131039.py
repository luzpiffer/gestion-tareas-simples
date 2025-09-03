from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import pyodbc
import os
from passlib.hash import bcrypt

app = FastAPI(title="Gestor de Tareas con Login")

# Archivos estáticos (CSS, JS, HTML)
app.mount("/static", StaticFiles(directory="."), name="static")

# Conexión a SQL Server
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=GestorTareas;"
    "Trusted_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(CONNECTION_STRING)

# ---------------- MODELOS ----------------
class UsuarioRegistro(BaseModel):
    username: str
    password: str

class UsuarioLogin(BaseModel):
    username: str
    password: str

class UsuarioOut(BaseModel):
    id: int
    username: str

class Tarea(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_vencimiento: Optional[str] = None

class TareaOut(Tarea):
    id: int
    usuario_id: int

# ---------------- AUTH ----------------
@app.post("/register", response_model=UsuarioOut)
def registrar_usuario(user: UsuarioRegistro):
    print(f"Intento de registro para el usuario: {user.username}")
    conn = get_connection()
    cur = conn.cursor()

    # Verificar si ya existe
    cur.execute("SELECT id FROM USUARIOS WHERE username = ?", (user.username,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # Hashear password
    hashed_pw = bcrypt.hash(user.password)
    print(f"Contraseña recibida: {user.password}")
    print(f"Hash generado: {hashed_pw}")

    # Insertar usuario
    cur.execute(
        "INSERT INTO USUARIOS (username, password_hash) OUTPUT INSERTED.id VALUES (?, ?)",
        (user.username, hashed_pw)
    )
    user_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    print(f"Usuario {user.username} registrado exitosamente con ID: {user_id}")
    return UsuarioOut(id=user_id, username=user.username)

@app.post("/login", response_model=UsuarioOut)
def login(user: UsuarioLogin):
    print(f"Intento de login para el usuario: {user.username}")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, password_hash FROM USUARIOS WHERE username = ?", (user.username,))
    row = cur.fetchone()
    conn.close()

    if not row:
        print(f"Error de login: El usuario {user.username} no existe.")
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    user_id, username, password_hash = row
    print(f"Usuario encontrado. ID: {user_id}, Hash almacenado: {password_hash}")
    print(f"Contraseña ingresada para verificar: {user.password}")

    if not bcrypt.verify(user.password, password_hash):
        print("Error de login: La contraseña no coincide.")
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    print(f"Login exitoso para el usuario: {username}")
    return UsuarioOut(id=user_id, username=username)

# ---------------- TAREAS ----------------
@app.post("/tareas", response_model=TareaOut)
def crear_tarea(tarea: Tarea, usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO TAREAS (titulo, descripcion, prioridad, fecha_vencimiento, usuario_id)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?, ?)
        """,
        (tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_vencimiento, usuario_id)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return TareaOut(id=new_id, usuario_id=usuario_id, **tarea.dict())

@app.get("/tareas", response_model=List[TareaOut])
def listar_tareas(usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, titulo, descripcion, prioridad, fecha_vencimiento, usuario_id FROM TAREAS WHERE usuario_id = ?",
        (usuario_id,)
    )
    rows = cur.fetchall()
    conn.close()
    return [
        TareaOut(
            id=r[0], titulo=r[1], descripcion=r[2], prioridad=r[3],
            fecha_vencimiento=str(r[4]) if r[4] else None,
            usuario_id=r[5]
        )
        for r in rows
    ]

@app.delete("/tareas/{tarea_id}")
def eliminar_tarea(tarea_id: int, usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM TAREAS WHERE id = ? AND usuario_id = ?", (tarea_id, usuario_id))
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea eliminada"}

# ---------------- FRONT ----------------
@app.get("/")
def index():
    return FileResponse(os.path.join(".", "index.html"))
