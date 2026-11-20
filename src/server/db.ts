import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = path.resolve(process.cwd(), 'data');
export const uploadsDir = path.resolve(dataDir, 'uploads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'brew_and_bliss.db');
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    categoryId TEXT PRIMARY KEY,
    categoryName TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    productId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    availability INTEGER NOT NULL DEFAULT 1,
    moodTag TEXT NOT NULL DEFAULT 'Fresh Start',
    tastingNotes TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS carts (
    userId TEXT PRIMARY KEY,
    itemsJson TEXT NOT NULL DEFAULT '[]',
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    orderId TEXT PRIMARY KEY,
    userId TEXT,
    customerName TEXT NOT NULL,
    customerEmail TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL,
    itemsJson TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    deliveryFee REAL NOT NULL,
    total REAL NOT NULL,
    orderType TEXT NOT NULL,
    deliveryAddress TEXT NOT NULL DEFAULT '',
    paymentMethod TEXT NOT NULL,
    paymentStatus TEXT NOT NULL,
    paymentReference TEXT NOT NULL DEFAULT '',
    orderStatus TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    messageId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    subscriberId TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    subscribedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

export function seedInitialCatalog() {
  const categoryCountRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCountRow.count === 0) {
    const insertCategory = db.prepare(
      'INSERT INTO categories (categoryId, categoryName, description, sortOrder) VALUES (?, ?, ?, ?)'
    );

    const initialCategories = [
      ['cat-hot-coffee', 'Hot Coffee', 'Single-origin espresso pulls and slow hand-poured filter coffees.', 1],
      ['cat-iced-coffee', 'Iced Coffee', 'Cold-steeped infusions, shaken espressos, and botanical coffee tonics.', 2],
      ['cat-tea', 'Tea', 'First-harvest ceremonial Uji matcha and whole-leaf herbal tisanes.', 3],
      ['cat-bakery', 'Bakery', '72-hour laminated Normandy butter viennoiserie baked fresh at dawn.', 4],
      ['cat-desserts', 'Desserts', 'European patisserie classics crafted with dark Valrhona cocoa and mascarpone.', 5],
    ] as const;

    for (const [id, name, desc, order] of initialCategories) {
      insertCategory.run(id, name, desc, order);
    }
  }

  const productCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCountRow.count === 0) {
    const now = new Date().toISOString();
    const insertProduct = db.prepare(`
      INSERT INTO products (
        productId, name, description, image, price, category,
        availability, moodTag, tastingNotes, featured, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialProducts = [
      {
        id: 'prod-velvet-flat-white',
        name: 'Velvet Flat White',
        description: 'Double ristretto of washed Ethiopian Yirgacheffe folded beneath silky, micro-textured whole milk.',
        image: '/src/assets/images/product_hot_espresso_1795207094803.jpg',
        price: 4.75,
        category: 'Hot Coffee',
        availability: 1,
        moodTag: 'Fresh Start',
        tastingNotes: 'Bergamot · Milk Chocolate · Sweet Cream',
        featured: 1,
      },
      {
        id: 'prod-honey-oat-cortado',
        name: 'Honey Oat Cortado',
        description: 'Equal parts bold double espresso and steamed artisanal oat milk finished with raw wildflower honey.',
        image: '/src/assets/images/product_hot_latte_1795207095844.jpg',
        price: 5.25,
        category: 'Hot Coffee',
        availability: 1,
        moodTag: 'Strong Coffee',
        tastingNotes: 'Toasted Almond · Wildflower Honey · Cocoa',
        featured: 1,
      },
      {
        id: 'prod-v60-pour-over',
        name: 'Single-Origin V60 Pour Over',
        description: 'Hand-poured to order using Kenyan AA beans roasted light for luminous clarity and delicate floral aroma.',
        image: '/src/assets/images/story_roastery_pour_1795207091832.jpg',
        price: 5.5,
        category: 'Hot Coffee',
        availability: 1,
        moodTag: 'Fresh Start',
        tastingNotes: 'White Peach · Jasmine · Blood Orange',
        featured: 1,
      },
      {
        id: 'prod-double-ristretto',
        name: 'Double Ristretto Espresso',
        description: 'Concentrated, syrupy double shot extracted at nine bars from our house northern Italian roast.',
        image: '/src/assets/images/product_hot_espresso_1795207094803.jpg',
        price: 3.75,
        category: 'Hot Coffee',
        availability: 1,
        moodTag: 'Strong Coffee',
        tastingNotes: 'Dark Cacao · Roasted Hazelnut · Molasses',
        featured: 0,
      },
      {
        id: 'prod-vanilla-bean-latte',
        name: 'Madagascar Vanilla Bean Latte',
        description: 'House-steeped organic vanilla pod syrup poured with velvety steamed milk and rich double espresso.',
        image: '/src/assets/images/product_hot_latte_1795207095844.jpg',
        price: 5.75,
        category: 'Hot Coffee',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Vanilla Pod · Caramelized Sugar · Silky Milk',
        featured: 0,
      },
      {
        id: 'prod-shaken-brown-sugar',
        name: 'Brown Sugar Shaken Espresso',
        description: 'Double espresso vigorously shaken over crystal ice with muscovado brown sugar, Ceylon cinnamon, and oat milk.',
        image: '/src/assets/images/product_iced_coffee_1795207095115.jpg',
        price: 5.95,
        category: 'Iced Coffee',
        availability: 1,
        moodTag: 'Strong Coffee',
        tastingNotes: 'Muscovado · Ceylon Cinnamon · Crisp Espresso',
        featured: 1,
      },
      {
        id: 'prod-cold-brew-tonic',
        name: 'Cold Brew Citrus Tonic',
        description: 'Eighteen-hour slow-steeped Colombian cold brew layered over botanical quinine tonic and expressed orange oil.',
        image: '/src/assets/images/product_iced_coffee_1795207095115.jpg',
        price: 5.5,
        category: 'Iced Coffee',
        availability: 1,
        moodTag: 'Something Refreshing',
        tastingNotes: 'Blood Orange · Botanical Tonic · Bright Cacao',
        featured: 0,
      },
      {
        id: 'prod-iced-salted-caramel',
        name: 'Iced Salted Caramel Macchiato',
        description: 'Chilled espresso poured slowly over cold milk and house-simmered sea salt caramel.',
        image: '/src/assets/images/product_iced_coffee_1795207095115.jpg',
        price: 5.75,
        category: 'Iced Coffee',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Fleur de Sel · Burnt Caramel · Espresso',
        featured: 0,
      },
      {
        id: 'prod-ceremonial-matcha',
        name: 'Ceremonial Uji Matcha Latte',
        description: 'First-harvest stone-milled Kyoto Uji matcha whisked by hand with bamboo chasen and steamed oat milk.',
        image: '/src/assets/images/product_matcha_tea_1795207094443.jpg',
        price: 6.25,
        category: 'Tea',
        availability: 1,
        moodTag: 'Fresh Start',
        tastingNotes: 'Umami Green · Sweet Almond · Velvet Foam',
        featured: 1,
      },
      {
        id: 'prod-sparkling-yuzu-sencha',
        name: 'Iced Sparkling Yuzu Sencha',
        description: 'Cold-brewed Japanese sencha leaf finished with aromatic yuzu juice and crisp sparkling mineral water.',
        image: '/src/assets/images/product_matcha_tea_1795207094443.jpg',
        price: 5.5,
        category: 'Tea',
        availability: 1,
        moodTag: 'Something Refreshing',
        tastingNotes: 'Yuzu Zest · Crisp Sencha · Mineral Finish',
        featured: 0,
      },
      {
        id: 'prod-chamomile-tisane',
        name: 'Chamomile & Rosehip Tisane',
        description: 'Whole Egyptian chamomile blossoms, wild rosehip, and garden lemon verbena brewed in an amber glass pot.',
        image: '/src/assets/images/product_matcha_tea_1795207094443.jpg',
        price: 4.95,
        category: 'Tea',
        availability: 1,
        moodTag: 'Something Refreshing',
        tastingNotes: 'Honeyed Blossom · Tart Rosehip · Lemon Verbena',
        featured: 0,
      },
      {
        id: 'prod-butter-croissant',
        name: 'Laminated French Butter Croissant',
        description: 'Seventy-two hour cold-fermented dough laminated with Normandy cultured butter for delicate, shattering layers.',
        image: '/src/assets/images/product_bakery_croissant_1795207095433.jpg',
        price: 4.5,
        category: 'Bakery',
        availability: 1,
        moodTag: 'Fresh Start',
        tastingNotes: 'Cultured Butter · Flaky Honeycomb · Warm Crust',
        featured: 1,
      },
      {
        id: 'prod-cardamom-knot',
        name: 'Swedish Cardamom Brioche Knot',
        description: 'Hand-braided brioche swirled with freshly mortar-crushed green cardamom seeds and Belgian pearl sugar.',
        image: '/src/assets/images/product_bakery_croissant_1795207095433.jpg',
        price: 4.95,
        category: 'Bakery',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Green Cardamom · Brown Butter · Pearl Sugar',
        featured: 0,
      },
      {
        id: 'prod-almond-croissant',
        name: 'Roasted Almond Croissant',
        description: 'Twice-baked butter croissant generously filled with dark rum frangipane and crowned with toasted almonds.',
        image: '/src/assets/images/gallery_bakery_table_1795207093049.jpg',
        price: 5.5,
        category: 'Bakery',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Toasted Frangipane · Flaked Almond · Powdered Sugar',
        featured: 0,
      },
      {
        id: 'prod-espresso-tiramisu',
        name: 'Espresso Mascarpone Tiramisu',
        description: 'House savoiardi soaked in fresh espresso, layered with whipped Piedmont mascarpone and dusted with dark cacao.',
        image: '/src/assets/images/product_dessert_tiramisu_1795207095298.jpg',
        price: 7.5,
        category: 'Desserts',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Mascarpone · Dark Cacao · Espresso Soak',
        featured: 1,
      },
      {
        id: 'prod-basque-cheesecake',
        name: 'San Sebastián Basque Cheesecake',
        description: 'Caramelized dark crust concealing a spoonably soft, vanilla-scented cream cheese center.',
        image: '/src/assets/images/product_dessert_tiramisu_1795207095298.jpg',
        price: 7.25,
        category: 'Desserts',
        availability: 1,
        moodTag: 'Sweet Craving',
        tastingNotes: 'Caramelized Custard · Vanilla Bean · Sea Salt',
        featured: 0,
      },
    ];

    for (const p of initialProducts) {
      insertProduct.run(
        p.id,
        p.name,
        p.description,
        p.image,
        p.price,
        p.category,
        p.availability,
        p.moodTag,
        p.tastingNotes,
        p.featured,
        now
      );
    }
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
