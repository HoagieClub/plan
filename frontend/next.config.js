const nextConfig = {
	reactStrictMode: true,
	env: {
		HOAGIEPLAN: process.env.HOAGIEPLAN,
		BACKEND: process.env.BACKEND,
	},
	experimental: {
		reactCompiler: true,
		optimizePackageImports: ['@mui/icons-material', 'date-fns'],
		staleTimes: {
			dynamic: 30,
		},
	},
};
module.exports = nextConfig;
