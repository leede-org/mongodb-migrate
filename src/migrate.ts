import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { setTimeout } from "timers/promises";
import {
  MongoClient,
  Db,
  Document,
  ChangeStreamInsertDocument,
  ChangeStreamUpdateDocument,
  ChangeStreamReplaceDocument,
  ChangeStreamDeleteDocument,
} from "mongodb";

export interface Change<TSchema extends Document = Document> {
  time: Date;
  event:
    | ChangeStreamInsertDocument<TSchema>
    | ChangeStreamUpdateDocument<TSchema>
    | ChangeStreamReplaceDocument<TSchema>
    | ChangeStreamDeleteDocument<TSchema>;
}

async function handleChange(dstDb: Db, change: Change) {
  const { time, event } = change;
  const collection = dstDb.collection(event.ns.coll);

  console.log(time, event.operationType, event.ns.coll, event.documentKey._id);

  switch (event.operationType) {
    case "insert":
      await collection.insertOne(event.fullDocument);
      break;
    case "update":
    case "replace":
      await collection.replaceOne(
        { _id: event.documentKey._id },
        event.fullDocument!
      );
      break;
    case "delete":
      await collection.deleteOne({ _id: event.documentKey._id });
      break;
  }
}

async function processChanges(dstDb: Db, changes: Change[]) {
  let unchangedTime = 0;

  while (true) {
    const change = changes.shift();

    if (change) {
      try {
        await handleChange(dstDb, change);
      } catch (err) {
        console.log("[FAILED]", change);
      }

      unchangedTime = 0;
    } else {
      await setTimeout(10);
      unchangedTime += 10;

      if (unchangedTime % 10000 === 0) {
        console.log(`No changes for ${Math.floor(unchangedTime / 1000)}s`);
      }
    }
  }
}

export async function migrate(
  srcUri: string,
  dstUri: string,
  excludeCollections: string[] = [],
  excludeWatchCollections: string[] = []
) {
  // Connect to source and destination databases
  const srcClient = new MongoClient(srcUri);
  await srcClient.connect();
  const srcDb = srcClient.db();

  const dstClient = new MongoClient(dstUri);
  await dstClient.connect();
  const dstDb = dstClient.db();

  // Record source database changes during dump and restore process
  const stream = srcDb.watch(undefined, {
    fullDocument: "updateLookup",
  });

  const changes: Change[] = [];

  stream.on("change", (event) => {
    if (
      event.operationType !== "insert" &&
      event.operationType !== "update" &&
      event.operationType !== "replace" &&
      event.operationType !== "delete"
    ) {
      return;
    }

    if (
      excludeCollections.includes(event.ns.coll) ||
      excludeWatchCollections.includes(event.ns.coll)
    ) {
      return;
    }

    changes.push({ time: new Date(), event });
  });

  // Create temporary directory for dump
  const dumpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dump-"));

  // Run mongodump
  spawnSync(
    "mongodump",
    [
      `--uri="${srcUri}"`,
      `--out="${dumpDir}"`,
      ...excludeCollections.map(
        (collection) => `--excludeCollection="${collection}"`
      ),
    ],
    {
      stdio: "inherit",
    }
  );

  // Run mongorestore
  spawnSync(
    "mongorestore",
    [
      `--uri="${dstUri}"`,
      `--nsFrom="${srcDb.databaseName}.*"`,
      `--nsTo="${dstDb.databaseName}.*"`,
      `${dumpDir}/${srcDb.databaseName}`,
    ],
    {
      stdio: "inherit",
    }
  );

  // Remove temporary directory
  fs.rmSync(dumpDir, { recursive: true });

  // Start writing changes to destination database after intial dump and restore
  console.log(`${changes.length} changes occured during dump and restore`);
  await processChanges(dstDb, changes);
}
