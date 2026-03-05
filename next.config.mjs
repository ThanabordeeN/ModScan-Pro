const nextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  serverExternalPackages: ['serialport', 'node-machine-id', 'modbus-serial'],
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:3456/api/:path*',
        },
      ];
    },
  }),
};

export default nextConfig;
