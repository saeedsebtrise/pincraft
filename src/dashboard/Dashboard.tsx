import { Copy, Image as ImageIcon, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { BrandKit, Project } from '../model/types';
import { duplicateProject } from '../store/projectActions';
import { useLibrary } from '../store/libraryStore';
import { useUi } from '../store/uiStore';
import { deleteProjectAndOrphans, repos } from '../storage/repositories';
import { BrandKitEditor } from '../editor/panels/MiscPanels';
import { IconButton } from '../ui/controls';
import { TemplateGallery } from './TemplateGallery';
import { NewPinFlow } from './NewPinFlow';
import type { DesignType } from '../config/designTypes';

export type DashTab = 'projects' | 'templates' | 'brand' | 'new';

export function Dashboard({ tab, params }: { tab: DashTab; params: URLSearchParams }) {
  return (
    <div className="dash">
      <header className="dash-top">
        <a href="#/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="logo-mark">
            <ImageIcon size={17} />
          </span>
          PinForge
        </a>
        <nav className="dash-nav" aria-label="Main">
          <button aria-current={tab === 'projects' ? 'page' : undefined} onClick={() => (location.hash = '#/')}>
            Projects
          </button>
          <button aria-current={tab === 'templates' ? 'page' : undefined} onClick={() => (location.hash = '#/templates')}>
            Templates
          </button>
          <button aria-current={tab === 'brand' ? 'page' : undefined} onClick={() => (location.hash = '#/brand')}>
            Brand Kit
          </button>
        </nav>
        <div className="grow" />
        <a className="btn btn-primary" href="#/new">
          <Plus size={16} /> Create New Pin
        </a>
      </header>
      {tab === 'projects' && <ProjectsHome />}
      {tab === 'templates' && (
        <div className="dash-main">
          <h1 style={{ fontSize: 24 }}>Template gallery</h1>
          <TemplateGallery onUse={(t) => (location.hash = `#/new?template=${t.id}`)} />
        </div>
      )}
      {tab === 'brand' && <BrandHome />}
      {tab === 'new' && <NewPinFlow key={params.toString()} initialTemplateId={params.get('template') ?? undefined} initialType={(params.get('type') as DesignType) ?? undefined} />}
    </div>
  );
}

function Onboarding() {
  const done = useUi((s) => s.onboardingDone);
  if (done) return null;
  const steps = ['Choose a design type and Pin size', 'Add your images — collages auto-fill', 'Pick a headline and customize text', 'Preview on mobile and export'];
  return (
    <section className="stack-sm" aria-label="Getting started">
      <div className="row-between">
        <h2 style={{ fontSize: 16 }}>Get started in four steps</h2>
        <IconButton label="Dismiss" onClick={() => useUi.getState().set({ onboardingDone: true })}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="steps">
        {steps.map((s, i) => (
          <div key={s} className="card step">
            <span className="step-num">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsHome() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const refresh = () =>
    repos.projects
      .list()
      .then(setProjects)
      .catch((e) => setError(`Couldn't load projects: ${(e as Error).message}`));
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="dash-main">
      <div className="card hero-card">
        <div className="stack-sm">
          <h1>Design Pinterest Pins in minutes</h1>
          <p className="muted">Collages, number-badge listicles, script + bold headlines, text overlays and editorial blocks — always fully editable.</p>
        </div>
        <div className="row">
          <a className="btn btn-lg" href="#/templates">
            Browse templates
          </a>
          <a className="btn btn-primary btn-lg" href="#/new">
            <Plus size={18} /> Create New Pin
          </a>
        </div>
      </div>
      <Onboarding />
      <section className="stack">
        <h2 style={{ fontSize: 18 }}>Recent projects</h2>
        {error && <div className="issue">{error}</div>}
        {projects === null && !error && <span className="subtle">Loading…</span>}
        {projects?.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <p className="muted">No Pins yet. Create your first one — it autosaves as you work.</p>
          </div>
        )}
        <div className="project-grid">
          {projects?.map((p) => (
            <div key={p.id} className="card project-card" onClick={() => (location.hash = `#/editor/${p.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (location.hash = `#/editor/${p.id}`)} aria-label={`Open ${p.name}`}>
              <div className="project-thumb" style={{ aspectRatio: `${p.doc.width} / ${p.doc.height}` }}>
                {p.thumbnail ? <img src={p.thumbnail} alt="" /> : <ImageIcon className="subtle" />}
              </div>
              <div className="project-meta" onClick={(e) => e.stopPropagation()}>
                <div style={{ minWidth: 0 }}>
                  <strong title={p.name}>{p.name}</strong>
                  <span className="subtle">
                    {p.doc.width}×{p.doc.height} · {new Date(p.meta.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <IconButton label="Project actions" onClick={() => setMenu(menu === p.id ? null : p.id)}>
                    <MoreHorizontal size={16} />
                  </IconButton>
                  {menu === p.id && (
                    <div className="popover stack-sm" style={{ right: 0, bottom: '100%', width: 180 }} role="menu">
                      <button
                        className="btn btn-ghost btn-sm"
                        role="menuitem"
                        onClick={async () => {
                          const n = prompt('Rename project', p.name);
                          if (n?.trim()) {
                            await repos.projects.put({ ...p, name: n.trim() });
                            refresh();
                          }
                          setMenu(null);
                        }}
                      >
                        <Pencil size={14} /> Rename
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        role="menuitem"
                        onClick={async () => {
                          await duplicateProject(p);
                          setMenu(null);
                          refresh();
                        }}
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        role="menuitem"
                        onClick={async () => {
                          setMenu(null);
                          if (!confirm(`Delete “${p.name}”? This can't be undone.`)) return;
                          await deleteProjectAndOrphans(p.id);
                          refresh();
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BrandHome() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [draft, setDraft] = useState<BrandKit>(kit);
  useEffect(() => setDraft(kit), [kit]);
  return (
    <div className="dash-main" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 24 }}>Brand Kit</h1>
      <p className="muted">Your website, colors and fonts. Used by website footers, the color picker and “Apply brand”.</p>
      <div className="card" style={{ padding: 20 }}>
        <BrandKitEditor kit={draft} onChange={setDraft} />
      </div>
      <div className="row">
        <button
          className="btn btn-dark"
          onClick={async () => {
            await lib.saveBrandKit(draft);
            useUi.getState().toast('Brand Kit saved', 'success');
          }}
        >
          Save Brand Kit
        </button>
      </div>
    </div>
  );
}
