# Wallet Feature - Testing Guide

## Pre-Testing Setup

### 1. Generate Referral Codes for Existing Users
```bash
node scripts/generateReferralCodes.js
```

### 2. Verify Environment Variables
Ensure `.env` has:
```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

### 3. Razorpay Test Cards
Use these for testing payments:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4111 1111 1111 1112
- CVV: Any 3 digits
- Expiry: Any future date

## Test Cases

### Test 1: View Wallet Page
**Steps:**
1. Login as a user
2. Click "Wallet" in sidebar
3. Verify you see:
   - Wallet balance
   - Referral code (6 characters)
   - "Add Money" button
   - Referral earnings
   - Transaction history (if any)

**Expected Result:** ✅ Page loads with all sections

---

### Test 2: Add Money - Success Flow
**Steps:**
1. Click "Add Money" button
2. Enter amount: 500
3. Click "Proceed to Pay"
4. Razorpay modal opens
5. Use test card: 4111 1111 1111 1111
6. Complete payment

**Expected Result:** 
- ✅ Payment successful message
- ✅ Wallet balance increased by ₹500
- ✅ Transaction appears in history
- ✅ Page reloads with new balance

---

### Test 3: Add Money - Validation
**Steps:**
1. Click "Add Money"
2. Try these amounts:
   - 50 (below minimum)
   - 60000 (above maximum)
   - 1000 (valid)

**Expected Results:**
- ❌ 50: "Minimum amount is ₹100"
- ❌ 60000: "Maximum amount is ₹50,000"
- ✅ 1000: Proceeds to payment

---

### Test 4: Add Money - Payment Cancellation
**Steps:**
1. Click "Add Money"
2. Enter amount: 300
3. Click "Proceed to Pay"
4. Close Razorpay modal (cancel payment)

**Expected Result:** 
- ℹ️ "Payment was cancelled" message
- ✅ Wallet balance unchanged
- ✅ No transaction recorded

---

### Test 5: Copy Referral Code
**Steps:**
1. On wallet page, note your referral code
2. Click the copy button next to code
3. Paste in a text editor

**Expected Result:** 
- ✅ "Copied!" success message
- ✅ Code copied to clipboard correctly

---

### Test 6: Apply Referral Code - Success
**Steps:**
1. Create/Login as User A
2. Note User A's referral code (e.g., "ABC123")
3. Logout
4. Create/Login as User B (new user)
5. Go to User B's wallet
6. Enter User A's code in "Have a Referral Code?" section
7. Click "Apply"

**Expected Result:**
- ✅ Success message: "₹100 added to your wallet!"
- ✅ User B's balance increased by ₹100
- ✅ User A's balance increased by ₹500
- ✅ User A's referral earnings increased by ₹500
- ✅ Both users have transaction records
- ✅ User B's referral input section disappears

---

### Test 7: Apply Referral Code - Already Used
**Steps:**
1. As User B (who already used a code)
2. Try to apply another referral code

**Expected Result:**
- ❌ "You have already used a referral code" message
- ✅ Wallet balance unchanged
- ✅ Shows "Referral Code Applied" status

---

### Test 8: Apply Referral Code - Own Code
**Steps:**
1. Login as User A
2. Try to apply User A's own referral code

**Expected Result:**
- ❌ "You cannot use your own referral code" message
- ✅ Wallet balance unchanged

---

### Test 9: Apply Referral Code - Invalid Code
**Steps:**
1. Login as a user who hasn't used a code
2. Try these codes:
   - "XXXXXX" (doesn't exist)
   - "ABC" (too short)
   - "ABC12@" (invalid characters)

**Expected Results:**
- ❌ "XXXXXX": "Invalid referral code"
- ❌ "ABC": "Invalid referral code format"
- ❌ "ABC12@": "Referral code must be 6 alphanumeric characters"

---

### Test 10: Use Wallet in Checkout
**Steps:**
1. Add items to cart
2. Go to checkout
3. Check "Use Wallet Balance"
4. Verify total is reduced
5. Place order with COD

**Expected Result:**
- ✅ Total reduced by wallet amount
- ✅ Order placed successfully
- ✅ Wallet balance deducted
- ✅ Transaction recorded as debit

---

### Test 11: Transaction History Display
**Steps:**
1. Perform multiple actions:
   - Add money (₹500)
   - Apply referral code (₹100)
   - Place order using wallet (₹200)
2. Check transaction history

**Expected Result:**
- ✅ All transactions listed
- ✅ Correct amounts with +/- signs
- ✅ Correct descriptions
- ✅ Correct balance after each transaction
- ✅ Newest transactions at top
- ✅ Proper icons (green for credit, red for debit)

---

### Test 12: Referral Earnings Tracking
**Steps:**
1. As User A, note initial referral earnings
2. Have 3 different users apply User A's code
3. Check User A's referral earnings

**Expected Result:**
- ✅ Earnings increased by ₹1500 (₹500 × 3)
- ✅ Wallet balance increased by ₹1500
- ✅ 3 separate transaction records

---

### Test 13: Mobile Responsiveness
**Steps:**
1. Open wallet page on mobile device or resize browser
2. Check all sections

**Expected Result:**
- ✅ Layout adjusts properly
- ✅ All buttons clickable
- ✅ Text readable
- ✅ Cards stack vertically

---

### Test 14: Concurrent Referral Applications
**Steps:**
1. Have 2 users try to apply the same referral code simultaneously

**Expected Result:**
- ✅ Both succeed
- ✅ Referrer gets ₹1000 total (₹500 × 2)
- ✅ Each referee gets ₹100
- ✅ All transactions recorded correctly

---

### Test 15: Database Consistency
**Steps:**
1. After various transactions, check database
2. Verify:
   - User wallet balance matches latest transaction balance
   - All transactions have correct userId
   - hasUsedReferral flag is correct
   - Referral codes are unique

**Expected Result:**
- ✅ All data consistent
- ✅ No orphaned transactions
- ✅ Balances match

---

## Edge Cases to Test

### Edge Case 1: Exactly ₹100 in Wallet
- Add ₹100 to wallet
- Try to use in checkout for ₹150 order
- Should use ₹100 from wallet + ₹50 from payment method

### Edge Case 2: Wallet Covers Full Order
- Have ₹1000 in wallet
- Place ₹500 order with wallet enabled
- Should deduct ₹500, no payment gateway needed

### Edge Case 3: Multiple Rapid Add Money Requests
- Click "Add Money" multiple times quickly
- Each should create separate Razorpay orders
- Only completed payments should credit wallet

### Edge Case 4: Referral Code Case Sensitivity
- Try applying code in lowercase
- Should work (converted to uppercase)

---

## Performance Tests

### Load Test 1: Transaction History
- Create 100+ transactions
- Load wallet page
- Should load within 2 seconds

### Load Test 2: Referral Code Generation
- Create 1000 new users
- Each should get unique code
- No duplicates

---

## Security Tests

### Security Test 1: Direct API Calls
- Try calling `/wallet/add-money` without login
- Should redirect to login

### Security Test 2: Tampered Payment Verification
- Modify Razorpay signature
- Should fail verification
- Wallet should not be credited

### Security Test 3: SQL Injection in Referral Code
- Try entering: `'; DROP TABLE users; --`
- Should be rejected as invalid format

---

## Regression Tests

After any code changes, verify:
1. ✅ Existing wallet balances unchanged
2. ✅ Old transactions still visible
3. ✅ Referral codes still work
4. ✅ Checkout wallet usage still works

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No database errors
- ✅ Correct balance calculations
- ✅ Proper transaction recording
- ✅ User-friendly error messages
- ✅ Smooth UI/UX

---

## Troubleshooting

### Issue: Razorpay not opening
**Solution:** Check RAZORPAY_KEY_ID in .env and browser console

### Issue: Referral code not generated
**Solution:** Run `node scripts/generateReferralCodes.js`

### Issue: Transaction not recorded
**Solution:** Check MongoDB connection and WalletTransaction model

### Issue: Balance mismatch
**Solution:** Check latest transaction balance field

---

## Test Report Template

```
Date: ___________
Tester: ___________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | View Wallet | ✅/❌ | |
| 2 | Add Money Success | ✅/❌ | |
| 3 | Add Money Validation | ✅/❌ | |
| ... | ... | ... | |

Overall Status: PASS / FAIL
Issues Found: ___________
```

---

**Happy Testing! 🚀**
