# QUÉ ES CADA COSA Y DÓNDE VA

Este zip trae TODO lo hecho hasta ahora. Así se distribuye en tu proyecto:

## 1. Carpeta `backend/`
Cópiala completa a la raíz de tu repositorio (junto a `frontend`, `public`, etc.),
como una carpeta nueva llamada `backend`.
Contiene el servidor FastAPI del caso de uso "Registrarse".
Instrucciones para levantarlo: ver `SoftQuality_Avances.md`, sección 3.

## 2. Carpeta `frontend-src/`
Esto NO se copia tal cual — su contenido va DENTRO de tu proyecto de React existente:

- `frontend-src/pages/Registrarse.jsx`  →  va a  `frontend/src/pages/Registrarse.jsx`
- `frontend-src/pages/Dashboard.jsx`    →  va a  `frontend/src/pages/Dashboard.jsx`
- `frontend-src/services/api.js`        →  va a  `frontend/src/services/api.js`

(Si tu carpeta del proyecto React no se llama `frontend`, usa el nombre que
tengas — lo importante es que quede dentro de `src/pages/` y `src/services/`.)

## 3. `SoftQuality_Avances.md`
Va suelto en la raíz del repositorio, junto al prompt maestro original.
Documenta qué está hecho, qué falta, y cómo correr todo.

## Recordatorio
NO subas las carpetas `node_modules/` ni `venv/` a GitHub — cada quien las genera
localmente con `npm install` y `pip install -r requirements.txt`. Revisa que tu
`.gitignore` las tenga (una regla por línea, sin comas):

```
node_modules/
venv/
__pycache__/
.env
```
