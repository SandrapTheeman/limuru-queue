# Limuru Cottage Hospital Queue Management System
## Technical Architecture Specification v2.0

---

## Table of Contents

1. [Frontend Architecture](#1-frontend-architecture)
2. [Design System Implementation](#2-design-system-implementation)
3. [Mobile Architecture](#3-mobile-architecture)
4. [Performance Architecture](#4-performance-architecture)
5. [API Layer Design](#5-api-layer-design)
6. [Real-time Features](#6-real-time-features)
7. [Accessibility Architecture](#7-accessibility-architecture)
8. [Implementation Priorities](#8-implementation-priorities)

---

## 1. Frontend Architecture

### 1.1 Next.js App Router Structure

```
apps/web/
├── app/
│   ├── (auth)/                    # Auth route group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Authenticated dashboard group
│   │   ├── layout.tsx             # Shared dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home
│   │   ├── queue/
│   │   │   ├── page.tsx           # Queue overview
│   │   │   ├── [id]/page.tsx      # Queue detail
│   │   │   └── components/        # Queue-specific components
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── components/
│   │   ├── appointments/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── components/
│   │   ├── display/               # TV Display routes
│   │   │   ├── page.tsx
│   │   │   └── waiting/page.tsx
│   │   └── staff/
│   │       ├── page.tsx
│   │       └── components/
│   ├── (admin)/                   # Admin route group
│   │   ├── layout.tsx
│   │   ├── users/page.tsx
│   │   ├── departments/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── audit/page.tsx
│   ├── (kiosk)/                  # Self-service kiosk
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/                      # API routes (if needed)
│   │   └── [...trpc]/route.ts
│   ├── layout.tsx                # Root layout
│   ├── globals.css
│   ├── error.tsx
│   ├── not-found.tsx
│   └── loading.tsx
├── components/
│   ├── ui/                       # Shadcn/ui-style primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── forms/                    # Form components
│   │   ├── patient-form.tsx
│   │   ├── queue-form.tsx
│   │   └── appointment-form.tsx
│   ├── queue/                    # Queue-specific components
│   │   ├── queue-card.tsx
│   │   ├── queue-list.tsx
│   │   ├── queue-status-badge.tsx
│   │   └── queue-timer.tsx
│   ├── display/                  # TV display components
│   │   ├── waiting-display.tsx
│   │   ├── current-caller.tsx
│   │   └── queue-announcement.tsx
│   └── layout/                   # Layout components
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── mobile-nav.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts             # API client setup
│   │   ├── endpoints.ts          # API endpoint functions
│   │   ├── types.ts              # API response types
│   │   └── hooks/                # React Query hooks
│   │       ├── use-queue.ts
│   │       ├── use-patients.ts
│   │       └── use-appointments.ts
│   ├── stores/                   # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── queue-store.ts
│   │   ├── notification-store.ts
│   │   └── ui-store.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-websocket.ts
│   │   ├── use-offline.ts
│   │   └── use-keyboard.ts
│   └── utils/
│       ├── cn.ts                 # classname utility
│       └── formatters.ts
├── hooks/                        # Global hooks (if using hoisted)
├── types/                        # Global TypeScript types
└── public/
    └── fonts/
```

### 1.2 Route Groups and Layouts Per Role

**Route Group Strategy:**
- `(auth)`: Unauthenticated routes (login, register, forgot-password)
- `(dashboard)`: Authenticated staff/doctor routes
- `(admin)`: Admin-only routes with role guards
- `(kiosk)`: Self-service terminal routes (simplified UI)

**Role-Based Access Control:**

```typescript
// lib/auth/rbac.ts
export const RolePermissions = {
  patient: ['view:queue', 'view:appointments', 'update:profile'],
  staff: ['view:queue', 'manage:queue', 'view:patients', 'call:patient'],
  doctor: ['view:queue', 'manage:queue', 'view:patients', 'manage:appointments'],
  admin: ['*'],
} as const;

export type Role = keyof typeof RolePermissions;

export function hasPermission(role: Role, permission: string): boolean {
  const perms = RolePermissions[role];
  return perms.includes('*') || perms.includes(permission as never);
}
```

### 1.3 Server Components vs Client Components Strategy

**Server Components (Default):**
- Page layouts and metadata
- Static data fetching (dashboard overview)
- SEO-critical content
- Non-interactive UI shells

**Client Components ('use client'):**
- Interactive forms
- Real-time queue updates
- WebSocket connections
- Browser-specific APIs (localStorage, notifications)
- Animation states

**Pattern Example:**

```typescript
// app/(dashboard)/queue/page.tsx - Server Component
import { Suspense } from 'react';
import { QueueList } from './components/queue-list';
import { QueueStats } from './components/queue-stats';
import { getServerQueueData } from '@/lib/api/server';

export const metadata = {
  title: 'Queue Management | Limuru Cottage Hospital',
  description: 'Manage patient queue and track wait times',
};

export default async function QueuePage() {
  const initialData = await getServerQueueData();
  
  return (
    <div className="space-y-6">
      <QueueStats data={initialData.stats} />
      <Suspense fallback={<QueueListSkeleton />}>
        <QueueList initialData={initialData.queues} />
      </Suspense>
    </div>
  );
}

// components/queue-list.tsx - Client Component
'use client';

import { useQuery } from '@tanstack/react-query';
import { useQueueWebSocket } from '@/lib/hooks/use-websocket';
import { queueApi } from '@/lib/api/endpoints';

export function QueueList({ initialData }: { initialData: Queue[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => queueApi.getAll(),
    initialData,
    refetchInterval: 30000,
  });
  
  useQueueWebSocket();

  return (
    <div className="grid gap-4">
      {data?.map((queue) => (
        <QueueCard key={queue.id} queue={queue} />
      ))}
    </div>
  );
}
```

### 1.4 State Management Approach

**Three-Layer State Management:**

```typescript
// Layer 1: Server State (React Query / tRPC)
// - Queue data, patient records, appointments
// - Automatic caching, revalidation, optimistic updates

// lib/api/hooks/use-queue.ts
export function useQueue(id: string) {
  return useQuery({
    queryKey: ['queue', id],
    queryFn: () => queueApi.get(id),
    staleTime: 10000,
  });
}

export function useQueueMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: queueApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    },
  });
}

// Layer 2: UI State (Zustand)
// - Modal visibility, sidebar collapsed state
// - Theme preference, notification settings
// - Selected items for bulk operations

// lib/stores/ui-store.ts
interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  theme: 'light' | 'dark' | 'system';
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  theme: 'system',
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));

// Layer 3: Form State (React Hook Form + Zod)
// - Form validation, field state
// - Integration with UI components

// lib/hooks/use-patient-form.ts
export function usePatientForm() {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().regex(/^\+254/),
    dateOfBirth: z.date(),
  });
  
  return useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', dateOfBirth: new Date() },
  });
}
```

### 1.5 API Integration Patterns

**tRPC Integration for Type-Safe API Calls:**

```typescript
// lib/trpc/client.ts
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '@hospital-queue/api';

export const trpc = createTRPCReact<AppRouter>();

// lib/trpc/provider.tsx
'use client';

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            const token = useAuthStore.getState().token;
            return { Authorization: token ? `Bearer ${token}` : '' };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 1.6 Real-time Updates (WebSocket/SSE)

**WebSocket Hook Pattern:**

```typescript
// lib/hooks/use-websocket.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueueStore } from '@/lib/stores/queue';
import { useToast } from '@/components/ui/toast';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { updateQueue, addQueueItem, removeQueueItem } = useQueueStore();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      wsRef.current?.send(JSON.stringify({ type: 'subscribe', channels: ['queue', 'notifications'] }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    wsRef.current.onclose = () => {
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, []);

  const handleMessage = useCallback((data: WSMessage) => {
    switch (data.type) {
      case 'queue:updated':
        updateQueue(data.payload);
        break;
      case 'queue:new':
        addQueueItem(data.payload);
        toast({ title: 'New Patient', description: `${data.payload.patientName} joined queue` });
        break;
      case 'queue:called':
        toast({ title: 'Patient Called', description: `${data.payload.patientName} is being called` });
        break;
    }
  }, [updateQueue, addQueueItem, removeQueueItem]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return {
    send: (message: object) => {
      wsRef.current?.send(JSON.stringify(message));
    },
  };
}
```

---

## 2. Design System Implementation

### 2.1 Tailwind CSS Configuration with Design Tokens

```typescript
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Hospital-specific colors
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // DEFAULT
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        hospital: {
          bg: 'hsl(var(--hospital-bg))',
          card: 'hsl(var(--hospital-card))',
          text: 'hsl(var(--hospital-text))',
          muted: 'hsl(var(--hospital-muted))',
          border: 'hsl(var(--hospital-border))',
        },
        // Queue status colors
        status: {
          waiting: '#F59E0B',
          inProgress: '#3B82F6',
          completed: '#10B981',
          cancelled: '#EF4444',
          noShow: '#6B7280',
        },
        // Department colors
        department: {
          general: '#6366F1',
          dental: '#8B5CF6',
          laboratory: '#EC4899',
          pharmacy: '#14B8A6',
          emergency: '#EF4444',
        },
      },
      
      // Spacing for touch targets
      spacing: {
        touch: '44px',
        'touch-lg': '56px',
      },

      // Border radius
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },

      // Shadows
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },

      // Animations
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'call-flash': 'callFlash 1s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        callFlash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'hsl(var(--primary) / 0.1)' },
        },
      },

      // Font families
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },

      // Custom backdrop blur
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};

export default config;
```

### 2.2 CSS Variables for Theming

```css
/* apps/web/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Primary palette */
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 210 40% 98%;
    
    /* Hospital theme */
    --hospital-bg: 0 0% 98%;
    --hospital-card: 0 0% 100%;
    --hospital-text: 0 0% 13%;
    --hospital-muted: 0 0% 46%;
    --hospital-border: 0 0% 90%;
    
    /* Semantic colors */
    --success: 142.1 76.2% 36.3%;
    --warning: 37.7 92.1% 50.2%;
    --error: 0.7 89.4% 50.2%;
    --info: 199.4 89.4% 48.4%;
    
    /* Border radius */
    --radius: 0.5rem;
    
    /* Ring for focus states */
    --ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --hospital-bg: 0 0% 10%;
    --hospital-card: 0 0% 14%;
    --hospital-text: 0 0% 98%;
    --hospital-muted: 0 0% 65%;
    --hospital-border: 0 0% 22%;
  }
}

@layer components {
  /* Card component */
  .card {
    @apply bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-card;
  }

  /* Status badge variants */
  .status-badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  .status-waiting { @apply bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400; }
  .status-in-progress { @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400; }
  .status-completed { @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400; }
  .status-cancelled { @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400; }

  /* Touch target */
  .touch-target {
    @apply min-h-touch min-w-touch flex items-center justify-center;
  }
  
  /* Queue number display (for TV screens) */
  .queue-number {
    @apply font-mono text-8xl font-bold tracking-tight;
  }
  
  /* Glass effect for overlays */
  .glass {
    @apply bg-white/80 dark:bg-gray-900/80 backdrop-blur-md;
  }
}

@layer utilities {
  /* Text balance for headings */
  .text-balance {
    text-wrap: balance;
  }
  
  /* Focus visible ring */
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary;
  }
}
```

### 2.3 Component Library Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── ui/                   # Primitive components
│   │   │   ├── button.tsx
│   │   │   ├── button.test.tsx
│   │   │   ├── button.stories.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── index.ts          # Re-export all primitives
│   │   │
│   │   ├── forms/                # Form components
│   │   │   ├── form.tsx
│   │   │   ├── form-field.tsx
│   │   │   ├── form-label.tsx
│   │   │   ├── form-error.tsx
│   │   │   └── form-description.tsx
│   │   │
│   │   └── layout/               # Layout components
│   │       ├── container.tsx
│   │       ├── stack.tsx
│   │       ├── grid.tsx
│   │       └── aspect-ratio.tsx
│   │
│   ├── hooks/                    # UI hooks
│   │   ├── use-toast.ts
│   │   ├── use-breakpoint.ts
│   │   └── use-keyboard-shortcut.ts
│   │
│   ├── lib/
│   │   ├── utils.ts              # cn(), etc.
│   │   └── tw-merge.ts           # Tailwind class merging
│   │
│   ├── styles/
│   │   └── globals.css           # CSS variables
│   │
│   └── index.ts                  # Package entry point
│
├── package.json
├── tsconfig.json
└── vite.config.ts                # For testing
```

### 2.4 Storybook Integration

```typescript
// packages/ui/.storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

```typescript
// packages/ui/src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A button component with multiple variants and loading states.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Loading: Story = {
  args: { children: 'Loading...', isLoading: true },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};
```

---

## 3. Mobile Architecture

### 3.1 Expo Router File-Based Routing

```
apps/mobile/
├── app/
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Home/Queue status
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home tab
│   │   ├── appointments.tsx      # Appointments tab
│   │   ├── notifications.tsx     # Notifications tab
│   │   └── profile.tsx            # Profile tab
│   ├── queue/
│   │   ├── [id].tsx              # Queue detail
│   │   └── check-in.tsx          # Self check-in
│   ├── appointments/
│   │   ├── new.tsx               # Book appointment
│   │   └── [id].tsx              # Appointment detail
│   └── +html.tsx                 # Web view fallback
├── components/
│   ├── ui/                       # Shared UI components
│   ├── queue/                    # Queue-specific components
│   └── forms/                    # Form components
├── hooks/
│   ├── use-offline-queue.ts
│   ├── use-push-notifications.ts
│   └── use-background-sync.ts
├── lib/
│   ├── api/
│   ├── stores/
│   └── db/                       # SQLite database
├── constants/
│   ├── theme.ts
│   └── config.ts
└── app.json
```

### 3.2 Offline-First Data Strategy (expo-sqlite)

```typescript
// apps/mobile/lib/db/schema.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  dateOfBirth: text('date_of_birth'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
});

export const queueEntries = sqliteTable('queue_entries', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').references(() => patients.id),
  departmentId: text('department_id').notNull(),
  status: text('status').notNull().default('waiting'),
  position: integer('position').notNull(),
  estimatedWaitMinutes: integer('estimated_wait_minutes'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
  calledAt: integer('called_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  operation: text('operation').notNull(), // 'insert' | 'update' | 'delete'
  payload: text('payload').notNull(), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  attempts: integer('attempts').default(0),
});
```

```typescript
// apps/mobile/lib/db/sync.ts
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;

export function useBackgroundSync() {
  const db = useSQLiteContext();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  const processSyncQueue = async () => {
    const pendingItems = db
      .selectFrom('sync_queue')
      .where('attempts', '<', MAX_RETRY_ATTEMPTS)
      .orderBy('created_at', 'asc')
      .limit(50)
      .execute();

    for (const item of pendingItems) {
      try {
        await syncItem(item);
        db.deleteFrom('sync_queue').where('id', '=', item.id).execute();
      } catch (error) {
        db.update('sync_queue')
          .set({ attempts: item.attempts + 1 })
          .where('id', '=', item.id)
          .execute();
      }
    }
  };

  const syncItem = async (item: SyncQueueItem) => {
    const endpoint = `${API_BASE}/${item.tableName}`;
    
    switch (item.operation) {
      case 'insert':
        await fetch(endpoint, {
          method: 'POST',
          body: item.payload,
          headers: { 'Content-Type': 'application/json' },
        });
        break;
      case 'update':
        await fetch(`${endpoint}/${item.recordId}`, {
          method: 'PATCH',
          body: item.payload,
          headers: { 'Content-Type': 'application/json' },
        });
        break;
      case 'delete':
        await fetch(`${endpoint}/${item.recordId}`, { method: 'DELETE' });
        break;
    }
  };

  useEffect(() => {
    const startSync = () => {
      processSyncQueue();
      syncTimeoutRef.current = setTimeout(startSync, SYNC_INTERVAL);
    };

    startSync();
    return () => clearTimeout(syncTimeoutRef.current);
  }, []);
}
```

### 3.3 Background Sync Patterns

```typescript
// apps/mobile/lib/hooks/use-background-sync.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncPendingData } from '@/lib/db/sync';

TaskManager.defineTask('SYNC_DATA', async () => {
  try {
    await syncPendingData();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export function useBackgroundFetch() {
  useEffect(() => {
    BackgroundFetch.registerTaskAsync('SYNC_DATA', {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }, []);
}
```

### 3.4 Push Notifications

```typescript
// apps/mobile/lib/hooks/use-push-notifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      handleNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response.notification);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const handleNotification = (notification: Notifications.Notification) => {
    const { type, queueId, position } = notification.request.content.data;
    
    switch (type) {
      case 'queue_called':
        // Navigate to queue screen
        router.push(`/queue/${queueId}`);
        break;
      case 'queue_updated':
        // Refresh queue data
        queryClient.invalidateQueries(['queue', queueId]);
        break;
      case 'appointment_reminder':
        // Show appointment details
        break;
    }
  };

  const handleNotificationTap = (notification: Notifications.Notification) => {
    const { screen, params } = notification.request.content.data;
    if (screen) {
      router.push({ pathname: screen, params });
    }
  };

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hospital-queue', {
      name: 'Hospital Queue',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    })).data;
  }

  return token;
}
```

### 3.5 Deep Linking

```typescript
// apps/mobile/app.json
{
  "expo": {
    "scheme": "limuruhospital",
    "splash": {
      "image": "./splash.png",
      "resizeMode": "contain"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.limuruhospital.queue"
    },
    "android": {
      "package": "com.limuruhospital.queue",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "*.limuruhospital.com",
              "pathPrefix": "/queue"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}

// apps/mobile/app/_layout.tsx
import { useDeepLinking } from 'expo-linking';

const linking = {
  prefixes: ['limuruhospital://', 'https://*.limuruhospital.com'],
  config: {
    screens: {
      '(auth)': {
        screens: {
          login: 'login',
          register: 'register',
        },
      },
      '(tabs)': {
        screens: {
          index: 'home',
          appointments: 'appointments',
          notifications: 'notifications',
          profile: 'profile',
        },
      },
      queue: {
        path: 'queue/:id',
        parse: { id: String },
      },
      appointments: {
        path: 'appointments/new',
      },
    },
  },
};
```

---

## 4. Performance Architecture

### 4.1 Code Splitting Per Route

**Dynamic Imports for Heavy Components:**

```typescript
// app/(dashboard)/display/page.tsx
import dynamic from 'next/dynamic';

// TV Display uses heavy animations and video - load lazily
const WaitingDisplay = dynamic(
  () => import('@/components/display/waiting-display').then((mod) => mod.WaitingDisplay),
  {
    loading: () => <DisplaySkeleton />,
    ssr: false, // No SSR for WebGL/Canvas components
  }
);

// Chart components loaded on demand
const QueueAnalytics = dynamic(
  () => import('@/components/display/queue-analytics'),
  { ssr: false }
);
```

**Route-Based Splitting (Automatic with App Router):**

```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
};
```

### 4.2 Image Optimization

```typescript
// components/patient-avatar.tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PatientAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function PatientAvatar({ src, name, size = 'md', className }: PatientAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center',
          className
        )}
        style={{ width: sizeMap[size], height: sizeMap[size] }}
      >
        <span className={cn('text-primary-600 dark:text-primary-400', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={sizeMap[size]}
      height={sizeMap[size]}
      className={cn('rounded-full object-cover', className)}
    />
  );
}
```

### 4.3 Font Optimization

```typescript
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false, // Only load when needed
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrainsMono.variable)}>
      <body>{children}</body>
    </html>
  );
}
```

### 4.4 Bundle Size Budgets

```javascript
// next.config.js
module.exports = {
  // ... existing config
  webpack: (config, { isServer }) => {
    // Analyze bundle size in development
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: `bundle-analysis/${isServer ? 'server' : 'client'}.html`,
        })
      );
    }
    return config;
  },
};
```

**Package.json scripts:**

```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:server": "ANALYZE=true next build && cat .next/analyze/server.html",
    "analyze:client": "ANALYZE=true next build && cat .next/analyze/client.html"
  }
}
```

### 4.5 Core Web Vitals Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | < 2.5s | Preload hero images, server components |
| FID | < 100ms | Code splitting, defer non-critical JS |
| CLS | < 0.1 | Reserve space for dynamic content |
| TTFB | < 600ms | Edge caching, optimized data fetching |
| INP | < 200ms | Efficient event handlers, React Server Actions |

**Performance Monitoring:**

```typescript
// components/performance-monitor.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsMonitor() {
  useReportWebVitals((metric) => {
    const body = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      rating: metric.rating,
    };

    // Send to analytics
    fetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return null;
}
```

---

## 5. API Layer Design

### 5.1 RESTful Endpoint Patterns

```
Base URL: /api/v1

Authentication:
POST   /auth/login          # Login
POST   /auth/register       # Register
POST   /auth/logout          # Logout
POST   /auth/refresh         # Refresh token
GET    /auth/me              # Current user

Patients:
GET    /patients             # List patients (paginated)
POST   /patients             # Create patient
GET    /patients/:id          # Get patient
PATCH  /patients/:id          # Update patient
DELETE /patients/:id          # Delete patient

Queue:
GET    /queue                # List queue entries
POST   /queue                # Join queue
GET    /queue/:id            # Get queue entry
PATCH  /queue/:id            # Update queue entry (status, position)
DELETE /queue/:id            # Leave queue
POST   /queue/:id/call       # Call patient
POST   /queue/:id/complete   # Mark as completed
POST   /queue/:id/no-show    # Mark as no-show

Departments:
GET    /departments          # List departments
POST   /departments          # Create department
GET    /departments/:id      # Get department
PATCH  /departments/:id      # Update department

Appointments:
GET    /appointments         # List appointments
POST   /appointments         # Create appointment
GET    /appointments/:id     # Get appointment
PATCH  /appointments/:id     # Update appointment
DELETE /appointments/:id     # Cancel appointment

Display:
GET    /display/current      # Current queue display
GET    /display/waiting      # Waiting room display
```

### 5.2 Request/Response Type Safety

```typescript
// packages/shared/src/api/schemas.ts
import { z } from 'zod';

// Patient schemas
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+254\d{9}$/),
  dateOfBirth: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Queue schemas
export const QueueStatusSchema = z.enum(['waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show']);

export const QueueEntrySchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  patient: PatientSchema,
  departmentId: z.string().uuid(),
  department: z.object({ id: z.string(), name: z.string() }),
  status: QueueStatusSchema,
  position: z.number().int().positive(),
  estimatedWaitMinutes: z.number().int().optional(),
  joinedAt: z.string().datetime(),
  calledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const CreateQueueEntrySchema = z.object({
  patientId: z.string().uuid(),
  departmentId: z.string().uuid(),
});

// Type exports
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type QueueEntry = z.infer<typeof QueueEntrySchema>;
export type CreateQueueEntry = z.infer<typeof CreateQueueEntrySchema>;
export type QueueStatus = z.infer<typeof QueueStatusSchema>;
```

### 5.3 Error Handling Standardization

```typescript
// packages/shared/src/api/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Error response format
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

// Success response format
export interface SuccessResponse<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 5.4 Caching Strategies

```typescript
// lib/api/hooks/use-queue.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueApi } from '@/lib/api/endpoints';

export function useQueues() {
  return useQuery({
    queryKey: ['queues'],
    queryFn: () => queueApi.getAll(),
    staleTime: 10000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useQueue(id: string) {
  return useQuery({
    queryKey: ['queue', id],
    queryFn: () => queueApi.get(id),
    staleTime: 5000, // 5 seconds for individual queue
    enabled: !!id,
  });
}

export function useJoinQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: queueApi.create,
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['queues'] });
      
      // Snapshot previous value
      const previousQueues = queryClient.getQueryData(['queues']);
      
      // Optimistically update
      queryClient.setQueryData(['queues'], (old: unknown) => ({
        ...(old as object),
        entries: [...((old as { entries?: unknown[] })?.entries || []), { ...newEntry, id: 'temp', status: 'waiting' }],
      }));
      
      return { previousQueues };
    },
    onError: (err, newEntry, context) => {
      queryClient.setQueryData(['queues'], context?.previousQueues);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    },
  });
}
```

---

## 6. Real-time Features

### 6.1 WebSocket Connection Management

```typescript
// apps/api/src/realtime/manager.ts
export class WebSocketManager {
  private connections: Map<string, Set<WebSocket>> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private env: Env) {}

  async handleConnection(ws: WebSocket, request: Request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const role = url.searchParams.get('role');

    if (!userId) {
      ws.close(4001, 'Missing userId');
      return;
    }

    this.addConnection(userId, role || 'patient', ws);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { userId, timestamp: Date.now() }
    }));

    // Handle incoming messages
    ws.addEventListener('message', (event) => {
      this.handleMessage(ws, userId, event.data);
    });

    // Handle disconnect
    ws.addEventListener('close', () => {
      this.removeConnection(userId, role || 'patient', ws);
    });
  }

  addConnection(userId: string, role: string, ws: WebSocket) {
    const key = `${role}:${userId}`;
    if (!this.connections.has(key)) {
      this.connections.set(key, new Set());
    }
    this.connections.get(key)!.add(ws);
    this.startHeartbeat(key, ws);
  }

  removeConnection(userId: string, role: string, ws: WebSocket) {
    const key = `${role}:${userId}`;
    this.connections.get(key)?.delete(ws);
    if (this.connections.get(key)?.size === 0) {
      this.connections.delete(key);
      this.stopHeartbeat(key);
    }
  }

  broadcast(channel: string, message: object) {
    const payload = JSON.stringify({ channel, ...message });
    this.connections.get(channel)?.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  broadcastToRole(role: string, message: object) {
    const payload = JSON.stringify(message);
    this.connections.forEach((connections, key) => {
      if (key.startsWith(`${role}:`)) {
        connections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        });
      }
    });
  }

  private handleMessage(ws: WebSocket, userId: string, data: string) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'subscribe':
          this.addConnection(userId, message.channel, ws);
          break;
        case 'unsubscribe':
          this.removeConnection(userId, message.channel, ws);
          break;
        case 'queue:call':
          this.handleQueueCall(userId, message.payload);
          break;
        case 'queue:complete':
          this.handleQueueComplete(userId, message.payload);
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  private async handleQueueCall(userId: string, payload: { queueId: string }) {
    // Broadcast to waiting patients
    this.broadcast('queue:waiting', {
      type: 'queue:called',
      payload: {
        queueId: payload.queueId,
        calledBy: userId,
        timestamp: Date.now(),
      },
    });
  }

  private startHeartbeat(key: string, ws: WebSocket) {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    this.heartbeatIntervals.set(key, interval);
  }

  private stopHeartbeat(key: string) {
    const interval = this.heartbeatIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(key);
    }
  }
}
```

### 6.2 Queue Position Updates

```typescript
// apps/api/src/routes/queue.ts
export async function updateQueueEntry(env: Env, ctx: ExecutionContext, id: string, data: Partial<QueueUpdate>) {
  const entry = await env.DB.prepare(
    'SELECT * FROM queue_entries WHERE id = ?'
  ).bind(id).first<QueueEntry>();

  if (!entry) {
    return { error: 'NOT_FOUND' };
  }

  const updatedEntry = {
    ...entry,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // Handle status transitions
  if (data.status === 'called' && entry.status === 'waiting') {
    updatedEntry.calledAt = new Date().toISOString();
    // Broadcast to waiting room display
    ctx.waitUntil(broadcastToChannel(env, 'display', {
      type: 'patient:called',
      payload: { queueNumber: entry.queueNumber, department: entry.departmentName },
    }));
  }

  if (data.status === 'completed') {
    updatedEntry.completedAt = new Date().toISOString();
    // Recalculate positions
    await recalculateQueuePositions(env, entry.departmentId);
  }

  // Broadcast to all connected clients
  ctx.waitUntil(broadcastToChannel(env, 'queue', {
    type: 'queue:updated',
    payload: updatedEntry,
  }));

  return { data: updatedEntry };
}

async function recalculateQueuePositions(env: Env, departmentId: string) {
  const waitingEntries = await env.DB.prepare(
    'SELECT id FROM queue_entries WHERE department_id = ? AND status = ? ORDER BY joined_at ASC'
  ).bind(departmentId, 'waiting').all<{ id: string }>();

  for (let i = 0; i < waitingEntries.results.length; i++) {
    await env.DB.prepare(
      'UPDATE queue_entries SET position = ? WHERE id = ?'
    ).bind(i + 1, waitingEntries.results[i].id).run();
  }
}
```

### 6.3 TV Display Synchronization

```typescript
// apps/web/components/display/waiting-display.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';

interface DisplayState {
  currentPatient: QueueEntry | null;
  nextPatients: QueueEntry[];
  estimatedWait: number;
  announcements: string[];
}

export function WaitingDisplay() {
  const [state, setState] = useState<DisplayState>({
    currentPatient: null,
    nextPatients: [],
    estimatedWait: 0,
    announcements: [],
  });

  const { data, isLoading } = trpc.display.current.useQuery(undefined, {
    refetchInterval: 5000, // Update every 5 seconds
  });

  useEffect(() => {
    if (data) {
      setState(data);
    }
  }, [data]);

  // WebSocket for instant updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/display`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'queue:updated':
          setState((prev) => ({
            ...prev,
            ...message.payload,
          }));
          break;
        case 'announcement':
          setState((prev) => ({
            ...prev,
            announcements: [...prev.announcements, message.payload.text],
          }));
          // Auto-dismiss after 10 seconds
          setTimeout(() => {
            setState((prev) => ({
              ...prev,
              announcements: prev.announcements.filter((a) => a !== message.payload.text),
            }));
          }, 10000);
          break;
      }
    };

    return () => ws.close();
  }, []);

  if (isLoading) {
    return <DisplaySkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Current Patient */}
        <section className="mb-12 text-center animate-fade-in">
          <p className="text-primary-300 text-xl mb-2">Now Serving</p>
          <div className="queue-number text-primary-400">
            {state.currentPatient?.queueNumber || '---'}
          </div>
          <p className="text-3xl mt-4">
            {state.currentPatient?.patientName || 'Waiting for patient'}
          </p>
        </section>

        {/* Next Patients */}
        <section className="grid grid-cols-4 gap-4">
          {state.nextPatients.map((patient, index) => (
            <div
              key={patient.id}
              className={cn(
                'bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm',
                index === 0 && 'ring-2 ring-primary-400'
              )}
            >
              <p className="text-primary-300 text-sm">Next</p>
              <p className="text-4xl font-bold mt-2">{patient.queueNumber}</p>
              <p className="text-lg mt-2">{patient.patientName}</p>
              <p className="text-primary-300 text-sm mt-1">
                Position {patient.position}
              </p>
            </div>
          ))}
        </section>

        {/* Announcements */}
        {state.announcements.map((announcement) => (
          <div
            key={announcement}
            className="fixed bottom-0 left-0 right-0 bg-amber-500 text-black text-center py-4 text-2xl font-bold animate-slide-in"
          >
            {announcement}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.4 Staff Notification System

```typescript
// apps/api/src/services/notifications.ts
export class NotificationService {
  constructor(private env: Env) {}

  async sendPushNotification(userId: string, notification: PushNotification) {
    const user = await this.getUser(userId);
    
    if (!user.pushToken) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.pushToken,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: notification.sound || 'default',
        priority: 'high',
      }),
    });
  }

  async sendInAppNotification(userId: string, notification: InAppNotification) {
    // Store in database
    await this.env.DB.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      notification.type,
      notification.title,
      notification.body,
      JSON.stringify(notification.data),
      new Date().toISOString()
    ).run();

    // Send via WebSocket
    await this.broadcastToUser(userId, {
      type: 'notification',
      payload: notification,
    });
  }

  async notifyNewQueueEntry(departmentId: string, entry: QueueEntry) {
    // Get staff for department
    const staff = await this.getDepartmentStaff(departmentId);
    
    for (const member of staff) {
      await this.sendInAppNotification(member.id, {
        type: 'new_patient',
        title: 'New Patient',
        body: `${entry.patientName} joined the queue`,
        data: { queueId: entry.id, departmentId },
      });
    }
  }

  async notifyPatientCalled(entry: QueueEntry) {
    await this.sendPushNotification(entry.patientId, {
      title: 'Your Turn!',
      body: `Please proceed to ${entry.departmentName}. You are being called.`,
      data: { queueId: entry.id, type: 'queue_called' },
    });
  }
}
```

---

## 7. Accessibility Architecture

### 7.1 ARIA Patterns

```typescript
// components/queue-list.tsx
export function QueueList({ queues, onSelect }: QueueListProps) {
  return (
    <div
      role="feed"
      aria-label="Patient queue"
      aria-busy={isLoading}
      className="space-y-4"
    >
      {isLoading && (
        <div role="status" aria-live="polite" className="sr-only">
          Loading queue data...
        </div>
      )}
      
      {queues.map((queue, index) => (
        <QueueCard
          key={queue.id}
          queue={queue}
          onClick={() => onSelect(queue.id)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(queue.id);
            }
          }}
          aria-posinset={index + 1}
          aria-setsize={queues.length}
          aria-label={`Patient ${queue.patientName}, position ${queue.position}, status ${queue.status}`}
        />
      ))}
    </div>
  );
}

// components/status-badge.tsx
interface StatusBadgeProps {
  status: QueueStatus;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    waiting: { color: 'bg-amber-100 text-amber-800', icon: Clock },
    called: { color: 'bg-blue-100 text-blue-800', icon: Bell },
    in_progress: { color: 'bg-green-100 text-green-800', icon: Activity },
    completed: { color: 'bg-gray-100 text-gray-800', icon: Check },
    cancelled: { color: 'bg-red-100 text-red-800', icon: X },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}
```

### 7.2 Keyboard Navigation

```typescript
// lib/hooks/use-keyboard-nav.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcuts configuration
const queueShortcuts: KeyboardShortcut[] = [
  { key: 'n', handler: () => router.push('/queue/new'), description: 'New queue entry' },
  { key: 'r', handler: () => queryClient.invalidateQueries(['queues']), shift: true, description: 'Refresh queue' },
  { key: '/', handler: () => document.getElementById('search')?.focus(), description: 'Focus search' },
  { key: 'Escape', handler: () => closeAllModals(), description: 'Close modal' },
];
```

### 7.3 Focus Management

```typescript
// lib/hooks/use-focus-management.ts
'use client';

import { useRef, useCallback, useEffect } from 'react';

export function useFocusManagement() {
  const focusTrapRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    previousFocusRef.current?.focus();
  }, []);

  return { trapFocus, saveFocus, restoreFocus };
}

// Focus trap component for modals
export function FocusTrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveFocus, restoreFocus, trapFocus } = useFocusManagement();

  useEffect(() => {
    if (!active) return;

    saveFocus();
    containerRef.current?.focus();

    const cleanup = trapFocus(containerRef);
    return () => {
      cleanup?.();
      restoreFocus();
    };
  }, [active, saveFocus, restoreFocus, trapFocus]);

  return (
    <div ref={containerRef} tabIndex={-1} className="outline-none">
      {children}
    </div>
  );
}
```

### 7.4 Screen Reader Support

```typescript
// components/queue-updates-announcer.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useQueueStore } from '@/lib/stores/queue';

export function QueueUpdatesAnnouncer() {
  const announcementRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<string>('');

  const queueUpdates = useQueueStore((state) => state.updates);

  useEffect(() => {
    const latestUpdate = queueUpdates[queueUpdates.length - 1];
    if (!latestUpdate || latestUpdate.id === lastUpdateRef.current) return;

    lastUpdateRef.current = latestUpdate.id;

    // Update the live region
    if (announcementRef.current) {
      announcementRef.current.textContent = generateAnnouncement(latestUpdate);
    }
  }, [queueUpdates]);

  return (
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

function generateAnnouncement(update: QueueUpdate): string {
  switch (update.type) {
    case 'patient_called':
      return `Patient ${update.patientName}, queue number ${update.queueNumber}, please proceed to ${update.departmentName}.`;
    case 'queue_updated':
      return `Queue position updated. Current wait time is approximately ${update.estimatedWait} minutes.`;
    case 'patient_completed':
      return `Queue number ${update.queueNumber} has completed their visit.`;
    default:
      return '';
  }
}

// Skip link component
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary-600 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {children}
    </a>
  );
}
```

---

## 8. Implementation Priorities

### Phase 1: Foundation (Weeks 1-4)
1. **Design System Setup**
   - Configure Tailwind with design tokens
   - Create base UI components (`packages/ui`)
   - Set up Storybook
   - CSS variables for theming

2. **API Foundation**
   - Type-safe API schemas (`packages/shared`)
   - tRPC integration
   - Error handling standardization
   - React Query hooks

3. **Authentication**
   - Role-based access control
   - Protected route groups
   - Token refresh logic

### Phase 2: Core Features (Weeks 5-8)
1. **Queue Management**
   - Queue list view with real-time updates
   - Add/edit queue entries
   - Status management
   - Position calculation

2. **WebSocket Integration**
   - Connection manager
   - Real-time queue updates
   - Display synchronization

3. **TV Display**
   - Waiting room display
   - Current patient view
   - Announcements

### Phase 3: Mobile (Weeks 9-12)
1. **Expo Router Setup**
   - File-based routing
   - Authentication flow
   - Tab navigation

2. **Offline Support**
   - SQLite database
   - Background sync
   - Conflict resolution

3. **Push Notifications**
   - Token management
   - Notification handlers
   - Deep linking

### Phase 4: Polish (Weeks 13-16)
1. **Accessibility Audit**
   - ARIA compliance
   - Keyboard navigation
   - Screen reader testing

2. **Performance Optimization**
   - Bundle analysis
   - Image optimization
   - Caching strategies

3. **Monitoring**
   - Error tracking
   - Analytics integration
   - Web Vitals monitoring

---

## Appendix: Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-devtools": "^5.0.0",
    "@trpc/react-query": "^11.0.0",
    "zod": "^3.22.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.3.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@storybook/react": "^8.0.0",
    "@storybook/addon-a11y": "^8.0.0",
    "@next/bundle-analyzer": "^14.2.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.2.0",
    "eslint": "^8.56.0"
  }
}
```

---

## File Structure Reference

```
hospital-queue-system/
├── apps/
│   ├── web/                      # Next.js 14 App Router
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   ├── mobile/                   # Expo Router
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── api/                      # Cloudflare Workers
│       └── src/
├── packages/
│   ├── ui/                       # Shared UI components
│   │   └── src/
│   └── shared/                   # Shared types, schemas, utils
│       └── src/
├── services/
│   └── docker-compose.yml        # PostgreSQL, Redis
└── turbo.json
```

---

*Document Version: 2.0*
*Last Updated: 2026-03-20*
*Project: Limuru Cottage Hospital Queue Management System*
