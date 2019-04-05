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
  });
});
