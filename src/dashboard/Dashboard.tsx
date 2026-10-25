import { ArrowRight, Copy, CreditCard, FolderOpen, Home, Image as ImageIcon, LayoutTemplate, MoreHorizontal, Palette, Pencil, Plus, PlusCircle, Search, Settings, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { AutoDesign } from './AutoDesign';
import { ensureCanCreateProject, handleLimitError } from '../saas/gates';
import { AccountPage, PricingPage, UpgradeButton, UserCard } from '../saas/ui/PlanViews';
import { useEffect, useMemo, useState } from 'react';
import { DESIGN_TYPES, type DesignType } from '../config/designTypes';
import type { BrandKit, Project } from '../model/types';
import { allTemplates, duplicateProject } from '../store/projectActions';
import { useLibrary } from '../store/libraryStore';
import { useUi } from '../store/uiStore';
import { deleteProjectAndOrphans, repos } from '../storage/repositories';
import { BrandKitEditor } from '../editor/panels/MiscPanels';
import { BrandMark } from '../ui/BrandMark';
import { IconButton } from '../ui/controls';
import { TemplateCard, TemplateGallery } from './TemplateGallery';
import { NewPinFlow } from './NewPinFlow';
import { TypeCard } from './TypeCard';

export type DashTab = 'home' | 'auto' | 'projects' | 'templates' | 'brand' | 'new' | 'account' | 'pricing';

const NAV: { id: DashTab; label: string; href: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', href: '#/', icon: <Home size={18} /> },
  { id: 'auto', label: 'Auto Design', href: '#/auto', icon: <Wand2 size={18} /> },
  { id: 'new', label: 'Create New', href: '#/new', icon: <PlusCircle size={18} /> },
  { id: 'templates', label: 'Templates', href: '#/templates', icon: <LayoutTemplate size={18} /> },
  { id: 'brand', label: 'Brand Kit', href: '#/brand', icon: <Palette size={18} /> },
  { id: 'projects', label: 'Projects', href: '#/projects', icon: <FolderOpen size={18} /> },
  { id: 'pricing', label: 'Plans & Pricing', href: '#/pricing', icon: <CreditCard size={18} /> },
];

/** Design types shown on the home screen (the full list of 16 is in Create New). */
const HOME_TYPES: DesignType[] = ['single-image', 'image-text-overlay', 'image-text-panel', 'collage-4', 'editorial', 'listicle', 'quote-advice', 'number-badge', 'script-bold', 'blank'];
const POPULAR = ['f2-balcony-white', 'f3-editorial-white-blocks', 'f4-text-first-number', 'f5-script-bold-white-band', 'f1-center-cream-script', 'f9-patio-band-23'];

export function Dashboard({ tab, params }: { tab: DashTab; params: URLSearchParams }) {
  // ?q= is a template search only on the gallery (on Auto Design it's the article title).
  const searchQuery = tab === 'templates' ? params.get('q') ?? '' : '';
  const [query, setQuery] = useState(searchQuery);
  useEffect(() => setQuery(searchQuery), [searchQuery]);
  return (
    <div className="dash2">
      <aside className="dash-side" aria-label="Main">
        <a href="#/" className="brand">
          <BrandMark size={40} />
          <span className="brand-text">
            <strong>PinCraft</strong>
            <span>Pinterest Design Studio</span>
          </span>
        </a>
        <nav className="dash-side-nav">
          {NAV.map((n) => (
            <a key={n.id} href={n.href} className="dash-side-item" aria-current={tab === n.id ? 'page' : undefined}>
              {n.icon}
              {n.label}
            </a>
          ))}
        </nav>
        <div className="grow" />
        <UserCard />
      </aside>
      <div className="dash-content">
        <header className="dash-top2">
          <form
            className="search-box dash-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              location.hash = `#/templates?q=${encodeURIComponent(query.trim())}`;
            }}
          >
            <Search size={17} />
            <input placeholder="Search templates (e.g. balcony, hair, decor, listicle…)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search templates" />
          </form>
          <div className="grow" />
          <a className="icon-btn" href="#/account" aria-label="Account settings" data-tip="Account settings">
            <Settings size={20} />
          </a>
          <UpgradeButton className="btn btn-outline btn-lg" />
          <a className="btn btn-pink btn-lg" href="#/new">
            <Plus size={18} /> Create New Pin
          </a>
        </header>
        {tab === 'home' && <HomeScreen />}
        {tab === 'auto' && <AutoDesign key={params.get('q') ?? ''} initialTitle={params.get('q') ?? ''} />}
        {tab === 'projects' && (
          <div className="dash-main">
            <h1 className="dash-h1">Projects</h1>
            <ProjectGrid />
          </div>
        )}
        {tab === 'templates' && (
          <div className="dash-main">
            <h1 className="dash-h1">Template gallery</h1>
            <TemplateGallery key={params.get('q') ?? ''} initialQuery={params.get('q') ?? ''} onUse={(t) => (location.hash = `#/new?template=${t.id}`)} />
          </div>
        )}
        {tab === 'brand' && <BrandHome />}
        {tab === 'account' && <AccountPage />}
        {tab === 'pricing' && <PricingPage />}
        {tab === 'new' && <NewPinFlow key={params.toString()} initialTemplateId={params.get('template') ?? undefined} initialType={(params.get('type') as DesignType) ?? undefined} />}
      </div>
    </div>
  );
}

function HomeScreen() {
  const popular = useMemo(() => POPULAR.map((id) => allTemplates().find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t), []);
  const [title, setTitle] = useState('');
  return (
    <div className="dash-main">
      <section className="card home-hero">
        <div className="stack-sm">
          <h2 className="dash-h2">
            <Wand2 size={20} style={{ verticalAlign: '-3px' }} /> Auto Design — type a title, press Enter
          </h2>
          <p className="muted">Enter your article title or primary keyword and get a dozen ready-made Pins with the text already fitted.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) location.hash = `#/auto?q=${encodeURIComponent(title.trim())}`;
          }}
        >
          <div className="search-box auto-input">
            <Sparkles size={20} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 Bronde Hair Color Ideas — or just “bronde hair”" aria-label="Article title or primary keyword" />
            <button className="btn btn-pink" type="submit" disabled={!title.trim()}>
              Design Pins
            </button>
          </div>
        </form>
      </section>
      <section className="card home-hero">
        <div className="stack-sm">
          <h1 className="dash-h1">Create Stunning Pinterest Pins</h1>
          <p className="muted">Choose a design type to get started</p>
        </div>
        <div className="home-types" role="radiogroup" aria-label="Design type">
          {HOME_TYPES.map((id) => {
            const def = DESIGN_TYPES.find((d) => d.id === id)!;
            return <TypeCard key={id} def={def} compact onPick={() => (location.hash = `#/new?type=${id}`)} />;
          })}
        </div>
      </section>
      <Onboarding />
      <section className="stack">
        <div className="row-between">
          <h2 className="dash-h2">Popular Templates</h2>
          <a className="link-pink" href="#/templates">
            See All <ArrowRight size={15} />
          </a>
        </div>
        <div className="popular-row">
          {popular.map((t) => (
            <TemplateCard key={t.id} t={t} compact onUse={(x) => (location.hash = `#/new?template=${x.id}`)} />
          ))}
        </div>
      </section>
      <section className="stack">
        <div className="row-between">
          <h2 className="dash-h2">Recent projects</h2>
          <a className="link-pink" href="#/projects">
            All projects <ArrowRight size={15} />
          </a>
        </div>
        <ProjectGrid limit={8} />
      </section>
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
        <h2 className="dash-h2">Get started in four steps</h2>
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

function ProjectGrid({ limit }: { limit?: number }) {
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
  const shown = limit ? projects?.slice(0, limit) : projects;

  return (
    <>
      {error && <div className="issue">{error}</div>}
      {projects === null && !error && <span className="subtle">Loading…</span>}
      {projects?.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p className="muted">No Pins yet. Create your first one — it autosaves as you work.</p>
        </div>
      )}
      <div className="project-grid">
        {shown?.map((p) => (
          <div key={p.id} className="card project-card" onClick={() => (location.hash = `#/editor/${p.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (location.hash = `#/editor/${p.id}`)} aria-label={`Open ${p.name}`}>
            <div className="project-thumb" style={{ aspectRatio: `${p.doc.width} / ${p.doc.height}` }}>
              {p.thumbnail ? <img src={p.thumbnail} alt="" /> : <ImageIcon className="subtle" />}
            </div>
            <div className="project-meta" onClick={(e) => e.stopPropagation()}>
              <div style={{ minWidth: 0 }}>
                <strong title={p.name}>{p.name}</strong>
                <span className="subtle">
                  {p.doc.width}×{p.doc.height}
                  {(p.pages?.length ?? 1) > 1 ? ` · ${p.pages.length} pages` : ''} · {new Date(p.meta.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <IconButton label="Project actions" onClick={() => setMenu(menu === p.id ? null : p.id)}>
                  <MoreHorizontal size={16} />
                </IconButton>
                {menu === p.id && (
                  <div className="popover menu" style={{ right: 0, bottom: '100%', width: 180 }} role="menu">
                    <button
                      className="menu-item"
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
                      className="menu-item"
                      role="menuitem"
                      onClick={async () => {
                        setMenu(null);
                        if (!(await ensureCanCreateProject())) return;
                        try {
                          await duplicateProject(p);
                        } catch (e) {
                          if (!handleLimitError(e)) throw e;
                        }
                        refresh();
                      }}
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    <button
                      className="menu-item btn-danger"
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
    </>
  );
}

function BrandHome() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [draft, setDraft] = useState<BrandKit>(kit);
  useEffect(() => setDraft(kit), [kit]);
  return (
    <div className="dash-main" style={{ maxWidth: 680 }}>
      <h1 className="dash-h1">Brand Kit</h1>
      <p className="muted">Your website, colors and fonts. Used by website footers, the color picker and “Apply brand”.</p>
      <div className="card" style={{ padding: 20 }}>
        <BrandKitEditor kit={draft} onChange={setDraft} />
      </div>
      <div className="row">
        <button
          className="btn btn-pink"
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
