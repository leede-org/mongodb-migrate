# mongodb-migrate

`mongodb-migrate` is a tool to migrate a MongoDB database from one server to another without downtime using change streams. It works by executing
a `mongodump` on the source database followed by a `mongorestore` on the destination database. Before starting the dump, the source database
is watched for changes to documents using change streams which are applied after the initial restore. Afterwards, the tool keeps synchronizing
document insertions, updates, replacements and deletions.

Caveats:

- change streams are only available for replica sets and sharded clusters (note that a standalone `mongod` instance can be converted to a replica set)
- the tool uses `mongodump` and `mongorestore` executables which must be available in the system path
- the tool only synchronizes one database, if you want to migrate multiple databases then run the tool multiple times in parallel or sequentially
- collection indexes are synchronized after the intial `mongodump` and `mongorestore`

## Usage

Install globally

```
npm i -g @leede/mongodb-migrate
```

The package provides a `mongodb-migrate` executable:

```
usage: mongodb-migrate [-h] -s SRC -d DST [-e EXCLUDE] [-w EXCLUDEWATCH]

MongoDB migration tool

optional arguments:
  -h, --help            show this help message and exit
  -s SRC, --src SRC     Source database uri, must include database name
  -d DST, --dst DST     Destination database uri, must include database name
  -e EXCLUDE, --exclude EXCLUDE
                        Exclude collections, separate collection names with comma to exclude multiple collections
  -w EXCLUDEWATCH, --excludeWatch EXCLUDEWATCH
                        Exclude collections from being watched for changes - only a snapshot for these will be copied and further changes
                        will not be synchronized, separate collection names with comma to exclude multiple collections
```

Example (note that specifying a database name is mandatory in both the src and dst connection uris):

```
mongodb-migrate --src mongodb://user:pass@some-mongodb-server/mydb --dst mongodb://user2:pass2@another-mongodb-server/mynewdb
```

Migration steps:

1. Run `mongodb-migrate`
2. Wait until the intial `mongorestore` is completed
3. Change MongoDB connection uri in all your applications
4. Use Ctrl+C to stop `mongodb-migrate` when no more changes are anticipated in the source database
