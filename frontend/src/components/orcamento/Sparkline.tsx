"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  showVariation?: boolean;
}

/**
 * Componente Sparkline - Mini gráfico de linha para visualização de tendência
 * 
 * Cores:
 * - Verde: tendência de alta (último valor > primeiro valor)
 * - Vermelho: tendência de baixa (último valor < primeiro valor)
 * - Cinza: estável (sem variação significativa)
 */
export function Sparkline({ 
  values, 
  width = 48, 
  height = 16, 
  className,
  showVariation = true,
}: SparklineProps) {
  const { path, color, variation, colorClass } = useMemo(() => {
    if (!values || values.length === 0) {
      return { path: "", color: "#9ca3af", variation: 0, colorClass: "text-muted-foreground" };
    }

    // Normalizar valores para o range do SVG
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    
    // Calcular pontos do path
    const points = values.map((val, i) => {
      const x = (i / (values.length - 1 || 1)) * (width - 4) + 2;
      const y = height - 2 - ((val - minVal) / range) * (height - 4);
      return { x, y };
    });
    
    // Criar path SVG
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, "");
    
    // Calcular variação percentual
    const first = values[0] || 0;
    const last = values[values.length - 1] || 0;
    const variationPct = first === 0 ? 0 : ((last - first) / first) * 100;
    
    // Definir cor baseada na tendência
    let strokeColor = "#9ca3af"; // Cinza padrão
    let textClass = "text-muted-foreground";
    
    if (variationPct > 1) {
      strokeColor = "#16a34a"; // Verde (text-green-600)
      textClass = "text-green-600";
    } else if (variationPct < -1) {
      strokeColor = "#dc2626"; // Vermelho (text-red-600)
      textClass = "text-red-600";
    }
    
    return { 
      path: pathD, 
      color: strokeColor, 
      variation: variationPct,
      colorClass: textClass,
    };
  }, [values, width, height]);

  if (!values || values.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="shrink-0"
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showVariation && (
        <span className={cn("text-[10px] font-medium whitespace-nowrap", colorClass)}>
          {variation > 0 ? "+" : ""}{variation.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

