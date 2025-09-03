from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import pyodbc
import os
import hashlib
import secrets

app = FastAPI(title="Gestor de Tareas")

# --- Archivos estáticos ---
app.mount("/static", StaticFiles(directory="."), name="static")

# --- Conexión a SQL Server ---
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=GestorTareas;"
    "Trusted_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(CONNECTION_STRING)

# --- Modelos ---
class Usuario(BaseModel):
    username: str
    password: str

class Tarea(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_vencimiento: Optional[str] = None

class TareaOut(Tarea):
    id: int

# --- Seguridad básica ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def hash_password(password: str) -> str:
    salt = "mi_salt_seguro"  # puedes usar uno dinámico
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# --- Endpoints de usuarios ---
@app.post("/registro")
def registro(usuario: Usuario):
    conn = get_connection()
    cur = conn.cursor()
    try:
        password_hash = hash_password(usuario.password)
        cur.execute(
            "INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)",
            (usuario.username, password_hash)
        )
        conn.commit()
        return {"mensaje": "Usuario registrado exitosamente"}
    except pyodbc.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    finally:
        conn.close()

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash FROM Usuarios WHERE username = ?",
        (form_data.username,)
    )
    row = cur.fetchone()
    conn.close()
    if not row or not verify_password(form_data.password, row[1]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    # token simple (no JWT por ahora)
    token = secrets.token_hex(16)
    return {"access_token": token, "token_type": "bearer", "user_id": row[0]}

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
    conn.commit()
    conn.close()
    return TareaOut(id=new_id, **tarea.dict())

@app.get("/tareas/{usuario_id}", response_model=List[TareaOut])
def listar_tareas(usuario_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, titulo, descripcion, prioridad, fecha_vencimiento FROM Tareas WHERE usuario_id = ?",
        (usuario_id,)
    )
    rows = cur.fetchall()
    conn.close()
    return [TareaOut(id=r[0], titulo=r[1], descripcion=r[2], prioridad=r[3], fecha_vencimiento=str(r[4])) for r in rows]

@app.delete("/tareas/{usuario_id}/{tarea_id}")
def eliminar_tarea(usuario_id: int, tarea_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM Tareas WHERE id = ? AND usuario_id = ?",
        (tarea_id, usuario_id)
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea eliminada"}

# --- HTML principal ---
@app.get("/")
def index():
    return FileResponse(os.path.join(".", "index.html"))
