/* eslint-env mocha */

const assert = require("assert");
const {createLock} = require("..");
const {delay} = require("./util");

describe("lock", () => {
  it("read should run parallel", async () => {
    const lock = createLock();
    const q = [];
    await Promise.all([
      lock.read(async () => {
        q.push(1);
        await delay();
        q.push(2);
      }),
      lock.read(() => {
        q.push(3);
      })
    ]);
    assert.deepStrictEqual(q, [1, 3, 2]);
  });
  
  it("write should block", async () => {
    const lock = createLock();
    const q = [];
    await Promise.all([
      lock.write(async () => {
        q.push(1);
        await delay();
        q.push(2);
      }),
      lock.write(() => {
        q.push(3);
      })
    ]);
    assert.deepStrictEqual(q, [1, 2, 3]);
  });
  
  it("write should block read", async () => {
    const lock = createLock();
    const q = [];
    await Promise.all([
      lock.write(async () => {
        q.push(1);
        await delay();
        q.push(2);
      }),
      lock.read(() => {
        q.push(3);
      })
    ]);
    assert.deepStrictEqual(q, [1, 2, 3]);
  });
  
  it("read should block write", async () => {
    const lock = createLock();
    const q = [];
    await Promise.all([
      lock.read(async () => {
        q.push(1);
        await delay();
        q.push(2);
      }),
      lock.write(() => {
        q.push(3);
      })
    ]);
    assert.deepStrictEqual(q, [1, 2, 3]);
  });
  
  it("manually release late", async () => {
    const lock = createLock();
    const q = [];
    const p1 = lock.read(release => {
      q.push(1);
      setTimeout(() => {
        release();
      }, 10);
    });
    const p2 = lock.read(() => {
      q.push(2);
    });
    const p3 = lock.write(() => {
      q.push(3);
    });
    await Promise.all([p1, p2]);
    assert.deepStrictEqual(q, [1, 2]);
    await p3;
    assert.deepStrictEqual(q, [1, 2, 3]);
  });
  
  it("manually release early", async () => {
    const lock = createLock();
    const q = [];
    await Promise.all([
      lock.read(async release => {
        q.push(1);
        release();
        q.push(2);
        await delay();
        q.push(3);
      }),
      lock.write(() => {
        q.push(4);
      })
    ]);
    assert.deepStrictEqual(q, [1, 2, 4, 3]);
  });
  
  it("auto release when callback throws", async () => {
    const lock = createLock();
    const p1 = assert.rejects(lock.read(release => { // eslint-disable-line no-unused-vars
      // auto release on sync error
      throw new Error("test");
    }));
    await lock.write(() => {});
    await p1;
  });
  
  it("maxActiveReader should throttle readers", async () => {
    const lock = createLock({maxActiveReader: 1});
    const q = [];
    await Promise.all([
      lock.read(async () => {
        q.push(1);
        await delay();
        q.push(2);
      }),
      lock.read(() => {
        q.push(3);
      })
    ]);
    assert.deepStrictEqual(q, [1, 2, 3]);
  });
});
