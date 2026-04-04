import { useNavigate } from 'react-router-dom';
import { ActivityRecord } from '@/hooks/useActivities';
import { ClipboardList, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActivityListProps {
  activities: ActivityRecord[];
  onDelete: (id: string) => void;
}

const activityColors: Record<string, string> = {
  Feed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Treatment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Water Quality': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Animal Quality': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Stocking: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Observation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const ActivityList = ({ activities, onDelete }: ActivityListProps) => {
  const navigate = useNavigate();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">No activities recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map(a => (
        <div
          key={a.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <div className="flex-1 min-w-0" onClick={() => navigate(`/record-activity?edit=${a.id}`)}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activityColors[a.activity] || 'bg-muted text-muted-foreground'}`}>
                {a.activity}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">{a.tank}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {a.date} · {a.time} {a.ampm}
              {a.comments ? ` — ${a.comments}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => navigate(`/record-activity?edit=${a.id}`)}
            >
              <Edit2 className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => onDelete(a.id)}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
