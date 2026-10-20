export type Language = 'taglish' | 'english';

export type Translations = {
  // Common
  cancel: string;
  save: string;
  saveChanges: string;
  saved: string;
  delete: string;
  add: string;
  edit: string;
  confirm: string;
  yes: string;
  no: string;
  ok: string;
  loading: string;
  error: string;
  tryAgain: string;

  // Auth
  signOut: string;
  signOutConfirmTitle: string;
  signOutConfirmBody: string;
  signOutYes: string;

  // Dashboard
  greeting: (name: string) => string;
  todayOverview: string;
  openStoreView: string;
  todaySales: string;
  netProfit: string;
  orders: string;
  expenses: string;
  generateInsights: string;
  poweredBy: string;
  aiInsightsBody: (orders: number) => string;
  aiInsightsBodyEmpty: string;

  // Menu
  menu: string;
  items: string;
  addItem: string;
  categories: string;
  manageCategories: string;
  newMenuItem: string;
  editItem: string;
  itemFromInventory: string;
  itemNameCustom: string;
  category: string;
  categorySelected: (cat: string) => string;
  price: string;
  stockLabel: string;
  stockFromInventory: string;
  stockManagedByInventory: string;
  photo: string;
  photoOptional: string;
  changePhoto: string;
  noInventoryAlert: string;
  noInventoryAlertBody: string;
  noInventoryHint: string;
  noCategoriesHint: string;
  noItemsYet: string;
  noItemsBody: string;
  uncategorized: string;
  deleteCategory: string;
  deleteCategoryBody: (cat: string, count: number) => string;
  deleteAll: string;
  addCategory: string;
  newCategoryPlaceholder: string;
  noCategoriesYet: string;
  deleteItemConfirm: (name: string) => string;

  // POS
  posTitle: string;
  orderNumber: (num: number) => string;
  allItems: string;
  viewCart: string;
  cartEmpty: string;
  cartEmptyBody: string;
  checkout: string;
  outOfStock: string;
  left: (n: number) => string;

  // Checkout
  howMuchPaid: string;
  cashReceived: string;
  change: string;
  confirmPayment: string;
  paidSuccess: string;
  orderRecorded: string;
  newOrder: string;

  // Expenses
  expensesTitle: string;
  addExpense: string;
  noExpenses: string;

  // Settings
  settings: string;
  businessInfo: string;
  shopNameLabel: string;
  shopNamePlaceholder: string;
  ownerNameLabel: string;
  ownerNamePlaceholder: string;
  account: string;
  emailLabel: string;
  userIdLabel: string;
  app: string;
  version: string;
  language: string;
  languageLabel: string;
  contributors: string;

  // Inventory
  inventory: string;
  restock: string;

  // Insights
  insightsTitle: string;
  insightsTab: string;
};

const taglish: Translations = {
  // Common
  cancel: 'Kanselahin',
  save: 'I-save',
  saveChanges: 'I-save ang Pagbabago',
  saved: 'Saved!',
  delete: 'Burahin',
  add: 'Idagdag',
  edit: 'I-edit',
  confirm: 'Kumpirmahin',
  yes: 'Oo',
  no: 'Hindi',
  ok: 'OK',
  loading: 'Loading...',
  error: 'May error',
  tryAgain: 'Subukan muli.',

  // Auth
  signOut: 'Sign Out',
  signOutConfirmTitle: 'Mag-logout?',
  signOutConfirmBody: 'Sigurado ka bang gusto mong lumabas?',
  signOutYes: 'Oo, Logout',

  // Dashboard
  greeting: (name) => `KUMUSTA, ${name}!`,
  todayOverview: "Today's overview",
  openStoreView: 'Buksan ang Tindera POS',
  todaySales: 'TODAY · SALES',
  netProfit: 'NET PROFIT',
  orders: 'ORDERS',
  expenses: 'EXPENSES',
  generateInsights: 'I-generate ang Insights',
  poweredBy: 'Powered by Groq · Llama 3.3',
  aiInsightsBody: (orders) => `May ${orders} na orders ka ngayon. I-analyze para makita kung kumikita ka.`,
  aiInsightsBodyEmpty: 'Kumuha ng personalized na business advice base sa iyong sales, gastos, at inventory.',

  // Menu
  menu: 'Menu',
  items: 'items',
  addItem: 'Mag-add ng Item',
  categories: 'Categories',
  manageCategories: 'Manage Categories',
  newMenuItem: 'Bagong Menu Item',
  editItem: 'I-edit ang Item',
  itemFromInventory: 'Item (mula sa Inventory)',
  itemNameCustom: 'O mag-type ng custom na pangalan…',
  category: 'Category',
  categorySelected: (cat) => `Pinili: ${cat}`,
  price: 'Presyo (₱)',
  stockLabel: 'Stock',
  stockFromInventory: 'Stock (from inventory)',
  stockManagedByInventory: 'Stock is managed by Inventory',
  photo: 'Larawan',
  photoOptional: 'Magdagdag ng larawan\n(optional)',
  changePhoto: 'Palitan ang larawan',
  noInventoryAlert: 'Walang Inventory',
  noInventoryAlertBody: 'Mag-add muna ng items sa Inventory bago ka magdagdag ng menu item.',
  noInventoryHint: 'Walang inventory items pa. Mag-add muna sa Inventory tab.',
  noCategoriesHint: 'Walang categories pa. I-close ito at i-manage ang Categories muna.',
  noItemsYet: 'Walang items pa',
  noItemsBody: 'Gumawa muna ng category, tapos mag-add ng items.',
  uncategorized: 'Walang Category',
  deleteCategory: 'Burahin ang Category?',
  deleteCategoryBody: (cat, count) => `Mabubura ang lahat ng ${count} item sa "${cat}".`,
  deleteAll: 'Burahin Lahat',
  addCategory: '+ Bagong Category',
  newCategoryPlaceholder: 'Pangalan ng category…',
  noCategoriesYet: 'Walang categories pa. Mag-add na!',
  deleteItemConfirm: (name) => `Tanggalin ang ${name}?`,

  // POS
  posTitle: 'Tindera POS',
  orderNumber: (num) => `Order #${num}`,
  allItems: 'Lahat',
  viewCart: 'Tingnan ang Cart',
  cartEmpty: 'Wala pa sa cart',
  cartEmptyBody: 'Tap an item para idagdag.',
  checkout: 'Mag-Checkout →',
  outOfStock: 'Ubos',
  left: (n) => `${n} natitira`,

  // Checkout
  howMuchPaid: 'Magkano ang bayad?',
  cashReceived: 'Cash Received',
  change: 'Sukli',
  confirmPayment: 'Confirm Payment ✓',
  paidSuccess: 'Bayad na!',
  orderRecorded: 'Order successfully recorded.',
  newOrder: 'Bagong Order →',

  // Expenses
  expensesTitle: 'Expenses',
  addExpense: 'Mag-add ng Gastos',
  noExpenses: 'Walang expenses pa.',

  // Settings
  settings: 'Settings',
  businessInfo: 'BUSINESS INFO',
  shopNameLabel: 'Shop Name',
  shopNamePlaceholder: 'Pangalan ng tindahan',
  ownerNameLabel: 'Owner Name',
  ownerNamePlaceholder: 'Iyong pangalan',
  account: 'ACCOUNT',
  emailLabel: 'Email',
  userIdLabel: 'User ID',
  app: 'APP',
  version: 'Version',
  language: 'LANGUAGE',
  languageLabel: 'App Language',
  contributors: 'CONTRIBUTORS',

  // Inventory
  inventory: 'Inventory',
  restock: 'Mag-restock',

  // Insights
  insightsTitle: 'AI Insights',
  insightsTab: 'AI Insights',
};

const english: Translations = {
  // Common
  cancel: 'Cancel',
  save: 'Save',
  saveChanges: 'Save Changes',
  saved: 'Saved!',
  delete: 'Delete',
  add: 'Add',
  edit: 'Edit',
  confirm: 'Confirm',
  yes: 'Yes',
  no: 'No',
  ok: 'OK',
  loading: 'Loading...',
  error: 'Error',
  tryAgain: 'Please try again.',

  // Auth
  signOut: 'Sign Out',
  signOutConfirmTitle: 'Sign out?',
  signOutConfirmBody: 'Are you sure you want to sign out?',
  signOutYes: 'Yes, Sign Out',

  // Dashboard
  greeting: (name) => `HELLO, ${name}!`,
  todayOverview: "Today's overview",
  openStoreView: 'Open Store View',
  todaySales: 'TODAY · SALES',
  netProfit: 'NET PROFIT',
  orders: 'ORDERS',
  expenses: 'EXPENSES',
  generateInsights: 'Generate Insights',
  poweredBy: 'Powered by Groq · Llama 3.3',
  aiInsightsBody: (orders) => `You have ${orders} orders today. Analyze to see if you're profitable.`,
  aiInsightsBodyEmpty: 'Get personalized business advice based on your sales, expenses, and inventory.',

  // Menu
  menu: 'Menu',
  items: 'items',
  addItem: 'Add Item',
  categories: 'Categories',
  manageCategories: 'Manage Categories',
  newMenuItem: 'New Menu Item',
  editItem: 'Edit Item',
  itemFromInventory: 'Item (from Inventory)',
  itemNameCustom: 'Or type a custom name…',
  category: 'Category',
  categorySelected: (cat) => `Selected: ${cat}`,
  price: 'Price (₱)',
  stockLabel: 'Stock',
  stockFromInventory: 'Stock (from inventory)',
  stockManagedByInventory: 'Stock is managed by Inventory',
  photo: 'Photo',
  photoOptional: 'Add a photo\n(optional)',
  changePhoto: 'Change photo',
  noInventoryAlert: 'No Inventory',
  noInventoryAlertBody: 'Please add items to your Inventory before adding menu items.',
  noInventoryHint: 'No inventory items yet. Add some in the Inventory tab first.',
  noCategoriesHint: 'No categories yet. Close this and manage Categories first.',
  noItemsYet: 'No items yet',
  noItemsBody: 'Create a category first, then add items.',
  uncategorized: 'Uncategorized',
  deleteCategory: 'Delete Category?',
  deleteCategoryBody: (cat, count) => `This will delete all ${count} items in "${cat}".`,
  deleteAll: 'Delete All',
  addCategory: '+ New Category',
  newCategoryPlaceholder: 'Category name…',
  noCategoriesYet: 'No categories yet. Add one!',
  deleteItemConfirm: (name) => `Remove ${name}?`,

  // POS
  posTitle: 'Store POS',
  orderNumber: (num) => `Order #${num}`,
  allItems: 'All',
  viewCart: 'View Cart',
  cartEmpty: 'Cart is empty',
  cartEmptyBody: 'Tap an item to add it.',
  checkout: 'Checkout →',
  outOfStock: 'Out of Stock',
  left: (n) => `${n} left`,

  // Checkout
  howMuchPaid: 'How much was paid?',
  cashReceived: 'Cash Received',
  change: 'Change',
  confirmPayment: 'Confirm Payment ✓',
  paidSuccess: 'Payment received!',
  orderRecorded: 'Order successfully recorded.',
  newOrder: 'New Order →',

  // Expenses
  expensesTitle: 'Expenses',
  addExpense: 'Add Expense',
  noExpenses: 'No expenses yet.',

  // Settings
  settings: 'Settings',
  businessInfo: 'BUSINESS INFO',
  shopNameLabel: 'Shop Name',
  shopNamePlaceholder: 'Your store name',
  ownerNameLabel: 'Owner Name',
  ownerNamePlaceholder: 'Your name',
  account: 'ACCOUNT',
  emailLabel: 'Email',
  userIdLabel: 'User ID',
  app: 'APP',
  version: 'Version',
  language: 'LANGUAGE',
  languageLabel: 'App Language',
  contributors: 'CONTRIBUTORS',

  // Inventory
  inventory: 'Inventory',
  restock: 'Restock',

  // Insights
  insightsTitle: 'AI Insights',
  insightsTab: 'AI Insights',
};

export const translations: Record<Language, Translations> = { taglish, english };
