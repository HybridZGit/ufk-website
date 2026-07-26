# UFK full website

This GitHub Pages-ready website includes:

- UFK branded hero and background
- Animated gold background particles
- Camacho Kit vs Leonard listing for $10
- Usyk vs Rico Kit listing for $10 with front and side previews
- Three kit preview screenshots
- Five-item robes section
- Every robe priced at $5
- Discord purchase buttons that copy the correct message
- Discord invite: https://discord.gg/zweuZ96QBe
- Responsive desktop and mobile layouts

## Publish

Upload every file and folder to the root of your GitHub repository, then enable GitHub Pages from the `main` branch and `/ (root)` folder.

- Floating animated client review panel with autoplay, pause, previous, and next controls
- Dedicated client reviews section

- Hector Kit listing for $10 with dedicated Discord purchase message

- Stripe payment integration using: https://buy.stripe.com/cNi28tcsha8Q1ek5Yw8so00
- Every paid item now opens a checkout reminder modal before Stripe
- Clear instructions to join Discord and open a ticket after purchase
- Customers are told to include their Stripe receipt and purchased item name

- Crawford Kit listing for $10 with front, back, and robe previews

- Usyk vs Witherspoon UFK Exclusive added as a free direct RAR download
- Includes kit preview and fight reference image

- Poster Designs section with six uploaded examples
- Individual poster price: $10
- 10-poster bundle price: $70
- Poster payments use the existing Stripe checkout and Discord ticket workflow

- See Our Kits in Action section with three uploaded MP4 gameplay clips
- Featured video plus three responsive video cards
- Videos pause each other automatically when a new clip starts

- Sugar Ray Leonard Playboy x True Religion Kit added for $25
- Includes front, back, side, and boots previews
- Uses the existing Stripe checkout and Discord ticket workflow

- Canelo vs Canelo Support Our Fight section
- Embedded official YouTube trailer
- Direct Matcherino support links
- Cinematic red/blue fight-night visuals and responsive mobile layout

- Browser-based client login and registration
- My Account dashboard with saved kit, robe, poster, and bundle checkout history
- Local order count and total value
- Account data is stored in localStorage on the customer's device
- Orders are added when a signed-in customer continues to Stripe

- Every paid Stripe checkout creates a unique UFK invoice ID
- Every free kit download also creates a unique UFK invoice ID
- Paid and free orders appear in the signed-in customer's local account history
- Invoice details are posted to the configured Discord invoice webhook
- Static-site limitation: paid orders are recorded when Stripe checkout opens, not after Stripe confirms payment

- New-client Discord signup webhook notification
- Local admin login: admin@ufk.local / UFK-ADMIN-2026
- Admin account list with signup dates and order counts
- Revoke and restore client accounts
- View every locally stored client's invoice history
- Change invoice/order status
- Attach delivered files to invoices using browser IndexedDB
- Customers can download delivered files from their My Account history
- Static-site limitation: accounts, admin data, and delivered files are visible only in the browser/device where they were stored

## Shared Supabase account system

This version replaces browser-only accounts with Supabase Authentication, Postgres, and Storage.

- Accounts are shared across all devices
- Admins can see every registered profile and order
- Account revocations apply everywhere
- Order history is shared across devices
- Admin delivery uploads are stored in the private `ufk-deliveries` bucket
- Customers receive temporary signed download links
- Run `SUPABASE-SETUP.sql` before testing
- Follow `SETUP-NEXT-STEPS.txt` to promote your account to admin
