"use client";

import { WeightEntry } from "@/types";

interface WeightChartProps {
  entries: WeightEntry[]; // chronologisch aufsteigend erwartet
  targetWeightKg?: number;
  height?: number;
}

// Leichtgewichtiges, abhängigkeitsfreies SVG-Liniendiagramm für den Gewichtsverlauf.
export default function WeightChart({ entries, targetWeightKg, height = 180 }: WeightChartProps) {
  if (entries.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        Trage mindestens 2 Gewichte ein, um einen Verlauf zu sehen
      </div>
    );
  }

  const width = 320;
  const padding = 24;

  const weights = entries.map((e) => e.weightKg);
  const allValues = targetWeightKg ? [...weights, targetWeightKg] : weights;
  const minWeight = Math.min(...allValues) - 1;
  const maxWeight = Math.max(...allValues) + 1;
  const range = maxWeight - minWeight || 1;

  const stepX = (width - padding * 2) / (entries.length - 1);

  function xFor(i: number) {
    return padding + i * stepX;
  }
  function yFor(weight: number) {
    return padding + (1 - (weight - minWeight) / range) * (height - padding * 2);
  }

  const points = entries.map((e, i) => `${xFor(i)},${yFor(e.weightKg)}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${points} ${xFor(entries.length - 1)},${
    height - padding
  }`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {targetWeightKg && (
        <line
          x1={padding}
          x2={width - padding}
          y1={yFor(targetWeightKg)}
          y2={yFor(targetWeightKg)}
          stroke="#16a34a"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          opacity={0.5}
        />
      )}
      <polygon points={areaPoints} fill="#16a34a" opacity={0.08} />
      <polyline points={points} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {entries.map((e, i) => (
        <circle key={e.id} cx={xFor(i)} cy={yFor(e.weightKg)} r={i === entries.length - 1 ? 4 : 2.5} fill="#16a34a" />
      ))}
    </svg>
  );
}
