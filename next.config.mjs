const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['serialport', 'node-machine-id', 'modbus-serial'],
  },
};

export default nextConfig;
