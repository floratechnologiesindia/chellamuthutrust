import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HomeHeroImage } from '@/components/homes/HomeHeroImage';
import { HomeProfileGallery } from '@/components/homes/HomeProfileGallery';
import { MapPin, Phone, Mail, Baby, Heart, Users, UserCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { HomePhoto } from '@/hooks/useHomePhotos';
import type { HomeWithTrust } from '@/hooks/useAssignedHome';
import type { Database } from '@/integrations/supabase/types';

type HomeType = Database['public']['Enums']['home_type'];

export const homeTypeLabels: Record<HomeType, string> = {
  children_home: 'Children Home',
  old_age_home: 'Old Age Home',
  mixed: 'Mixed Care',
  others: 'Other',
  special_children: 'Special Children Home',
};

interface HomeProfileViewProps {
  home: HomeWithTrust;
  photos: HomePhoto[];
  showSupportCta?: boolean;
}

export function HomeProfileView({ home, photos, showSupportCta = true }: HomeProfileViewProps) {
  const { user } = useAuth();
  const trust = home.trusts;
  const socialWorker = home.primary_social_worker;
  const childrenTotal = (home.capacity_children_male || 0) + (home.capacity_children_female || 0);
  const elderlyTotal = (home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0);
  const totalCapacity = childrenTotal + elderlyTotal;
  const canLinkSocialWorker = user?.role === 'super_admin' && socialWorker?.id;

  return (
    <div className="home-profile-view grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* 1. Name */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant="secondary">{homeTypeLabels[home.type]}</Badge>
            {trust && <span className="text-sm text-primary">{trust.name}</span>}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{home.name}</h1>
        </div>

        {/* 2. Capacity */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="home-profile-stat-card">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalCapacity}</p>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
            </CardContent>
          </Card>
          {childrenTotal > 0 && (
            <Card className="home-profile-stat-card">
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
            <Card className="home-profile-stat-card">
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

        {/* 3. Main photo */}
        <HomeHeroImage src={home.image_url} alt={home.name} />

        {/* 4. Description */}
        {home.description && (
          <p className="text-lg text-muted-foreground leading-relaxed">{home.description}</p>
        )}

        {/* 5. Facilities */}
        {home.facilities && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facilities</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {home.facilities}
            </CardContent>
          </Card>
        )}

        {/* 6. Photo gallery */}
        <HomeProfileGallery photos={photos} />
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="home-profile-contact-card">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {home.address}
                  <br />
                  {home.city}, {home.state}
                  <br />
                  {home.country} - {home.pincode}
                </p>
              </div>
            </div>

            {(home.supported_by || home.year_established) && (
              <div className="text-sm text-muted-foreground space-y-1">
                {home.year_established && <p>Established in {home.year_established}</p>}
                {home.supported_by && <p>Supported by {home.supported_by}</p>}
              </div>
            )}

            {socialWorker ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Person</p>
                    <p className="font-medium">Social Worker — {socialWorker.name}</p>
                  </div>
                </div>
                {socialWorker.phone && (
                  <div className="flex items-center gap-2 pl-7">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${socialWorker.phone}`} className="text-sm text-primary hover:underline">
                      {socialWorker.phone}
                    </a>
                  </div>
                )}
                {socialWorker.email && (
                  <div className="flex items-center gap-2 pl-7">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${socialWorker.email}`} className="text-sm text-primary hover:underline break-all">
                      {socialWorker.email}
                    </a>
                  </div>
                )}
                {canLinkSocialWorker && (
                  <Button variant="link" className="h-auto p-0 pl-7 text-sm" asChild>
                    <Link to={`/super-admin/staff/${socialWorker.id}/edit`}>
                      View social worker profile
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            ) : home.contact_details ? (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Contact</p>
                  <p className="text-sm text-muted-foreground">{home.contact_details}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {showSupportCta && (
          <Card className="home-profile-cta-card bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <Heart className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="font-display text-xl font-semibold mb-2">Support This Project</h3>
              <p className="text-sm opacity-90 mb-4">
                Browse available requirements and make a difference in the lives of residents.
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link to={`/sponsor?home=${home.id}`}>View All Requirements</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {trust && (
          <Card className="home-profile-about-card">
            <CardHeader>
              <CardTitle>About the Trust</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">{trust.name}</h4>
              {trust.description && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{trust.description}</p>
              )}
              {trust.registration_number && (
                <p className="text-xs text-muted-foreground">Registration: {trust.registration_number}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
