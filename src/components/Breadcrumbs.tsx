import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const routeNames: Record<string, string> = {
  'owner': 'Owner System',
  'user': 'Staff System',
  'dashboard': 'Dashboard',
  'create-farm': 'Create Farm',
  'edit-farm': 'Edit Farm',
  'add-user': 'Add User',
  'manage-users': 'Manage Users',
  'profile': 'Profile',
  'farms': 'Farms',
  'reports': 'Reports',
  'consolidated-reports': 'Consolidated Reports',
  'activity': 'Record Activity',
  'daily-report': 'Daily Report',
};

// Activity types
const activityNames: Record<string, string> = {
  'feed': 'Feed',
  'treatment': 'Treatment',
  'water': 'Water Quality',
  'animal': 'Animal Quality',
  'stocking': 'Stocking',
  'observation': 'Observation',
};

export const Breadcrumbs = ({ className = "", lightTheme = false }: { className?: string, lightTheme?: boolean }) => {
  const location = useLocation();
  const { user } = useAuth();
  const paths = location.pathname.split('/').filter(p => p);

  // Don't show breadcrumbs on login or splash
  if (paths.length === 0 || paths[0] === 'login') return null;

  const textColor = lightTheme ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-primary";
  const activeColor = lightTheme ? "text-white font-bold" : "text-foreground font-semibold";
  const chevronOp = lightTheme ? "opacity-60 text-white" : "opacity-50";

  // Filter out the generic root terms like 'owner' and 'user' from the visual path
  const visualPaths = paths.filter(p => p !== 'owner' && p !== 'user');

  return (
    <nav className={`flex items-center text-[10px] sm:text-xs whitespace-nowrap overflow-x-auto pb-2 mb-2 w-full no-scrollbar ${className}`}>
      <Link to={user?.role === 'owner' ? '/owner/dashboard' : '/user/dashboard'} className={`flex items-center transition-colors ${textColor}`}>
        <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
        <span className="font-semibold">{user?.hatchery_name || (user?.role === 'owner' ? 'Owner System' : 'Staff System')}</span>
      </Link>
      
      {visualPaths.map((path, index) => {
        const isLast = index === visualPaths.length - 1;
        
        let label = routeNames[path] || activityNames[path] || path;
        
        // Capitalize if not found in map
        if (label === path && isNaN(Number(path))) {
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }

        // Reconstruct the actual URL for the link
        const actualIndex = paths.indexOf(path);
        const to = `/${paths.slice(0, actualIndex + 1).join('/')}`;

        return (
          <div key={to} className="flex items-center">
            <ChevronRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mx-1 flex-shrink-0 ${chevronOp}`} />
            {isLast ? (
              <span className={`truncate max-w-[150px] sm:max-w-none ${activeColor}`}>
                {label}
              </span>
            ) : (
              <Link to={to} className={`transition-colors truncate max-w-[100px] sm:max-w-none ${textColor}`}>
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
