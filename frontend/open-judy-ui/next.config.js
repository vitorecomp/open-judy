/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/cases/:path*',
        destination: process.env.CASE_SERVICE_URL || 'http://localhost:8081/api/v1/cases/:path*',
      },
      {
        source: '/api/v1/hearings/:path*',
        destination: process.env.CASE_SERVICE_URL || 'http://localhost:8081/api/v1/hearings/:path*',
      },
      {
        source: '/api/v1/media/:path*',
        destination: process.env.MEDIA_SERVICE_URL || 'http://localhost:8082/api/v1/media/:path*',
      },
      {
        source: '/api/v1/transcriptions/:path*',
        destination: process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8083/api/v1/transcriptions/:path*',
      },
      {
        source: '/api/v1/ai/:path*',
        destination: process.env.AI_SERVICE_URL || 'http://localhost:8084/api/v1/ai/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
