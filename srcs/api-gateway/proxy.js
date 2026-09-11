const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config');

const inventoryProxy = createProxyMiddleware({
  target: config.inventoryApiUrl,
  changeOrigin: true,
  pathFilter: (pathname) => (
    pathname === '/api/movies' || pathname.startsWith('/api/movies/')
  ),
});

module.exports = inventoryProxy;
