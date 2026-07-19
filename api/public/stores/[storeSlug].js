import {
  methodNotAllowed,
  publicStoreRecord,
  readBlobJSON,
  sendJSON,
  storeBlobPath
} from "../../_lib/online-store.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  try {
    const storeSlug = request.query.storeSlug;
    const record = await readBlobJSON(storeBlobPath(storeSlug));
    const publicRecord = publicStoreRecord(record);
    if (!publicRecord?.store) {
      return sendJSON(response, 404, { error: "Online store not found. Publish the store from CinchPOS first." });
    }
    return sendJSON(response, 200, publicRecord);
  } catch (error) {
    return sendJSON(response, 500, { error: error.message || "Online store could not be loaded." });
  }
}
