/**
 * Persistence behind repository interfaces. The MVP uses IndexedDB in the
 * browser; a cloud implementation (user accounts, sync, team workspaces) can
 * implement the same interfaces without touching editor code.
 */
import { createStore, del, get, keys, set, values } from 'idb-keyval';
import type { AssetMeta, BrandKit, Id, Project, Template } from '../model/types';

export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: Id): Promise<Project | undefined>;
  put(project: Project): Promise<void>;
  remove(id: Id): Promise<void>;
}

export interface StoredAsset {
  meta: AssetMeta;
  blob: Blob;
}

export interface AssetRepository {
  get(id: Id): Promise<StoredAsset | undefined>;
  put(asset: StoredAsset): Promise<void>;
  remove(id: Id): Promise<void>;
  ids(): Promise<Id[]>;
}

export interface CollectionRepository<T extends { id: Id }> {
  list(): Promise<T[]>;
  put(item: T): Promise<void>;
  remove(id: Id): Promise<void>;
}

const stores = {
  projects: () => createStore('pinforge-projects', 'projects'),
  assets: () => createStore('pinforge-assets', 'assets'),
  templates: () => createStore('pinforge-templates', 'templates'),
  brandKits: () => createStore('pinforge-brandkits', 'brandkits'),
};

function lazy<T>(f: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= f());
}

export function createIdbProjectRepository(): ProjectRepository {
  const store = lazy(stores.projects);
  return {
    list: async () => ((await values(store())) as Project[]).sort((a, b) => b.meta.updatedAt - a.meta.updatedAt),
    get: (id) => get(id, store()),
    put: (p) => set(p.id, p, store()),
    remove: (id) => del(id, store()),
  };
}

export function createIdbAssetRepository(): AssetRepository {
  const store = lazy(stores.assets);
  return {
    get: (id) => get(id, store()),
    put: (a) => set(a.meta.id, a, store()),
    remove: (id) => del(id, store()),
    ids: async () => (await keys(store())) as Id[],
  };
}

function createIdbCollection<T extends { id: Id }>(make: () => ReturnType<typeof createStore>): CollectionRepository<T> {
  const store = lazy(make);
  return {
    list: async () => (await values(store())) as T[],
    put: (item) => set(item.id, item, store()),
    remove: (id) => del(id, store()),
  };
}

export const repos = {
  projects: createIdbProjectRepository(),
  assets: createIdbAssetRepository(),
  templates: createIdbCollection<Template>(stores.templates),
  brandKits: createIdbCollection<BrandKit>(stores.brandKits),
};

/** Deletes a project and any of its assets no other project references. */
export async function deleteProjectAndOrphans(id: Id): Promise<void> {
  const project = await repos.projects.get(id);
  await repos.projects.remove(id);
  if (!project) return;
  const others = await repos.projects.list();
  const stillUsed = new Set(others.flatMap((p) => p.assetIds));
  const templates = await repos.templates.list();
  templates.forEach((t) => t.doc.background.assetId && stillUsed.add(t.doc.background.assetId));
  await Promise.all(project.assetIds.filter((a) => !stillUsed.has(a)).map((a) => repos.assets.remove(a)));
}
