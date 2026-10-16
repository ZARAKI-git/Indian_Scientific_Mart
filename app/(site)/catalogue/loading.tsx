export default function Loading() {
  return <div className="wrap" style={{ paddingTop: "calc(var(--hdr) + 60px)" }} aria-busy="true" aria-label="Loading">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" />)}</div>;
}
