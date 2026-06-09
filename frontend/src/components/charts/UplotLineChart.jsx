import { memo, useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const UplotLineChart = ({ ariaLabel, color = '#1E6BFF', height = 120, points, valueSuffix = '' }) => {
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  const chartData = useMemo(() => {
    const safePoints = points?.length ? points : [{ label: '-', value: 0 }];

    return [
      safePoints.map((_, index) => index),
      safePoints.map((point) => Number(point.value || 0)),
    ];
  }, [points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const createChart = () => {
      chartRef.current?.destroy();

      const width = Math.max(container.clientWidth, 240);
      chartRef.current = new uPlot(
        {
          axes: [
            { show: false },
            {
              grid: { stroke: '#E2E8F0', width: 1 },
              size: 36,
              stroke: '#64748B',
              values: (_, values) => values.map((value) => `${value}${valueSuffix}`),
            },
          ],
          cursor: { drag: { x: false, y: false } },
          height,
          legend: { show: false },
          scales: { x: { time: false } },
          series: [
            {},
            {
              stroke: color,
              width: 4,
              points: {
                fill: '#FFD600',
                size: 7,
                stroke: '#0F172A',
                width: 2,
              },
            },
          ],
          width,
        },
        chartData,
        container,
      );
    };

    createChart();

    const resizeObserver = new ResizeObserver(createChart);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [chartData, color, height, valueSuffix]);

  return <div ref={containerRef} role="img" aria-label={ariaLabel} className="w-full" />;
};

export default memo(UplotLineChart);
