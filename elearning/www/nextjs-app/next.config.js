/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ["nextstepjs"],
  images: {
    unoptimized: true, // THÊM DÒNG NÀY ĐỂ TẮT TỐI ƯU HÓA HÌNH ẢNH
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http", // Thêm cho learn.local nếu bạn phục vụ ảnh từ Frappe qua Nginx
        hostname: "math.local",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
      },
    ],
  },
};

module.exports = nextConfig;
