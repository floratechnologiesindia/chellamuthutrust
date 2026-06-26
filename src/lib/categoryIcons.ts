import { 
  Utensils, 
  Heart, 
  List, 
  HandHelping, 
  PiggyBank, 
  Gift, 
  HelpCircle, 
  LucideIcon,
  Rocket,
  Users,
  Home,
  BookOpen,
  Stethoscope,
  GraduationCap,
  Shirt,
  Package,
  Sparkles
} from 'lucide-react';

export const categoryIconMap: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'heart': Heart,
  'list': List,
  'hand-helping': HandHelping,
  'piggy-bank': PiggyBank,
  'gift': Gift,
  'rocket': Rocket,
  'users': Users,
  'home': Home,
  'book-open': BookOpen,
  'stethoscope': Stethoscope,
  'graduation-cap': GraduationCap,
  'shirt': Shirt,
  'package': Package,
  'sparkles': Sparkles,
  'help-circle': HelpCircle,
};

export const getCategoryIcon = (iconName: string | null | undefined): LucideIcon => {
  return iconName ? categoryIconMap[iconName] || HelpCircle : HelpCircle;
};

export const getAvailableIcons = () => Object.keys(categoryIconMap);
