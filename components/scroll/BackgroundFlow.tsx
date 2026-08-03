const BACKGROUND_FLOW_ID = "bg-flow-layer";

export { BACKGROUND_FLOW_ID };

export function BackgroundFlow({ initialColor }: { initialColor: string }) {
  return (
    <div
      id={BACKGROUND_FLOW_ID}
      className="fixed inset-0 -z-10"
      style={{ backgroundColor: initialColor }}
      aria-hidden
    />
  );
}
