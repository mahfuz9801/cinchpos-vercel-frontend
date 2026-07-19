import {
  methodNotAllowed,
  orderBlobPath,
  readBlobJSON,
  sendJSON
} from "../../../_lib/online-store.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  try {
    const orderId = request.query.orderId;
    const record = await readBlobJSON(orderBlobPath(orderId));
    if (!record?.order) {
      return sendJSON(response, 404, { error: "Invoice not found." });
    }
    return sendJSON(response, 200, {
      store: record.store,
      order: record.order
    });
  } catch (error) {
    return sendJSON(response, 500, { error: error.message || "Invoice could not be loaded." });
  }
}
