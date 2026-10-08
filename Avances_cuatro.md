# 🚀 Bitácora Técnica y Documentación de Arquitectura: SoftQuality

**Institución:** Corporación Universitaria Comfacauca (Unicomfacauca) — Popayán, 2026  
**Proyecto:** Plataforma Web para la Evaluación de Calidad de Producto (ISO/IEC 25010) y Madurez de Procesos (CMMI)  
**Equipo de Desarrollo:** Julián, Juan Camilo y Juan Sebastián  
**Docente / Asesor:** Ing. Gabriel  
**Estado del Sistema:** 100% Operativo de Extremo a Extremo (Contenerizado con Docker)

---

## 1. Resumen Ejecutivo y Regla de Oro Arquitectónica

**SoftQuality** es una plataforma web académica diseñada para evaluar objetivamente la calidad técnica del código fuente de proyectos en Python bajo la norma **ISO/IEC 25010** y diagnosticar el nivel de madurez de los procesos de ingeniería del equipo mediante el modelo **CMMI**.

### Regla de Oro (Arquitectura Anti-Alucinaciones)
La Inteligencia Artificial (**Google Gemini**, integrada mediante el SDK oficial `google-genai`) **tiene estrictamente prohibido calcular o inventar métricas numéricas**.  
1. El **Motor de Análisis Estático en Python** (`motor_analisis.py`) inspecciona el código fuente (`.py`), las dependencias (`requirements.txt`) y los reportes de cobertura (`coverage.xml`), calculando de forma **100% determinística y matemática** un puntaje normalizado en escala de **0 a 100** para las 4 características automatizables del MVP.
2. Esos valores y su evidencia técnica se persisten en **PostgreSQL**.
3. El **Motor de IA** (`motor_ia.py`) lee exclusivamente los datos ya guardados en PostgreSQL junto con las respuestas del cuestionario **CMMI** para redactar recomendaciones de mejora continua separadas en dos bloques: **Calidad del Producto (ISO/IEC 25010)** y **Mejora de Procesos (CMMI)**.

---

## 2. Stack Tecnológico Unificado

| Capa | Tecnología / Librería | Rol en SoftQuality |
| :--- | :--- | :--- |
| **Frontend** | React + Vite, `react-router-dom`, `axios`, `recharts` | Interfaz SPA en el puerto `5173`, navegación por rutas, gráficas de evolución multi-versión (0 a 100) y cuadrícula 2×2 de resultados ISO/IEC 25010. |
| **Backend** | Python 3.12 + FastAPI + Uvicorn | API REST en el puerto `8000`, ingesta de archivos `.zip`, cálculo automático de versiones, orquestación del análisis estático y conexión con Gemini. |
| **Motor Estático** | `radon`, `ast` (Abstract Syntax Tree), `re`, `xml.etree.ElementTree` | Cálculo determinístico y normalización matemática (0 a 100) de Mantenibilidad, Seguridad, Flexibilidad y Fiabilidad. |
| **Motor de IA** | `google-genai` (`gemini-3.6-flash` / `gemini-3.8-flash`) + Respaldo Local | Auditoría cualitativa estructurada en JSON (`analisis_iso`, `analisis_cmmi`, `mensaje_general`) con tolerancia a fallos `503 UNAVAILABLE`. |
| **Base de Datos** | PostgreSQL 15 + SQLAlchemy (`JSONB`) | Persistencia relacional e híbrida (`PROYECTO` → `VERSION` → `ANALISIS` → `METRICA_RESULTADO` / `CARACTERISTICA_ISO` y `EVALUACION_CMMI`). |
| **Infraestructura** | Docker + Docker Compose | Orquestación de 3 contenedores (`db`, `backend`, `frontend`) con volumen persistente `postgres_data` y recarga en vivo (`--reload`). |

---

## 3. Modelo de Datos e Integridad Relacional (PostgreSQL)

El esquema definido en `backend/app/models/calidad.py` implementa la jerarquía completa del Modelo Entidad-Relación:

1. **`PROYECTO` (`proyecto`):** Almacena cada proyecto creado por los estudiantes (ej. `"PopaBus"`, `"metriquero"`, `"Pruebas Iniciales"`), con su nombre único, descripción, estado y fecha de creación.
2. **`VERSION` (`version`):** Relación `1:N` con `PROYECTO`. Cada vez que el estudiante sube un archivo `.zip` a un proyecto, el sistema calcula y asigna automáticamente el número consecutivo (`Versión 1`, `Versión 2`... `Versión N`).
3. **`ANALISIS` (`analisis`):** Vinculado a `id_version`. Registra la fecha de ejecución, el estado (`Completado` / `Interpretado por IA`) y la columna `recomendaciones_ia` en formato nativo **`JSONB`**.
4. **`CARACTERISTICA_ISO` (`caracteristica_iso`):** Catálogo oficial autogestionado con las 4 características del MVP:
   * `1`: **Mantenibilidad**
   * `2`: **Seguridad**
   * `3`: **Flexibilidad**
   * `4`: **Fiabilidad**
5. **`METRICA_RESULTADO` (`metrica_resultado`):** Almacena los 4 puntajes normalizados (`valor_cuantitativo` de `0.0` a `100.0`) y la evidencia técnica detallada (`valor_cualitativo` hasta 500 caracteres) por cada análisis.
6. **`EVALUACION_CMMI` (`evaluacion_cmmi`):** Almacena las respuestas del checklist de procesos en formato **`JSONB`** (`respuestas_checklist`) y el nivel alcanzado (`nivel_madurez_referencial`).

> **Auto-Migración Transparente (`asegurar_esquema_y_migracion`):** Al iniciar o recibir peticiones, el backend verifica automáticamente la existencia de las tablas y columnas, puebla el catálogo `CARACTERISTICA_ISO` y agrupa cualquier análisis antiguo sin versión dentro del proyecto por defecto **"Pruebas Iniciales"**.

---

## 4. Motor Matemático de Análisis Estático y Normalización (0 a 100)

El archivo `backend/app/services/motor_analisis.py` descomprime el `.zip` en un directorio temporal seguro, omite carpetas basura (`__pycache__`, `.venv`, `venv`, `.git`, `node_modules`) e inspecciona tres tipos de artefactos (`.py`, `requirements.txt` y `coverage.xml`) sin fallar si el estudiante olvida incluir los dos últimos:

### 4.1. Mantenibilidad (Escala 0 a 100)
* **Fuente:** Archivos `.py` procesados con `radon` (`analyze`, `cc_visit`, `mi_visit`).
* **Cálculo:** Combina el **Índice de Mantenibilidad (MI)** promedio ($60\%$) y el puntaje de **Complejidad Ciclomática (CC)** promedio ($40\%$, donde $\text{CC} \le 2$ otorga $100$ puntos y valores superiores descuentan $7.5$ puntos por unidad):
  $$\text{Puntaje CC} = \max(0,\; 100 - \max(0, \text{CC}_{\text{prom}} - 2.0) \times 7.5)$$
  $$\text{Mantenibilidad} = (\text{MI}_{\text{prom}} \times 0.60) + (\text{Puntaje CC} \times 0.40)$$
* **Evidencia generada:** Total de Líneas de Código (LOC), número de archivos `.py` válidos, Complejidad Ciclomática promedio e Índice MI.

### 4.2. Seguridad (Escala 0 a 100)
* **Fuente:** Árbol de Sintaxis Abstracta (`ast`) + expresiones regulares sobre los archivos `.py` y auditoría de `requirements.txt`.
* **Cálculo:** Parte de una base de $100$ puntos y descuenta penalizaciones por vulnerabilidades estáticas detectadas (SAST):
  * Uso de funciones peligrosas (`eval`, `exec`, `compile`): $-15\text{ pts c/u}$.
  * Ejecución de comandos del sistema (`os.system` o `subprocess` con `shell=True`): $-15\text{ pts c/u}$.
  * Consultas SQL concatenadas en `f-strings` (riesgo de Inyección SQL): $-12\text{ pts c/u}$.
  * Contraseñas, tokens o llaves quemadas en asignaciones de texto plano: $-10\text{ pts c/u}$.
  * Bloques `except:` genéricos que silencian errores: $-3\text{ pts c/u}$.
  * Ausencia de `requirements.txt` ($-10\text{ pts}$) o librerías sin versión fijada con `==`, `>=`, `~=` ($-3\text{ pts c/u}$, tope $-15\text{ pts}$).

### 4.3. Flexibilidad (Escala 0 a 100)
* **Fuente:** Análisis estructural del Árbol de Sintaxis Abstracta (`ast`) en los archivos `.py`.
* **Cálculo:** Parte de $100$ puntos y evalúa la modularidad y el desacoplamiento:
  * **Acoplamiento por importaciones:** Promedio de sentencias `import` / `from ... import` por archivo (óptimo $\le 6$; cada import adicional descuenta $4.5\text{ pts}$).
  * **Profundidad de herencia:** Número máximo de clases base en definiciones `class` (óptimo $\le 2$; cada nivel adicional descuenta $8\text{ pts}$).
  * **Complejidad de interfaces:** Funciones o métodos con más de 5 parámetros ($-5\text{ pts c/u}$, tope $-25\text{ pts}$).

### 4.4. Fiabilidad (Escala 0 a 100)
* **Fuente:** Reporte de pruebas unitarias `coverage.xml` (`line-rate`) y conteo AST de bloques `try/except`, funciones `test_*` y sentencias `assert`.
* **Cálculo Dual (Con y Sin `coverage.xml`):**
  * **Con `coverage.xml` incluido en el `.zip`:** Pondera el porcentaje real de cobertura de líneas ($70\%$) más el índice de programación defensiva con bloques `try/except` ($30\%$):
    $$\text{Fiabilidad} = (\text{Cobertura XML} \times 0.70) + (\text{Puntaje Defensivo} \times 0.30)$$
  * **Sin `coverage.xml` (Modo Respaldo AST):** Parte de una base de $45$ puntos, suma hasta $25$ puntos según la proporción de bloques `try/except` por función y hasta $25$ puntos por funciones `test_*` o `assert` encontradas en el código (con un tope máximo de $85/100$ para incentivar la entrega del `coverage.xml`).

---

## 5. Módulo CMMI y Motor Cualitativo de IA (`motor_ia.py`)

### 5.1. Evaluación de Madurez de Procesos (CMMI)
Desde el Dashboard, el botón **`📝 Responder Checklist CMMI`** abre el componente modal `FormularioCMMI.jsx`, el cual evalúa 5 Áreas de Proceso fundamentales:
1. **`reqm` — Gestión de Requisitos (REQM):** Documentación y aprobación de requisitos/historias de usuario.
2. **`pp` — Planificación del Proyecto (PP):** Estimación de esfuerzo, asignación de roles y cronograma.
3. **`pmc` — Monitorización y Control del Proyecto (PMC):** Seguimiento periódico de avances y riesgos.
4. **`cm` — Gestión de la Configuración (CM):** Uso estructurado de Git, ramas y Pull Requests.
5. **`ver` — Verificación y Validación (VER/VAL):** Revisiones de código entre pares y pruebas antes de integrar.

El endpoint `POST /api/analisis/{id_analisis}/cmmi` contabiliza las respuestas afirmativas y asigna determinísticamente el nivel referencial:
* **0 a 1 respuestas Sí:** `Nivel 1 - Inicial (Proceso impredecible y reactivo)`
* **2 a 3 respuestas Sí:** `Nivel 2 - Gestionado (Proyecto planificado y controlado)`
* **4 a 5 respuestas Sí:** `Nivel 3 - Definido (Proceso estandarizado y proactivo)`

### 5.2. Alta Disponibilidad del Servicio de IA
El servicio `MotorIAService` implementa una cola de reintentos progresivos (`gemini-3.6-flash` con espera de 2s y 4s, seguido de `gemini-3.8-flash`). Si los servidores de Google presentan saturación (`503 UNAVAILABLE`), se activa automáticamente `_interpretar_localmente_por_respaldo`, generando el dictamen técnico para las 4 características ISO/IEC 25010 y las áreas CMMI pendientes sin interrumpir la experiencia del usuario.

---

## 6. Módulos del Frontend (React + Vite)

1. **`App.jsx` (Barra de Navegación y Enrutador):**
   * `/` → **Autenticación** (`Registrarse.jsx`, módulo a cargo de los compañeros de equipo, mantenido intacto).
   * `/subir` → **Subir Proyecto** (`SubirProyecto.jsx`).
   * `/proyectos` → **Mirar Proyectos** (`HistorialProyectos.jsx`).
   * `/dashboard` y `/dashboard/:id` → **Dashboard de Calidad** (`Dashboard.jsx`).
2. **`SubirProyecto.jsx`:** Permite crear un proyecto nuevo (ej. `"PopaBus"` o `"metriquero"`), seleccionar uno existente, renombrarlo en línea y subir archivos `.zip` indicando automáticamente qué número de versión se creará (`Versión 1`, `Versión 2`, etc.).
3. **`HistorialProyectos.jsx` (Navegación en 2 Niveles):**
   * **Nivel 1 (Vista por Proyectos):** Tarjetas con el total de versiones por proyecto, edición de nombre y eliminación completa en cascada.
   * **Nivel 2 (Versiones del Proyecto):** Despliega todas las versiones de un proyecto con su fecha, puntajes `/100` de las 4 características ISO/IEC 25010 y nivel CMMI, permitiendo abrir cualquier versión en el Dashboard o eliminarla individualmente.
4. **`Dashboard.jsx`:**
   * Muestra en el encabezado la insignia dinámica **`Viendo: Versión X de NombreProyecto`**.
   * Renderiza a la izquierda la gráfica **`Recharts`** con las 4 líneas de evolución histórica (`Mantenibilidad`, `Seguridad`, `Flexibilidad`, `Fiabilidad`) en escala de `0` a `100`.
   * Renderiza a la derecha el bloque **`📦 Calidad del Producto (Código) — ISO/IEC 25010`** organizado en una **cuadrícula 2×2** con barras de progreso por característica y recuadro de recomendación técnica, separado visualmente del bloque **`⚙️ Mejora de Procesos (Equipo) — Modelo CMMI`**.

---

## 7. Guía Exacta de Ejecución (Docker y Modo Local)

### Opción A: Ejecución Recomendada con Docker (1 Solo Comando)

El proyecto cuenta con contenerización completa (`docker-compose.yml`, `backend/Dockerfile` y `frontend-src/Dockerfile`).

1. **Ubicarse en la carpeta raíz del proyecto:**
   ```bash
   cd ~/Documentos/SoftQuality/Softquality
   ```
2. **Detener el servicio local de PostgreSQL (para liberar el puerto `5432`):**
   ```bash
   sudo systemctl stop postgresql
   ```
3. **Construir y levantar los 3 contenedores (`db`, `backend` y `frontend`):**
   ```bash
   sudo docker compose up --build
   ```
   *(En ejecuciones posteriores basta con correr `sudo docker compose up` sin `--build`)*.
4. **Acceder a la plataforma en el navegador:**
   * **Aplicación Web (Frontend React):** `http://localhost:5173`
   * **Documentación Swagger (Backend FastAPI):** `http://localhost:8000/docs`
5. **Detener los contenedores al finalizar:**
   Presionar `Ctrl + C` en la terminal o ejecutar:
   ```bash
   sudo docker compose down
   ```

---

### Opción B: Ejecución Manual en Entorno Local (Sin Docker)

Si se desea ejecutar directamente sobre el sistema operativo Linux sin contenedores:

1. **Encender PostgreSQL local:**
   ```bash
   sudo systemctl start postgresql
   ```
2. **Terminal 1 — Iniciar el Backend (FastAPI):**
   ```bash
   cd ~/Documentos/SoftQuality/Softquality/backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```
3. **Terminal 2 — Iniciar el Frontend (React + Vite):**
   ```bash
   cd ~/Documentos/SoftQuality/Softquality/frontend-src
   npm run dev
   ```