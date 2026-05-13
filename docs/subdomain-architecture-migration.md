# Pomah Guesthouse Subdomain Architecture Migration

## Target Architecture

### Public
- https://pomahguesthouse.com
- SEO pages
- Booking
- Landing pages
- Explore Semarang

### Admin
- https://admin.pomahguesthouse.com
- Dashboard
- SEO Agent
- AI tools
- Media library
- Analytics

---

## Migration Checklist

### Routing
- Remove legacy `/admin/*` routes from production usage
- Use clean admin routes:
  - `/dashboard`
  - `/bookings`
  - `/seo-agent`

### Domain Separation
- Public app renders only public routes
- Admin app renders only admin routes
- Cross-domain redirects enabled

### SEO Protection
- Admin domain must use:
  - `noindex,nofollow`
  - no sitemap
  - no GlobalSEO rendering

### Public SEO
- Public app remains lightweight
- Dynamic location SEO pages enabled
- Programmatic SEO supported

### Future Improvements
- Split services into:
  - `services/seo`
  - `services/ai`
  - `services/admin`
- Move AI jobs to backend/edge functions
- Add auth guards
- Add ranking tracker backend sync
