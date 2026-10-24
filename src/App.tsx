import { useEffect, useState } from 'react';
import { Dashboard, type DashTab } from './dashboard/Dashboard';
import { EditorScreen } from './editor/Editor';
import { useLibrary } from './store/libraryStore';
import { ErrorBoundary, Toasts } from './ui/controls';

/** Hash routes: #/  #/projects  #/templates?q=…  #/brand  #/new?type=…|template=…  #/editor/:id */
function parseRoute(hash: string): { screen: 'editor'; id: string } | { screen: DashTab; params: URLSearchParams } {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const m = path.match(/^\/editor\/([\w-]+)/);
  if (m) return { screen: 'editor', id: m[1] };
  if (path.startsWith('/templates')) return { screen: 'templates', params };
  if (path.startsWith('/brand')) return { screen: 'brand', params };
  if (path.startsWith('/projects')) return { screen: 'projects', params };
  if (path.startsWith('/new')) return { screen: 'new', params };
  return { screen: 'home', params };
}

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    useLibrary.getState().load();
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const route = parseRoute(hash);
  return (
    <ErrorBoundary>
      {route.screen === 'editor' ? <EditorScreen key={route.id} projectId={route.id} /> : <Dashboard tab={route.screen} params={route.params} />}
      <Toasts />
    </ErrorBoundary>
  );
}
