/** User-facing "Project" terminology (backend still uses homes/home_id). */

export const PROJECT_SINGULAR = 'Project';
export const PROJECT_PLURAL = 'Projects';
export const PROJECT_TYPE_LABEL = 'Project Type';
export const UNKNOWN_PROJECT = 'Unknown Project';
export const PROJECT_FALLBACK_NAME = 'Project';

export const PUBLIC_PROJECTS_PATH = '/projects';
export const ADMIN_PROJECTS_PATH = '/admin/projects';
export const WARDEN_PROJECT_PATH = '/warden/project';
export const SUPER_ADMIN_PROJECTS_PATH = '/super-admin/projects';
export const SUPER_ADMIN_PROJECT_NEW_PATH = '/super-admin/projects/new';

export const projectDetailPath = (id: string) => `/projects/${id}`;
export const adminProjectDetailPath = (id: string) => `/super-admin/projects/${id}`;
export const adminProjectEditPath = (id: string) => `/super-admin/projects/${id}/edit`;
