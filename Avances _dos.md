Markdown # SOFTQUALITY — REGISTRO DE AVANCES (Fase Analítica e IA)

> Este documento **complementa** a `SoftQuality_Prompt_Maestro.md` (no lo reemplaza). Léanlo los dos juntos antes de seguir trabajando: el maestro define las reglas fijas del proyecto; este archivo dice **qué ya existe, cómo correrlo, y qué falta**. Actualícenlo cada vez que se agregue un caso de uso.

**Última actualización:** 13 de septiembre de 2026

---

## ## 1. Estado general

En las últimas sesiones, logramos un hito importantísimo: fusionar la base arquitectónica de Camilo con el motor de análisis de Sebastián y Julián. El corazón de evaluación del backend ya está operativo, persistiendo datos relacionalmente y consultando al modelo semántico de Google.

| Caso de uso | Estado | Backend | Frontend | |---|---|---|---| | Registrarse | ✅ Implementado | `POST /auth/registrarse` | `Registrarse.jsx` | | Iniciar sesión | ⏳ Pendiente | — | — | | Subir Proyecto (Ingesta y Análisis) | ✅ Backend Listo | `POST /api/analisis/ejecutar` | ⏳ Pendiente | | Verificar proyecto (IA Gemini) | ✅ Backend Listo | `POST /api/analisis/{id}/generar-recomendaciones` | ⏳ Pendiente | | Persistencia (PostgreSQL) | ✅ Implementado | Modelos creados (`calidad.py`) | N/A | | Dashboard | 🎨 Mockup visual | Falta conectar | `Dashboard.jsx` (datos de ejemplo) | | Mirar proyectos y eliminar | ⏳ No iniciado | — | — | | Solicitar Revisión (CMMI) | ⏳ No iniciado | — | — |

---

## 2. Qué existe hoy en el repositorio (Arquitectura Unificada)

La estructura unificada consolida el motor Python de Sebastián dentro de los directorios de FastAPI diseñados por Camilo[cite: 1, 2]:

```text softquality-completo/ ├── backend/ │ ├── app/ │ │ ├── api/routes/ │ │ │ ├── auth.py ← Endpoints de registro │ │ │ └── analisis.py ← Endpoints de subida ZIP y generación IA │ │ ├── core/ │ │ │ └── security.py ← Hash de contraseñas

│ │ ├── models/ │ │ │ ├── usuario.py ← Tabla de usuarios │ │ │ └── calidad.py ← Tablas: Analisis, CaracteristicaISO, MetricaResultado │ │ ├── schemas/ │ │ │ ├── usuario.py │ │ │ └── metrica.py ← DTO para Pydantic (MetricaCalculada) │ │ ├── services/ │ │ │ ├── motor_analisis.py ← Lógica estática con 'radon' (LOC, Complejidad) │ │ │ └── motor_ia.py ← Puente semántico con SDK google-genai │ │ ├── database.py ← Conexión PostgreSQL │ │ └── main.py │ ├── requirements.txt ← Actualizado con dependencias (radon, google-genai) │ └── .env ← ¡CRÍTICO! Requiere GEMINI_API_KEY y DATABASE_URL │ └── frontend/ ← React + Vite (A la espera de integración)