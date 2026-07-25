export default function Sparkline({ data, width = 96, height = 30, color = '#C8102E' }) {
  if (!data || data.length < 2) {
    return <div style={{ height }} />;
  }

  const max = Math.max(...data, 0.0001);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={areaPoints}
        fill={color}
        opacity="0.12"
        stroke="none"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}