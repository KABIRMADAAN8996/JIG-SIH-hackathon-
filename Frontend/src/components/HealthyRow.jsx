export default function HealthyRow({ index, caseItem, onSelect }) {
  return (
    <div className="healthy-row" onClick={() => onSelect(caseItem.id)}>
      <div className="sl">{String(index + 1).padStart(2, "0")}.</div>
      <div className="num">
        <span className="mark green"></span>
        {caseItem.id}
      </div>
      <div className="sub">No Bottlenecks Detected</div>
    </div>
  );
}
