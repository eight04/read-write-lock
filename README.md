read-write-lock
===============

[![Build Status](https://travis-ci.com/eight04/read-write-lock.svg?branch=master)](https://travis-ci.com/eight04/read-write-lock)
[![codecov](https://codecov.io/gh/eight04/read-write-lock/branch/master/graph/badge.svg)](https://codecov.io/gh/eight04/read-write-lock)

A browser-friendly read/write lock.

Features
--------

* Read/write lock.
* Include a lock pool which can acquire multiple keys at once.
* No `process.nextTick`. Built with Promise.
* The pending queue is implemented with a linked list.
* Support promise while it is allowed to use a `done` callback.
* Throttle read tasks.

Installation
------------

npm:

```
npm install @eight04/read-write-lock
```
```js
const {createLock, createLockPool} = require("@eight04/read-write-lock");
...
```

CDN:

```html
<script src="https://unpkg.com/@eight04/read-write-lock/dist/read-write-lock.min.js"></script>
```
```js
/* global readWriteLock */
const {createLock, createLockPool} = readWriteLock;
...
```

Usage
-----

`createLock`:

```js
const lock = createLock();
lock.read(async () => {
  console.log(1);
  await delay(100);
});
lock.read(async () => {
  console.log(2);
  await delay(100);
});
lock.write(async () => {
  console.log(3);
  await delay(100);
});
lock.read(async () => {
  console.log(4);
  await delay(100);
});
```
```
1
2
<100ms delay>
3
<100ms delay>
4
```

`createLockPool`:

```js
const lockPool = createLockPool();
lockPool.read(["foo", "bar"], async () => {
  console.log(1);
  await delay(100);
});
lockPool.write(["bar"], async () => {
  console.log(2);
  await delay(100);
});
lockPool.write(["baz"], async () => {
  console.log(3);
  await delay(100);
});
lockPool.read(["foo"], async () => {
  console.log(4);
  await delay(100);
});
```

```
1
3
4
<100ms delay>
2
```

API
----

This module exports two functions:

* `createLock` - create a `lock` object that can be used to queue up async tasks.
* `createLockPool` - create a lock pool that can queue up async tasks for different scopes.

### createLock

```js
const lock = createLock({
  maxActiveReader = Infinity
} = {});
```

Create a read/write lock.

`maxActiveReader` controls how many reader will run in parallel.

### lock.read

```js
const callbackResult = await lock.read(callback: Function | AsyncFunction);
```

Register a reader callback, wait until the reader get called, and return the callback result.

If `callback` accepts no argument, the lock will be released when the callback returns. Otherwise, callback accepts a `release` function that will release the lock when called.

If `callback` is a sync function and it throws when called, the lock will be released immediately.

### lock.write

```js
const callbackResult = await lock.write(callback: Function | AsyncFunction);
```

Register a writer callback, wait until the writer get called, and return the callback result.

### createLockPool

```js
const pool = createLockPool(options?);
```

Create a lock pool. You can operate on multiple locks at once by specifying multiple scopes.

`options` object will be sent to `createLock`.

### pool.read

```js
const callbackResult = await pool.read(scopes: Iterable, callback: Function | AsyncFunction);
```

Grant access to multiple `scopes`, wait until the reader get called, and return the callback result.

`scopes` may contain anything that can be used as the key of JavaScript `Map`.

### pool.write

```js
const callbackResult = await pool.write(scopes: Iterable, callback: Function | AsyncFunction);
```

Grant access to multiple `scopes`, wait until the writer get called, and return the callback result.

Similar projects
----------------

There are a lot of other implementations on npm:

* [read-write-lock](https://github.com/TehShrike/read-write-lock) - simple read/write lock built with [mutexify](https://www.npmjs.com/package/mutexify) which uses `process.nextTick`.
* [node-memory-lock](https://github.com/danielgindi/node-memory-lock) - support priority/upgrade/downgrade/timeout.
* [async-rwlock](https://github.com/mvisat/async-rwlock) - the unlock timing is hidden. Support timeout.
* [rwlock](https://github.com/71104/rwlock) - the unlock function is sync.
* [mortice](https://github.com/achingbrain/mortice) - put the lock in worker/cluster. Support timeout/throttle.
* [readwrite-lock](https://github.com/dataserve/readwrite-lock) - promise based. Support limited queue size/timeout/priority.

Changelog
---------

* 0.1.0 (Apr 5, 2019)

  - First release.
