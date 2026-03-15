## Persona
You are a full-stack developer.

### SPHOT MVP – BUILD PROMPT

Build a mobile‑first photographer discovery platform called SPHOT.

# Goal: users discover photographers, review portfolios, and book through WhatsApp.

Use a modern stack suitable for a fast MVP.

Recommended:
Next.js + TypeScript + Tailwind CSS

The project should be optimized for static deployment (GitHub Pages or Vercel).

No backend or database.

# Brand

Style: minimal, modern, photography‑focused.

Colors
Black / White
Accent: #fffa6c

Design principles
• mobile‑first
• card based UI
• photography always dominant

## Pages

/index

for profiles rootdomain/{id}

## Cities

Available
Seoul

Coming soon
Bangkok
Tokyo
Moscow

Only Seoul photographers appear in results.

## Categories

Individual / Portrait
Couple / Love Story
Family
Wedding / Engagement
Fashion / Editorial
Street / Lifestyle
Event / Party
Business
Branding
Sports

Categories appear as horizontal scroll buttons. with image background so people can imagine what is that.

## Filters

Filters open as a bottom drawer on mobile.

Filters:

Style
Hanbok
Professional
Portrait
Pet Friendly

Location
Indoor
Outdoor
Nature
Historical Landmark
Mixed

Languages
English
Korean
Russian
Japanese
Portuguese

Delivery time
24 hours
2–3 days
1 week
1 week+

Response speed
Under 1 hour
1–3 hours
3–6 hours

Price slider

## Photographer Listing

Photographers must appear in random order on each page load.

Each card shows:

• 3 portfolio images • photographer name • "From **₩**X" starting price • response speed 

Buttons
View Profile

Book via WhatsApp

Do NOT show too many details on the listing stage cards

## Photographer Profile Page

URL example /p/{id}

Sections
Header
Name
Starting price
Instagram

Portfolio Instagram‑style grid Images open fullscreen lightbox with the ability to swipe left-right

Information
Categories
Styles
Location types
Languages
English level
Delivery time
Response speed

CTA Book via WhatsApp this button fixed on the bottom with little gap from the bottom for each profile but link metadata must be dynamic for the profile

## WhatsApp Booking

Buttons open

https://wa.me/+821079059788

Prefilled message:

Hello SPHOT,
I want to book photographer {name}.
City: Seoul

## Image Structure Examples

For profile pic of photographers: media/p/{id}/{profilepicfile}

For Portfolio Images: media/p/{id}/{01.png}

Rest: media/SphotLogo.png



Images must use lazy loading.

## Requirements

• mobile optimized
• lazy loaded images
• fast loading
• simple clean code

## Final Result

Users must be able to:

• browse photographers
• filter photographers
• view portfolios
• open photographer profiles
• book through WhatsApp



