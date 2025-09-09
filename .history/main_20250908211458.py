from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import pyodbc
import os
import hashlib
import secrets
from fastapi import Query


app = FastAPI(title="Gestor de Tareas")

# --- Archivos estáticos ---
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Conexión a SQL Server ---
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=LAPTOP-I85C1DHM"
    "DATABASE=GestorTareas;"
    "Trusted_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(CONNECTION_STRING)

# --- Modelos ---
class Usuario(BaseModel):
    username: str
    password: str

class UsuarioResponse(BaseModel):
    id: int
    username: str

class Tarea(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    completada: Optional[bool] = False
    categorias: Optional[List[int]] = []

class TareaOut(Tarea):
    id: int

# --- Seguridad básica ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def hash_password(password: str) -> str:
    salt = "mi_salt_seguro"  # puedes usar uno dinámico
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# --- Ruta raíz redirige a register.html ---
@app.get("/")
def root():
    return RedirectResponse(url="/register.html", status_code=302)

# --- Servir archivos HTML ---
@app.get("/register.html")
def register_page():
    return FileResponse("register.html")

@app.get("/index.html")
def index_page():
    return FileResponse("index.html")

# --- Endpoints de usuarios (actualizados) ---
@app.post("/usuarios/register", response_model=UsuarioResponse)
def registro(usuario: Usuario):
    conn = get_connection()
    cur = conn.cursor()
    try:
        password_hash = hash_password(usuario.password)
        cur.execute(
            "INSERT INTO Usuarios (username, password_hash) OUTPUT INSERTED.id VALUES (?, ?)",
            (usuario.username, password_hash)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return UsuarioResponse(id=user_id, username=usuario.username)
    except pyodbc.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    finally:
        conn.close()

@app.post("/usuarios/login", response_model=UsuarioResponse)
def login(usuario: Usuario):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash FROM Usuarios WHERE username = ?",
        (usuario.username,)
    )
    row = cur.fetchone()
    conn.close()
    
    if not row or not verify_password(usuario.password, row[1]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    return UsuarioResponse(id=row[0], username=usuario.username)

# --- Endpoints de tareas ---
@app.post("/tareas/{usuario_id}", response_model=TareaOut)
def crear_tarea(usuario_id: int, tarea: Tarea):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO Tareas (titulo, descripcion, prioridad, fecha_vencimiento, usuario_id) OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?)",
        (tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_vencimiento, usuario_id)
    )
    new_id = cur.fetchone()[0]
    asignar_categorias(conn, new_id, tarea.categorias)
    conn.commit()
    conn.close()
    return TareaOut(id=new_id, **tarea.dict())

@app.get("/tareas/{usuario_id}", response_model=List[TareaOut])
def listar_tareas(
    usuario_id: int,
    titulo: Optional[str] = None,
    fecha: Optional[str] = None,
    completada: Optional[int] = Query(None, ge=0, le=1)
):
    conn = get_connection()
    cur = conn.cursor()
    
    query = """
    SELECT t.id, t.titulo, t.descripcion, t.prioridad, t.fecha_vencimiento, t.completada,
           STRING_AGG(CAST(c.id AS VARCHAR), ',') AS categorias
    FROM Tareas t
    LEFT JOIN TareasCategorias tc ON t.id = tc.tarea_id
    LEFT JOIN Categorias c ON tc.categoria_id = c.id
    WHERE t.usuario_id = ?
    """
    params = [usuario_id]

    if titulo:  # solo si se pasa
        query += " AND t.titulo LIKE ?"
        params.append(f"%{titulo}%")
    if fecha:  # solo si se pasa
        query += " AND t.fecha_vencimiento = ?"
        params.append(fecha)
    if completada is not None:  # solo si se pasa
        query += " AND t.completada = ?"
        params.append(completada)

    query += " GROUP BY t.id, t.titulo, t.descripcion, t.prioridad, t.fecha_vencimiento, t.completada"

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    
    tareas = []
    for r in rows:
        cats = [int(x) for x in r[6].split(',')] if r[6] else []
        tareas.append(TareaOut(
            id=r[0],
            titulo=r[1],
            descripcion=r[2],
            prioridad=r[3],
            fecha_vencimiento=str(r[4]) if r[4] else None,
            completada=bool(r[5]),
            categorias=cats
))

    return tareas

@app.delete("/tareas/{usuario_id}/{tarea_id}")
def eliminar_tarea(usuario_id: int, tarea_id: int):
    conn = get_connection()
    cur = conn.cursor()
   # Primero eliminar las categorías asociadas
    cur.execute(
        "DELETE FROM TareasCategorias WHERE tarea_id = ?", 
        (tarea_id,)
    )
    
    #  Luego eliminar la tarea en sí
    cur.execute(
        "DELETE FROM Tareas WHERE id = ? AND usuario_id = ?", 
        (tarea_id, usuario_id)
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea eliminada"}

from datetime import datetime

@app.put("/tareas/{usuario_id}/{tarea_id}", response_model=TareaOut)
def editar_tarea(usuario_id: int, tarea_id: int, tarea: Tarea):
    conn = get_connection()
    cur = conn.cursor()

    # Validaciones
    if not tarea.titulo or tarea.titulo.strip() == "":
        raise HTTPException(status_code=400, detail="El título es obligatorio")

    if tarea.fecha_vencimiento:
        try:
            fecha = datetime.strptime(tarea.fecha_vencimiento, "%Y-%m-%d").date()
            if fecha < datetime.now().date():
                raise HTTPException(status_code=400, detail="La fecha no puede ser en el pasado")
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido (usar YYYY-MM-DD)")

    # Verificar que la tarea existe y es del usuario
    cur.execute("SELECT id FROM Tareas WHERE id = ? AND usuario_id = ?", (tarea_id, usuario_id))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # Actualizar
    cur.execute(
        """
        UPDATE Tareas
        SET titulo = ?, descripcion = ?, prioridad = ?, fecha_vencimiento = ?
        WHERE id = ? AND usuario_id = ?
        """,
        (tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_vencimiento, tarea_id, usuario_id)
    )
    asignar_categorias(conn, tarea_id, tarea.categorias)
    conn.commit()
    conn.close()
    return TareaOut(id=tarea_id, **tarea.dict())

@app.get("/categorias")
def listar_categorias():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nombre FROM Categorias ORDER BY nombre")
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "nombre": r[1]} for r in rows]


@app.get("/estados_tarea")
def listar_estados_tarea():
    # Retornamos id y label
    return [
        {"id": 0, "nombre": "Pendiente"},
        {"id": 1, "nombre": "Completada"}
    ]

def asignar_categorias(conn, tarea_id: int, categorias: List[int]):
    cur = conn.cursor()
    cur.execute("DELETE FROM TareasCategorias WHERE tarea_id = ?", (tarea_id,))
    for cat_id in categorias:
        cur.execute(
            "INSERT INTO TareasCategorias (tarea_id, categoria_id) VALUES (?, ?)",
            (tarea_id, cat_id)
        )

# --- Marcar Tarea como Completada ---
@app.patch("/tareas/{usuario_id}/{tarea_id}/completada")
def marcar_completada(usuario_id: int, tarea_id: int, completada: bool):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE Tareas SET completada = ? WHERE id = ? AND usuario_id = ?",
        (completada, tarea_id, usuario_id)
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea actualizada", "completada": completada}