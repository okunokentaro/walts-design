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
  }

  emit(action) {
    if (isActions(action)) {
      this.emitAll(action);
      return;
    }
    this.emitAll([action]);
  }

    emitAll(actions) {
      const processor = (st) => {
        return actions
          .reduce((a, b) => {
            return new Promise((resolve, reject) => {
              a.then((aa) => {
                const bReturn = b(aa);
                if (isPromise(bReturn)) {
                  bReturn.then((bb) => {
                    resolve(Object.assign(aa, bb));
                  });
                  return;
                }
                resolve(Object.assign(aa, bReturn));
              });
            });
          }, st);
      };
      this.subject.next(processor);
    }

  subscribe(observer) {
    this.subject.subscribe((processor) => {
      observer(processor);
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

    this.dispatcher.subscribe((processor) => {
      const before = Promise.resolve(this.stateRef);
      processor(before).then((after) => {
        this.stateRef = after;
        this._observable.next(Object.assign({}, this.stateRef));
      });
    });
  }

  get observable() {
    return this._observable;
  }
}

const dispatcher = new Dispatcher();
const store = new Store(dispatcher);
store.observable.subscribe(s => console.log(s));

dispatcher.emit((st) => {
  return new Promise((resolve) => {
    resolve({a: st.a + 10});
  });
});
