import { useTranslation } from 'react-i18next';

export interface SvgChartTooltipRow {
  key: string;
  label: string;
}

export function SvgChartTooltip({
  x,
  y,
  width,
  header,
  rows,
}: {
  x: number;
  y: number;
  width: number;
  header: string;
  rows: readonly SvgChartTooltipRow[];
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const textX = rtl ? width - 12 : 12;
  const direction = rtl ? 'rtl' : 'ltr';

  return (
    <g className="chart-tooltip" transform={`translate(${String(x)},${String(y)})`}>
      <rect width={width} height={36 + rows.length * 20} rx="9" />
      <text x={textX} y="20" textAnchor="start" direction={direction}>
        {header}
      </text>
      {rows.map((row, index) => (
        <text key={row.key} x={textX} y={42 + index * 20} textAnchor="start" direction={direction}>
          {row.label}
        </text>
      ))}
    </g>
  );
}
