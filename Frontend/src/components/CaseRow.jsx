export default function CaseRow({ index, caseItem, onSelect }) {
  const {
    id,
    case_number,
    fir_number,
    issue,
    detail,
    days
  } = caseItem;

  const viewId = case_number || fir_number;

  const viewLabel = case_number
    ? "View Case →"
    : "View FIR →";

  return (
    <div className="case-row">
      <div className="sl">
        {String(index + 1).padStart(2, "0")}.
      </div>

      <div>
        <p className="num">
          <span className="mark red"></span>
          {id || fir_number}
        </p>

        <p className="issue">{issue}</p>
        <p className="detail">{detail}</p>
        <span className="days">{days}</span>

        {!case_number && (
          <p className="detail">
            FIR registered — Case not yet registered
          </p>
        )}
      </div>

      <button
        className="view-btn"
        onClick={() => onSelect(viewId)}
      >
        {viewLabel}
      </button>
    </div>
  );
}