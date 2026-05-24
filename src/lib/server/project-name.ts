import { env } from '$env/dynamic/private';

export const projectName = env.PROJECT_NAME ?? env.PUBLIC_PROJECT_NAME ?? 'kit-docs';
