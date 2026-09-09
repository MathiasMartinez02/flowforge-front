// Isotipo de FlowForge: tres nodos conectados (representa un workflow), usado en el topbar.
export function Logo() {
  return (
    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-lime">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#150f23" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="6" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M7.2 7.6 L10.5 16.3 M16.8 7.6 L13.5 16.3" />
      </svg>
    </div>
  );
}
