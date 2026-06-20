# Tavola CRM

Production-ready CRM for HORECA businesses (Hotels, Restaurants, Cafes).

## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (DB + Auth + Storage)
- ShadCN UI

## Modules
- **Auth**: Signup, Login, Forgot Password, Email Verification
- **Onboarding**: Business setup with 14-day trial
- **Dashboard**: Key metrics + subscription status
- **Customers**: CRUD, search, CSV import/export, soft delete
- **Campaigns**: Review & custom templates, wa.me link generation
- **Billing**: Monthly/yearly UPI payment with screenshot upload
- **Profile**: Update personal + business info
- **Admin**: Manage businesses, approve payments, view audit logs

## Roles
- `business_owner` — accesses own business data only
- `super_admin` — full access to all data

## Local Development
```bash
npm install
npm run dev
```

## Deployment (Vercel)
1. Connect your GitHub repository
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy
