import { ImageResponse } from 'next/og';

export const alt = 'streetraceing — developer portfolio and projects';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px 88px',
        color: '#fafafa',
        background:
          'radial-gradient(circle at 18% 20%, rgba(59,130,246,0.22), transparent 34%), radial-gradient(circle at 82% 78%, rgba(168,85,247,0.18), transparent 32%), #09090b',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          fontSize: 68,
          fontWeight: 700,
          letterSpacing: '-0.04em',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            fontSize: 34,
          }}
        >
          s
        </div>
        streetraceing
      </div>
      <div
        style={{
          display: 'flex',
          maxWidth: 880,
          marginTop: 34,
          color: '#a1a1aa',
          fontSize: 34,
          lineHeight: 1.35,
        }}
      >
        Full-stack development, open-source projects, Dev Notes, and useful
        browser tools.
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 48,
          color: '#d4d4d8',
          fontSize: 22,
        }}
      >
        TypeScript · React · Next.js · Rust · Java
      </div>
    </div>,
    size,
  );
}
