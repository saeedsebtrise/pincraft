import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dashboard, type DashTab } from './dashboard/Dashboard';
import { EditorScreen } from './editor/Editor';
import { useAccount } from './saas/accountStore';
import { AuthScreen, type AuthView } from './saas/ui/AuthScreen';
import { UpgradeDialog } from './saas/ui/PlanViews';
import { useLibrary } from './store/libraryStore';
import { ErrorBoundary, Toasts } from './ui/controls';

type Route = { screen: 'editor'; id: string } | { screen: 'auth'; view: AuthView } | { screen: DashTab; params: URLSearchParams };

/** Hash routes: #/  #/auto?q=…  #/projects  #/templates?q=…  #/brand  #/new?type=…|template=…  #/editor/:id
 *  #/account  #/pricing  #/login  #/signup  #/forgot  #/reset-password */
function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const m = path.match(/^\/editor\/([\w-]+)/);
  if (m) return { screen: 'editor', id: m[1] };
  const auth: Record<string, AuthView> = { '/login': 'login', '/signup': 'signup', '/forgot': 'forgot', '/reset-password': 'reset' };
  if (auth[path]) return { screen: 'auth', view: auth[path] };
  if (path.startsWith('/auto')) return { screen: 'auto', params };
  if (path.startsWith('/templates')) return { screen: 'templates', params };
  if (path.startsWith('/brand')) return { screen: 'brand', params };
  if (path.startsWith('/projects')) return { screen: 'projects', params };
  if (path.startsWith('/account')) return { screen: 'account', params };
  if (path.startsWith('/pricing')) return { screen: 'pricing', params };
  if (path.startsWith('/new')) return { screen: 'new', params };
  return { screen: 'home', params };
}

export function App() {
  const [hash, setHash] = useState(location.hash);
  const acc = useAccount();
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    void useAccount.getState().init().then(() => useLibrary.getState().load());
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const route = parseRoute(hash);

  let screen: React.ReactNode;
  if (acc.status === 'loading') {
    screen = (
      <div className="error-screen">
        <Loader2 aria-label="Loading your studio" />
      </div>
    );
  } else if (route.screen === 'auth') {
    // Signed-in users who land on sign-in pages go to the studio (except the password-reset step).
    screen = acc.status === 'signedIn' && route.view !== 'reset' ? <Redirect to="#/" /> : <AuthScreen key={route.view} view={route.view} />;
  } else if (acc.status === 'signedOut') {
    screen = <AuthScreen view="login" />;
  } else if (route.screen === 'editor') {
    screen = <EditorScreen key={`${route.id}:${acc.account?.id}`} projectId={route.id} />;
  } else {
    screen = <Dashboard key={acc.account?.id} tab={route.screen} params={route.params} />;
  }

  return (
    <ErrorBoundary>
      {screen}
      <UpgradeDialog />
      <Toasts />
    </ErrorBoundary>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    location.hash = to;
  }, [to]);
  return null;
}
