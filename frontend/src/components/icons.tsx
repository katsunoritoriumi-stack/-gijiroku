import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, children: React.ReactNode) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "w-5 h-5"}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconArrowLeft = (p: IconProps) =>
  base(p, <path d="M19 12H5M5 12l6-6M5 12l6 6" />);

export const IconSettings = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  );

export const IconTrash = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  );

export const IconFileText = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </>
  );

export const IconSparkles = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </>
  );

export const IconListChecks = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 6l1.5 1.5L8 5" />
      <path d="M4 12l1.5 1.5L8 11" />
      <path d="M4 18l1.5 1.5L8 17" />
      <path d="M12 6h8M12 12h8M12 18h8" />
    </>
  );

export const IconMessageCircle = (p: IconProps) =>
  base(
    p,
    <path d="M12 21c-4.97 0-9-3.58-9-8s4.03-8 9-8 9 3.58 9 8c0 1.5-.47 2.9-1.28 4.1.15.9.55 2.06 1.28 3.05-1.24.32-2.6.13-3.55-.4A10.2 10.2 0 0 1 12 21Z" />
  );

export const IconMic = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3M9 22h6" />
    </>
  );

export const IconSend = (p: IconProps) =>
  base(p, <path d="M4 11l16-7-6.5 16-3-6.5L4 11Z" strokeLinejoin="round" />);

export const IconPlay = (p: IconProps) =>
  base(p, <path d="M6 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" />);

export const IconPause = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    </>
  );

export const IconCheck = (p: IconProps) => base(p, <path d="M4 12l5 5L20 6" />);

export const IconPencil = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  );

export const IconX = (p: IconProps) => base(p, <path d="M18 6 6 18M6 6l12 12" />);

export const IconUpload = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  );

export const IconStop = (p: IconProps) =>
  base(p, <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />);

export const IconPauseCircle = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 9v6M14 9v6" />
    </>
  );
