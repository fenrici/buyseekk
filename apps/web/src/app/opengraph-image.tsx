import { ImageResponse } from 'next/og';

export const alt = 'Buyseekk — inverted marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #060c1d 0%, #1e3a8a 50%, #5b21b6 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, marginBottom: 24 }}>Buyseekk</div>
        <div style={{ fontSize: 36, opacity: 0.9, maxWidth: 900, lineHeight: 1.3 }}>
          Post what you need. Get offers from sellers. Cars &amp; real estate in the US.
        </div>
      </div>
    ),
    { ...size },
  );
}
