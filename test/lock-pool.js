/* eslint-env mocha */

const assert = require("assert");
const {createLockPool} = require("..");
const {delay} = require("./util");

describe("lock pool", () => {
  it("write should block", async () => {
    const locks = createLockPool();
    const q = [];
    locks.write(["foo", "bar"], async () => {
      q.push(1);
      await delay();
      q.push(2);
    });
    const p = locks.write(["foo"], () => {
      q.push(3);
    });
    await p;
    assert.deepStrictEqual(q, [1, 2, 3]);
    assert.equal(locks.locks.size, 0);
  });
  
  it("write should not block if not overlay", async () => {
    const locks = createLockPool();
    const q = [];
    const p = locks.write(["foo", "bar"], async () => {
      q.push(1);
      await delay();
      q.push(2);
    });
    locks.write(["baz"], () => {
      q.push(3);
    });
    await p;
    assert.deepStrictEqual(q, [1, 3, 2]);
    assert.equal(locks.locks.size, 0);
  });
  
  it("read should run parallel", async () => {
    const locks = createLockPool();
    const q = [];
    const p = locks.read(["foo", "bar"], async () => {
      q.push(1);
      await delay();
      q.push(2);
    });
    locks.read(["foo"], () => {
      q.push(3);
    });
    await p;
    assert.deepStrictEqual(q, [1, 3, 2]);
    assert.equal(locks.locks.size, 0);
  });
  
  it("manually release", async () => {
    const locks = createLockPool();
    const q = [];
    locks.read(["foo", "bar"], release => {
      q.push(1);
      setTimeout(() => {
        q.push(2);
        release();
      }, 10);
    });
    const p = locks.write(["foo"], () => {
      q.push(3);
    });
    await p;
    assert.deepStrictEqual(q, [1, 2, 3]);
    assert.equal(locks.locks.size, 0);
  });
  
  it("release automatically if the callback throws", async () => {
    const locks = createLockPool();
    const q = [];
    const p1 = locks.read(["foo", "bar"], release => { // eslint-disable-line no-unused-vars
      q.push(1);
      throw new Error("foo");
    });
    const p2 = locks.write(["foo"], () => {
      q.push(2);
    });
    await p2;
    assert.deepStrictEqual(q, [1, 2]);
    await assert.rejects(p1);
    assert.equal(locks.locks.size, 0);
  });
});
