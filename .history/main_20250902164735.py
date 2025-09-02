from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import pyodbc
import os

app = FastAPI(title="Gestor de Tareas")


app.mount("/static", StaticFiles(directory="."), name="static")

CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=GestorTareas;"
    "Trusted_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(CONNECTION_STRING)

class Tarea(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: str
    fecha_vencimiento: str

class TareaOut(Tarea):
    id: int

# --- Endpoints de la API ---
@app.post("/tareas", response_model=TareaOut)
def crear_tarea(tarea: Tarea):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO Tareas (titulo, descripcion, prioridad, fecha_vencimiento) OUTPUT INSERTED.id VALUES (?, ?, ?, ?)",
        (tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_vencimiento)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return TareaOut(id=new_id, **tarea.dict())

@app.get("/tareas", response_model=List[TareaOut])
def listar_tareas():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, titulo, descripcion, prioridad, fecha_vencimiento FROM Tareas")
    rows = cur.fetchall()
    conn.close()
    return [TareaOut(id=r[0], titulo=r[1], descripcion=r[2], prioridad=r[3], fecha_vencimiento=str(r[4])) for r in rows]

@app.get("/tareas/buscar", response_model=List[TareaOut])
def buscar_tareas(titulo: Optional[str] = None, fecha: Optional[str] = None):
    conn = get_connection()
    cur = conn.cursor()
    query = "SELECT id, titulo, descripcion, prioridad, fecha_vencimiento FROM Tareas WHERE 1=1"
    params = []
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
def eliminar_tarea(tarea_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM Tareas WHERE id = ?", (tarea_id,))
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea eliminada"}

@app.get("/")
def index():
    return FileResponse(os.path.join(".", "index.html"))
