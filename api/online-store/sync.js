import {
  cleanProduct,
  cleanStore,
  hashSyncToken,
  methodNotAllowed,
  publicStoreRecord,
  readBlobJSON,
  readRequestJSON,
  sendJSON,
  storeBlobPath,
  writeBlobJSON
} from "../_lib/online-store.mjs";

export default async function handler(request, response) {
  if (!["POST", "PUT"].includes(request.method)) {
    return methodNotAllowed(response, ["POST", "PUT"]);
  }

  try {
    const payload = await readRequestJSON(request);
    const store = cleanStore(payload.store || {});
    const products = Array.isArray(payload.products)
      ? payload.products.map(cleanProduct).filter(Boolean)
      : [];
    const syncToken = String(payload.sync_token || payload.syncToken || "");
    if (!store.slug) {
      return sendJSON(response, 400, { error: "Store slug is required." });
    }
    if (!syncToken || syncToken.length < 24) {
      return sendJSON(response, 401, { error: "A valid store sync token is required." });
    }
    if (!products.length) {
      return sendJSON(response, 400, { error: "At least one online product is required." });
    }

    const pathname = storeBlobPath(store.slug);
    const existingRecord = await readBlobJSON(pathname);
    const syncTokenHash = hashSyncToken(syncToken);
    if (existingRecord?.sync_token_hash && existingRecord.sync_token_hash !== syncTokenHash) {
      return sendJSON(response, 403, { error: "Store sync token does not match this online store." });
    }

    const record = {
      store,
      products,
      sync_token_hash: syncTokenHash,
      updated_at: new Date().toISOString()
    };
    await writeBlobJSON(pathname, record);
    const publicRecord = publicStoreRecord(record);
    return sendJSON(response, 200, {
      status: "synced",
      store: publicRecord.store,
      products: publicRecord.products,
      published_count: publicRecord.products.length
    });
  } catch (error) {
    return sendJSON(response, error.statusCode || 500, {
      error: error.message || "Online store sync failed."
    });
  }
}
