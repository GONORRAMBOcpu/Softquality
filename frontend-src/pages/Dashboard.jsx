import React, { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Sparkles,
  Settings,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ShieldCheck,
} from "lucide-react";

const INK = "#1B2430";
const INK_SOFT = "#5B6472";
const PAPER = "#FBFAF7";
const LINE = "#DCD9D0";
const BLUE = "#1E4B8C";
const AMBER = "#B9791F";
const GREEN = "#3A7D5C";
const RED = "#AA3B33";

const isoData = [
  { characteristic: "Funcionalidad", short: "FUN", value: 82 },
  { characteristic: "Fiabilidad", short: "FIA", value: 61 },
  { characteristic: "Usabilidad", short: "USA", value: 74 },
  { characteristic: "Eficiencia", short: "EFI", value: 55 },
  { characteristic: "Mantenibilidad", short: "MAN", value: 68 },
  { characteristic: "Portabilidad", short: "POR", value: 71 },
  { characteristic: "Seguridad", short: "SEG", value: 48 },
  { characteristic: "Compatibilidad", short: "COM", value: 77 },
];

const versions = [
  { id: "v2.1", date: "12 mar 2026", score: 58 },
  { id: "v2.2", date: "02 may 2026", score: 63 },
  { id: "v2.3", date: "20 ago 2026", score: 67, current: true },
];

const recommendations = [
  {
    characteristic: "Seguridad",
    tag: "SEG",
    tone: RED,
    text: "El análisis estático reporta 6 endpoints sin validación de entrada. Priorizar antes de la siguiente versión: es la característica con menor puntaje.",
  },
  {
    characteristic: "Eficiencia de desempeño",
    tag: "EFI",
    tone: AMBER,
    text: "El tiempo de respuesta promedio subió 180ms respecto a v2.2. Revisar las consultas N+1 detectadas en el módulo de reportes.",
  },
  {
    characteristic: "Fiabilidad",
    tag: "FIA",
    tone: AMBER,
    text: "La cobertura de pruebas de los casos de error es baja (34%). Esto explica la caída frente a la meta interna del equipo.",
  },
];

const cmmiAreas = [
  { name: "Gestión de requisitos", answered: 8, total: 8 },
  { name: "Planificación de proyecto", answered: 6, total: 8 },
  { name: "Aseguramiento de calidad", answered: 3, total: 8 },
  { name: "Gestión de configuración", answered: 0, total: 6 },
];

const navItems = [
  { label: "Proyectos", icon: FolderKanban },
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Checklist CMMI", icon: ClipboardList },
  { label: "Recomendaciones IA", icon: Sparkles },
  { label: "Configuración", icon: Settings },
];

function Trend({ current, previous }) {
  const diff = current - previous;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const color = diff > 0 ? GREEN : diff < 0 ? RED : INK_SOFT;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
      <Icon size={14} strokeWidth={2.5} />
      {diff === 0 ? "0" : (diff > 0 ? "+" : "") + diff}
    </span>
  );
}

export default function SoftQualityDashboard() {
  const [activeVersion, setActiveVersion] = useState("v2.3");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui", background: PAPER, color: INK, minHeight: 640, display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .sq-scoresheet { background-image: linear-gradient(${LINE}1a 1px, transparent 1px), linear-gradient(90deg, ${LINE}1a 1px, transparent 1px); background-size: 28px 28px; }
        .sq-navitem { transition: background 0.15s ease, color 0.15s ease; }
        .sq-navitem:hover { background: #F0EEE7; }
        .sq-card { border: 1px solid ${LINE}; background: #fff; }
        .sq-btn { transition: opacity 0.15s ease; }
        .sq-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 220, borderRight: `1px solid ${LINE}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 28, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
          <div style={{ width: 26, height: 26, border: `2px solid ${INK}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={15} color={INK} strokeWidth={2.2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>SoftQuality</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className="sq-navitem"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 6,
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? INK : INK_SOFT,
                background: active ? "#F0EEE7" : "transparent",
                cursor: "pointer",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "12px 10px", border: `1px dashed ${LINE}`, borderRadius: 6, fontSize: 11.5, color: INK_SOFT, lineHeight: 1.5 }}>
          Herramienta académica de diagnóstico. No certifica cumplimiento ISO/IEC 25010 ni nivel CMMI oficial.
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>PROYECTO / 03</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Sistema de Gestión de Inventarios</h1>
          </div>
          <div
            className="sq-btn"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
              border: `1px solid ${INK}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {activeVersion} — actual
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Top row: radar + score summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="sq-card sq-scoresheet" style={{ borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <h2 style={{ fontSize: 13.5, fontWeight: 600, margin: 0, textTransform: "none" }}>Características ISO/IEC 25010</h2>
              <span style={{ fontSize: 11.5, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>{activeVersion}</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={isoData} outerRadius="75%">
                <PolarGrid stroke={LINE} />
                <PolarAngleAxis
                  dataKey="short"
                  tick={{ fill: INK_SOFT, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                />
                <Radar dataKey="value" stroke={BLUE} fill={BLUE} fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 4, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
              {isoData.map((d) => (
                <span key={d.short} style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>
                  {d.short} <b style={{ color: INK }}>{d.value}</b>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="sq-card" style={{ borderRadius: 8, padding: 20, flex: 1 }}>
              <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 2 }}>Puntaje global de calidad</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                <span style={{ fontSize: 42, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>67</span>
                <span style={{ fontSize: 15, color: INK_SOFT, marginBottom: 4 }}>/ 100</span>
                <span style={{ marginBottom: 6 }}><Trend current={67} previous={63} /></span>
              </div>
              <div style={{ height: 6, background: "#EFEDE6", borderRadius: 3, marginTop: 14, overflow: "hidden" }}>
                <div style={{ width: "67%", height: "100%", background: BLUE }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: INK_SOFT, lineHeight: 1.5 }}>
                Punto más débil: <b style={{ color: RED }}>Seguridad (48)</b> · Punto más fuerte: <b style={{ color: GREEN }}>Funcionalidad (82)</b>
              </div>
            </div>

            <div className="sq-card" style={{ borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 10 }}>Evolución entre versiones</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
                {versions.map((v) => (
                  <div key={v.id} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: v.score * 0.55,
                      background: v.current ? BLUE : "#D8DEE8",
                      borderRadius: "3px 3px 0 0",
                      marginBottom: 6,
                    }} />
                    <div style={{ fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace", color: INK_SOFT }}>{v.id}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: recommendations + cmmi */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <div className="sq-card" style={{ borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Sparkles size={15} color={BLUE} />
              <h2 style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>Recomendaciones del motor de IA</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.map((r) => (
                <div key={r.tag} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: `1px solid ${LINE}` }}>
                  <span style={{
                    flexShrink: 0, fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                    color: "#fff", background: r.tone, padding: "3px 7px", borderRadius: 4, height: "fit-content",
                  }}>
                    {r.tag}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.characteristic}</div>
                    <div style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.5 }}>{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: INK_SOFT, marginTop: 12, fontStyle: "italic" }}>
              Generado a partir de métricas ya calculadas. La IA interpreta resultados, no los calcula.
            </div>
          </div>

          <div className="sq-card" style={{ borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <ClipboardList size={15} color={BLUE} />
              <h2 style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>Checklist de madurez CMMI</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cmmiAreas.map((a) => {
                const pct = Math.round((a.answered / a.total) * 100);
                return (
                  <div key={a.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span>{a.name}</span>
                      <span style={{ color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace" }}>{a.answered}/{a.total}</span>
                    </div>
                    <div style={{ height: 5, background: "#EFEDE6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : pct === 0 ? LINE : AMBER }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="sq-btn"
              style={{
                marginTop: 16, textAlign: "center", padding: "9px 0", border: `1px solid ${INK}`,
                borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              Continuar checklist
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
