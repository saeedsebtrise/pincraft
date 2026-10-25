import { UPLOAD_LIMITS } from '../config/colors';
import { assignImages, frames } from '../model/docOps';
import { pointInRect } from '../model/geometry';
import type { FrameLayer, Id, PinDocument } from '../model/types';
import { useAssets } from '../store/assetStore';
import { useEditor } from '../store/editorStore';
import { useUi } from '../store/uiStore';
import { newFrame } from './blocks';

/**
 * Puts photos into the frames of the open page — or of every page when
 * "Apply to all pages" is on. Each page starts the list at a different photo,
 * so a project of many designs doesn't show the same image first everywhere.
 * `refill` replaces the photos already there; otherwise only empty frames fill.
 */
export function fillPhotos(ids: Id[], opts: { refill?: boolean; allowDuplicates?: boolean; smart?: boolean } = {}): number {
  const ed = useEditor.getState();
  const project = ed.project;
  if (!project || !ids.length) return 0;
  const metas = useAssets.getState().metas;
  const fill = (doc: PinDocument, offset: number): PinDocument => {
    if (opts.refill) doc = { ...doc, layers: doc.layers.map((l) => (l.type === 'frame' && l.role !== 'logo' ? { ...l, assetId: null } : l)) };
    if (!frames(doc).some((f) => !f.assetId)) return doc;
    const k = offset % ids.length;
    return assignImages(doc, [...ids.slice(k), ...ids.slice(0, k)], metas, { onlyEmpty: true, allowDuplicates: opts.allowDuplicates, smart: opts.smart ?? true });
  };
  if (useUi.getState().fillAllPages && project.pages.length > 1) {
    ed.updatePages((doc, i) => fill(doc, i));
    return project.pages.length;
  }
  ed.setDoc(fill(project.doc, 0));
  return 1;
}

/**
 * Upload pipeline used by the file picker, drag-and-drop and paste:
 * validate → store original → add to the project library → optionally place.
 * With a drop point the image fills the frame under it (or a new frame);
 * without one, empty frames are auto-filled.
 */
export async function importAndPlace(files: File[], at?: { x: number; y: number } | null, autoFill = true): Promise<Id[]> {
  const ed = useEditor.getState();
  const ui = useUi.getState();
  const project = ed.project;
  if (!project) return [];
  const room = UPLOAD_LIMITS.maxImagesPerProject - project.assetIds.length;
  if (room <= 0) {
    ui.toast(`This Pin already has ${UPLOAD_LIMITS.maxImagesPerProject} images. Remove some to add more.`, 'error');
    return [];
  }
  const accepted = files.slice(0, room);
  if (files.length > room) ui.toast(`Only ${room} more image(s) fit in this project; extra files were skipped.`, 'info');

  const { ids, errors } = await useAssets.getState().importFiles(accepted);
  errors.forEach((e) => ui.toast(e, 'error'));
  if (!ids.length) return [];

  const current = useEditor.getState().project!;
  useEditor.getState().updateProject({ assetIds: [...current.assetIds, ...ids] });

  const doc = useEditor.getState().project!.doc;
  if (at) {
    const target = [...doc.layers].reverse().find((l): l is FrameLayer => l.type === 'frame' && l.visible && pointInRect(at.x, at.y, l));
    if (target) {
      ed.updateLayer<FrameLayer>(target.id, { assetId: ids[0], crop: { zoom: 1, fx: 0.5, fy: 0.5 } });
    } else {
      const m = useAssets.getState().metas[ids[0]];
      ed.addLayers([{ ...newFrame(doc, m?.width, m?.height, at), assetId: ids[0] }]);
    }
  }
  const pages = !at && autoFill ? fillPhotos(ids) : 0;
  ui.toast(`${ids.length} image${ids.length > 1 ? 's' : ''} added${pages > 1 ? ` to all ${pages} pages` : ''}`, 'success');
  return ids;
}
