import {Subject, BehaviorSubject} from 'rxjs';
import { isPromise as rxIsPromise } from 'rxjs/util/isPromise';

const state = {
  a: 1,
  b: 'hello'
};

function isActions(v) {
  return Array.isArray(v);
}

function isPromise(v) {
  return rxIsPromise(v);
}

class Dispatcher {
  constructor() {
    this.subject = new Subject();
    this.subject2 = new Subject();
  }

  emit(action) {
    if (isActions(action)) {
      this.emitAll(action);
      return;
    }
    this.emitAll([action]);
  }

  emitAll(actions) {
    actions.forEach((action, i) => {
      const publisher = new Subject();
      publisher.subscribe((state) => {
        const result = actions[i](state);
        this.subject2.next(result);
      });
      this.subject.next(publisher);
    });
  }

  subscribe(observer) {
    this.subject.subscribe((publisher) => {
      observer(publisher);
    });
  }
  subscribe2(observer) {
    this.subject2.subscribe((result) => {
      observer(result);
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

    this.dispatcher.subscribe((publisher) => {
      publisher.next(this.stateRef);
    });
    this.dispatcher.subscribe2((result) => {
      this.stateRef = Object.assign({}, this.stateRef, result);
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
dispatcher.emitAll([
  (st) => {
    return {a: st.a + 1};
  },
  (st) => {
    return {a: st.a + 1};
  },
  (st) => {
    return {a: st.a + 1};
  }
]);
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
