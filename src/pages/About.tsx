import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, Target, Award } from 'lucide-react';
import founderImage from '@/assets/founder.png';

const About = () => {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
              About MS Chellamuthu Trust
            </h1>
            <p className="text-lg text-muted-foreground">
              Promoting mental health and supporting children's homes, old age care 
              through donations and sponsorships since 1983.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 lg:py-24 bg-muted/30 overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Founder Image & Card */}
            <div className="relative">
              <div className="relative max-w-md mx-auto lg:mx-0">
                {/* Image */}
                <div className="relative">
                  <img 
                    src={founderImage} 
                    alt="Dr. C. Ramasubramanian - Founder" 
                    className="w-full rounded-2xl shadow-2xl"
                  />
                  {/* Decorative elements */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
                  <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                </div>
                
                {/* Info Card Overlay */}
                <div className="absolute -bottom-6 left-4 right-4 sm:left-8 sm:right-8 bg-card rounded-xl shadow-xl p-5 sm:p-6 border border-border">
                  <h3 className="font-display text-xl sm:text-2xl font-bold">Dr. C. Ramasubramanian</h3>
                  <p className="text-accent font-semibold mb-3">Founder</p>
                  <blockquote className="text-muted-foreground italic text-sm leading-relaxed">
                    "Together, we can make Mental Health accessible and affordable to everyone."
                  </blockquote>
                </div>
              </div>
            </div>

            {/* Founder Bio */}
            <div className="pt-12 lg:pt-0">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Dr. C. Ramasubramanian
              </h2>
              <p className="text-muted-foreground font-medium mb-6">M.D., D.P.M., Ph.D.</p>
              
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Dr. C. Ramasubramanian (Dr. CRS), a distinguished luminary in the field of mental health 
                  with a rich legacy of over 40 years. Hailing as a trailblazer from Madurai District, 
                  his journey has been punctuated by remarkable achievements.
                </p>
                <p>
                  Notably, he etched his name in history by securing the pioneering Ph.D. in Community 
                  Psychiatry from Madurai Kamaraj University in 2012, building upon earlier laurels from 
                  Madurai Medical College.
                </p>
                <p>
                  Driven by an unwavering dedication to community psychiatry and psycho-social rehabilitation, 
                  his ardor originates from personal encounters with mental health stigma, ignited while caring 
                  for his own brother. This ignited his vision for comprehensive mental health rehabilitation 
                  services in India.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <Target className="h-12 w-12 mb-4 opacity-80" />
                <h2 className="font-display text-2xl font-bold mb-4">Our Mission</h2>
                <p className="opacity-90">
                  To create a seamless bridge between generous donors and verified projects, 
                  ensuring transparent, impactful support reaches those who need it most. 
                  We believe every act of kindness can transform lives.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Award className="h-12 w-12 mb-4 text-primary" />
                <h2 className="font-display text-2xl font-bold mb-4">Our Vision</h2>
                <p className="text-muted-foreground">
                  A world where every orphaned child receives quality education, 
                  every elderly person lives with dignity, and communities come together 
                  to support the most vulnerable among us.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Our Core Values
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Compassion</h3>
                <p className="text-sm text-muted-foreground">
                  Every action is driven by genuine care for the well-being of others
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Building connections between donors, homes, and beneficiaries
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  Clear tracking of every donation and its impact
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Striving for the highest standards in service and support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-8">
              Our Story
            </h2>
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p>
                Chellamuthu Trust was founded in 2020 with a simple but powerful idea: 
                to make charitable giving personal, meaningful, and transparent. Named after 
                the founder's grandmother who dedicated her life to serving others, the trust 
                carries forward her legacy of selfless service.
              </p>
              <p>
                Today, we work with multiple projects across Tamil Nadu, connecting thousands 
                of well-wishers with children and elderly who need support. Our unique date-based 
                sponsorship model allows donors to give on days that matter to them — birthdays, 
                anniversaries, or in memory of loved ones — making each contribution a meaningful 
                celebration.
              </p>
              <p>
                Every meal sponsored, every uniform provided, every medical checkup funded 
                brings us closer to our vision of a world where no one is left behind.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default About;
