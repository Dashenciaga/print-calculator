/** @type {import('next').NextConfig} */

// Бүх хуудсанд нэмэх хамгаалалтын header-ууд
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },                       // өөр сайтад iframe-ээр оруулахыг хориглоно (clickjacking)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
