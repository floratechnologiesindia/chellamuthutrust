import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderKanban } from 'lucide-react';
import { useActiveProject } from '@/hooks/useActiveProject';

export function ProjectSwitcher({ className }: { className?: string }) {
  const { assignedProjects, homeId, setActiveProjectId, isLoading } = useActiveProject();

  if (isLoading || assignedProjects.length <= 1) {
    return null;
  }

  return (
    <Select value={homeId || ''} onValueChange={setActiveProjectId}>
      <SelectTrigger className={`h-9 w-[9.5rem] max-w-[28vw] shrink-0 text-xs sm:text-sm ${className || ''}`}>
        <FolderKanban className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {assignedProjects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
            {project.city ? ` (${project.city})` : ''}
            {project.isPrimary ? ' · Primary' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
