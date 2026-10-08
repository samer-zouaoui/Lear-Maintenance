// invertGood = true  -> une baisse est une bonne nouvelle (ex: MTTR, downtime)
// invertGood = false -> une hausse est une bonne nouvelle (ex: MTBF, disponibilité)
export default function TrendBadge({ current, previous, invertGood = true }) {
  if (current === null || previous === null || previous === undefined || previous === 0) {
    return null;
  }

  const diff = current - previous;
  const percent = (diff / previous) * 100;

  if (Math.abs(percent) < 0.5) {
    return <span className="trend-badge trend-flat">stable</span>;
  }

  const isIncrease = diff > 0;
  const isGood = invertGood ? !isIncrease : isIncrease;

  return (
    <span className={`trend-badge ${isGood ? 'trend-good' : 'trend-bad'}`}>
      {isIncrease ? '\u2191' : '\u2193'} {Math.abs(percent).toFixed(0)}%
    </span>
  );
}