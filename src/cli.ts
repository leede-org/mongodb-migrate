#!/usr/bin/env node

import { spawnSync } from "child_process";
import { ArgumentParser } from "argparse";
import { migrate } from "./migrate";

// Parse args
const parser = new ArgumentParser({
  prog: "mongodb-migrate",
  description: "MongoDB migration tool",
});

parser.add_argument("-s", "--src", {
  help: "Source database uri, must include database name",
  required: true,
});

parser.add_argument("-d", "--dst", {
  help: "Destination database uri, must include database name",
  required: true,
});

parser.add_argument("-e", "--exclude", {
  help: "Exclude collections, separate collection names with comma to exclude multiple collections",
});

parser.add_argument("-w", "--excludeWatch", {
  help: "Exclude collections from being watched for changes - only a snapshot for these will be copied and further changes will not be synchronized, separate collection names with comma to exclude multiple collections",
});

const args = parser.parse_args();

// Check environment
const mongodumpVersion = spawnSync("mongodump", ["--version"]);
const mongorestoreVersion = spawnSync("mongorestore", ["--version"]);

if (mongodumpVersion.error) {
  console.error(
    "mongodump is not on system path, install MongoDB Database Tools and try again"
  );
  process.exit(1);
}

if (mongorestoreVersion.error) {
  console.error(
    "mongorestore is not on system path, install MongoDB Database Tools and try again"
  );
  process.exit(1);
}

// Run
migrate(
  args.src,
  args.dst,
  args.exclude?.split(",") || [],
  args.excludeWatch?.split(",") || []
);
