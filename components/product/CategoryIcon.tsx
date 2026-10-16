/** Line icons per catalogue category, used by the branded placeholder. */
const P: Record<string, string> = {
  chemicals: "M9 3h6M10 3v5.2L5.4 17.4A2.3 2.3 0 0 0 7.5 21h9a2.3 2.3 0 0 0 2.1-3.6L14 8.2V3M7.6 14h8.8",
  "life-science": "M7 3c0 4 10 5 10 9s-10 5-10 9M17 3c0 4-10 5-10 9s10 5 10 9M8.5 6.5h7M8.5 17.5h7",
  microbiology: "M4 12a8 4 0 1 0 16 0a8 4 0 1 0-16 0M4 12v2a8 4 0 0 0 16 0v-2M9 11h.01M13 12.5h.01M15 10.5h.01",
  glassware: "M8 3h8M9 3v6l-4 10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2L15 9V3M6.5 15h11",
  plasticware: "M9 3h6v3H9zM8 6h8l-1 15H9zM10 11h4",
  filtration: "M4 4h16l-6 8v6l-4 2v-8z",
  "analytical-instruments": "M4 5h16v11H4zM8 20h8M12 16v4M7 12l3-3 2 2 4-4",
  balances: "M12 4v16M6 20h12M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z",
  "lab-equipment": "M5 4h14v8H5zM7 12v7M17 12v7M5 19h14M9 8h6",
  thermometers: "M12 3a2 2 0 0 0-2 2v9.3a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2zM12 9v8",
  education: "M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v5",
  "water-testing": "M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11zM9.5 15a2.5 2.5 0 0 0 2.5 2.5",
  general: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10",
};
export function CategoryIcon({ slug }: { slug?: string | null }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={P[slug ?? "general"] ?? P.general} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
