from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import pyodbc
import os
from passlib.hash import bcrypt

app = FastAPI(title="Gestor de Tareas")

# Servir archivos estáticos
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

# ------------------- Modelos -------------------
class Tarea(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: str
    fecha_vencimiento: str

class TareaOut(Tarea):
    id: int

class UsuarioRegistro(BaseModel):
    username: str
    password: str

class UsuarioLogin(BaseModel):
    username: str
    password: str

# ------------------- Endpoints Usuarios -------------------
@app.post("/registro")
def registrar_usuario(usuario: UsuarioRegistro):
    conn = get_connection()
    cur = conn.cursor()
    password_hash = bcrypt.hash(usuario.password)
    try:
        cur.execute(
            "INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)",
            (usuario.username, password_hash)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return {"error": "Usuario ya existe o error al registrar"}
    conn.close()
    return {"mensaje": "Usuario registrado correctamente"}

@app.post("/login")
def login(usuario: UsuarioLogin):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash FROM Usuarios WHERE username = ?", (usuario.username,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    user_id, password_hash = row
    if not bcrypt.verify(usuario.password, password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    return {"mensaje": "Login exitoso", "usuario_id": user_id}

# ------------------- Endpoints Tareas -------------------
@app.post("/tareas", response_model=TareaOut)
def crear_tarea(tarea: Tarea, usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO Tareas (titulo, descripcion, prioridad, fecha_vencimiento, usuario_id) OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?)",
        (tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_vencimiento, usuario_id)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return TareaOut(id=new_id, **tarea.dict())

@app.get("/tareas", response_model=List[TareaOut])
def listar_tareas(usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, titulo, descripcion, prioridad, fecha_vencimiento FROM Tareas WHERE usuario_id = ?", (usuario_id,))
    rows = cur.fetchall()
    conn.close()
    return [TareaOut(id=r[0], titulo=r[1], descripcion=r[2], prioridad=r[3], fecha_vencimiento=str(r[4])) for r in rows]

@app.get("/tareas/buscar", response_model=List[TareaOut])
def buscar_tareas(usuario_id: int, titulo: Optional[str] = None, fecha: Optional[str] = None):
    conn = get_connection()
    cur = conn.cursor()
    query = "SELECT id, titulo, descripcion, prioridad, fecha_vencimiento FROM Tareas WHERE usuario_id = ?"
    params = [usuario_id]
    if titulo:
        query += " AND titulo LIKE ?"
        params.append(f"%{titulo}%")
    if fecha:
        query += " AND fecha_vencimiento = ?"
        params.append(fecha)
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    return [TareaOut(id=r[0], titulo=r[1], descripcion=r[2], prioridad=r[3], fecha_vencimiento=str(r[4])) for r in rows]

@app.delete("/tareas/{tarea_id}")
def eliminar_tarea(tarea_id: int, usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Tareas WHERE id = ? AND usuario_id = ?", (tarea_id, usuario_id))
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea eliminada"}

# ------------------- Servir HTML -------------------
@app.get("/")
def index():
    return FileResponse(os.path.join(".", "index.html"))

