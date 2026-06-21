import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Film, Home, Plus, FileText } from 'lucide-react';
import { useDraftStore } from '@/store/useDraftStore';
import { useReviewStore } from '@/store/useReviewStore';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getIncompleteCount } = useDraftStore();
  const { createNewDraft } = useReviewStore();
  const incompleteCount = getIncompleteCount();

  const handleNewReview = () => {
    const draft = createNewDraft();
    navigate(`/viewer/${draft.id}`);
  };

  const navItems = [
    { path: '/', label: '首页', icon: Home, onClick: undefined },
    { path: undefined, label: '新建核查', icon: Plus, onClick: handleNewReview },
    { path: '/drafts', label: '草稿箱', icon: FileText, badge: incompleteCount, onClick: undefined },
  ];

  return (
    <nav className="bg-[#1e3a5f] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Film className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-wide">胶片质控核查系统</h1>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.path ? location.pathname === item.path : false;

              const content = (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-5 text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              );

              const className = cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              );

              if (item.onClick) {
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={className}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={index}
                  to={item.path!}
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
