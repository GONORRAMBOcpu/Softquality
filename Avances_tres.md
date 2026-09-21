# 🚀 Reporte Extenso de Avances: Proyecto SoftQuality

**Fecha de actualización:** 21 de septiembre de 2026
**Institución:** Corporación Universitaria Comfacauca (Unicomfacauca) - Popayán, Cauca
**Desarrolladores:** Juan Camilo Solarte Trochez, Juan Sebastian Rojas Bravo, Julian Zarama
**Director/Evaluador:** Ing. Gabriel Ángel Osorio Hoyos

---

## 1. Definición y Objetivo del Proyecto
**SoftQuality** es una plataforma web inteligente y académica diseñada para evaluar, diagnosticar y monitorear la calidad de proyectos de software. Su funcionamiento se basa en la integración de dos grandes estándares internacionales:
*   **ISO/IEC 25010 (2023):** Para evaluar la calidad del producto software (el código).
*   **CMMI:** Para evaluar la madurez de los procesos de desarrollo del equipo.

**⚠️ Regla de Oro del Proyecto (Anti-Alucinaciones IA):**
La Inteligencia Artificial (Gemini) tiene el rol *exclusivo* de interpretar resultados. La IA tiene estrictamente prohibido inventar o calcular métricas. Todo el cálculo matemático lo realiza el motor estático en Python; la IA simplemente lee la base de datos y genera recomendaciones de mejora cualitativas en lenguaje natural.

---

## 2. Stack Tecnológico Unificado
Se logró fusionar con éxito los aportes arquitectónicos de Camilo con el núcleo matemático de Sebastián y las integraciones de IA y Frontend de Julián, consolidando el siguiente stack:
*   **Backend:** Python con FastAPI (Arquitectura escalable: `/api`, `/models`, `/schemas`).
*   **Frontend:** React empaquetado con Vite (Navegación con `react-router-dom`, gráficos con `recharts`).
*   **Base de Datos:** PostgreSQL administrado con SQLAlchemy. Uso intensivo del tipo de dato `JSONB` para almacenar las respuestas semiestructuradas de CMMI y la IA.
*   **Inteligencia Artificial:** SDK `google-genai` conectado al modelo `gemini-3.6-flash`.

---

## 3. Hitos Alcanzados y Módulos Completados

### 3.1. Motor de Análisis Backend (100% Funcional)
Se construyó el motor de análisis estático (`motor_analisis.py`) capaz de ingerir y procesar los proyectos de los usuarios:
*   **Ingesta de Archivos:** Endpoint `POST /api/analisis/ejecutar`. Recibe un archivo `.zip` del estudiante.
*   **Estructura Esperada del `.zip`:** El sistema está optimizado para procesar un paquete que contenga:
    1.  Múltiples archivos fuente `.py` (Lógica del negocio).
    2.  `requirements.txt` (Listado de dependencias).
    3.  `coverage.xml` (Reporte de pruebas unitarias).
*   **Extracción de Métricas:** El sistema extrae temporalmente los archivos, ignora la "basura" (imágenes, PDFs), y mediante librerías como `radon`, calcula métricas como Líneas de Código (LOC) y Complejidad Ciclomática.

### 3.2. Resolución del Puente de Inteligencia Artificial
Se superó un bloqueo crítico en la Etapa 4 relacionado con la API de Google Cloud:
*   Se detectaron errores `429 Quota Exceeded` (por usar modelos Pro sin saldo) y `404 Model Not Found` (por nomenclaturas incorrectas).
*   **Solución:** Se actualizó la librería obsoleta `google-generativeai` a la nueva `google-genai`. Se configuró la API Key por entorno (`.env`) y se apuntó exitosamente al modelo **`gemini-3.6-flash`**, garantizando velocidad, gratuidad y estabilidad.
*   **Resultado:** El endpoint `POST /api/analisis/{id}/generar-recomendaciones` ahora toma las métricas extraídas y recibe exitosamente un objeto JSON con el análisis semántico y sugerencias de mejora.

### 3.3. Desarrollo del Frontend (React + Vite)
Se materializó la interfaz visual (Opción A), construyendo las pantallas principales y conectándolas al Backend:
*   **Configuración y Enrutamiento:** Se configuró Vite y se implementó `react-router-dom` con los archivos clave (`index.html`, `main.jsx`, `App.jsx`) para una navegación SPA (Single Page Application).
*   **Pantalla de Ingesta (`SubirProyecto.jsx`):** Interfaz para subir el `.zip`. Incluye validaciones visuales, bloqueos durante la carga y conexión al endpoint de FastAPI.
*   **Dashboard Interactivo (`Dashboard.jsx`):** Pantalla maestra que consume el endpoint `GET /api/analisis/{id}/resultados`. Implementa `recharts` para graficar la evolución temporal de la calidad. Renderiza tarjetas con el texto generado por Gemini.
*   **Conexión y CORS:** Se solucionaron bloqueos de seguridad cruzada (CORS) permitiendo que el puerto 5173 (React) hable con el puerto 8000 (FastAPI). También se corrigieron errores internos de serialización (Error 500) añadiendo correctamente las importaciones de tablas (`CaracteristicaISO`).

### 3.4. Definición del Modelo de Datos (MER)
Se consolidó un modelo Entidad-Relación relacional, robusto y escalable:
*   **`USUARIO` (1) -> `PROYECTO` (N):** Un usuario gestiona sus propios proyectos.
*   **`PROYECTO` (1) -> `VERSION` (N):** Evolución del software en el tiempo (v1.0, v2.0).
*   **`VERSION` (1) -> `ANALISIS` (1):** Snapshot estático evaluado. Incluye el campo `recomendaciones_ia` (JSONB).
*   **`ANALISIS` (1) -> `EVALUACION_CMMI` (1):** Cuestionario de madurez (respuestas en JSONB).
*   **`ANALISIS` (1) -> `METRICA_RESULTADO` (N):** Resultados matemáticos calculados por el motor.
*   **`CARACTERISTICA_ISO` (1) -> `METRICA_RESULTADO` (N):** Tabla catálogo para agrupar bajo la norma ISO 25010.

---

## 4. Delimitación del Alcance y Normativas (Decisiones Arquitectónicas)

Tras un análisis riguroso de normativas (MODS, CMMI, ISO 9001, IEEE 730, ISO 14598, ISO 25000), se tomaron decisiones cruciales para el MVP (Producto Mínimo Viable) y la sustentación:

1.  **Enfoque ISO/IEC 25010 (Solo 4 características automatizables):**
    Para evitar que la IA "alucine" o invente datos, SoftQuality V1 se limita a las métricas que puede comprobar matemáticamente leyendo código fuente:
    *   ✅ **Mantenibilidad:** Medida vía LOC y Complejidad Ciclomática.
    *   ✅ **Seguridad:** Medida vía análisis estático de vulnerabilidades e inyecciones.
    *   ✅ **Fiabilidad:** Medida mediante la cobertura del `coverage.xml`.
    *   ✅ **Flexibilidad:** Medida mediante el acoplamiento y profundidad de herencia.
    *   ❌ *Se descartan para la V1 (No evaluables sin intervención humana):* Adecuación funcional, Eficiencia de desempeño, Capacidad de interacción, Compatibilidad y Safety.
2.  **Normativas Obsoletas Descartadas:** Se eliminaron las referencias a IEEE 830, ISO 9126, ISO 14598 y SPICE para garantizar vigencia académica (2026).
3.  **Módulo CMMI (En desarrollo):** Se adaptó un cuestionario ágil de 5 preguntas (Sí/No) enfocadas en las áreas REQM (Requisitos), PP (Planificación), PMC (Monitorización), CM (Configuración) y VER (Verificación). El frontend (Modal en React `FormularioCMMI.jsx`) ya está programado.

---

## 5. Próximos Pasos (To-Do)
La tubería central está finalizada. Los próximos objetivos para completar el aplicativo son:
1.  **Completar el Módulo CMMI en Backend:** Desarrollar el endpoint `POST /api/analisis/{id}/cmmi` en FastAPI para recibir el formulario de React, determinar el nivel de madurez (1, 2 o 3) y guardarlo en PostgreSQL.
2.  **Autenticación JWT:** Blindar la aplicación conectando la pantalla de Login y Registro (hechas por Camilo) con endpoints seguros, garantizando que cada usuario vea solo sus proyectos.
3.  **Dockerización:** Crear los archivos `Dockerfile` y `docker-compose.yml` para empaquetar PostgreSQL, FastAPI y React, logrando que el entorno se ejecute con un solo comando en cualquier máquina del equipo.

## 6. Guía de Ejecución (Pasos Exactos para Levantar el Proyecto)

Para que el sistema completo (Frontend y Backend) funcione de manera interconectada y no se produzcan errores de conexión rechazada (CORS o Network Errors), se deben ejecutar ambos entornos en terminales separadas de la siguiente manera:

### Paso 1: Levantar el Servidor Backend (Python/FastAPI)
1. Abre una terminal y navega hasta la raíz de la carpeta del backend utilizando el comando `cd backend`[cite: 1].
2. Activa el entorno virtual de Python ejecutando `source venv/bin/activate`[cite: 1].
3. Asegúrate de tener configurada la variable de entorno obligatoria `GEMINI_API_KEY` en tu archivo `.env`[cite: 3].
4. Ejecuta el servidor de FastAPI apuntando hacia la carpeta de la aplicación con el comando exacto: `uvicorn app.main:app --reload`[cite: 1].
5. Verifica en la consola que Uvicorn arroje el mensaje indicando que está corriendo en `http://127.0.0.1:8000`[cite: 1].
6. (Opcional) Puedes comprobar que los endpoints están activos visitando la documentación automática en `http://127.0.0.1:8000/docs`[cite: 1].

### Paso 2: Levantar la Interfaz Frontend (React/Vite)
1. Abre una **nueva** pestaña o ventana de terminal y navega hasta la carpeta del frontend utilizando `cd frontend-src`[cite: 1].
2. Si es la primera vez que se descarga el proyecto, o si faltan dependencias, instala los paquetes necesarios ejecutando: `npm install vite @vitejs/plugin-react react-router-dom recharts axios lucide-react --save-dev`[cite: 1].
3. Verifica que en el archivo `package.json` se encuentre configurado el script de arranque `"dev": "vite"`[cite: 1].
4. Arranca el entorno de desarrollo ejecutando el comando: `npm run dev`[cite: 1].
5. Abre tu navegador web y accede a la interfaz gráfica mediante la dirección `http://localhost:5173/`[cite: 1].

> **Nota importante sobre CORS:** El backend ya cuenta con el middleware configurado (`CORSMiddleware`) para permitir orígenes cruzados desde el puerto `5173`, lo que autoriza al navegador a transferir el archivo `.zip` al puerto `8000` de forma segura[cite: 1].
