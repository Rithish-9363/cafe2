import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, generateId, uploadsDir } from './db.ts';
import {
  extractUser,
  hashPassword,
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  requireAdmin,
  requireAuth,
  safeCompareStrings,
  sanitizeImageUrl,
  signDemoPaymentToken,
  signToken,
  verifyDemoPaymentToken,
  verifyPassword,
} from './security.ts';
import type { AuthenticatedRequest } from './security.ts';

const ALLOWED_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
] as const;

const ALLOWED_PAYMENT_STATUSES = ['Pending', 'Paid', 'Test Paid (Demo)', 'Failed'] as const;

const ALLOWED_MOODS = [
  'Fresh Start',
  'Strong Coffee',
  'Something Refreshing',
  'Sweet Craving',
] as const;

function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}

function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function getEnvAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'admin@brewandbliss.cafe').trim().toLowerCase();
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface ProductRow {
  productId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  category: string;
  availability: number;
  moodTag: string;
  tastingNotes: string;
  featured: number;
  createdAt: string;
}

function computeOrderTotals(rawItems: unknown, orderType: 'pickup' | 'delivery') {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    return { error: 'Your cart must contain between 1 and 50 line items.' };
  }

  const normalizedMap = new Map<string, number>();
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') {
      return { error: 'Invalid cart item payload.' };
    }
    const { productId, quantity } = item as OrderItemInput;
    if (!isNonEmptyString(productId, 100) || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return { error: 'Each cart item must have a valid product ID and integer quantity between 1 and 50.' };
    }
    normalizedMap.set(productId, (normalizedMap.get(productId) ?? 0) + quantity);
  }

  const stmt = db.prepare('SELECT * FROM products WHERE productId = ?');
  const resolvedItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    lineTotal: number;
  }> = [];

  let subtotal = 0;

  for (const [productId, quantity] of normalizedMap.entries()) {
    const product = stmt.get(productId) as ProductRow | undefined;
    if (!product) {
      return { error: `Menu item "${productId}" was not found.` };
    }
    if (product.availability !== 1) {
      return { error: `"${product.name}" is currently sold out or unavailable.` };
    }
    const lineTotal = roundCurrency(product.price * quantity);
    subtotal = roundCurrency(subtotal + lineTotal);
    resolvedItems.push({
      productId: product.productId,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
      lineTotal,
    });
  }

  const tax = roundCurrency(subtotal * 0.08);
  const deliveryFee = orderType === 'delivery' ? (subtotal >= 35 ? 0 : 4.5) : 0;
  const total = roundCurrency(subtotal + tax + deliveryFee);

  return {
    items: resolvedItems,
    subtotal,
    tax,
    deliveryFee,
    total,
  };
}

function hydrateCart(itemsJson: string) {
  try {
    const parsed = JSON.parse(itemsJson) as Array<{ productId: string; quantity: number }>;
    if (!Array.isArray(parsed)) return [];
    const stmt = db.prepare('SELECT * FROM products WHERE productId = ?');
    const result: Array<ProductRow & { quantity: number }> = [];
    for (const entry of parsed) {
      if (!entry || typeof entry.productId !== 'string' || typeof entry.quantity !== 'number') continue;
      const product = stmt.get(entry.productId) as ProductRow | undefined;
      if (product && entry.quantity > 0) {
        result.push({ ...product, quantity: Math.min(50, Math.floor(entry.quantity)) });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function createApiRouter() {
  const router = express.Router();

  // Health & Config
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'brew-and-bliss' });
  });

  router.get('/payments/config', (_req, res) => {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    const publishable = (process.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
    res.json({
      stripeConfigured: Boolean(stripeKey && publishable),
      mode: stripeKey && publishable ? 'stripe' : 'demo',
      publishableKey: publishable || null,
    });
  });

  // Categories & Menu Products
  router.get('/categories', (_req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sortOrder ASC, categoryName ASC').all();
    res.json({ categories });
  });

  router.get('/products', (req, res) => {
    const { category, search, mood, sort, featured, includeUnavailable } = req.query;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (includeUnavailable !== 'true') {
      conditions.push('availability = 1');
    }
    if (typeof category === 'string' && category.trim() && category !== 'All') {
      conditions.push('category = ?');
      params.push(category.trim());
    }
    if (typeof mood === 'string' && mood.trim()) {
      conditions.push('moodTag = ?');
      params.push(mood.trim());
    }
    if (featured === 'true') {
      conditions.push('featured = 1');
    }
    if (typeof search === 'string' && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tastingNotes) LIKE ?)');
      params.push(q, q, q);
    }

    let orderBy = 'featured DESC, createdAt DESC';
    if (sort === 'price_asc') orderBy = 'price ASC';
    else if (sort === 'price_desc') orderBy = 'price DESC';
    else if (sort === 'name_asc') orderBy = 'name ASC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const products = db.prepare(`SELECT * FROM products ${whereClause} ORDER BY ${orderBy}`).all(...params);
    res.json({ products });
  });

  router.get('/products/:productId', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE productId = ?').get(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product });
  });

  router.get('/moods', (_req, res) => {
    const moodDescriptions: Record<(typeof ALLOWED_MOODS)[number], { subtitle: string; ritualNote: string }> = {
      'Fresh Start': {
        subtitle: 'Clean clarity, bright aromatics, and gentle morning warmth.',
        ritualNote: 'Ideal for unhurried mornings and clear-headed beginnings.',
      },
      'Strong Coffee': {
        subtitle: 'Concentrated crema, roasted depth, and bold espresso character.',
        ritualNote: 'Pulled rich and focused for decisive energy.',
      },
      'Something Refreshing': {
        subtitle: 'Crisp botanical infusions, citrus lift, and chilled slow steeps.',
        ritualNote: 'Cool, bright, and restorative for sunlit afternoons.',
      },
      'Sweet Craving': {
        subtitle: 'Caramelized pastry, Madagascar vanilla, and velvety cacao.',
        ritualNote: 'Gentle European indulgence crafted without excess.',
      },
    };

    const allAvailable = db
      .prepare('SELECT * FROM products WHERE availability = 1 ORDER BY featured DESC, price ASC')
      .all() as unknown as ProductRow[];
    const moods = ALLOWED_MOODS.map((moodName) => ({
      mood: moodName,
      subtitle: moodDescriptions[moodName].subtitle,
      ritualNote: moodDescriptions[moodName].ritualNote,
      recommendations: allAvailable.filter((p) => p.moodTag === moodName).slice(0, 4),
    }));
    res.json({ moods });
  });

  // Authentication
  router.post('/auth/register', (req, res) => {
    const { name, email, phone, password } = req.body ?? {};
    if (!isNonEmptyString(name, 80)) {
      res.status(400).json({ error: 'Please enter your full name (max 80 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT userId FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
      return;
    }

    const userId = generateId('usr');
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.prepare(
      'INSERT INTO users (userId, name, email, phone, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, name.trim(), normalizedEmail, phone.trim(), passwordHash, 'customer', now);

    const user = {
      userId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: 'customer' as const,
      createdAt: now,
    };
    const token = signToken(userId, 'customer');
    res.status(201).json({ token, user });
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ error: 'Please provide both a valid email and password.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const row = db
      .prepare('SELECT userId, name, email, phone, passwordHash, role, createdAt FROM users WHERE email = ?')
      .get(normalizedEmail) as
      | {
          userId: string;
          name: string;
          email: string;
          phone: string;
          passwordHash: string;
          role: 'customer' | 'admin';
          createdAt: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(row.userId, row.role);
    res.json({
      token,
      user: {
        userId: row.userId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        createdAt: row.createdAt,
      },
    });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const row = db
      .prepare('SELECT userId, name, email, phone, role, createdAt FROM users WHERE userId = ?')
      .get(req.user!.userId);
    res.json({ user: row });
  });

  router.patch('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const { name, phone } = req.body ?? {};
    if (!isNonEmptyString(name, 80)) {
      res.status(400).json({ error: 'Name must be between 1 and 80 characters.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }

    db.prepare('UPDATE users SET name = ?, phone = ? WHERE userId = ?').run(
      name.trim(),
      phone.trim(),
      req.user!.userId
    );
    const updated = db
      .prepare('SELECT userId, name, email, phone, role, createdAt FROM users WHERE userId = ?')
      .get(req.user!.userId);
    res.json({ user: updated });
  });

  router.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
      return;
    }
    const row = db
      .prepare('SELECT passwordHash FROM users WHERE userId = ?')
      .get(req.user!.userId) as { passwordHash: string } | undefined;

    if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    db.prepare('UPDATE users SET passwordHash = ? WHERE userId = ?').run(
      hashPassword(newPassword),
      req.user!.userId
    );
    res.json({ ok: true, message: 'Your password has been updated.' });
  });

  router.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body ?? {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    // Never reveal whether an email exists or leak reset tokens in unauthenticated responses
    res.json({
      ok: true,
      message:
        'Password reset emails require an outbound SMTP service configured on the server. If you are already signed in, you can update your password directly from your Account Security tab.',
    });
  });

  // Persistent Cart for signed-in customers
  router.get('/cart', requireAuth, (req: AuthenticatedRequest, res) => {
    const row = db.prepare('SELECT itemsJson FROM carts WHERE userId = ?').get(req.user!.userId) as
      | { itemsJson: string }
      | undefined;
    const items = row ? hydrateCart(row.itemsJson) : [];
    res.json({ items });
  });

  router.put('/cart', requireAuth, (req: AuthenticatedRequest, res) => {
    const { items } = req.body ?? {};
    if (!Array.isArray(items) || items.length > 50) {
      res.status(400).json({ error: 'Invalid cart items.' });
      return;
    }
    const sanitized: Array<{ productId: string; quantity: number }> = [];
    for (const item of items) {
      if (
        item &&
        typeof item === 'object' &&
        isNonEmptyString((item as OrderItemInput).productId, 100) &&
        typeof (item as OrderItemInput).quantity === 'number' &&
        Number.isInteger((item as OrderItemInput).quantity) &&
        (item as OrderItemInput).quantity >= 1 &&
        (item as OrderItemInput).quantity <= 50
      ) {
        sanitized.push({
          productId: (item as OrderItemInput).productId,
          quantity: (item as OrderItemInput).quantity,
        });
      }
    }
    const now = new Date().toISOString();
    const json = JSON.stringify(sanitized);
    db.prepare(
      `INSERT INTO carts (userId, itemsJson, updatedAt) VALUES (?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET itemsJson = excluded.itemsJson, updatedAt = excluded.updatedAt`
    ).run(req.user!.userId, json, now);
    res.json({ items: hydrateCart(json) });
  });

  // Payments (Stripe when configured, or secure Test/Demo confirmation token)
  router.post('/payments/demo-confirm', (req, res) => {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (stripeKey) {
      res.status(400).json({ error: 'Stripe is configured; use Stripe PaymentIntent instead of demo checkout.' });
      return;
    }
    const { items, orderType } = req.body ?? {};
    if (orderType !== 'pickup' && orderType !== 'delivery') {
      res.status(400).json({ error: 'Invalid order type.' });
      return;
    }
    const calc = computeOrderTotals(items, orderType);
    if ('error' in calc) {
      res.status(400).json({ error: calc.error });
      return;
    }
    const amountCents = Math.round(calc.total * 100);
    const demoPaymentToken = signDemoPaymentToken(amountCents);
    res.json({
      demoPaymentToken,
      amount: calc.total,
      mode: 'demo',
    });
  });

  router.post('/payments/stripe-intent', async (req, res) => {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      res.status(503).json({ error: 'Stripe is not configured on this server.' });
      return;
    }
    const { items, orderType } = req.body ?? {};
    if (orderType !== 'pickup' && orderType !== 'delivery') {
      res.status(400).json({ error: 'Invalid order type.' });
      return;
    }
    const calc = computeOrderTotals(items, orderType);
    if ('error' in calc) {
      res.status(400).json({ error: calc.error });
      return;
    }
    const amountCents = Math.round(calc.total * 100);
    try {
      const formBody = new URLSearchParams({
        amount: String(amountCents),
        currency: 'usd',
        'automatic_payment_methods[enabled]': 'true',
      });
      const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });
      const data = (await stripeRes.json()) as { id?: string; client_secret?: string; error?: { message?: string } };
      if (!stripeRes.ok || !data.client_secret) {
        res.status(400).json({ error: data.error?.message || 'Unable to create Stripe payment intent.' });
        return;
      }
      res.json({ clientSecret: data.client_secret, paymentIntentId: data.id, amount: calc.total });
    } catch {
      res.status(502).json({ error: 'Unable to reach Stripe API.' });
    }
  });

  // Orders
  router.post('/orders', extractUser, async (req: AuthenticatedRequest, res) => {
    const {
      customerName,
      customerEmail,
      phone,
      orderType,
      deliveryAddress,
      paymentMethod,
      paymentToken,
      items,
      notes,
    } = req.body ?? {};

    if (!isNonEmptyString(customerName, 80)) {
      res.status(400).json({ error: 'Please provide the recipient name.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please provide a valid phone number.' });
      return;
    }
    const emailValue =
      typeof customerEmail === 'string' && customerEmail.trim()
        ? customerEmail.trim().toLowerCase()
        : req.user?.email || '';
    if (emailValue && !isValidEmail(emailValue)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (orderType !== 'pickup' && orderType !== 'delivery') {
      res.status(400).json({ error: 'Order type must be either pickup or delivery.' });
      return;
    }
    if (orderType === 'delivery' && !isNonEmptyString(deliveryAddress, 250)) {
      res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
      return;
    }
    if (paymentMethod !== 'pay_at_pickup' && paymentMethod !== 'cash_on_delivery' && paymentMethod !== 'online_card') {
      res.status(400).json({ error: 'Please select a valid payment method.' });
      return;
    }
    if (paymentMethod === 'pay_at_pickup' && orderType !== 'pickup') {
      res.status(400).json({ error: 'Pay at Pickup is only available for pickup orders.' });
      return;
    }
    if (paymentMethod === 'cash_on_delivery' && orderType !== 'delivery') {
      res.status(400).json({ error: 'Cash on Delivery is only available for delivery orders.' });
      return;
    }

    const calc = computeOrderTotals(items, orderType);
    if ('error' in calc) {
      res.status(400).json({ error: calc.error });
      return;
    }

    let paymentStatus: (typeof ALLOWED_PAYMENT_STATUSES)[number] = 'Pending';
    let paymentReference = '';

    if (paymentMethod === 'online_card') {
      const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
      if (stripeKey) {
        if (!isNonEmptyString(paymentToken, 120) || !paymentToken.startsWith('pi_')) {
          res.status(400).json({ error: 'Missing verified Stripe PaymentIntent reference.' });
          return;
        }
        try {
          const verifyRes = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentToken)}`, {
            headers: { Authorization: `Bearer ${stripeKey}` },
          });
          const pi = (await verifyRes.json()) as { status?: string; amount?: number; id?: string };
          if (!verifyRes.ok || pi.status !== 'succeeded' || pi.amount !== Math.round(calc.total * 100)) {
            res.status(402).json({ error: 'Online payment could not be verified as paid.' });
            return;
          }
          paymentStatus = 'Paid';
          paymentReference = pi.id || paymentToken;
        } catch {
          res.status(502).json({ error: 'Payment verification failed while contacting Stripe.' });
          return;
        }
      } else {
        if (!isNonEmptyString(paymentToken, 300) || !verifyDemoPaymentToken(paymentToken, Math.round(calc.total * 100))) {
          res.status(402).json({ error: 'Online test payment was not verified. Please confirm the test payment step.' });
          return;
        }
        paymentStatus = 'Test Paid (Demo)';
        paymentReference = `DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      }
    }

    const orderId = `BB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();
    const safeNotes = typeof notes === 'string' ? notes.trim().slice(0, 300) : '';
    const safeAddress = orderType === 'delivery' ? String(deliveryAddress).trim() : '';

    db.prepare(`
      INSERT INTO orders (
        orderId, userId, customerName, customerEmail, phone, itemsJson,
        subtotal, tax, deliveryFee, total, orderType, deliveryAddress,
        paymentMethod, paymentStatus, paymentReference, orderStatus, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      req.user?.userId ?? null,
      customerName.trim(),
      emailValue,
      phone.trim(),
      JSON.stringify(calc.items),
      calc.subtotal,
      calc.tax,
      calc.deliveryFee,
      calc.total,
      orderType,
      safeAddress,
      paymentMethod,
      paymentStatus,
      paymentReference,
      'Pending',
      safeNotes,
      now
    );

    if (req.user) {
      db.prepare('DELETE FROM carts WHERE userId = ?').run(req.user.userId);
    }

    res.status(201).json({
      order: {
        orderId,
        userId: req.user?.userId ?? null,
        customerName: customerName.trim(),
        customerEmail: emailValue,
        phone: phone.trim(),
        items: calc.items,
        subtotal: calc.subtotal,
        tax: calc.tax,
        deliveryFee: calc.deliveryFee,
        total: calc.total,
        orderType,
        deliveryAddress: safeAddress,
        paymentMethod,
        paymentStatus,
        paymentReference,
        orderStatus: 'Pending',
        notes: safeNotes,
        createdAt: now,
      },
    });
  });

  router.get('/orders/mine', requireAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC')
      .all(req.user!.userId) as Array<Record<string, unknown>>;

    const orders = rows.map((r) => ({
      ...r,
      items: JSON.parse(String(r.itemsJson || '[]')),
    }));
    res.json({ orders });
  });

  // Contact & Newsletter
  router.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body ?? {};
    if (!isNonEmptyString(name, 80)) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!isNonEmptyString(subject, 120)) {
      res.status(400).json({ error: 'Please enter a subject.' });
      return;
    }
    if (!isNonEmptyString(message, 2000)) {
      res.status(400).json({ error: 'Please enter your message (up to 2,000 characters).' });
      return;
    }

    const messageId = generateId('msg');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO contact_messages (messageId, name, email, subject, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(messageId, name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim(), now);

    res.status(201).json({
      ok: true,
      message: 'Thank you for writing to Brew & Bliss. Our café team will respond within one business day.',
    });
  });

  router.post('/newsletter', (req, res) => {
    const { email } = req.body ?? {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const normalized = email.trim().toLowerCase();
    const existing = db.prepare('SELECT subscriberId FROM newsletter_subscribers WHERE email = ?').get(normalized);
    if (existing) {
      res.status(409).json({ error: 'This email address is already subscribed to our journal.' });
      return;
    }

    const subscriberId = generateId('sub');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO newsletter_subscribers (subscriberId, email, subscribedAt) VALUES (?, ?, ?)').run(
      subscriberId,
      normalized,
      now
    );
    res.status(201).json({ ok: true, message: 'Welcome to the Brew & Bliss Sunday Journal.' });
  });

  // Admin Bootstrap & Auth
  router.get('/admin/bootstrap-status', (_req, res) => {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode) {
      res.json({ configured: true, source: 'env', defaultEmail: getEnvAdminEmail() });
      return;
    }
    const claimedHash = getSetting('admin_credential_hash');
    if (claimedHash) {
      const claimedEmail = getSetting('admin_email') || getEnvAdminEmail();
      res.json({ configured: true, source: 'claimed', defaultEmail: claimedEmail });
      return;
    }
    res.json({ configured: false, source: 'unclaimed', defaultEmail: getEnvAdminEmail() });
  });

  router.post('/admin/bootstrap', (req, res) => {
    if (getEnvAdminPasscode()) {
      res.status(403).json({ error: 'Admin access is already configured via server environment secrets.' });
      return;
    }
    const { email, password, name } = req.body ?? {};
    const adminEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : getEnvAdminEmail();
    if (!isValidEmail(adminEmail)) {
      res.status(400).json({ error: 'Please enter a valid administrator email.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Admin password must be between 8 and 128 characters.' });
      return;
    }
    const adminName = isNonEmptyString(name, 80) ? name.trim() : 'Café Director';
    const credHash = hashPassword(password);
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      const already = db
        .prepare("SELECT value FROM app_settings WHERE key = 'admin_credential_hash'")
        .get() as { value: string } | undefined;
      if (already) {
        db.exec('ROLLBACK');
        res.status(403).json({ error: 'First-run admin setup has already been completed and locked.' });
        return;
      }

      db.prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES ('admin_credential_hash', ?, ?)").run(
        credHash,
        now
      );
      db.prepare(
        "INSERT INTO app_settings (key, value, updatedAt) VALUES ('admin_email', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt"
      ).run(adminEmail, now);

      const existingUser = db.prepare('SELECT userId FROM users WHERE email = ?').get(adminEmail) as
        | { userId: string }
        | undefined;
      let userId: string;
      if (existingUser) {
        userId = existingUser.userId;
        db.prepare("UPDATE users SET name = ?, passwordHash = ?, role = 'admin' WHERE userId = ?").run(
          adminName,
          credHash,
          userId
        );
      } else {
        userId = generateId('adm');
        db.prepare(
          "INSERT INTO users (userId, name, email, phone, passwordHash, role, createdAt) VALUES (?, ?, ?, '', ?, 'admin', ?)"
        ).run(userId, adminName, adminEmail, credHash, now);
      }
      db.exec('COMMIT');

      const token = signToken(userId, 'admin');
      res.status(201).json({
        token,
        user: {
          userId,
          name: adminName,
          email: adminEmail,
          phone: '',
          role: 'admin',
          createdAt: now,
        },
      });
    } catch {
      db.exec('ROLLBACK');
      res.status(500).json({ error: 'Failed to complete first-run admin setup.' });
    }
  });

  router.post('/admin/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Please enter the administrator passcode or password.' });
      return;
    }

    const envPasscode = getEnvAdminPasscode();
    const configuredEmail = (getSetting('admin_email') || getEnvAdminEmail()).toLowerCase();
    const inputEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : configuredEmail;

    if (envPasscode) {
      // Configured environment passcode always overrides any claimed fallback hash
      if (!safeCompareStrings(password, envPasscode) || inputEmail !== getEnvAdminEmail()) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      let adminUser = db.prepare("SELECT userId, name, email, phone, role, createdAt FROM users WHERE email = ? AND role = 'admin'").get(
        getEnvAdminEmail()
      ) as
        | { userId: string; name: string; email: string; phone: string; role: 'admin'; createdAt: string }
        | undefined;

      if (!adminUser) {
        const userId = generateId('adm');
        const now = new Date().toISOString();
        const existingByEmail = db.prepare('SELECT userId FROM users WHERE email = ?').get(getEnvAdminEmail()) as
          | { userId: string }
          | undefined;
        if (existingByEmail) {
          db.prepare("UPDATE users SET role = 'admin' WHERE userId = ?").run(existingByEmail.userId);
          adminUser = db
            .prepare('SELECT userId, name, email, phone, role, createdAt FROM users WHERE userId = ?')
            .get(existingByEmail.userId) as typeof adminUser;
        } else {
          db.prepare(
            "INSERT INTO users (userId, name, email, phone, passwordHash, role, createdAt) VALUES (?, 'Café Director', ?, '', ?, 'admin', ?)"
          ).run(userId, getEnvAdminEmail(), hashPassword(crypto.randomBytes(32).toString('hex')), now);
          adminUser = {
            userId,
            name: 'Café Director',
            email: getEnvAdminEmail(),
            phone: '',
            role: 'admin',
            createdAt: now,
          };
        }
      }

      const token = signToken(adminUser!.userId, 'admin');
      res.json({ token, user: adminUser });
      return;
    }

    const claimedHash = getSetting('admin_credential_hash');
    if (!claimedHash) {
      res.status(403).json({ error: 'Admin setup has not been claimed yet.' });
      return;
    }

    const adminRow = db
      .prepare("SELECT userId, name, email, phone, passwordHash, role, createdAt FROM users WHERE email = ? AND role = 'admin'")
      .get(inputEmail) as
      | { userId: string; name: string; email: string; phone: string; passwordHash: string; role: 'admin'; createdAt: string }
      | undefined;

    if (!adminRow || !verifyPassword(password, adminRow.passwordHash)) {
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    const token = signToken(adminRow.userId, 'admin');
    res.json({
      token,
      user: {
        userId: adminRow.userId,
        name: adminRow.name,
        email: adminRow.email,
        phone: adminRow.phone,
        role: adminRow.role,
        createdAt: adminRow.createdAt,
      },
    });
  });

  // Protected Admin Routes
  router.get('/admin/overview', requireAuth, requireAdmin, (_req, res) => {
    const ordersCount = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
    const productsCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
    const customersCount = (
      db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as { count: number }
    ).count;
    const revenueRow = db
      .prepare("SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE orderStatus != 'Cancelled'")
      .get() as { revenue: number };

    const statusRows = db
      .prepare('SELECT orderStatus, COUNT(*) as count FROM orders GROUP BY orderStatus')
      .all() as Array<{ orderStatus: string; count: number }>;

    const recentRows = db
      .prepare('SELECT * FROM orders ORDER BY createdAt DESC LIMIT 8')
      .all() as Array<Record<string, unknown>>;

    res.json({
      totalOrders: ordersCount,
      totalProducts: productsCount,
      totalUsers: customersCount,
      totalRevenue: roundCurrency(revenueRow.revenue),
      statusOverview: statusRows,
      recentOrders: recentRows.map((r) => ({ ...r, items: JSON.parse(String(r.itemsJson || '[]')) })),
    });
  });

  router.get('/admin/products', requireAuth, requireAdmin, (_req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
    res.json({ products });
  });

  router.post('/admin/products', requireAuth, requireAdmin, (req, res) => {
    const { name, description, image, price, category, availability, moodTag, tastingNotes, featured } = req.body ?? {};
    if (!isNonEmptyString(name, 100)) {
      res.status(400).json({ error: 'Product name is required (max 100 characters).' });
      return;
    }
    if (!isNonEmptyString(description, 600)) {
      res.status(400).json({ error: 'Product description is required (max 600 characters).' });
      return;
    }
    const safeImg = sanitizeImageUrl(image);
    if (!safeImg) {
      res.status(400).json({ error: 'Please provide a valid image URL or uploaded image path.' });
      return;
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 1000) {
      res.status(400).json({ error: 'Price must be a positive number.' });
      return;
    }
    if (!isNonEmptyString(category, 60)) {
      res.status(400).json({ error: 'Category is required.' });
      return;
    }
    const validMood = ALLOWED_MOODS.includes(moodTag) ? moodTag : 'Fresh Start';
    const productId = generateId('prod');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (
        productId, name, description, image, price, category,
        availability, moodTag, tastingNotes, featured, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId,
      name.trim(),
      description.trim(),
      safeImg,
      roundCurrency(price),
      category.trim(),
      availability === false || availability === 0 ? 0 : 1,
      validMood,
      typeof tastingNotes === 'string' ? tastingNotes.trim().slice(0, 140) : '',
      featured ? 1 : 0,
      now
    );

    const product = db.prepare('SELECT * FROM products WHERE productId = ?').get(productId);
    res.status(201).json({ product });
  });

  router.patch('/admin/products/:productId', requireAuth, requireAdmin, (req, res) => {
    const { productId } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE productId = ?').get(productId) as ProductRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const body = req.body ?? {};
    const name = body.name !== undefined ? body.name : existing.name;
    const description = body.description !== undefined ? body.description : existing.description;
    const image = body.image !== undefined ? sanitizeImageUrl(body.image) : existing.image;
    const price = body.price !== undefined ? Number(body.price) : existing.price;
    const category = body.category !== undefined ? body.category : existing.category;
    const availability =
      body.availability !== undefined ? (body.availability === true || body.availability === 1 ? 1 : 0) : existing.availability;
    const moodTag = body.moodTag !== undefined && ALLOWED_MOODS.includes(body.moodTag) ? body.moodTag : existing.moodTag;
    const tastingNotes =
      body.tastingNotes !== undefined ? String(body.tastingNotes).trim().slice(0, 140) : existing.tastingNotes;
    const featured = body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured;

    if (!isNonEmptyString(name, 100) || !isNonEmptyString(description, 600) || !image || !Number.isFinite(price) || price <= 0) {
      res.status(400).json({ error: 'Invalid product fields supplied.' });
      return;
    }

    db.prepare(`
      UPDATE products
      SET name = ?, description = ?, image = ?, price = ?, category = ?, availability = ?, moodTag = ?, tastingNotes = ?, featured = ?
      WHERE productId = ?
    `).run(name.trim(), description.trim(), image, roundCurrency(price), String(category).trim(), availability, moodTag, tastingNotes, featured, productId);

    const updated = db.prepare('SELECT * FROM products WHERE productId = ?').get(productId);
    res.json({ product: updated });
  });

  router.delete('/admin/products/:productId', requireAuth, requireAdmin, (req, res) => {
    const result = db.prepare('DELETE FROM products WHERE productId = ?').run(req.params.productId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // Safe Admin Image Upload (PNG/JPEG/WEBP)
  router.post('/admin/upload', requireAuth, requireAdmin, (req, res) => {
    const { dataUrl } = req.body ?? {};
    if (typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Image payload is required.' });
      return;
    }
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Only PNG, JPEG, or WEBP images are supported.' });
      return;
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      res.status(400).json({ error: 'Image file size must be under 2 MB.' });
      return;
    }

    // Verify magic bytes
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    let ext = '';
    if (isPng) ext = 'png';
    else if (isJpg) ext = 'jpg';
    else if (isWebp) ext = 'webp';
    else {
      res.status(400).json({ error: 'Invalid image file signature.' });
      return;
    }

    const safeName = `prod_${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(uploadsDir, safeName);
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      res.status(400).json({ error: 'Invalid file destination.' });
      return;
    }
    fs.writeFileSync(targetPath, buffer);
    res.status(201).json({ url: `/api/uploads/${safeName}` });
  });

  // Categories Admin Management
  router.post('/admin/categories', requireAuth, requireAdmin, (req, res) => {
    const { categoryName, description } = req.body ?? {};
    if (!isNonEmptyString(categoryName, 60) || !isNonEmptyString(description, 240)) {
      res.status(400).json({ error: 'Category name and description are required.' });
      return;
    }
    const existing = db.prepare('SELECT categoryId FROM categories WHERE LOWER(categoryName) = LOWER(?)').get(categoryName.trim());
    if (existing) {
      res.status(409).json({ error: 'Category already exists.' });
      return;
    }
    const categoryId = generateId('cat');
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sortOrder), 0) as m FROM categories').get() as { m: number }).m;
    db.prepare('INSERT INTO categories (categoryId, categoryName, description, sortOrder) VALUES (?, ?, ?, ?)').run(
      categoryId,
      categoryName.trim(),
      description.trim(),
      maxOrder + 1
    );
    const created = db.prepare('SELECT * FROM categories WHERE categoryId = ?').get(categoryId);
    res.status(201).json({ category: created });
  });

  router.delete('/admin/categories/:categoryId', requireAuth, requireAdmin, (req, res) => {
    const cat = db.prepare('SELECT * FROM categories WHERE categoryId = ?').get(req.params.categoryId) as
      | { categoryId: string; categoryName: string }
      | undefined;
    if (!cat) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const prodCount = (
      db.prepare('SELECT COUNT(*) as count FROM products WHERE category = ?').get(cat.categoryName) as { count: number }
    ).count;
    if (prodCount > 0) {
      res.status(400).json({ error: `Cannot delete "${cat.categoryName}" while ${prodCount} menu item(s) belong to it.` });
      return;
    }
    db.prepare('DELETE FROM categories WHERE categoryId = ?').run(req.params.categoryId);
    res.json({ ok: true });
  });

  // Orders Admin Management
  router.get('/admin/orders', requireAuth, requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all() as Array<Record<string, unknown>>;
    res.json({
      orders: rows.map((r) => ({ ...r, items: JSON.parse(String(r.itemsJson || '[]')) })),
    });
  });

  router.patch('/admin/orders/:orderId', requireAuth, requireAdmin, (req, res) => {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus } = req.body ?? {};
    const existing = db.prepare('SELECT * FROM orders WHERE orderId = ?').get(orderId) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const nextOrderStatus =
      orderStatus !== undefined ? orderStatus : (existing.orderStatus as string);
    const nextPaymentStatus =
      paymentStatus !== undefined ? paymentStatus : (existing.paymentStatus as string);

    if (!ALLOWED_ORDER_STATUSES.includes(nextOrderStatus)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    if (!ALLOWED_PAYMENT_STATUSES.includes(nextPaymentStatus)) {
      res.status(400).json({ error: 'Invalid payment status.' });
      return;
    }

    db.prepare('UPDATE orders SET orderStatus = ?, paymentStatus = ? WHERE orderId = ?').run(
      nextOrderStatus,
      nextPaymentStatus,
      orderId
    );
    const updated = db.prepare('SELECT * FROM orders WHERE orderId = ?').get(orderId) as Record<string, unknown>;
    res.json({ order: { ...updated, items: JSON.parse(String(updated.itemsJson || '[]')) } });
  });

  // Customers Admin View
  router.get('/admin/customers', requireAuth, requireAdmin, (_req, res) => {
    const customers = db
      .prepare(`
        SELECT u.userId, u.name, u.email, u.phone, u.role, u.createdAt,
               COUNT(o.orderId) as orderCount,
               COALESCE(SUM(CASE WHEN o.orderStatus != 'Cancelled' THEN o.total ELSE 0 END), 0) as totalSpent
        FROM users u
        LEFT JOIN orders o ON u.userId = o.userId
        WHERE u.role = 'customer'
        GROUP BY u.userId
        ORDER BY u.createdAt DESC
      `)
      .all();
    res.json({ customers });
  });

  router.get('/admin/customers/:userId/orders', requireAuth, requireAdmin, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC')
      .all(req.params.userId) as Array<Record<string, unknown>>;
    res.json({
      orders: rows.map((r) => ({ ...r, items: JSON.parse(String(r.itemsJson || '[]')) })),
    });
  });

  // Contact Messages & Newsletter Subscribers Admin View
  router.get('/admin/messages', requireAuth, requireAdmin, (_req, res) => {
    const messages = db.prepare('SELECT * FROM contact_messages ORDER BY createdAt DESC').all();
    res.json({ messages });
  });

  router.get('/admin/subscribers', requireAuth, requireAdmin, (_req, res) => {
    const subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY subscribedAt DESC').all();
    res.json({ subscribers });
  });

  // Safe Uploaded Image Serving
  router.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
      res.status(400).send('Invalid filename');
      return;
    }
    const target = path.resolve(uploadsDir, filename);
    if (!target.startsWith(uploadsDir + path.sep) || !fs.existsSync(target)) {
      res.status(404).send('Not found');
      return;
    }
    res.sendFile(target);
  });

  return router;
}
