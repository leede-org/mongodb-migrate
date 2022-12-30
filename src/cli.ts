#!/usr/bin/env node

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

// Run
const args = parser.parse_args();

migrate(
  args.src,
  args.dst,
  args.exclude?.split(",") || [],
  args.excludeWatch?.split(",") || []
);
