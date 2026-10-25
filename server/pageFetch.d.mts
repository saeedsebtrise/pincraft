// Types for server/pageFetch.mjs (used by vite.config.ts and the tests).
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface PageImage {
  url: string;
  alt: string;
}
export interface PageInfo {
  url: string;
  title: string;
  description: string;
  siteName: string;
  images: PageImage[];
}
export class FetchError extends Error {
  status: number;
  constructor(message: string, status?: number);
}
export function isPrivateAddress(ip: string): boolean;
export function parsePublicUrl(raw: string): URL;
export function decodeEntities(s: string): string;
export function stripSiteName(title: string, siteName: string, hostname: string): string;
export function parsePage(html: string, pageUrl: string): PageInfo;
export function readPage(raw: string): Promise<PageInfo>;
export function readImage(raw: string): Promise<{ type: string; body: Uint8Array }>;
export function pageMiddleware(): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>;
