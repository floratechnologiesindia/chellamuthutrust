import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, 
  Search, Filter, LayoutGrid, LayoutList,
  Folder, Tag, Circle, GripVertical,
  ChevronsUpDown, ChevronsDownUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryIcon, categoryIconMap } from '@/lib/categoryIcons';
import {
  useAllCategories,
  useAllSubcategories,
  useAllSubSubcategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
  useCreateSubSubcategory,
  useUpdateSubSubcategory,
  useDeleteSubSubcategory,
  useUpdateCategoryOrder,
  useUpdateSubcategoryOrder,
  useUpdateSubSubcategoryOrder,
  Category,
  Subcategory,
  SubSubcategory,
} from '@/hooks/useCategories';

type ViewMode = 'hierarchy' | 'table';
type LevelFilter = 'all' | 'category' | 'subcategory' | 'sub_subcategory';

interface FlatItem {
  id: string;
  type: 'category' | 'subcategory' | 'sub_subcategory';
  label: string;
  description: string | null;
  parentPath: string;
  parentId: string | null;
  order: number;
  original: Category | Subcategory | SubSubcategory;
}

export const EnhancedCategoriesSection = () => {
  const { data: categories, isLoading: categoriesLoading } = useAllCategories();
  const { data: allSubcategories, isLoading: subcategoriesLoading } = useAllSubcategories();
  const { data: allSubSubcategories, isLoading: subSubcategoriesLoading } = useAllSubSubcategories();
  
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();
  const createSubSubcategory = useCreateSubSubcategory();
  const updateSubSubcategory = useUpdateSubSubcategory();
  const deleteSubSubcategory = useDeleteSubSubcategory();
  const updateCategoryOrder = useUpdateCategoryOrder();
  const updateSubcategoryOrder = useUpdateSubcategoryOrder();
  const updateSubSubcategoryOrder = useUpdateSubSubcategoryOrder();
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  
  // Expand state - initialize with all expanded
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);
  
  // Dialog state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [isSubSubcategoryDialogOpen, setIsSubSubcategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [editingSubSubcategory, setEditingSubSubcategory] = useState<SubSubcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({ label: '', key: '', description: '', icon: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ label: '', description: '' });
  const [subSubcategoryForm, setSubSubcategoryForm] = useState({ label: '', description: '' });

  // Expand all categories by default when loaded
  useEffect(() => {
    if (categories && categories.length > 0 && expandedCategories.length === 0) {
      setExpandedCategories(categories.map(c => c.id));
    }
  }, [categories]);

  useEffect(() => {
    if (allSubcategories && allSubcategories.length > 0 && expandedSubcategories.length === 0) {
      setExpandedSubcategories(allSubcategories.map(s => s.id));
    }
  }, [allSubcategories]);

  // Create flat list for table view
  const flatItems = useMemo((): FlatItem[] => {
    if (!categories) return [];
    
    const items: FlatItem[] = [];
    
    categories.forEach((cat, catIndex) => {
      items.push({
        id: cat.id,
        type: 'category',
        label: cat.label,
        description: cat.description,
        parentPath: '',
        parentId: null,
        order: catIndex,
        original: cat,
      });
      
      const subs = allSubcategories?.filter(s => s.category_id === cat.id) || [];
      subs.forEach((sub, subIndex) => {
        items.push({
          id: sub.id,
          type: 'subcategory',
          label: sub.label,
          description: sub.description,
          parentPath: cat.label,
          parentId: cat.id,
          order: subIndex,
          original: sub,
        });
        
        const subSubs = allSubSubcategories?.filter(ss => ss.subcategory_id === sub.id) || [];
        subSubs.forEach((subSub, ssIndex) => {
          items.push({
            id: subSub.id,
            type: 'sub_subcategory',
            label: subSub.label,
            description: subSub.description,
            parentPath: `${cat.label} → ${sub.label}`,
            parentId: sub.id,
            order: ssIndex,
            original: subSub,
          });
        });
      });
    });
    
    return items;
  }, [categories, allSubcategories, allSubSubcategories]);

  // Filter items
  const filteredItems = useMemo(() => {
    return flatItems.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesParent = item.parentPath.toLowerCase().includes(query);
        if (!matchesLabel && !matchesDescription && !matchesParent) return false;
      }
      
      // Level filter
      if (levelFilter !== 'all' && item.type !== levelFilter) return false;
      
      return true;
    });
  }, [flatItems, searchQuery, levelFilter]);

  // Filter categories for hierarchy view
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery && levelFilter === 'all') return categories;
    
    return categories.filter(cat => {
      // If filtering by subcategory or sub_subcategory level only, hide categories
      if (levelFilter === 'subcategory' || levelFilter === 'sub_subcategory') {
        // Check if any matching children exist
        const subs = allSubcategories?.filter(s => s.category_id === cat.id) || [];
        if (levelFilter === 'subcategory') {
          return subs.some(sub => {
            const matchesSearch = !searchQuery || sub.label.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
          });
        }
        // sub_subcategory level
        return subs.some(sub => {
          const subSubs = allSubSubcategories?.filter(ss => ss.subcategory_id === sub.id) || [];
          return subSubs.some(ss => {
            const matchesSearch = !searchQuery || ss.label.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
          });
        });
      }
      
      // Search in category and its children
      const matchesSearch = !searchQuery || 
        cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allSubcategories?.some(s => s.category_id === cat.id && s.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        allSubSubcategories?.some(ss => {
          const sub = allSubcategories?.find(s => s.id === ss.subcategory_id);
          return sub?.category_id === cat.id && ss.label.toLowerCase().includes(searchQuery.toLowerCase());
        });
      
      return matchesSearch;
    });
  }, [categories, allSubcategories, allSubSubcategories, searchQuery, levelFilter]);

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubcategoryExpanded = (subcategoryId: string) => {
    setExpandedSubcategories(prev => 
      prev.includes(subcategoryId) 
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const expandAll = () => {
    setExpandedCategories(categories?.map(c => c.id) || []);
    setExpandedSubcategories(allSubcategories?.map(s => s.id) || []);
  };

  const collapseAll = () => {
    setExpandedCategories([]);
    setExpandedSubcategories([]);
  };

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  // Reorder handlers
  const moveItem = async (item: FlatItem, direction: 'up' | 'down') => {
    const delta = direction === 'up' ? -1 : 1;
    const newOrder = item.order + delta;
    
    try {
      if (item.type === 'category') {
        await updateCategoryOrder.mutateAsync({ id: item.id, display_order: newOrder });
      } else if (item.type === 'subcategory') {
        await updateSubcategoryOrder.mutateAsync({ id: item.id, display_order: newOrder });
      } else {
        await updateSubSubcategoryOrder.mutateAsync({ id: item.id, display_order: newOrder });
      }
      toast.success('Order updated');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  // Category handlers
  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        label: category.label,
        key: category.key,
        description: category.description || '',
        icon: category.icon || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ label: '', key: '', description: '', icon: '' });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSubmitCategory = async () => {
    if (!categoryForm.label || !categoryForm.key) {
      toast.error('Label and Key are required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          label: categoryForm.label,
          key: categoryForm.key,
          description: categoryForm.description || null,
          icon: categoryForm.icon || null,
        });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync(categoryForm);
        toast.success('Category created');
      }
      setIsCategoryDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to permanently delete "${category.label}"? This will also delete all subcategories and sub-subcategories. This action cannot be undone.`)) return;
    
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Subcategory handlers
  const handleOpenSubcategoryDialog = (categoryId: string, subcategory?: Subcategory) => {
    setSelectedCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryForm({
        label: subcategory.label,
        description: subcategory.description || '',
      });
    } else {
      setEditingSubcategory(null);
      setSubcategoryForm({ label: '', description: '' });
    }
    setIsSubcategoryDialogOpen(true);
  };

  const handleSubmitSubcategory = async () => {
    if (!subcategoryForm.label || !selectedCategoryId) {
      toast.error('Label is required');
      return;
    }

    try {
      if (editingSubcategory) {
        await updateSubcategory.mutateAsync({
          id: editingSubcategory.id,
          category_id: selectedCategoryId,
          label: subcategoryForm.label,
          description: subcategoryForm.description || null,
        });
        toast.success('Subcategory updated');
      } else {
        await createSubcategory.mutateAsync({
          category_id: selectedCategoryId,
          label: subcategoryForm.label,
          description: subcategoryForm.description || null,
        });
        toast.success('Subcategory created');
      }
      setIsSubcategoryDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save subcategory');
    }
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    if (!confirm(`Are you sure you want to permanently delete "${subcategory.label}"? This will also delete all sub-subcategories. This action cannot be undone.`)) return;
    
    try {
      await deleteSubcategory.mutateAsync(subcategory.id);
      toast.success('Subcategory deleted');
    } catch (error) {
      toast.error('Failed to delete subcategory');
    }
  };

  // Sub-subcategory handlers
  const handleOpenSubSubcategoryDialog = (subcategoryId: string, subSubcategory?: SubSubcategory) => {
    setSelectedSubcategoryId(subcategoryId);
    if (subSubcategory) {
      setEditingSubSubcategory(subSubcategory);
      setSubSubcategoryForm({
        label: subSubcategory.label,
        description: subSubcategory.description || '',
      });
    } else {
      setEditingSubSubcategory(null);
      setSubSubcategoryForm({ label: '', description: '' });
    }
    setIsSubSubcategoryDialogOpen(true);
  };

  const handleSubmitSubSubcategory = async () => {
    if (!subSubcategoryForm.label || !selectedSubcategoryId) {
      toast.error('Label is required');
      return;
    }

    try {
      if (editingSubSubcategory) {
        await updateSubSubcategory.mutateAsync({
          id: editingSubSubcategory.id,
          subcategory_id: selectedSubcategoryId,
          label: subSubcategoryForm.label,
          description: subSubcategoryForm.description || null,
        });
        toast.success('Sub-subcategory updated');
      } else {
        await createSubSubcategory.mutateAsync({
          subcategory_id: selectedSubcategoryId,
          label: subSubcategoryForm.label,
          description: subSubcategoryForm.description || null,
        });
        toast.success('Sub-subcategory created');
      }
      setIsSubSubcategoryDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save sub-subcategory');
    }
  };

  const handleDeleteSubSubcategory = async (subSubcategory: SubSubcategory) => {
    if (!confirm(`Are you sure you want to permanently delete "${subSubcategory.label}"? This action cannot be undone.`)) return;
    
    try {
      await deleteSubSubcategory.mutateAsync(subSubcategory.id);
      toast.success('Sub-subcategory deleted');
    } catch (error) {
      toast.error('Failed to delete sub-subcategory');
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    let subs = allSubcategories?.filter(s => s.category_id === categoryId) || [];
    
    // Apply search filter
    if (searchQuery) {
      subs = subs.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return subs;
  };

  const getSubSubcategoriesForSubcategory = (subcategoryId: string) => {
    let items = allSubSubcategories?.filter(s => s.subcategory_id === subcategoryId) || [];
    
    // Apply search filter
    if (searchQuery) {
      items = items.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return items;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'category': return Folder;
      case 'subcategory': return Tag;
      default: return Circle;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'category': return 'bg-primary/10 text-primary border-primary/20';
      case 'subcategory': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  const isLoading = categoriesLoading || subcategoriesLoading || subSubcategoriesLoading;

  // Get parent category name for subcategory dialog
  const getParentCategoryName = () => {
    if (!selectedCategoryId) return '';
    return categories?.find(c => c.id === selectedCategoryId)?.label || '';
  };

  // Get parent path for sub-subcategory dialog
  const getParentSubcategoryPath = () => {
    if (!selectedSubcategoryId) return '';
    const sub = allSubcategories?.find(s => s.id === selectedSubcategoryId);
    if (!sub) return '';
    const cat = categories?.find(c => c.id === sub.category_id);
    return cat ? `${cat.label} → ${sub.label}` : sub.label;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  Categories & Subcategories
                </CardTitle>
                <CardDescription>Manage 3-level category hierarchy with search, filter, and reordering</CardDescription>
              </div>
              <Button onClick={() => handleOpenCategoryDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Level Filter */}
              <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="category">Categories</SelectItem>
                  <SelectItem value="subcategory">Subcategories</SelectItem>
                  <SelectItem value="sub_subcategory">Sub-subcategories</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('hierarchy')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Expand/Collapse */}
              {viewMode === 'hierarchy' && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronsUpDown className="h-4 w-4 mr-1" />
                    Expand
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronsDownUp className="h-4 w-4 mr-1" />
                    Collapse
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="min-h-[200px]">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading categories...</p>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[130px]">Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Parent</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No items found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const TypeIcon = getTypeIcon(item.type);
                      return (
                        <TableRow key={`${item.type}-${item.id}`}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTypeBadgeColor(item.type)}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {item.type === 'sub_subcategory' ? 'Item' : item.type === 'subcategory' ? 'Sub' : 'Cat'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {item.parentPath || '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                            {item.description || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (item.type === 'category') {
                                    handleOpenCategoryDialog(item.original as Category);
                                  } else if (item.type === 'subcategory') {
                                    const sub = item.original as Subcategory;
                                    handleOpenSubcategoryDialog(sub.category_id, sub);
                                  } else {
                                    const subSub = item.original as SubSubcategory;
                                    handleOpenSubSubcategoryDialog(subSub.subcategory_id, subSub);
                                  }
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (item.type === 'category') {
                                    handleDeleteCategory(item.original as Category);
                                  } else if (item.type === 'subcategory') {
                                    handleDeleteSubcategory(item.original as Subcategory);
                                  } else {
                                    handleDeleteSubSubcategory(item.original as SubSubcategory);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Hierarchy View */
            <div className="space-y-3">
              {filteredCategories?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery || levelFilter !== 'all'
                    ? 'No categories found matching your filters'
                    : 'No categories yet. Click "Add Category" to create one.'}
                </p>
              ) : (
                filteredCategories?.map((category) => {
                  const IconComponent = getCategoryIcon(category.icon);
                  const isCategoryExpanded = expandedCategories.includes(category.id);
                  const subcategories = getSubcategoriesForCategory(category.id);
                  const totalSubItems = subcategories.reduce((acc, sub) => 
                    acc + getSubSubcategoriesForSubcategory(sub.id).length, 0);

                  return (
                    <Collapsible 
                      key={category.id} 
                      open={isCategoryExpanded} 
                      onOpenChange={() => toggleCategoryExpanded(category.id)}
                    >
                      <div className="border rounded-lg overflow-hidden">
                        {/* Category Row */}
                        <div className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {isCategoryExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-primary/10">
                                <IconComponent className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{category.label}</p>
                                <p className="text-xs text-muted-foreground">{category.key}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-background ml-2">
                              {subcategories.length} sub · {totalSubItems} items
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenCategoryDialog(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSubcategoryDialog(category.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub
                            </Button>
                          </div>
                        </div>

                        {/* Subcategories Section */}
                        <CollapsibleContent>
                          <div className="border-t bg-muted/30">
                            {subcategories.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4 pl-16">
                                No subcategories yet. Click "Add Sub" to create one.
                              </p>
                            ) : (
                              <div className="py-2">
                                {subcategories.map((sub) => {
                                  const isSubExpanded = expandedSubcategories.includes(sub.id);
                                  const subSubcategories = getSubSubcategoriesForSubcategory(sub.id);

                                  return (
                                    <Collapsible
                                      key={sub.id}
                                      open={isSubExpanded}
                                      onOpenChange={() => toggleSubcategoryExpanded(sub.id)}
                                    >
                                      <div className="ml-8">
                                        {/* Subcategory Row */}
                                        <div className="flex items-center justify-between p-3 rounded-md hover:bg-background/50 transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                              <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                                              <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                  {isSubExpanded ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                </Button>
                                              </CollapsibleTrigger>
                                            </div>
                                            <Tag className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{sub.label}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {subSubcategories.length} items
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleOpenSubcategoryDialog(category.id, sub)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleDeleteSubcategory(sub)}
                                            >
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() => handleOpenSubSubcategoryDialog(sub.id)}
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              Item
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Sub-subcategories */}
                                        <CollapsibleContent>
                                          <div className="ml-10 py-1">
                                            {subSubcategories.length === 0 ? (
                                              <p className="text-xs text-muted-foreground py-2 pl-4">
                                                No items yet
                                              </p>
                                            ) : (
                                              subSubcategories.map((subSub) => (
                                                <div
                                                  key={subSub.id}
                                                  className="flex items-center justify-between p-2 pl-4 rounded hover:bg-background/50 transition-colors"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                                                    <Circle className="h-3 w-3 text-green-500" />
                                                    <span className="text-sm">{subSub.label}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6"
                                                      onClick={() => handleOpenSubSubcategoryDialog(sub.id, subSub)}
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6"
                                                      onClick={() => handleDeleteSubSubcategory(subSub)}
                                                    >
                                                      <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details' : 'Create a new top-level category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-label">Label *</Label>
              <Input
                id="cat-label"
                value={categoryForm.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setCategoryForm(prev => ({
                    ...prev,
                    label,
                    key: !editingCategory ? generateKey(label) : prev.key,
                  }));
                }}
                placeholder="e.g., Food & Kitchen"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-key">Key *</Label>
              <Input
                id="cat-key"
                value={categoryForm.key}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, key: e.target.value }))}
                placeholder="e.g., food_kitchen"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Select value={categoryForm.icon} onValueChange={(v) => setCategoryForm(prev => ({ ...prev, icon: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-[300px]">
                  {Object.keys(categoryIconMap).map((iconKey) => {
                    const IconComp = categoryIconMap[iconKey as keyof typeof categoryIconMap];
                    return (
                      <SelectItem key={iconKey} value={iconKey}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{iconKey}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCategory} disabled={createCategory.isPending || updateCategory.isPending}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={isSubcategoryDialogOpen} onOpenChange={setIsSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}</DialogTitle>
            <DialogDescription>
              {getParentCategoryName() && (
                <span className="text-primary font-medium">Parent: {getParentCategoryName()}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sub-label">Label *</Label>
              <Input
                id="sub-label"
                value={subcategoryForm.label}
                onChange={(e) => setSubcategoryForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Breakfast Items"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-desc">Description</Label>
              <Textarea
                id="sub-desc"
                value={subcategoryForm.description}
                onChange={(e) => setSubcategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubcategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitSubcategory} disabled={createSubcategory.isPending || updateSubcategory.isPending}>
              {editingSubcategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-subcategory Dialog */}
      <Dialog open={isSubSubcategoryDialogOpen} onOpenChange={setIsSubSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubSubcategory ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {getParentSubcategoryPath() && (
                <span className="text-primary font-medium">Parent: {getParentSubcategoryPath()}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subsub-label">Label *</Label>
              <Input
                id="subsub-label"
                value={subSubcategoryForm.label}
                onChange={(e) => setSubSubcategoryForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Rice"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subsub-desc">Description</Label>
              <Textarea
                id="subsub-desc"
                value={subSubcategoryForm.description}
                onChange={(e) => setSubSubcategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubSubcategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitSubSubcategory} disabled={createSubSubcategory.isPending || updateSubSubcategory.isPending}>
              {editingSubSubcategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
