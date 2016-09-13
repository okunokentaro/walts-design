import {Actions, Dispatcher, Store} from 'walts'

class AppActions extends Actions {
  addToA(n) {
    return (st) => {
      throw new Error('エラーだよ');
    };
  }
}

const INIT_STATE = {
  a: 0,
  b: 0
};
const dispatcher = new Dispatcher();

class AppStore extends Store {
  constructor(_dispatcher) {
    super(INIT_STATE, _dispatcher);
  }
}

const actions = new AppActions();
const store   = new AppStore(dispatcher);

dispatcher.emit(actions.addToA(1));

store.observable.subscribe((st) => {
  console.log(st);
}, (err) => {
  console.log('エラーをキャッチした');
  console.err(err);
});
