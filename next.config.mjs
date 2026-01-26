const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  experimental: {
    serverComponentsExternalPackages: ['serialport', 'node-machine-id', 'modbus-serial'],
  },
};

export default nextConfig;
