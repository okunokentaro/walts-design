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
    this.begin$    = new Subject();
    this.continue$ = new Subject();
    this.complete$ = new Subject();
  }

  emit(action) {
    this.emitImpl(action, this.complete$);
  }

  emitImpl(action, complete$) {
    if (isActions(action)) {
      return this.emitAllImpl(action, complete$);
    }
    return this.emitAllImpl([action], complete$);
  }

  emitAll(action) {
    this.emitAllImpl(action, this.complete$);
  }

  emitAllImpl(actions, complete$) {
    const promise = new Promise((resolve) => {
      const queueStack = actions.map((_) => new Subject());

      queueStack.forEach((queue, i) => {
        const action    = actions[i];
        const nextQueue = queueStack[i + 1]
          ? queueStack[i + 1]
          : {next: (v) => { resolve(v); if (complete$) { complete$.next(v); }}};

        queue.subscribe((state) => {
          if (isPromise(action)) {
            console.warn('Use of promise is deprecated. Please use the delayed() instead.');
            action.then((_action) => {
              const result = _action(state);
              this.continueNext(result, nextQueue);
            });
            return;
          }

          const result = action(state);
          isPromise(result)
            ? this.whenPromise(result, nextQueue)
            : this.continueNext(result, nextQueue);
        });
      });

      this.begin$.next(queueStack[0]);
    });

    return promise;
  }

  whenPromise(result, nextQueue) {
    result.then((value) => {
      if (typeof value === 'function') {
        const action = value;
        return this.emitImpl(action).then((v) => this.continueNext(v, nextQueue));
      }
      if (Array.isArray(value)) {
        const actions = value;
        return this.emitAllImpl(actions).then((v) => this.continueNext(v, nextQueue));
      }
      this.continueNext(value, nextQueue);
    });
  }

  continueNext(result, queue) {
    this.continue$.next({result, queue});
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

console.log(1);
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

dispatcher.emitAll([
  // new Promise((resolve) => {
  //   console.log(2);
  //   setTimeout(() => {
  //     console.log(4);
  //     resolve((st) => {
  //       console.log(6);
  //       return {
  //         a: st.a + 1
  //       };
  //     });
  //     console.log(8);
  //   }, 500)
  // }),
  (st) => {
    console.log(20);
    return delayed((apply) => {
      console.log(30);
      setTimeout(() => {
        console.log(40);
        apply((st) => {
          console.log(50);
          return {
            a: st.a + 1
          };
        })
      }, 500);
    });
  },
  (st) => {
    console.log(60);
    return {
      a: st.a + 1
    };
  },
]);

dispatcher.emit((st) => {
  return {a: st.a * 10};
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
