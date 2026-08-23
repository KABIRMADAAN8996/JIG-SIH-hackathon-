export default function CaseRow({ index, caseItem, onSelect }) {
  const { id, issue, detail, days } = caseItem;

  return (
    <div className="case-row">
      <div className="sl">{String(index + 1).padStart(2, "0")}.</div>
      <div>
        <p className="num">
          <span className="mark red"></span>
          {id}
        </p>
        <p className="issue">{issue}</p>
        <p className="detail">{detail}</p>
        <span className="days">{days}</span>
      </div>
      <button className="view-btn" onClick={() => onSelect(id)}>
        View Case →
      </button>
    </div>
  );
}
