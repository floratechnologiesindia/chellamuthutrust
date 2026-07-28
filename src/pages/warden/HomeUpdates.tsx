import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HomeProfileView } from '@/components/homes/HomeProfileView';
import { ProjectProfileEditor } from '@/components/homes/ProjectProfileEditor';
import { ResidentDirectory } from '@/components/residents/ResidentDirectory';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { useAssignedHome } from '@/hooks/useAssignedHome';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

type HomeEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  description?: string;
  status: string;
};

type CaseStudy = {
  id: string;
  title: string;
  resident_name?: string;
  summary: string;
  story?: string;
  status: string;
};

function useHomeEvents(homeId: string | null) {
  return useQuery({
    queryKey: ['home-events', homeId],
    queryFn: async () => {
      if (!homeId) return [] as HomeEvent[];
      const { data, error } = await supabase.from('home_events').select('*').eq('home_id', homeId).order('event_date', { ascending: false });
      if (error) throw error;
      return data as HomeEvent[];
    },
    enabled: !!homeId,
  });
}

function useCaseStudies(homeId: string | null) {
  return useQuery({
    queryKey: ['case-studies', homeId],
    queryFn: async () => {
      if (!homeId) return [] as CaseStudy[];
      const { data, error } = await supabase.from('case_studies').select('*').eq('home_id', homeId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as CaseStudy[];
    },
    enabled: !!homeId,
  });
}

const WardenHomeUpdates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { homeId, home, photos, isLoading } = useAssignedHome();
  const qc = useQueryClient();
  const { data: events = [] } = useHomeEvents(homeId);
  const { data: stories = [] } = useCaseStudies(homeId);

  const [editing, setEditing] = useState(false);

  const createEvent = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from('home_events').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home-events'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
      toast.success('Event saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createStory = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from('case_studies').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-studies'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
      toast.success('Case study saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'celebration',
    event_date: new Date().toISOString().slice(0, 10),
    description: '',
    status: 'PUBLISHED',
  });
  const [storyForm, setStoryForm] = useState({
    title: '',
    resident_name: '',
    summary: '',
    story: '',
    status: 'DRAFT',
  });

  return (
    <AssignedHomeStates homeId={homeId} home={home} isLoading={isLoading}>
      {home && homeId && (
        <MainLayout>
          <div className="container py-8 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="md:hidden">
                <ProjectSwitcher className="w-full max-w-xs" />
              </div>
              <p className="text-sm text-muted-foreground">{home.name}</p>
              <h1 className="text-3xl font-display font-bold">Project Updates</h1>
              <p className="text-muted-foreground">
                Project profile, residents, events, and success stories
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(tab) => setSearchParams({ tab }, { replace: true })}
            >
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="profile">Project Profile</TabsTrigger>
                <TabsTrigger value="residents">Resident Profiles</TabsTrigger>
                <TabsTrigger value="events">Events & Activities</TabsTrigger>
                <TabsTrigger value="stories">Case Studies</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Update the description, photographs, capacity, and contact details donors see.
                  </p>
                  <Button variant="outline" onClick={() => setEditing((v) => !v)}>
                    {editing ? 'Done editing' : 'Edit profile'}
                  </Button>
                </div>

                {editing ? (
                  <ProjectProfileEditor
                    home={home}
                    onSaved={() => setEditing(false)}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <HomeProfileView home={home} photos={photos} showSupportCta={false} />
                )}
              </TabsContent>

              <TabsContent value="residents" className="mt-6">
                <ResidentDirectory homeId={homeId} />
              </TabsContent>

              <TabsContent value="events" className="mt-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Add event / activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Title</Label>
                      <Input value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((p) => ({ ...p, event_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="celebration">Celebration</SelectItem>
                          <SelectItem value="awareness">Awareness programme</SelectItem>
                          <SelectItem value="special">Special event</SelectItem>
                          <SelectItem value="recreation">Recreational activity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
                    </div>
                    <Button
                      className="sm:col-span-2 w-fit"
                      disabled={!eventForm.title.trim() || createEvent.isPending}
                      onClick={() => {
                        if (!home.trust_id) {
                          toast.error('Trust missing on project');
                          return;
                        }
                        createEvent.mutate({
                          ...eventForm,
                          home_id: homeId,
                          trust_id: home.trust_id,
                        });
                        setEventForm((p) => ({ ...p, title: '', description: '' }));
                      }}
                    >
                      Save event
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No events documented yet.</p>
                  ) : (
                    events.map((ev) => (
                      <Card key={ev.id}>
                        <CardContent className="py-4 flex justify-between gap-3">
                          <div>
                            <p className="font-medium">{ev.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {ev.event_date} · {ev.event_type}
                            </p>
                            {ev.description && <p className="text-sm mt-1">{ev.description}</p>}
                          </div>
                          <Badge variant="outline">{ev.status}</Badge>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stories" className="mt-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add case study / success story</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input value={storyForm.title} onChange={(e) => setStoryForm((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Resident name (optional)</Label>
                      <Input value={storyForm.resident_name} onChange={(e) => setStoryForm((p) => ({ ...p, resident_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Summary *</Label>
                      <Textarea value={storyForm.summary} onChange={(e) => setStoryForm((p) => ({ ...p, summary: e.target.value }))} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label>Full story</Label>
                      <Textarea value={storyForm.story} onChange={(e) => setStoryForm((p) => ({ ...p, story: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select value={storyForm.status} onValueChange={(v) => setStoryForm((p) => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="SUBMITTED">Submitted</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      disabled={!storyForm.title.trim() || !storyForm.summary.trim() || createStory.isPending}
                      onClick={() => {
                        createStory.mutate({
                          ...storyForm,
                          home_id: homeId,
                          trust_id: home.trust_id,
                        });
                        setStoryForm({ title: '', resident_name: '', summary: '', story: '', status: 'DRAFT' });
                      }}
                    >
                      Save case study
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {stories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No case studies yet.</p>
                  ) : (
                    stories.map((s) => (
                      <Card key={s.id}>
                        <CardContent className="py-4 space-y-1">
                          <div className="flex justify-between gap-2">
                            <p className="font-medium">{s.title}</p>
                            <Badge variant="outline">{s.status}</Badge>
                          </div>
                          {s.resident_name && <p className="text-sm text-muted-foreground">{s.resident_name}</p>}
                          <p className="text-sm">{s.summary}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenHomeUpdates;
