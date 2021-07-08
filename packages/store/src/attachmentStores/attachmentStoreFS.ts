import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { pipeline } from "stream";
import { pathToFileURL } from "url";
import { promisify } from "util";
import { AttachmentStore } from "../attachmentStore";
import { AttachmentReference } from "../core2";
import { AttachmentDownloadError } from "./attachmentDownloadError";
import { getPathForAttachment } from "./getPathForAttachment";

const _pipeline = promisify(pipeline);

/*
Implements an attachment store by writing files to a folder on disk.

This implementation is for Node.js clients.
 */
export class AttachmentStoreFS implements AttachmentStore {
  private readonly _basePath: string;

  // basePath must be a path to a folder which already exists.
  constructor(basePath: string) {
    this._basePath = path.normalize(basePath);
  }

  async storeAttachmentFromURL(
    url: string,
    attachmentReference: AttachmentReference,
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new AttachmentDownloadError({
        statusCode: response.status,
        bodyText: await response.text(),
      });
    }

    await _pipeline(
      response.body,
      fs.createWriteStream(
        getPathForAttachment(this._basePath, attachmentReference),
      ),
    );
  }

  // If the attachment has already been stored, resolves to its local URL; otherwise resolves to null.
  async getURLForStoredAttachment(
    attachmentReference: AttachmentReference,
  ): Promise<string | null> {
    const attachmentPath = getPathForAttachment(
      this._basePath,
      attachmentReference,
    );
    const exists = await fs.promises
      .access(attachmentPath)
      .then(() => true)
      .catch(() => false);
    return exists ? pathToFileURL(attachmentPath).href : null;
  }
}
