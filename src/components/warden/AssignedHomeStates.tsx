import { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { useActiveProject } from '@/hooks/useActiveProject';

interface AssignedHomeStatesProps {
  homeId?: string | null;
  home?: unknown;
  isLoading?: boolean;
  children: ReactNode;
}

export function AssignedHomeStates({
  homeId: homeIdProp,
  home: homeProp,
  isLoading: isLoadingProp,
  children,
}: AssignedHomeStatesProps) {
  const active = useActiveProject();
  const homeId = homeIdProp ?? active.homeId;
  const home = homeProp ?? active.home;
  const isLoading = isLoadingProp ?? active.isLoading;

  if (!active.hasAssignments && !homeId) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not Assigned to Any Project</h1>
            <p className="text-muted-foreground max-w-md">
              You have not been assigned to a project yet. Please contact an administrator.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 md:h-96 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!home) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
            <p className="text-muted-foreground max-w-md mb-6">
              The selected project could not be found. Choose another project or contact an administrator.
            </p>
            {active.assignedProjects.length > 1 && <ProjectSwitcher />}
          </div>
        </div>
      </MainLayout>
    );
  }

  return <>{children}</>;
}
