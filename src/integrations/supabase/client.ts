const API_BASE = import.meta.env.VITE_API_URL || '/api';

type Filter = { field: string; op: 'eq' | 'in' | 'gte' | 'lte' | 'lt' | 'neq'; value: unknown };

class ApiQueryBuilder {
  private table: string;
  private filters: Filter[] = [];
  private includes = '';
  private sortField = '';
  private sortAsc = false;
  private limitCount?: number;
  private singleResult = false;
  private maybeSingleResult = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string) {
    // Parse nested includes like "*, trusts (id, name)"
    const includeMatch = fields.match(/(\w+)\s*\(/g);
    if (includeMatch) {
      this.includes = includeMatch.map((m) => m.replace(/\s*\($/, '')).join(',');
    }
    return this;
  }

  eq(field: string, value: unknown) { this.filters.push({ field, op: 'eq', value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ field, op: 'neq', value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, op: 'in', value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ field, op: 'gte', value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ field, op: 'lte', value }); return this; }
  lt(field: string, value: unknown) { this.filters.push({ field, op: 'lt', value }); return this; }
  order(field: string, opts?: { ascending?: boolean }) {
    this.sortField = field;
    this.sortAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) { this.limitCount = n; return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { this.maybeSingleResult = true; return this; }

  private getEndpoint(): string {
    const special: Record<string, string> = {
      user_roles: 'user-roles',
      donation_payments: 'donation-payments',
      corpus_fund_contributions: 'corpus_fund_contributions',
      kind_donations: 'kind_donations',
      food_slots: 'food_slots',
      food_slot_pricing: 'food_slot_pricing',
      bank_transactions: 'bank_transactions',
      home_photos: 'home_photos',
      home_types: 'home_types',
      donor_categories: 'donor_categories',
      sub_subcategories: 'sub_subcategories',
    };
    return special[this.table] || this.table;
  }

  private buildUrl(id?: string): string {
    const endpoint = this.getEndpoint();
    if (this.table === 'donors') return `${API_BASE}/donors`;
    if (this.table === 'users') return `${API_BASE}/users`;
    if (this.table === 'user_roles') {
      const roleFilter = this.filters.find((f) => f.field === 'role' && f.op === 'eq');
      if (roleFilter) return `${API_BASE}/user-roles?role=${roleFilter.value}`;
      const userFilter = this.filters.find((f) => f.field === 'user_id' && f.op === 'eq');
      if (userFilter) return `${API_BASE}/user-roles/${userFilter.value}`;
    }
    let url = `${API_BASE}/${endpoint}`;
    const idFilter = id || this.filters.find((f) => f.field === 'id' && f.op === 'eq')?.value;
    if (idFilter) url += `/${idFilter}`;
    const params = new URLSearchParams();
    for (const f of this.filters) {
      if (f.field === 'id' && f.op === 'eq') continue;
      if (f.op === 'eq') params.set(f.field, String(f.value));
      else if (f.op === 'in') params.set(f.field, (f.value as unknown[]).join(','));
      else params.set(`${f.op}_${f.field}`, String(f.value));
    }
    if (this.includes) params.set('include', this.includes);
    if (this.sortField) {
      params.set('sort', this.sortField);
      params.set('order', this.sortAsc ? 'asc' : 'desc');
    }
    if (this.limitCount) params.set('limit', String(this.limitCount));
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  async execute(): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      const url = this.buildUrl();
      const res = await apiFetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        return { data: null, error: { message: err.error || res.statusText } };
      }
      let data = await res.json();
      if (this.table === 'user_roles' && data?.role) {
        data = { role: data.role };
        if (this.singleResult || this.maybeSingleResult) return { data, error: null };
      }
      if (this.singleResult || this.maybeSingleResult) {
        if (Array.isArray(data)) data = data[0] || null;
        if (this.singleResult && !data) return { data: null, error: { message: 'Not found' } };
      }
      return { data, error: null };
    } catch (e: unknown) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Request failed' } };
    }
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  insert(payload: unknown | unknown[]) {
    return new ApiMutationBuilder(this.table, 'POST', payload);
  }

  update(payload: unknown) {
    const idFilter = this.filters.find((f) => f.field === 'id' || f.op === 'eq');
    const id = idFilter?.value as string;
    return new ApiMutationBuilder(this.table, 'PATCH', payload, id);
  }

  delete() {
    const idFilter = this.filters.find((f) => f.op === 'eq');
    return new ApiMutationBuilder(this.table, 'DELETE', null, idFilter?.value as string);
  }
}

class ApiMutationBuilder {
  constructor(
    private table: string,
    private method: string,
    private payload: unknown,
    private id?: string
  ) {}

  private getEndpoint(): string {
    const q = new ApiQueryBuilder(this.table);
    return q['getEndpoint']();
  }

  eq(field: string, value: unknown) {
    if (field === 'id' || !this.id) this.id = value as string;
    return this;
  }

  select() { return this; }

  async execute(): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      const endpoint = this.getEndpoint();
      let url = `${API_BASE}/${endpoint}`;
      if (this.id) url += `/${this.id}`;
      const res = await apiFetch(url, {
        method: this.method,
        body: this.payload ? JSON.stringify(this.payload) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        return { data: null, error: { message: err.error || res.statusText } };
      }
      if (this.method === 'DELETE') return { data: { success: true }, error: null };
      const data = await res.json();
      return { data, error: null };
    } catch (e: unknown) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Request failed' } };
    }
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  single() { return this; }
}

// Token management
let accessToken: string | null = localStorage.getItem('auth_token');
const authListeners: Array<(event: string, session: Session | null) => void> = [];

export interface Session {
  access_token: string;
  user: { id: string; email: string };
}

function getSession(): Session | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('auth_token');
  }
  if (!accessToken) return null;
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) return null;
  try {
    return { access_token: accessToken, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

/** Persist JWT for API calls and notify auth listeners */
export function setAuthSession(token: string, user: { id: string; email: string }) {
  setSession(token, user);
}

function setSession(token: string, user: { id: string; email: string }) {
  accessToken = token;
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  const session = getSession();
  authListeners.forEach((cb) => cb('SIGNED_IN', session));
}

function clearSession() {
  accessToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  authListeners.forEach((cb) => cb('SIGNED_OUT', null));
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) {
    accessToken = localStorage.getItem('auth_token');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return fetch(url.startsWith('http') ? url : url, { ...options, headers });
}

export const api = {
  from(table: string) {
    return new ApiQueryBuilder(table);
  },

  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error || 'Login failed' } };
      setSession(data.token, { id: data.user.id, email: data.user.email || '' });
      return { data: { user: data.user, session: getSession() }, error: null };
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: { name?: string }; emailRedirectTo?: string } }) => {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ email, password, name: options?.data?.name || email.split('@')[0] }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error || 'Registration failed' } };
      if (data.token) setSession(data.token, { id: data.user.id, email: data.user.email });
      return { data: { user: data.user, session: data.token ? getSession() : null }, error: null };
    },

    signOut: async () => {
      clearSession();
      return { error: null };
    },

    getSession: async () => ({ data: { session: getSession() }, error: null }),

    getUser: async () => {
      const session = getSession();
      return { data: { user: session?.user ?? null }, error: null };
    },

    verifyOtp: async ({ phone, otp }: { phone: string; otp: string }) => {
      const res = await apiFetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { data: { user: null, session: null, devOtp: undefined }, error: { message: data.error || 'Invalid OTP' } };
      }
      setSession(data.token, { id: data.user.id, email: data.user.email || '' });
      return { data: { user: data.user, session: getSession(), devOtp: data.devOtp }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      authListeners.push(callback);
      const session = getSession();
      if (session) setTimeout(() => callback('INITIAL_SESSION', session), 0);
      return { data: { subscription: { unsubscribe: () => {
        const idx = authListeners.indexOf(callback);
        if (idx >= 0) authListeners.splice(idx, 1);
      } } } };
    },

    resetPasswordForEmail: async (email: string) => {
      const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        return { data: null, error: { message: data.error } };
      }
      return { data: {}, error: null };
    },

    updateUser: async ({ password }: { password: string }) => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token') || localStorage.getItem('reset_token');
      if (token) localStorage.setItem('reset_token', token);
      const res = await apiFetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null }, error: { message: data.error } };
      localStorage.removeItem('reset_token');
      return { data: { user: {} }, error: null };
    },
  },

  functions: {
    invoke: async (name: string, options?: { body?: unknown; headers?: Record<string, string> }) => {
      const routeMap: Record<string, string> = {
        'create-razorpay-order': '/create-razorpay-order',
        'verify-razorpay-payment': '/verify-razorpay-payment',
        'send-donor-report': '/send-donor-report',
        'send-whatsapp': '/send-whatsapp',
        'create-user': '/auth/create-user',
        'reset-user-password': '/auth/reset-user-password',
        'delete-donor': '/auth/delete-donor',
        'impersonate-home': '/auth/impersonate-home',
        'bulk-upload-donors': '/bulk-upload-donors',
      };
      const path = routeMap[name] || `/${name}`;
      const url = path.startsWith('/auth') ? `${API_BASE}${path}` : `${API_BASE}${path}`;
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(options?.body || {}),
        headers: options?.headers,
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || 'Function call failed' } };
      return { data, error: null };
    },
  },

  storage: {
    from(bucket: string) {
      return {
        upload: async (filePath: string, file: File, _opts?: unknown) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', filePath);
          const headers: Record<string, string> = {};
          if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
          const res = await fetch(`${API_BASE}/storage/${bucket}/upload`, {
            method: 'POST',
            headers,
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) return { data: null, error: { message: data.error || 'Upload failed' } };
          return {
            data: {
              path: data.path,
              publicUrl: data.publicUrl || data.public_url,
            },
            error: null,
          };
        },
        getPublicUrl: (filePath: string) => {
          const origin = (() => {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            if (apiUrl.startsWith('http')) {
              try {
                return new URL(apiUrl).origin;
              } catch {
                return '';
              }
            }
            return typeof window !== 'undefined' ? window.location.origin : '';
          })();
          return { data: { publicUrl: `${origin}/uploads/${bucket}/${filePath}` } };
        },
        remove: async (paths: string[]) => {
          const res = await apiFetch(`${API_BASE}/storage/${bucket}`, {
            method: 'DELETE',
            body: JSON.stringify({ paths }),
          });
          if (!res.ok) {
            const data = await res.json();
            return { data: null, error: { message: data.error } };
          }
          return { data: {}, error: null };
        },
      };
    },
  },
};

// Drop-in replacement for Supabase client
export const supabase = api;
