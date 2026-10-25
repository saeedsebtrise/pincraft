import { normalizeProject } from '../model/factory';
import { createLocalRepositories, repos } from '../storage/repositories';

export interface ImportResult {
  imported: number;
  skipped: number;
  stoppedByLimit: string | null;
}

/** Copies projects (and their images) saved in this browser into the signed-in cloud account. */
export async function importLocalProjects(onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
  const local = createLocalRepositories();
  const projects = await local.projects.list();
  const existing = new Set((await repos.projects.list()).map((p) => p.id));
  const todo = projects.filter((p) => !existing.has(p.id));
  let imported = 0;
  for (const p of todo) {
    const project = normalizeProject(p);
    try {
      for (const id of project.assetIds) {
        const asset = await local.assets.get(id);
        if (asset) await repos.assets.put(asset);
      }
      await repos.projects.put(project);
      imported++;
      onProgress?.(imported, todo.length);
    } catch (e) {
      const msg = (e as Error).message;
      if (/project_limit|Free plan includes/.test(msg)) return { imported, skipped: projects.length - todo.length, stoppedByLimit: msg };
      throw e;
    }
  }
  return { imported, skipped: projects.length - todo.length, stoppedByLimit: null };
}
