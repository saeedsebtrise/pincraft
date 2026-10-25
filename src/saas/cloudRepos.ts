/**
 * Cloud storage on Supabase: project/template/brand-kit JSON in Postgres tables
 * and original images in a private Storage bucket, all scoped to the signed-in
 * user by row-level security (supabase/migrations/0001_init.sql).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssetMeta, BrandKit, Id, Project, Template } from '../model/types';
import type { AssetRepository, CollectionRepository, ProjectRepository, RepositorySet, StoredAsset } from '../storage/repositories';
import { ASSET_BUCKET } from './supabase';

/** Errors raised by server-side limits come back with these codes in the message. */
export class LimitError extends Error {}

function fail(error: { message: string } | null, what: string): void {
  if (!error) return;
  if (/project_limit|export_limit|pro_feature/.test(error.message)) throw new LimitError(error.message.replace(/^\w+: /, ''));
  throw new Error(`${what}: ${error.message}`);
}

function projectRepo(sb: SupabaseClient, uid: string): ProjectRepository {
  return {
    async list() {
      const { data, error } = await sb.from('projects').select('data, thumbnail').order('updated_at', { ascending: false });
      fail(error, 'Loading projects failed');
      return (data ?? []).map((r) => ({ ...(r.data as Project), thumbnail: r.thumbnail ?? undefined }));
    },
    async get(id) {
      const { data, error } = await sb.from('projects').select('data, thumbnail').eq('id', id).maybeSingle();
      fail(error, 'Loading the project failed');
      return data ? { ...(data.data as Project), thumbnail: data.thumbnail ?? undefined } : undefined;
    },
    async put(p) {
      const { thumbnail, ...rest } = p;
      const { error } = await sb.from('projects').upsert({
        id: p.id,
        owner: uid,
        name: p.name,
        data: rest,
        thumbnail: thumbnail ?? null,
        updated_at: new Date(p.meta.updatedAt).toISOString(),
      });
      fail(error, 'Saving the project failed');
    },
    async remove(id) {
      const { error } = await sb.from('projects').delete().eq('id', id);
      fail(error, 'Deleting the project failed');
    },
  };
}

function assetRepo(sb: SupabaseClient, uid: string): AssetRepository {
  const path = (id: Id) => `${uid}/${id}`;
  return {
    async get(id) {
      const [{ data: row, error: e1 }, { data: blob, error: e2 }] = await Promise.all([
        sb.from('assets').select('meta').eq('id', id).maybeSingle(),
        sb.storage.from(ASSET_BUCKET).download(path(id)),
      ]);
      if (e1 || e2 || !row || !blob) return undefined;
      return { meta: row.meta as AssetMeta, blob };
    },
    async put(a: StoredAsset) {
      const up = await sb.storage.from(ASSET_BUCKET).upload(path(a.meta.id), a.blob, { contentType: a.meta.mime, upsert: true });
      fail(up.error, 'Uploading the image failed');
      const { error } = await sb.from('assets').upsert({ id: a.meta.id, owner: uid, meta: a.meta });
      fail(error, 'Saving image details failed');
    },
    async remove(id) {
      await sb.storage.from(ASSET_BUCKET).remove([path(id)]);
      const { error } = await sb.from('assets').delete().eq('id', id);
      fail(error, 'Deleting the image failed');
    },
    async ids() {
      const { data, error } = await sb.from('assets').select('id');
      fail(error, 'Listing images failed');
      return (data ?? []).map((r) => r.id as Id);
    },
  };
}

function collectionRepo<T extends { id: Id }>(sb: SupabaseClient, uid: string, table: 'templates' | 'brand_kits'): CollectionRepository<T> {
  return {
    async list() {
      const { data, error } = await sb.from(table).select('data').order('created_at', { ascending: false });
      fail(error, `Loading ${table.replace('_', ' ')} failed`);
      return (data ?? []).map((r) => r.data as T);
    },
    async put(item) {
      const { error } = await sb.from(table).upsert({ id: item.id, owner: uid, data: item });
      fail(error, `Saving ${table.replace('_', ' ')} failed`);
    },
    async remove(id) {
      const { error } = await sb.from(table).delete().eq('id', id);
      fail(error, `Deleting from ${table.replace('_', ' ')} failed`);
    },
  };
}

export function createCloudRepositories(sb: SupabaseClient, uid: string): RepositorySet {
  return {
    projects: projectRepo(sb, uid),
    assets: assetRepo(sb, uid),
    templates: collectionRepo<Template>(sb, uid, 'templates'),
    brandKits: collectionRepo<BrandKit>(sb, uid, 'brand_kits'),
  };
}
