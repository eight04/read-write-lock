function createLock({maxActiveReader = Infinity} = {}) {
  let firstTask;
  let lastTask;
  let activeReader = 0;
  return {read, write};
  
  function read(fn) {
    return que(fn, false);
  }
  
  function write(fn) {
    return que(fn, true);
  }
  
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
    let err;
    try {
      result = task.fn(task.q2 && task.q2.resolve);
    } catch (_err) {
      err = _err;
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
      if (err) {
        task.q.reject(err);
      } else {
        task.q.resolve(result);
      }
      if (!task.q2) {
        onDone();
        return;
      }
      task.q2.resolve();
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

module.exports = {
  createLock
};
