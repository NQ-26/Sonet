const createExpoWebpackConfigAsync = require('@expo/webpack-config')
const path = require('path')
const {withAlias} = require('@expo/webpack-config/addons')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer')
const {sentryWebpackPlugin} = require('@sentry/webpack-plugin')
const {version} = require('./package.json')

const GENERATE_STATS = process.env.EXPO_PUBLIC_GENERATE_STATS === '1'
const OPEN_ANALYZER = process.env.EXPO_PUBLIC_OPEN_ANALYZER === '1'

const reactNativeWebWebviewConfiguration = {
  // Load the mock HTML file that react-native-web-webview imports on web
  test: /postMock.html$/,
  use: {
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
    },
  },
}

module.exports = async function (env, argv) {
  let config = await createExpoWebpackConfigAsync(env, argv)
  config = withAlias(config, {
    'react-native$': 'react-native-web',
    'react-native-webview': 'react-native-web-webview',
  })
  config.module.rules = [
    ...(config.module.rules || []),
    reactNativeWebWebviewConfiguration,
  ]
  // Sonet API resolution
  config.resolve = config.resolve || {}
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '#': path.resolve(__dirname, 'src'),
    '@sonet/api': path.resolve(__dirname, 'src/lib/api/sonet-api.ts'),
    '@sonet/api/dist': path.resolve(__dirname, 'src/lib/api/dist'),
    '@sonet/types': path.resolve(__dirname, 'src/types/sonet.ts'),
    // Fix zeego resolution
    'zeego/lib/typescript/menu': path.resolve(__dirname, 'node_modules/zeego/lib/typescript/menu'),
    // Stubs for optional native/libs not needed on web
    'statsig-react': path.resolve(__dirname, 'src/shims/statsig-react.ts'),
    '@sentry/react-native': path.resolve(__dirname, 'src/shims/sentry-react-native.web.ts'),
  }
  config.resolve.extensions = [
    '.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'
  ]
  if (env.mode === 'development') {
    config.plugins.push(new ReactRefreshWebpackPlugin())
  } else {
    // Support static CDN for chunks
    config.output.publicPath = 'auto'
  }

  if (GENERATE_STATS || OPEN_ANALYZER) {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        openAnalyzer: OPEN_ANALYZER,
        generateStatsFile: true,
        statsFilename: '../stats.json',
        analyzerMode: OPEN_ANALYZER ? 'server' : 'json',
        defaultSizes: 'parsed',
      }),
    )
  }
  if (process.env.SENTRY_AUTH_TOKEN) {
    config.plugins.push(
      sentryWebpackPlugin({
        org: 'sonet',
        project: 'app',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: {
          // fallback needed for Render.com deployments
          name: process.env.SENTRY_RELEASE || version,
          dist: process.env.SENTRY_DIST,
        },
      }),
    )
  }
  return config
}
