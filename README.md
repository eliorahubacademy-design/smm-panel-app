# SMM Panel

A full-stack Social Media Marketing panel built with Next.js 15, Supabase, and Tailwind CSS. All services listed are **authorized and platform-compliant** — no fake engagement or artificial manipulation.

## Features

- **Multi-role system**: Customer, Reseller, Admin
- **Wallet system**: Deposit via GCash/Maya/Bank Transfer with admin verification
- **Service catalog**: 6 platforms (Facebook, Instagram, TikTok, LinkedIn, YouTube, X)
- **Order management**: Atomic wallet deductions with rollback on failure
- **Reseller pricing**: Custom markup on base prices
- **Support tickets**: With order linkage and priority levels
- **Admin controls**: User, service, order, payment, and supplier management
- **Audit logs**: All admin actions recorded
- **Supplier abstraction**: Plug-and-play API adapter pattern

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Supabase (with RLS)
- **Auth**: Supabase Auth with SSR cookies
- **Deployment**: Vercel

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database migration

In the Supabase SQL editor, run the contents of:
```
supabase/migrations/001_initial_schema.sql
```

### 3. Configure environment variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Security**: Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. It is only used in server-side API routes via `createAdminClient()`.

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

### 5. Create an admin user

1. Register a new account at `/register`
2. In the Supabase dashboard, manually set the user's `role` to `admin` in the `profiles` table

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Set environment variables in Vercel project settings
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Register
│   ├── (dashboard)/
│   │   ├── admin/           # Admin pages
│   │   ├── customer/        # Customer pages
│   │   └── reseller/        # Reseller pages
│   ├── api/                 # API routes
│   └── page.tsx             # Landing page
├── components/
│   ├── dashboard/           # Reusable dashboard components
│   └── layout/              # Sidebar, DashboardLayout
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── suppliers/           # Supplier adapter pattern
│   └── utils/               # Helpers
└── types/                   # TypeScript types
```

## Supplier Integration

To add a real supplier API:

1. Create a class implementing `SupplierAdapter` in `src/lib/suppliers/`
2. Implement `placeOrder()`, `getOrderStatus()`, `getBalance()`
3. Add supplier record to the `suppliers` table in Supabase
4. Register in `getSupplierAdapter()` factory function
5. Add API keys as environment variables in Vercel (never in code)

## Security Notes

- Wallet balances can **only** be modified server-side via stored functions
- All admin routes verify role server-side independently
- Row Level Security (RLS) enforced at the database level
- Service role key never exposed to the browser
- All inputs validated with Zod before database operations
