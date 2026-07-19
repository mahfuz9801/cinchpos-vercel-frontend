import {
  buildCheckoutOrder,
  methodNotAllowed,
  publicStoreRecord,
  readBlobJSON,
  readRequestJSON,
  sendJSON,
  storeBlobPath,
  orderBlobPath,
  writeBlobJSON
} from "../../../_lib/online-store.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  try {
    const storeSlug = request.query.storeSlug;
    const storePathname = storeBlobPath(storeSlug);
    const record = await readBlobJSON(storePathname);
    if (!record?.store) {
      return sendJSON(response, 404, { error: "Online store not found. Publish the store from CinchPOS first." });
    }

    const payload = await readRequestJSON(request);
    const { order, updatedProducts } = buildCheckoutOrder(record, payload);
    const nextRecord = {
      ...record,
      products: updatedProducts,
      updated_at: new Date().toISOString()
    };
    await writeBlobJSON(storePathname, nextRecord);
    await writeBlobJSON(orderBlobPath(order.id), {
      store: record.store,
      order,
      created_at: order.created_at
    });

    return sendJSON(response, 201, {
      store: publicStoreRecord(nextRecord).store,
      order
    });
  } catch (error) {
    return sendJSON(response, error.statusCode || 500, {
      error: error.message || "Checkout could not be completed."
    });
  }
}
