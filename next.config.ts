import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 95],
  },
  // Without this, dev-mode requests from the phone's LAN IP (rather than
  // localhost) get their HMR websocket blocked as cross-origin — this was
  // very likely why nothing (videos, scroll animations) ever ran correctly
  // when testing from an actual phone: the page loads, but the dev client
  // never finishes its expected handshake, and things effectively hang.
  allowedDevOrigins: ["192.168.1.3"],
  // Drops the `X-Powered-By: Next.js` response header — no functional
  // benefit to advertising the framework/version to every visitor.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Applies to every route, including the static /images/*.mp4
        // assets — none of these headers interfere with range-request
        // video streaming.
        source: "/:path*",
        headers: [
          // This site never frames itself into another origin's <iframe>
          // and isn't meant to be framed by anyone else either.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers from MIME-sniffing a response into executing
          // as something other than its declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full referrer only to same-origin requests; other
          // origins (e.g. an outbound link) only get the origin, not the
          // full path — a reasonable default with no functional cost here
          // (nothing on this site relies on receiving a full referrer).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This site has no use for camera/microphone/geolocation access
          // anywhere — explicitly denying them removes an entire class of
          // permission-prompt-based phishing/clickjacking risk.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Re-encoded videos and their poster frames. Never edited in place:
      // any change ships under a new file name (v2 → v3 directory or a
      // renamed file), so browsers may cache them for a year without
      // revalidating — the old `/images/*` files got `max-age=0` and were
      // re-validated on every visit/seek. Listed after the catch-all so
      // only Cache-Control is added; the security headers above still apply.
      {
        source: "/images/v2/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/images/posters/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
