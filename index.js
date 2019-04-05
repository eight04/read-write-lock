function createLock({maxActiveReader = Infinity} = {}) {
  let firstTask;
  let lastTask;
  let activeReader = 0;
  return {
    read: fn => que(fn, false),
    write: fn => que(fn, true)
  };
  
  function que(fn, block) {
    const task = createTask({fn, block});
    if (!lastTask) {
      firstTask = lastTask = task;
    } else {
      lastTask.next = task;
      task.prev = lastTask;
      lastTask = task;
      if (!firstTask) {
        firstTask = lastTask;
      }
    }
    deque();
    return task.q.promise;
  }
  
  function defer() {
    const o = {};
    o.promise = new Promise((resolve, reject) => {
      o.resolve = resolve;
      o.reject = reject;
    });
    return o;
  }
  
  function createTask({
    fn,
    block = false,
    prev,
    next,
    q = defer(),
    q2 = fn.length ? defer() : null
  }) {
    return {fn, block, prev, next, q, q2};
  }
  
  function deque() {
    const task = firstTask;
    if (
      !task ||
      task.block && task.prev ||
      task.prev && task.prev.block ||
      activeReader >= maxActiveReader
    ) {
      return;
    }
    if (!task.block) {
      activeReader++;
    }
    firstTask = task.next;
    let result;
    try {
      result = task.fn(task.q2 && task.q2.resolve);
    } catch (err) {
      task.q.reject(err);
      // auto release with sync error
      // q2 is useless in this case
      onDone();
      return;
    }
    if (task.q2) {
      task.q2.promise.then(onDone);
    }
    if (result && result.then) {
      const pending = result.then(task.q.resolve, task.q.reject);
      if (!task.q2) {
        pending.then(onDone);
      }
    } else {
      task.q.resolve(result);
      if (!task.q2) {
        // it's a sync function and you don't want to release it manually, why
        // do you need a lock?
        onDone();
        return;
      }
    }
    deque();
    
    function onDone() {
      if (task.prev) {
        task.prev.next = task.next;
      }
      if (task.next) {
        task.next.prev = task.prev;
      }
      if (lastTask === task) {
        lastTask = task.prev;
      }
      if (!task.block) {
        activeReader--;
      }
      deque();
    }
  }
}

function createLockPool(options) {
  const locks = new Map; // scope -> lock
  return {
    read: (scope, fn) => op(scope, fn, "read"),
    write: (scope, fn) => op(scope, fn, "write")
  };
  
  async function op(scopes, fn, opType) {
    // FIXME: dead lock if there are duplicated scopes?
    const acquiring = [];
    for (const scope of scopes) {
      let lock = locks.get(scope);
      if (!lock) {
        lock = createLock(options);
        locks.set(scope, lock);
      }
      acquiring.push(lock[opType](release => release));
    }
    const releasers = await Promise.all(acquiring);
    let result;
    try {
      result = fn(fn.length && onDone);
    } catch (err) {
      onDone();
      throw err;
    }
    if (result && result.then) {
      if (!fn.length) {
        result.then(onDone, onDone);
      }
      return await result;
    }
    if (!fn.length) {
      onDone();
    }
    return result;
    
    function onDone() {
      for (const release of releasers) {
        release();
      }
      releasers.length = 0;
    }
  }
}

module.exports = {
  createLock,
  createLockPool
};
