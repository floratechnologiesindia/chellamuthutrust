import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NeedCard } from '@/components/needs/NeedCard';
import { PhotoGalleryCarousel } from '@/components/homes/PhotoGalleryCarousel';
import { WardenHelpSection } from '@/components/homes/WardenHelpSection';
import { useHome } from '@/hooks/useHomes';
import { useNeeds } from '@/hooks/useNeeds';
import { useHomePhotos } from '@/hooks/useHomePhotos';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Users, Phone, Mail, Baby, Heart, ArrowLeft, Calendar } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type HomeType = Database['public']['Enums']['home_type'];

const homeTypeLabels: Record<HomeType, string> = {
  'children_home': 'Children Home',
  'old_age_home': 'Old Age Home',
  'mixed': 'Mixed Care',
  'others': 'Other',
  'special_children': 'Special Children Home',
};

interface HomeWithTrust {
  id: string;
  trust_id: string;
  name: string;
  type: HomeType;
  description: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  capacity_children_male: number | null;
  capacity_children_female: number | null;
  capacity_elderly_male: number | null;
  capacity_elderly_female: number | null;
  image_url: string | null;
  trusts?: {
    id: string;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    registration_number?: string;
  } | null;
}

const HomeDetail = () => {
  const { homeId } = useParams<{ homeId: string }>();
  const { user } = useAuth();
  
  const { data: home, isLoading: homeLoading } = useHome(homeId || null) as { data: HomeWithTrust | null; isLoading: boolean };
  const { data: allNeeds, isLoading: needsLoading } = useNeeds({ homeId });
  const { data: photos = [] } = useHomePhotos(homeId || null);
  
  const homeNeeds = allNeeds?.filter(n => n.status === 'OPEN' || n.status === 'PARTIAL') || [];
  const trust = home?.trusts;
  
  // Check if user is a social worker/admin/super_admin - they can see the help management section
  const canManageHelp = user?.role === 'warden' || user?.role === 'admin' || user?.role === 'super_admin';

  if (homeLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-64 md:h-96 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32" />
              <div className="grid sm:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!home) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Home Not Found</h1>
          <p className="text-muted-foreground mb-6">The care home you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link to="/homes">Browse All Homes</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const childrenTotal = (home.capacity_children_male || 0) + (home.capacity_children_female || 0);
  const elderlyTotal = (home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0);
  const totalCapacity = childrenTotal + elderlyTotal;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/homes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Homes
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery - Inside grid to avoid sidebar overlap */}
            <PhotoGalleryCarousel 
              photos={photos} 
              fallbackImage={home.image_url}
            />

            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary">{homeTypeLabels[home.type]}</Badge>
                {trust && <span className="text-sm text-primary">{trust.name}</span>}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{home.name}</h1>
              <p className="text-lg text-muted-foreground">{home.description}</p>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalCapacity}</p>
                  <p className="text-sm text-muted-foreground">Total Capacity</p>
                </CardContent>
              </Card>
              {childrenTotal > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Baby className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{childrenTotal}</p>
                    <p className="text-sm text-muted-foreground">
                      Children ({home.capacity_children_male || 0}M / {home.capacity_children_female || 0}F)
                    </p>
                  </CardContent>
                </Card>
              )}
              {elderlyTotal > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{elderlyTotal}</p>
                    <p className="text-sm text-muted-foreground">
                      Elderly ({home.capacity_elderly_male || 0}M / {home.capacity_elderly_female || 0}F)
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Social Worker Help Management Section */}
            {canManageHelp && homeId && home && (
              <WardenHelpSection homeId={homeId} trustId={home.trust_id} />
            )}

            {/* Current Needs - Only show for public visitors */}
            {!canManageHelp && (
              needsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                  </div>
                </div>
              ) : homeNeeds.length > 0 ? (
                <div>
                  <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Current Requirements
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {homeNeeds.map(need => (
                      <NeedCard key={need.id} need={need} showHome={false} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No current requirements for this home</p>
                </div>
              )
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {home.address}<br />
                      {home.city}, {home.state}<br />
                      {home.country} - {home.pincode}
                    </p>
                  </div>
                </div>
                {trust && (
                  <>
                    {trust.contact_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <a href={`tel:${trust.contact_phone}`} className="text-sm text-primary hover:underline">
                            {trust.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {trust.contact_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email</p>
                          <a href={`mailto:${trust.contact_email}`} className="text-sm text-primary hover:underline">
                            {trust.contact_email}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <Heart className="h-8 w-8 mb-4 opacity-80" />
                <h3 className="font-display text-xl font-semibold mb-2">Support This Home</h3>
                <p className="text-sm opacity-90 mb-4">
                  Browse available requirements and make a difference in the lives of residents.
                </p>
                <Button variant="secondary" className="w-full" asChild>
                  <Link to={`/sponsor?home=${home.id}`}>
                    View All Requirements
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Trust Info */}
            {trust && (
              <Card>
                <CardHeader>
                  <CardTitle>About the Trust</CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2">{trust.name}</h4>
                  {trust.description && (
                    <p className="text-sm text-muted-foreground mb-3">{trust.description}</p>
                  )}
                  {trust.registration_number && (
                    <p className="text-xs text-muted-foreground">
                      Registration: {trust.registration_number}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomeDetail;
