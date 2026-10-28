// Metro, Expo's bundler, as Expo sets it up, plus one fix for testing on a
// phone through `expo start --tunnel`. When the phone's traffic already passes
// a proxy, the tunnel appends its own value to X-Forwarded-Proto and
// X-Forwarded-Host ("https, https"), and Metro then fails every request with
// "TypeError: Invalid URL". Keeping only the first value fixes that.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const FORWARDED_HEADER_NAMES = ['x-forwarded-proto', 'x-forwarded-host'];
const expoEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    const expoMiddleware = expoEnhanceMiddleware ? expoEnhanceMiddleware(metroMiddleware, metroServer) : metroMiddleware;
    return (request, response, next) => {
      for (const headerName of FORWARDED_HEADER_NAMES) {
        const headerValue = request.headers[headerName];
        if (typeof headerValue === 'string' && headerValue.includes(',')) {
          request.headers[headerName] = headerValue.split(',')[0].trim();
        }
      }
      return expoMiddleware(request, response, next);
    };
  },
};

module.exports = config;
