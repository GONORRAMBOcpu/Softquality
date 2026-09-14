# SOFTQUALITY — REGISTRO DE AVANCES

> Este documento **complementa** a `SoftQuality_Prompt_Maestro.md` (no lo reemplaza). Léanlo los dos juntos antes de seguir trabajando: el maestro define las reglas fijas del proyecto; este archivo dice **qué ya existe, cómo correrlo, y qué falta**. Actualícenlo cada vez que se agregue un caso de uso.

**Última actualización:** 7 de septiembre de 2026

---

## 1. Estado general

De los 8 casos de uso del diagrama (sección 3 del prompt maestro), se está trabajando en 3 casos priorizados **antes** de Verificar proyecto y Generar reporte, porque son prerrequisito funcional de esos dos:

| Caso de uso | Estado | Backend | Frontend |
|---|---|---|---|
| Registrarse | ✅ Implementado | `POST /auth/registrarse` | `Registrarse.jsx` |
| Iniciar sesión | ⏳ Pendiente | — | — |
| Subir Proyecto | ⏳ Pendiente | — | — |
| Dashboard | 🎨 Solo mockup visual | No conectado | `Dashboard.jsx` (datos de ejemplo) |
| Mirar proyectos y eliminar | ⏳ No iniciado | — | — |
| Solicitar Revisión | ⏳ No iniciado | — | — |
| Verificar proyecto (IA) | ⏸️ Fuera de alcance actual | — | — |
| Generar reporte | ⏸️ Fuera de alcance actual | — | — |

**Importante sobre el Dashboard:** el archivo `Dashboard.jsx` es un mockup visual con datos escritos a mano dentro del componente (radar ISO 25010, puntaje, recomendaciones IA). **No consulta al backend todavía.** Sirve para validar el diseño, no la lógica. Cuando se implemente el caso "Dashboard" de verdad, ese archivo debe reemplazar sus arreglos fijos (`isoData`, `versions`, `recommendations`) por llamadas a `services/api.js`.

---

## 2. Qué existe hoy en el repositorio

```
softquality/
├── backend/                          ← FastAPI (Python)
│   ├── app/
│   │   ├── database.py               ← conexión a PostgreSQL, lee .env
│   │   ├── models/
│   │   │   └── usuario.py            ← tabla `usuarios`
│   │   ├── schemas/
│   │   │   └── usuario.py            ← DTOs: UsuarioRegistroRequest / UsuarioOut
│   │   ├── core/
│   │   │   └── security.py           ← hash de contraseña (bcrypt)
│   │   ├── api/routes/
│   │   │   └── auth.py               ← POST /auth/registrarse
│   │   └── main.py                   ← entrypoint FastAPI
│   ├── requirements.txt
│   └── .env                          ← NO se sube a Git (contiene credenciales)
│
└── frontend/                         ← React + Vite
    └── src/
        ├── pages/
        │   ├── Registrarse.jsx       ← formulario conectado al backend
        │   └── Dashboard.jsx         ← mockup visual, datos de ejemplo
        └── services/
            └── api.js                ← cliente fetch hacia el backend
```

Ambos proyectos corren **por separado y al mismo tiempo**, en dos terminales distintas, mientras se desarrolla.

---

## 3. Cómo levantar el proyecto completo (para cualquiera que haga `pull`)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# crear archivo .env con: DATABASE_URL=postgresql+psycopg2://usuario:password@localhost:5432/softquality_db
uvicorn app.main:app --reload
```
Queda escuchando en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Queda escuchando en `http://localhost:5173`.

**Requisito previo:** tener PostgreSQL instalado y una base de datos creada (`softquality_db`). Ver guía paso a paso compartida por el equipo.

---

## 4. Decisiones tomadas que no estaban explícitas en el prompt maestro

Estas decisiones son consistentes con las reglas del prompt maestro, pero como no estaban detalladas ahí, se documentan aquí para que el equipo las conozca y las discuta si alguien no está de acuerdo:

- **Roles de usuario** (`RolUsuario`): se definieron como `usuario` y `administrador`, en un `Enum`, coincidiendo con los actores de la sección 3.
- **Identificador de usuario:** se usa UUID en vez de un entero autoincremental, por buenas prácticas al exponer IDs en una API pública.
- **Contraseñas:** se hashean con `bcrypt` vía `passlib`; nunca se guarda ni se devuelve la contraseña en texto plano (el DTO `UsuarioOut` no incluye `password_hash`).
- **CORS:** el backend solo acepta peticiones desde `http://localhost:5173` (el frontend en desarrollo). Si despliegan a producción, hay que actualizar esa lista en `main.py`.
- **Identidad visual del frontend:** paleta "hoja técnica de especificaciones" — fondo claro, tipografía IBM Plex Sans/Mono, acento azul cobalto (`#1E4B8C`). Se eligió para diferenciarse del look genérico de dashboard SaaS y porque conecta con el carácter técnico/normativo del proyecto (ISO/CMMI). Cualquier pantalla nueva debería mantener esta misma paleta para que se vea como un solo producto.

---

## 5. Próximos pasos sugeridos (en orden)

1. **Iniciar sesión:** login con email/password, emisión de JWT, reutilizando `core/security.py`. Habilita proteger rutas futuras.
2. **Subir Proyecto:** CRUD básico de la entidad `Proyecto` (regla 1 de la sección 7 del maestro: es el punto de entrada, no el core de análisis). Requiere que el usuario esté autenticado (depende del punto 1).
3. Conectar el `Dashboard.jsx` a datos reales una vez exista al menos un proyecto con métricas.
4. Recién después de esto, entrar a Verificar proyecto y Generar reporte, que dependen de tener proyectos reales en la base de datos.

---

## 6. Reglas heredadas del prompt maestro que siguen aplicando

- No inventar alcance sin confirmar con el equipo (regla 1, sección 7).
- Separar CRUD / análisis / IA / CMMI / dashboard como módulos independientes (regla 2).
- Nomenclatura: entidades de negocio en español, convenciones técnicas en inglés (regla 4).
- Cada commit debe indicar a qué caso de uso corresponde (regla 6).
- Nunca prometer certificación oficial ISO/IEC 25010 o CMMI en ningún texto visible (regla 7) — el frontend ya incluye este aviso en la barra lateral.
