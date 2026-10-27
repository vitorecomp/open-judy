/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    const caseService = process.env.CASE_SERVICE_URL || 'http://localhost:8081';
    const mediaService = process.env.MEDIA_SERVICE_URL || 'http://localhost:8082';
    const transcriptionService = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8083';
    const aiService = process.env.AI_SERVICE_URL || 'http://localhost:8084';
    const userService = process.env.USER_SERVICE_URL || 'http://localhost:8085';
    const configService = process.env.CONFIG_SERVICE_URL || 'http://localhost:8086';
    const notificationService = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8087';
    const agentGardenService = process.env.AGENT_GARDEN_SERVICE_URL || 'http://localhost:8088';
    const indexerService = process.env.INDEXER_SERVICE_URL || 'http://localhost:8089';
    const notebookService = process.env.NOTEBOOK_SERVICE_URL || 'http://localhost:8090';
    const keycloakService = process.env.KEYCLOAK_URL || 'http://localhost:8080';

    return [
      {
        source: '/api/v1/cases/:path*',
        destination: `${caseService}/api/v1/cases/:path*`,
      },
      {
        source: '/api/v1/hearings/:path*',
        destination: `${caseService}/api/v1/hearings/:path*`,
      },
      {
        source: '/api/v1/media/:path*',
        destination: `${mediaService}/api/v1/media/:path*`,
      },
      {
        source: '/api/v1/transcriptions/:path*',
        destination: `${transcriptionService}/api/v1/transcriptions/:path*`,
      },
      {
        source: '/api/v1/ai/:path*',
        destination: `${aiService}/api/v1/ai/:path*`,
      },
      {
        source: '/api/v1/users/:path*',
        destination: `${userService}/api/v1/users/:path*`,
      },
      {
        source: '/api/v1/config/:path*',
        destination: `${configService}/api/v1/config/:path*`,
      },
      {
        source: '/api/v1/system/:path*',
        destination: `${userService}/api/v1/system/:path*`,
      },
      {
        source: '/api/v1/notifications/:path*',
        destination: `${notificationService}/api/v1/notifications/:path*`,
      },
      {
        source: '/api/v1/agent-garden/:path*',
        destination: `${agentGardenService}/api/v1/agent-garden/:path*`,
      },
      {
        source: '/api/v1/notebooks/:path*',
        destination: `${notebookService}/api/v1/notebooks/:path*`,
      },
      {
        source: '/api/v1/indexer/:path*',
        destination: `${indexerService}/api/v1/indexer/:path*`,
      },
      {
        source: '/api/v1/search',
        destination: `${indexerService}/api/v1/indexer/search`,
      },
      {
        source: '/api/v1/search/:path*',
        destination: `${indexerService}/api/v1/indexer/search/:path*`,
      },
      {
        source: '/realms/:path*',
        destination: `${keycloakService}/realms/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
