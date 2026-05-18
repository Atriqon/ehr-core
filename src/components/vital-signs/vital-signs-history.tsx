'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import type { VitalSignsRow } from '@/queries/vital-signs';
import { AttachVitalSignsButton } from './attach-vital-signs-button';

// ─── Evolution chart ──────────────────────────────────────────────────────────
// Recharts isn't installed in this project. Rather than pull in ~80kb of
// dependencies for three small charts, we render inline SVG with a Catmull-Rom
// smoothed line + area fill. The SVG always lives inside a fixed h-48 wrapper,
// so it can never grow taller than 192px regardless of viewport.

const CHART_W = 320;
const CHART_H = 192;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;

interface ChartSeries {
  label: string;
  color: string;
  /** Oldest-first so the line moves left → right. */
  points: { x: Date; y: number }[];
}

/** Catmull-Rom → cubic Bézier path through the given pixel points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function EvolutionChart({
  series,
  unit,
  shortFmt,
}: {
  series: ChartSeries[];
  unit: string;
  shortFmt: Intl.DateTimeFormat;
}) {
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const allX = series.flatMap((s) => s.points.map((p) => p.x.getTime()));

  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yRange = yMax - yMin || 1;
  const yLo = yMin - yRange * 0.15;
  const yHi = yMax + yRange * 0.15;

  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const xRange = xMax - xMin || 1;

  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const baseY = PAD_TOP + innerH;

  const xPx = (t: number) => PAD_X + ((t - xMin) / xRange) * innerW;
  const yPx = (v: number) =>
    PAD_TOP + innerH - ((v - yLo) / (yHi - yLo)) * innerH;

  return (
    <svg
      role="img"
      aria-label={series.map((s) => s.label).join(', ')}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={CHART_W - PAD_X}
          y1={PAD_TOP + innerH * f}
          y2={PAD_TOP + innerH * f}
          stroke="rgba(15,23,42,0.05)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {series.map((s) => {
        const px = s.points.map((p) => ({ x: xPx(p.x.getTime()), y: yPx(p.y) }));
        if (px.length === 0) return null;
        const line = smoothPath(px);
        const area =
          px.length >= 2
            ? `${line} L${px[px.length - 1].x},${baseY} L${px[0].x},${baseY} Z`
            : '';
        return (
          <g key={s.label}>
            {area && <path d={area} fill={s.color} fillOpacity={0.12} />}
            <path
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {s.points.map((p, i) => (
              <g key={i}>
                <circle cx={px[i].x} cy={px[i].y} r={2.5} fill={s.color} />
                {/* Wide invisible hit area for the native hover tooltip. */}
                <circle cx={px[i].x} cy={px[i].y} r={11} fill="transparent">
                  <title>{`${s.label}: ${p.y}${unit ? ` ${unit}` : ''} · ${shortFmt.format(p.x)}`}</title>
                </circle>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function LegendChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-600">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/** Human-readable span between the first and last record of a metric. */
function spanLabel(from: Date, to: Date): string {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days <= 1) return 'mismo día';
  if (days < 14) return `últimos ${days} días`;
  if (days < 60) return `últimas ${Math.round(days / 7)} semanas`;
  if (days < 730) return `últimos ${Math.round(days / 30)} meses`;
  return `últimos ${Math.round(days / 365)} años`;
}

interface MetricCardProps {
  title: string;
  /** Unit shown next to the title and value (e.g. "kg", "mmHg"). */
  unit: string;
  series: ChartSeries[];
  /** Number of records that contributed a value for this metric. */
  count: number;
  /** Compact-mode current value, e.g. "70.0" or "120/80". */
  compactValue: string;
  /** Compact-mode delta-vs-previous line. */
  compactDelta: ReactNode;
  shortFmt: Intl.DateTimeFormat;
}

function MetricCard({
  title,
  unit,
  series,
  count,
  compactValue,
  compactDelta,
  shortFmt,
}: MetricCardProps) {
  const maxPoints = Math.max(0, ...series.map((s) => s.points.length));
  const enoughData = maxPoints >= 3;

  const flatX = series.flatMap((s) => s.points.map((p) => p.x));
  const span =
    flatX.length >= 2
      ? spanLabel(
          new Date(Math.min(...flatX.map((d) => d.getTime()))),
          new Date(Math.max(...flatX.map((d) => d.getTime()))),
        )
      : null;

  return (
    <div className="glass-card rounded-[22px] p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
          {unit && <span className="text-sm text-zinc-500">{unit}</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {enoughData && series.length > 1 && (
            <div className="flex flex-wrap justify-end gap-1">
              {series.map((s) => (
                <LegendChip key={s.label} label={s.label} color={s.color} />
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400">
            {count} {count === 1 ? 'registro' : 'registros'}
            {span && ` · ${span}`}
          </p>
        </div>
      </div>

      {enoughData ? (
        <>
          <div className="h-48 w-full">
            <EvolutionChart series={series} unit={unit} shortFmt={shortFmt} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{shortFmt.format(series[0].points[0].x)}</span>
            <span>
              {shortFmt.format(
                series[0].points[series[0].points.length - 1].x,
              )}
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-48 flex-col justify-center">
          {count === 0 ? (
            <p className="text-sm text-slate-400">Sin registros</p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-slate-800">
                {compactValue}
                {unit && (
                  <span className="ml-1.5 text-base font-normal text-zinc-400">
                    {unit}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm">{compactDelta}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const COLOR = {
  weight: '#14b8a6', // teal
  systolic: '#dc2626', // red
  diastolic: '#2563eb', // blue
  bmi: '#16a34a', // green
} as const;

interface VitalSignsHistoryProps {
  records: VitalSignsRow[];
  /** IANA timezone for rendering recordedAt in the clinic's local time. */
  timeZone: string;
  /**
   * When defined, an "Asociar a esta nota" button is rendered next to every
   * record whose `clinicalNoteId` is null. Pass:
   *   - a note uuid → enabled (clicking calls attachVitalSignsToNote)
   *   - `null`      → visible but disabled (e.g. on /notas/nueva before save)
   *   - omit        → no button (default for read-only contexts like the
   *                   patient detail "Signos vitales" tab)
   */
  attachToNoteId?: string | null;
}

export function VitalSignsHistory({
  records,
  timeZone,
  attachToNoteId,
}: VitalSignsHistoryProps) {
  const showAttachButton = attachToNoteId !== undefined;
  const [showAll, setShowAll] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-VE', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone,
      }),
    [timeZone],
  );

  const shortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-VE', {
        day: '2-digit',
        month: '2-digit',
        timeZone,
      }),
    [timeZone],
  );

  // Charts read oldest-first so the line moves left → right.
  const chronological = useMemo(() => [...records].slice().reverse(), [records]);

  const weight = useMemo(
    () =>
      chronological
        .filter((r) => r.weightKg != null)
        .map((r) => ({ x: r.recordedAt, y: r.weightKg as number })),
    [chronological],
  );
  const systolic = useMemo(
    () =>
      chronological
        .filter((r) => r.systolicBp != null)
        .map((r) => ({ x: r.recordedAt, y: r.systolicBp as number })),
    [chronological],
  );
  const diastolic = useMemo(
    () =>
      chronological
        .filter((r) => r.diastolicBp != null)
        .map((r) => ({ x: r.recordedAt, y: r.diastolicBp as number })),
    [chronological],
  );
  const bmi = useMemo(
    () =>
      chronological
        .filter((r) => r.bmi != null)
        .map((r) => ({ x: r.recordedAt, y: r.bmi as number })),
    [chronological],
  );

  if (records.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center rounded-[22px] p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#F0FDFA,#CCFBF1)] text-teal-600 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.15),0_8px_18px_-8px_rgba(13,148,136,0.35)]"><Activity className="h-7 w-7" /></span>
        <p className="mt-3 text-[15px] font-semibold text-slate-800">
          Sin signos vitales registrados
        </p>
        <p className="mt-1 text-[13px] text-slate-500">
          Los signos vitales aparecerán aquí a medida que se registren al inicio de cada consulta.
        </p>
      </div>
    );
  }

  const latest = records[0];
  const visibleHistory = showAll ? records : records.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Latest snapshot */}
      <div className="glass-card rounded-[22px] p-5.5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Últimos signos vitales
          </h3>
          <p className="text-xs text-slate-400">
            {dateFmt.format(latest.recordedAt)} · {latest.recordedByName}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="TA" value={formatBp(latest.systolicBp, latest.diastolicBp)} unit="mmHg" />
          <Stat label="FC" value={fmt(latest.heartRate)} unit="lpm" />
          <Stat label="FR" value={fmt(latest.respiratoryRate)} unit="rpm" />
          <Stat label="Temp." value={fmt(latest.temperatureC)} unit="°C" />
          <Stat label="SpO2" value={fmt(latest.oxygenSaturation)} unit="%" />
          <Stat label="Peso" value={fmt(latest.weightKg)} unit="kg" />
          <Stat label="Talla" value={fmt(latest.heightCm)} unit="cm" />
          <Stat label="IMC" value={fmt(latest.bmi)} unit="" />
        </div>
        {latest.notes && (
          <p className="mt-3 rounded-xl bg-slate-900/4 px-3 py-2 text-xs text-slate-600">
            {latest.notes}
          </p>
        )}
      </div>

      {/* Evolution — 3 metrics side by side */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Evolución</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Peso"
            unit="kg"
            count={weight.length}
            series={[{ label: 'Peso', color: COLOR.weight, points: weight }]}
            compactValue={
              weight.length ? weight[weight.length - 1].y.toFixed(1) : '—'
            }
            compactDelta={buildDelta(weight, 'kg', 1, shortFmt, 'text-zinc-500')}
            shortFmt={shortFmt}
          />
          <MetricCard
            title="Tensión arterial"
            unit="mmHg"
            count={systolic.length}
            series={[
              { label: 'Sistólica', color: COLOR.systolic, points: systolic },
              { label: 'Diastólica', color: COLOR.diastolic, points: diastolic },
            ]}
            compactValue={formatBp(
              systolic.length ? systolic[systolic.length - 1].y : null,
              diastolic.length ? diastolic[diastolic.length - 1].y : null,
            )}
            compactDelta={buildDelta(
              systolic,
              'mmHg sist.',
              0,
              shortFmt,
              systolic.length && systolic[systolic.length - 1].y > 140
                ? 'text-red-600'
                : 'text-zinc-500',
            )}
            shortFmt={shortFmt}
          />
          <MetricCard
            title="IMC"
            unit=""
            count={bmi.length}
            series={[{ label: 'IMC', color: COLOR.bmi, points: bmi }]}
            compactValue={bmi.length ? bmi[bmi.length - 1].y.toFixed(1) : '—'}
            compactDelta={buildDelta(bmi, '', 1, shortFmt, 'text-zinc-500')}
            shortFmt={shortFmt}
          />
        </div>
      </div>

      {/* History list */}
      <div className="glass-surface rounded-[20px]">
        <div className="flex items-center justify-between border-b border-slate-900/6 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Historial ({records.length})
          </h3>
          {records.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline dark:text-teal-400"
            >
              {showAll ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  Ver todos
                </>
              )}
            </button>
          )}
        </div>
        <ul className="divide-y divide-slate-900/6">
          {visibleHistory.map((r) => {
            const isUnassigned = r.clinicalNoteId == null;
            return (
              <li key={r.id} className="px-5 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-700">
                    {dateFmt.format(r.recordedAt)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {r.recordedByName}
                    {isUnassigned && ' · sin nota asociada'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {r.systolicBp != null && r.diastolicBp != null && (
                      <Span k="TA" v={`${r.systolicBp}/${r.diastolicBp}`} u="mmHg" />
                    )}
                    {r.heartRate != null && <Span k="FC" v={r.heartRate} u="lpm" />}
                    {r.respiratoryRate != null && (
                      <Span k="FR" v={r.respiratoryRate} u="rpm" />
                    )}
                    {r.temperatureC != null && <Span k="T" v={r.temperatureC} u="°C" />}
                    {r.oxygenSaturation != null && (
                      <Span k="SpO2" v={r.oxygenSaturation} u="%" />
                    )}
                    {r.weightKg != null && <Span k="Peso" v={r.weightKg} u="kg" />}
                    {r.bmi != null && <Span k="IMC" v={r.bmi} u="" />}
                  </div>
                  {showAttachButton && isUnassigned && (
                    <AttachVitalSignsButton
                      vitalSignsId={r.id}
                      clinicalNoteId={attachToNoteId ?? null}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Builds the "↑ 4.5 kg desde 18/04" delta line for compact (insufficient-data) cards. */
function buildDelta(
  points: { x: Date; y: number }[],
  unit: string,
  precision: number,
  shortFmt: Intl.DateTimeFormat,
  colorClass: string,
): ReactNode {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return <span className="text-slate-400">Único registro hasta ahora</span>;
  }
  const curr = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = curr.y - prev.y;
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const mag = Math.abs(delta).toFixed(precision);
  return (
    <span className={colorClass}>
      {arrow} {mag}
      {unit && ` ${unit}`} desde {shortFmt.format(prev.x)}
    </span>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-slate-900/6 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">
        {value}
        {value !== '—' && unit && (
          <span className="ml-1 text-xs font-normal text-slate-400">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function Span({ k, v, u }: { k: string; v: string | number; u: string }) {
  return (
    <span>
      <span className="text-slate-400">{k}:</span>{' '}
      <span className="font-medium text-slate-700">{v}</span>
      {u && <span className="text-slate-400"> {u}</span>}
    </span>
  );
}

function fmt(v: number | null): string {
  return v == null ? '—' : String(v);
}

function formatBp(sys: number | null, dia: number | null): string {
  if (sys == null && dia == null) return '—';
  return `${sys ?? '—'}/${dia ?? '—'}`;
}
