import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Trash2, User } from 'lucide-react';
import { Resident } from '@/types';
import { cn } from '@/lib/utils';

interface ResidentCardProps {
  resident: Resident;
  onEdit?: (resident: Resident) => void;
  onDelete?: (resident: Resident) => void;
}

export const ResidentCard = ({ resident, onEdit, onDelete }: ResidentCardProps) => {
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'child':
        return <Badge className="bg-primary/20 text-primary">Child</Badge>;
      case 'old_age':
        return <Badge className="bg-accent/20 text-accent">Elderly</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success">Active</Badge>;
      case 'moved_out':
        return <Badge className="bg-warning/20 text-warning">Moved Out</Badge>;
      case 'deceased':
        return <Badge className="bg-muted text-muted-foreground">Deceased</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      resident.status !== 'active' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={resident.photo_url} alt={resident.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(resident.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{resident.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {resident.age} years • {resident.gender}
                </p>
                {(resident.admission_date || resident.discharge_date) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {resident.admission_date ? `In: ${resident.admission_date}` : null}
                    {resident.admission_date && resident.discharge_date ? ' · ' : null}
                    {resident.discharge_date ? `Out: ${resident.discharge_date}` : null}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {getCategoryBadge(resident.category)}
                {getStatusBadge(resident.status)}
              </div>
            </div>
            
            {resident.special_needs && (
              <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                <span className="font-medium">Special needs:</span> {resident.special_needs}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-3">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(resident)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && resident.status === 'active' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(resident)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResidentCard;
