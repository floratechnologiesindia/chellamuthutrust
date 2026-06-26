import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import logo from '@/assets/logo.jpg';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img 
                src={logo} 
                alt="MS Chellamuthu Trust Logo" 
                className="h-10 w-auto object-contain"
              />
              <span className="font-display text-xl font-semibold">MS Chellamuthu Trust</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Connecting compassionate hearts with those in need. Together, we can make a difference 
              in the lives of children and elderly across our communities.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/homes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Our Homes
              </Link>
              <Link to="/sponsor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sponsor a Need
              </Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <address className="not-italic text-sm text-muted-foreground space-y-2">
              <p>123 Gandhi Road</p>
              <p>Madurai, Tamil Nadu 625001</p>
              <p>India</p>
              <p className="pt-2">
                <a href="mailto:info@chellamuthutrust.org" className="hover:text-foreground transition-colors">
                  info@chellamuthutrust.org
                </a>
              </p>
              <p>
                <a href="tel:+919876543210" className="hover:text-foreground transition-colors">
                  +91 98765 43210
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MS Chellamuthu Trust & Research Foundation. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-destructive fill-destructive" /> for the community
          </p>
        </div>
      </div>
    </footer>
  );
};
