import { UPLOAD_LIMITS } from '../config/colors';
import { assignImages, frames } from '../model/docOps';
import { pointInRect } from '../model/geometry';
import type { FrameLayer, Id } from '../model/types';
import { useAssets } from '../store/assetStore';
import { useEditor } from '../store/editorStore';
import { useUi } from '../store/uiStore';
import { newFrame } from './blocks';

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
  } else if (autoFill && frames(doc).some((f) => !f.assetId)) {
    ed.setDoc(assignImages(doc, ids, useAssets.getState().metas, { onlyEmpty: true }));
  }
  ui.toast(`${ids.length} image${ids.length > 1 ? 's' : ''} added`, 'success');
  return ids;
}
