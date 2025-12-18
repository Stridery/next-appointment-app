# 📢 Advertising Pay-Per-Day System Complete

## ✅ What Changed

### From Package Model → Pay-Per-Day Model

**Before:**
- User selects from preset packages (Basic, Pro, Enterprise)
- Fixed prices and durations
- Managed via `ad_plans` table

**After:**
- User inputs number of days (minimum 1)
- Dynamic pricing: $5.00/day
- Membership discount: 5% off
- No preset packages needed

---

## 🎯 Key Features

### 1. **Dynamic Pricing**
```
Base Rate: $5.00 per day
User Input: Number of days
Membership Discount: 5% (for active subscribers)

Example:
10 days × $5.00 = $50.00
With membership: $50.00 - $2.50 (5%) = $47.50
```

### 2. **Campaign Extension**
- If user has active campaign: extends from current `end_at`
- If campaign expired: starts from now
- All purchases extend the same campaign (no multiple parallel campaigns)

### 3. **Membership Integration**
- Checks `subscriptions` table for active membership
- Automatic 5% discount applied
- Status shown on payment page

---

## 📊 Database Changes

### `ads` Table - New Fields Added

Run this SQL in Supabase:

```sql
-- Add new columns
ALTER TABLE ads
ADD COLUMN IF NOT EXISTS days_purchased INTEGER,
ADD COLUMN IF NOT EXISTS daily_rate_cents INTEGER,
ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS had_membership BOOLEAN DEFAULT FALSE;
```

**Field Descriptions:**
- `days_purchased` - Number of days purchased
- `daily_rate_cents` - Rate per day in cents (500 = $5.00)
- `total_amount_cents` - Total paid after discount
- `discount_percent` - Discount applied (5.00 = 5%)
- `had_membership` - Whether user had membership at purchase time

### Deleted Tables
- ❌ `ad_plans` - No longer needed (deleted from database)

---

## 🔄 Updated Files

### 1. **Types**
- `src/payments/types/advertising.ts` - Simplified, removed ad_plans types

### 2. **Services**
- `src/payments/service/advertisingService.ts`
  - Removed: `getAdPlan`, `getAdPlanByPackageId`, `getExistingAdForPlan`
  - Added: `calculateAdPrice` (handles membership discount)
  - Simplified: `createAd`, `extendAd`, `calculateAdDates`

### 3. **API Routes**
- `src/app/api/payment/create-session/route.ts`
  - `handleAdvertisingPurchase` completely rewritten
  - Now checks membership status
  - Calculates dynamic pricing
  
- `src/app/api/ad-plans/route.ts` - **DELETED**

### 4. **Webhooks**
- `src/payments/service/webhookService.ts`
  - `handleAdvertisingPurchase` rewritten
  - Reads days, pricing from metadata
  - Creates or extends campaigns

### 5. **Frontend**
- `src/app/payment/advertising/page.tsx` - **Completely rewritten**
  - Shows active campaign status
  - Input box for days (not preset cards)
  - Real-time price calculation
  - Shows membership discount
  - Calculator-style UI

---

## 🎨 User Experience

### Page Layout

```
┌──────────────────────────────────────────────┐
│ Advertising Campaigns                        │
│ Boost your business visibility              │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🟢 Active Campaign: My Business              │
│ Started: Dec 15, 2025                        │
│ Expires: Dec 25, 2025                        │
│ 10 days remaining                            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Extend Your Campaign                         │
│                                              │
│ How many days would you like to advertise?  │
│ [    7    ] days                             │
│                                              │
│ Price Calculation:                           │
│ Daily rate: $5.00/day                        │
│ Number of days: 7 days                       │
│ Subtotal: $35.00                             │
│ 🎖️ Membership discount (5%): -$1.75          │
│ ─────────────────────────────────            │
│ Total: $33.25                                │
│                                              │
│ [Continue to Payment - $33.25]               │
└──────────────────────────────────────────────┘
```

---

## 🔄 Payment Flow

### 1. User Journey

```
User visits /payment/advertising
  ↓
System checks:
  - User's business
  - Active ad campaign
  - Membership status
  ↓
User inputs days (e.g., 7)
  ↓
System calculates:
  - Subtotal: 7 × $5.00 = $35.00
  - Discount: 5% if member = -$1.75
  - Total: $33.25
  ↓
User clicks "Continue to Payment"
  ↓
Redirect to Stripe Checkout
  ↓
User completes payment
  ↓
Webhook receives event
  ↓
System creates/extends campaign
  ↓
User sees updated campaign status
```

### 2. Backend Logic

**Create Session API:**
```typescript
POST /api/payment/create-session
{
  "productType": "advertising",
  "userId": "uuid",
  "businessId": "uuid",
  "days": 7
}

Backend:
1. Check membership → hasMembership
2. Calculate: 7 × 500 = 3500 cents
3. Apply 5% discount if member → 3325 cents
4. Create Stripe session with metadata
```

**Webhook Handler:**
```typescript
Event: checkout.session.completed

Metadata:
- days: 7
- dailyRateCents: 500
- totalAmountCents: 3325
- hasMembership: true
- discountPercent: 5.0

Logic:
1. Get active ad for business
2. If exists & not expired:
     endAt = currentEndAt + 7 days
   Else:
     endAt = now + 7 days
3. Update or create ad record
```

---

## 📋 Testing Checklist

### Step 1: Database Setup
```sql
-- Run in Supabase SQL Editor
-- File: src/supabase/add_ads_purchase_fields.sql
```

### Step 2: Create a Business
- User must have a business record in `businesses` table
- Link to your user_id

### Step 3: Test Without Membership
1. Visit `/payment/advertising`
2. Should show "No Active Campaign"
3. Enter days (e.g., 5)
4. Price should be: $25.00 (no discount)
5. Complete payment
6. Check `ads` table:
   - `days_purchased` = 5
   - `daily_rate_cents` = 500
   - `total_amount_cents` = 2500
   - `had_membership` = false
   - `discount_percent` = 0.00

### Step 4: Test With Membership
1. Have an active subscription
2. Visit `/payment/advertising`
3. Should show membership discount
4. Enter days (e.g., 10)
5. Price should be: $47.50 (5% off $50.00)
6. Complete payment
7. Check `ads` table:
   - `total_amount_cents` = 4750
   - `had_membership` = true
   - `discount_percent` = 5.00

### Step 5: Test Campaign Extension
1. Have an active campaign (e.g., ending Dec 25)
2. Purchase 5 more days
3. `end_at` should update to Dec 30
4. `days_purchased` should sum up

---

## 🐛 Troubleshooting

### Issue: "Business not found"
**Solution:** 
```sql
-- Check if user has a business
SELECT * FROM businesses WHERE owner_id = 'your-user-id';

-- If not, create one
INSERT INTO businesses (owner_id, name) 
VALUES ('your-user-id', 'Test Business');
```

### Issue: No discount showing but I have membership
**Solution:**
```sql
-- Check subscription status
SELECT * FROM subscriptions 
WHERE profile_id = 'your-user-id' 
AND status = 'active';
```

### Issue: Campaign not extending
**Solution:**
1. Check webhook is running: `stripe listen --forward-to localhost:3000/api/payment/webhook`
2. Check webhook logs in terminal
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

---

## 💰 Pricing Summary

| Scenario | Days | Base Price | Discount | Final Price |
|----------|------|------------|----------|-------------|
| No membership | 1 | $5.00 | $0.00 | **$5.00** |
| No membership | 7 | $35.00 | $0.00 | **$35.00** |
| No membership | 30 | $150.00 | $0.00 | **$150.00** |
| With membership | 1 | $5.00 | -$0.25 | **$4.75** |
| With membership | 7 | $35.00 | -$1.75 | **$33.25** |
| With membership | 30 | $150.00 | -$7.50 | **$142.50** |

---

## ✨ Future Enhancements

Consider adding:
- [ ] Bulk pricing (e.g., 50+ days get 10% off)
- [ ] Daily budget instead of days
- [ ] Campaign performance metrics
- [ ] A/B testing for different ads
- [ ] Geographic targeting options
- [ ] Pause/resume campaign feature

---

**Migration Date:** December 17, 2025  
**Status:** ✅ Complete and Ready for Testing

**Key Simplifications:**
- No more ad_plans table to maintain
- Easier to adjust daily rate (just change constant)
- More flexible for users (buy any number of days)
- Cleaner code (less database queries)

