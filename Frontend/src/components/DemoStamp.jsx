/**
 * Renders the "DEMO DATA" rubber-stamp mark whenever the given
 * dataset is synthetic ("B"). Driven entirely by the dataset field
 * rather than being hardcoded per case, per the API contract.
 */
export default function DemoStamp({ dataset }) {
  if (dataset !== "B") return null;

  return <div className="demo-stamp">⚠ Demo Data — Synthetic Case Lifecycle</div>;
}
