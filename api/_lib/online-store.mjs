import crypto from "node:crypto";
import { list, put } from "@vercel/blob";

const STORE_PREFIX = "online-stores";
const ORDER_PREFIX = "online-orders";

export function sendJSON(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

export function methodNotAllowed(response, methods) {
  response.setHeader("Allow", methods.join(", "));
  sendJSON(response, 405, { error: "Method not allowed." });
}

export async function readRequestJSON(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

export function safeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function safeIdentifier(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function storeBlobPath(storeSlug) {
  const slug = safeSlug(storeSlug);
  return slug ? `${STORE_PREFIX}/${slug}.json` : "";
}

export function orderBlobPath(orderId) {
  const id = safeIdentifier(orderId);
  return id ? `${ORDER_PREFIX}/${id}.json` : "";
}

export function hashSyncToken(token) {
  return crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

export async function readBlobJSON(pathname) {
  if (!pathname) return null;
  const blobList = await list({ prefix: pathname, limit: 10 });
  const blob = blobList.blobs.find((entry) => entry.pathname === pathname);
  if (!blob) return null;
  const blobResponse = await fetch(blob.downloadUrl || blob.url, { cache: "no-store" });
  if (!blobResponse.ok) {
    throw new Error("Stored online data could not be read.");
  }
  return blobResponse.json();
}

export async function writeBlobJSON(pathname, payload) {
  await put(pathname, JSON.stringify(payload), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60
  });
}

export function publicStoreRecord(record) {
  if (!record) return null;
  return {
    store: record.store,
    products: Array.isArray(record.products)
      ? record.products.filter((product) => (product.status || "Active") === "Active")
      : []
  };
}

export function cleanStore(store) {
  const slug = safeSlug(store?.slug);
  return {
    id: String(store?.id || ""),
    business_id: String(store?.business_id || ""),
    public_code: String(store?.public_code || ""),
    slug,
    store_name: String(store?.store_name || store?.storeName || "CinchPOS Store").trim(),
    contact_phone: String(store?.contact_phone || store?.contactPhone || "").trim(),
    contact_email: String(store?.contact_email || store?.contactEmail || "").trim(),
    address: String(store?.address || "").trim(),
    logo_url: String(store?.logo_url || store?.logoUrl || "").trim(),
    status: String(store?.status || "Active"),
    public_url: String(store?.public_url || `https://cinchpos.in/${slug}/online-store`),
    created_at: String(store?.created_at || new Date().toISOString()),
    updated_at: new Date().toISOString()
  };
}

export function cleanProduct(product) {
  const productKey = String(product?.product_key || product?.productKey || product?.id || "").trim();
  const name = String(product?.name || "").trim();
  const onlinePrice = numberValue(product?.online_price ?? product?.onlinePrice);
  if (!productKey || !name || onlinePrice <= 0) return null;
  const barcodes = Array.isArray(product?.barcodes)
    ? product.barcodes.map((barcode) => String(barcode || "").trim()).filter(Boolean)
    : [];
  const barcode = String(product?.barcode || barcodes[0] || "").trim();
  return {
    id: String(product?.id || productKey),
    product_key: productKey,
    name,
    barcode,
    barcodes: barcode && !barcodes.includes(barcode) ? [barcode, ...barcodes] : barcodes,
    category: String(product?.category || "").trim(),
    hsn: String(product?.hsn || "").trim(),
    unit: String(product?.unit || "Pcs").trim() || "Pcs",
    stock: numberValue(product?.stock),
    offline_price: numberValue(product?.offline_price ?? product?.offlinePrice),
    online_price: onlinePrice,
    mrp: numberValue(product?.mrp),
    gst_rate: numberValue(product?.gst_rate ?? product?.gstRate),
    image_url: String(product?.image_url || product?.imageUrl || "").trim(),
    status: String(product?.status || "Active"),
    updated_at: new Date().toISOString()
  };
}

export function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

export function makeOrderId() {
  return `web_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

export function makeInvoiceNumber() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = `${now.getUTCHours()}${now.getUTCMinutes()}${now.getUTCSeconds()}${crypto.randomBytes(2).toString("hex")}`;
  return `WEB-${yyyy}${mm}${dd}-${suffix}`;
}

export function buildCheckoutOrder(record, checkoutPayload) {
  const customer = checkoutPayload.customer || {};
  const customerName = String(customer.name || "").trim();
  const customerPhone = String(customer.phone || "").replace(/\D+/g, "").slice(-10);
  if (!customerName) {
    const error = new Error("Customer name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^\d{10}$/.test(customerPhone)) {
    const error = new Error("A valid 10 digit phone number is required.");
    error.statusCode = 400;
    throw error;
  }

  const requestedItems = Array.isArray(checkoutPayload.items) ? checkoutPayload.items : [];
  const products = Array.isArray(record.products) ? record.products : [];
  const productMap = new Map(products.map((product) => [product.product_key || product.id, product]));
  const orderItems = [];
  const updatedProducts = products.map((product) => ({ ...product }));

  for (const requestedItem of requestedItems) {
    const productKey = String(requestedItem.product_key || requestedItem.productKey || requestedItem.id || "").trim();
    const quantity = Math.max(0, Math.floor(Number(requestedItem.quantity || 0)));
    const product = productMap.get(productKey);
    if (!product || quantity <= 0) continue;
    const availableStock = Math.max(0, Math.floor(Number(product.stock || 0)));
    if (availableStock < quantity) {
      const error = new Error(`${product.name} has only ${availableStock} ${product.unit || "Pcs"} available.`);
      error.statusCode = 409;
      throw error;
    }
    const gstRate = numberValue(product.gst_rate);
    const onlinePrice = numberValue(product.online_price);
    const mrp = numberValue(product.mrp || onlinePrice);
    const rateWithoutGst = gstRate ? numberValue(onlinePrice / (1 + gstRate / 100)) : onlinePrice;
    const gstPerUnit = numberValue(onlinePrice - rateWithoutGst);
    const discountPerUnit = Math.max(0, numberValue(mrp - onlinePrice));
    orderItems.push({
      product_key: productKey,
      name: product.name,
      barcode: product.barcode || "",
      quantity,
      unit: product.unit || "Pcs",
      mrp,
      online_price: onlinePrice,
      rate_without_gst: rateWithoutGst,
      gst_rate: gstRate,
      gst_amount: numberValue(gstPerUnit * quantity),
      discount_amount: numberValue(discountPerUnit * quantity),
      total: numberValue(onlinePrice * quantity)
    });
    const updatedProduct = updatedProducts.find((entry) => (entry.product_key || entry.id) === productKey);
    if (updatedProduct) {
      updatedProduct.stock = numberValue(availableStock - quantity);
      updatedProduct.updated_at = new Date().toISOString();
    }
  }

  if (!orderItems.length) {
    const error = new Error("Add at least one available product to checkout.");
    error.statusCode = 400;
    throw error;
  }

  const subtotal = numberValue(orderItems.reduce((sum, item) => sum + (item.rate_without_gst * item.quantity), 0));
  const gstTotal = numberValue(orderItems.reduce((sum, item) => sum + item.gst_amount, 0));
  const discountTotal = numberValue(orderItems.reduce((sum, item) => sum + item.discount_amount, 0));
  const total = numberValue(orderItems.reduce((sum, item) => sum + item.total, 0));
  const now = new Date().toISOString();
  const order = {
    id: makeOrderId(),
    invoice_number: makeInvoiceNumber(),
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: String(customer.email || "").trim(),
    customer_address: String(customer.address || "").trim(),
    items: orderItems,
    subtotal,
    gst_total: gstTotal,
    discount_total: discountTotal,
    total,
    status: "Placed",
    payment_status: "Unpaid",
    created_at: now,
    updated_at: now
  };

  return { order, updatedProducts };
}
