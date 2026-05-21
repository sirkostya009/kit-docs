import { env } from '$env/dynamic/private';

export const origin =
	env.ORIGIN ??
	env.PUBLIC_ORIGIN ??
	(env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
	'http://localhost:5173';
