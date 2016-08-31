import {Subject, BehaviorSubject} from 'rxjs';
import { isPromise as rxIsPromise } from 'rxjs/util/isPromise';

const state = {
  a: 1,
  b: 'hello',
  c: 1
};

function delayed(argFunc) {
  return new Promise(argFunc);
}

function isActions(v) {
  return Array.isArray(v);
}

function isPromise(v) {
  return rxIsPromise(v);
}

class Dispatcher {
  constructor() {
    this.begin$ = new Subject();
    this.continue$ = new Subject();
    this.complete$ = new Subject();
  }

  emit(action) {
    if (isActions(action)) {
      return this.emitAll(action);
    }
    return this.emitAll([action]);
  }

  emitAll(actions) {
    return new Promise((resolve) => {
      const queueStack = actions.map((action, i) => {
        const actionQueue = new Subject();
        actionQueue.subscribe((state) => {
          const result = actions[i](state);
          const nextQueue = queueStack[i + 1]
            ? queueStack[i + 1]
            : {next: (v) => { resolve(v); this.complete$.next(v); }}
          ;
          if (isPromise(result)) {
            result.then((resultSt) => {
              if (typeof resultSt === 'function') {
                this.emit(resultSt).then((v) => {
                  this.continue$.next({result: v, queue: nextQueue});
                });
                return;
              }
              if (Array.isArray(resultSt)) {
                this.emit(resultSt).then((v) => {
                  this.continue$.next({result: v, queue: nextQueue});
                });
                return;
              }
              this.continue$.next({result: resultSt, queue: nextQueue});
            });
            return;
          }
          this.continue$.next({result: result, queue: nextQueue});
        });

        return actionQueue;
      });

      this.begin$.next(queueStack[0]);
    });
  }

  beginSubscribe(observer) {
    this.begin$.subscribe((actionQueue) => {
      observer(actionQueue);
    });
  }

  continueSubscribe(observer) {
    this.continue$.subscribe((resultState) => {
      observer(resultState);
    });
  }

  completeSubscribe(observer) {
    this.complete$.subscribe((resultState) => {
      observer(resultState);
    });
  }
}

class Store {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
    const initState = state;
    //
    this.stateRef    = Object.assign({}, initState);
    this._observable = new BehaviorSubject(this.stateRef);

    this.dispatcher.beginSubscribe((actionQueue) => {
      actionQueue.next(Object.assign({}, this.stateRef));
    });
    this.dispatcher.continueSubscribe((params) => {
      this.stateRef = Object.assign({}, this.stateRef, params.result);
      params.queue.next(this.stateRef);
    });
    this.dispatcher.completeSubscribe((params) => {
      this.stateRef = Object.assign({}, this.stateRef, params.result);
      this._observable.next(this.stateRef);
    });
  }

  get observable() {
    return this._observable;
  }
}

const dispatcher = new Dispatcher();
const store = new Store(dispatcher);
store.observable.subscribe(s => console.log(s));

// console.log(1);
// dispatcher.emit((st) => {
//   return new Promise((resolve) => {
//     resolve({a: st.a + 10});
//   });
// });

console.log(2);
// dispatcher.emitAll([
//   (st) => {
//     console.log(10);
//     return {a: st.a + 1};
//   },
//   (st) => {
//     return new Promise((resolve) => {
//       console.log(20);
//       setTimeout(() => {
//         console.log(25);
//         resolve({a: st.a + 1});
//       }, 1000);
//     });
//   },
//   (st) => {
//     console.log(30);
//     return {a: st.a + 1};
//   }
// ]);

dispatcher.emit((st) => {
  return new Promise((resolve) => {
    console.log(10);
    setTimeout(() => {
      console.log(20);
      resolve({a: st.a + 1});
    }, 1000);
  });
});
dispatcher.emit((st) => {
  return new Promise((resolve) => {
    console.log(30);
    setTimeout(() => {
      console.log(40);
      resolve({a: st.a + 1});
    }, 500);
  });
});

dispatcher.emitAll([
  (_) => {
    return delayed((apply) => {
      console.log(50);
      const value = 3;
      setTimeout(() => {
        console.log(60);
        apply([
          (st) => {
            console.log(65);
            return {c: st.c / value}
          },
          (st) => {
            console.log(67);
            return {c: st.c + 5}
          }
        ]);
      }, 1000);
    });
  },
  (st) => {
    console.log(69);
    return {c: st.c / 2}
  }
]);
dispatcher.emit((st) => {
  return new Promise((resolve) => {
    console.log(70);
    setTimeout(() => {
      console.log(80);
      resolve({c: st.c + 5});
    }, 500);
  });
});

//
// console.log(3);
// dispatcher.emit((st) => {
//   console.log(JSON.stringify(st));
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       console.log(JSON.stringify(st));
//       resolve({a: st.a / 3})
//     }, 3000);
//   });
// });
//
// console.log(4);
// dispatcher.emit((st) => {
//   return {a: st.a + 1};
// });
//
// console.log(4);
// dispatcher.emit((st) => {
//   return {a: st.a + 1};
// });
