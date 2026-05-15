export function ViewportBlurEdges() {
  return (
    <>
      {/* Top blur edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[9] h-[20vh]"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      {/* Bottom blur edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[9] h-[20vh]"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 0%, transparent 100%)",
        }}
      />
    </>
  );
}
