export type Announcement = { id: string; text: string; href?: string };

export const announcements: Announcement[] = [
	{ id: 'v2-launch', text: 'kit-docs v2 is out — faster builds, smaller bundles.', href: '/' },
];
