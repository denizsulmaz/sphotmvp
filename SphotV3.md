# Sphot V3 SaaS Platform - Specifications

This document defines the finalized requirements, architecture, and specifications for the transition of Sphot from an MVP directory into a full-scale booking SaaS platform.

---

## 1. System Overview

Sphot V3 is a marketplace SaaS platform where clients can browse, chat with, and book photographers.

### Core Transaction Model
* **Reservation Fee:** Clients pay a flat platform reservation fee of **25,000 KRW** via Lemon Squeezy to secure a booking. This fee is identical for all photographers and is fully refundable upon booking cancellation.
* **Direct Settlement:** The remaining payment is settled directly between the photographer and the client, based on their final agreement. 
* **Chat Access:** In-platform messaging is unlocked **only** after the reservation fee payment is successfully completed.

---

## 2. Key Portals & Features

### A. Client Portal (Main Site)
1. **Browse & Search:**
   * Filter photographers by location, category, rating, base price, and availability.
2. **Photographer Profile:**
   * View portfolio (maximum 10 images).
   * Read reviews from previous clients.
   * View public hourly availability slots.
3. **Booking & Checkout Flow:**
   * Select an hourly availability slot.
   * Enter booking details (description, location, expectations).
   * **Seamless Sign-up/Sign-in Integration:** If not logged in, the client undergoes a smooth, inline registration/login during checkout (no upfront registration required).
   * Pay the 25,000 KRW reservation fee via Lemon Squeezy.
4. **Dashboard & Communication:**
   * Direct in-platform messaging/chat with the photographer after a booking is paid and initialized.
   * View booking status (Pending, Paid, Confirmed, Completed, Cancelled).
   * Leave a review (1-5 stars + text comment) post-shoot.

### B. Photographer Portal
1. **Onboarding & Profile Setup:**
   * Set base pricing, categories (e.g., wedding, portrait, event), and locations served.
   * Upload and manage a portfolio of up to 10 high-quality images.
   * **Verification Process:** Profiles must be reviewed and approved by the Admin before becoming visible in public searches. Approvals are made within 3 business days.
2. **Schedule Management:**
   * Define specific hourly active slots (e.g., "June 25, 2026, 10:00 AM - 12:00 PM") on the dashboard for clients to select.
   * Block out custom dates.
3. **Booking Management:**
   * View incoming bookings.
   * Approve or decline booking requests.
   * Mark a booking/session as "Completed".
4. **Chat Portal:**
   * Direct, real-time chat with clients who have completed their reservation payment.

### C. Admin Portal
1. **Photographer Moderation:**
   * Review and approve/reject photographer profiles within 3 business days of application.
2. **Platform Management:**
   * Configure the global flat reservation fee (defaulting to 25,000 KRW).
   * Manage categories, locations, and tags.
3. **System Dashboard:**
   * Monitor total bookings, active users, messaging volumes, and platform revenues.
4. **Review Moderation:**
   * Flag or remove inappropriate reviews.

---

## 3. Technology Stack & Design Direction

### Tech Stack
* **Frontend Framework:** Next.js 14 (App Router)
* **Styling:** Vanilla Tailwind CSS with custom theme variables.
* **Database & Real-time Sync:** Supabase (PostgreSQL)
  * Supabase Auth for user authentication and role management (roles: `admin`, `photographer`, `client`).
  * Supabase Storage for photographer portfolios (max 10 files per photographer).
  * Supabase Realtime for instant in-platform messaging.
* **Payments:** Lemon Squeezy (hosted checkout & webhooks for processing the 25,000 KRW reservation fee).

### Design & Art Direction
Maintain the art direction of the current website:
* **Theme:** Light and dark mode support with sharp minimalist contrast.
  * Light Background: `#ffffff`, Foreground: `#000000`
  * Dark Background: `#000000`, Foreground: `#f4f4f5`
  * Accent Color: Custom cream/yellow (`#fffa6c`)
* **Layout Elements:** Responsive category horizontal scroll (with hidden scrollbars) and smooth transitions.
* **Dashboards:** Keep the minimalist visual language, ensuring a premium, polished user experience.
