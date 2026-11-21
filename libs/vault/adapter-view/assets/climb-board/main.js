var ov = Object.defineProperty,
  rv = Object.defineProperties;
var sv = Object.getOwnPropertyDescriptors;
var Io = Object.getOwnPropertySymbols;
var Zf = Object.prototype.hasOwnProperty,
  Yf = Object.prototype.propertyIsEnumerable;
var qf = (n, e, t) =>
    e in n
      ? ov(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t })
      : (n[e] = t),
  h = (n, e) => {
    for (var t in (e ||= {})) Zf.call(e, t) && qf(n, t, e[t]);
    if (Io) for (var t of Io(e)) Yf.call(e, t) && qf(n, t, e[t]);
    return n;
  },
  y = (n, e) => rv(n, sv(e));
var bn = (n, e) => {
  var t = {};
  for (var i in n) Zf.call(n, i) && e.indexOf(i) < 0 && (t[i] = n[i]);
  if (n != null && Io)
    for (var i of Io(n)) e.indexOf(i) < 0 && Yf.call(n, i) && (t[i] = n[i]);
  return t;
};
var De = null,
  Mo = !1,
  ia = 1,
  av = null,
  pe = Symbol('SIGNAL');
function M(n) {
  let e = De;
  return ((De = n), e);
}
function _o() {
  return De;
}
var jt = {
  version: 0,
  lastCleanEpoch: 0,
  dirty: !1,
  producers: void 0,
  producersTail: void 0,
  consumers: void 0,
  consumersTail: void 0,
  recomputing: !1,
  consumerAllowSignalWrites: !1,
  consumerIsAlwaysLive: !1,
  kind: 'unknown',
  producerMustRecompute: () => !1,
  producerRecomputeValue: () => {},
  consumerMarkedDirty: () => {},
  consumerOnSignalRead: () => {},
};
function Sn(n) {
  if (Mo) throw new Error('');
  if (De === null) return;
  De.consumerOnSignalRead(n);
  let e = De.producersTail;
  if (e !== void 0 && e.producer === n) return;
  let t,
    i = De.recomputing;
  if (
    i &&
    ((t = e !== void 0 ? e.nextProducer : De.producers),
    t !== void 0 && t.producer === n)
  ) {
    ((De.producersTail = t), (t.lastReadVersion = n.version));
    return;
  }
  let o = n.consumersTail;
  if (o !== void 0 && o.consumer === De && (!i || cv(o, De))) return;
  let r = _n(De),
    s = {
      producer: n,
      consumer: De,
      nextProducer: t,
      prevConsumer: o,
      lastReadVersion: n.version,
      nextConsumer: void 0,
    };
  ((De.producersTail = s),
    e !== void 0 ? (e.nextProducer = s) : (De.producers = s),
    r && Jf(n, s));
}
function Qf() {
  ia++;
}
function No(n) {
  if (!(_n(n) && !n.dirty) && !(!n.dirty && n.lastCleanEpoch === ia)) {
    if (!n.producerMustRecompute(n) && !ui(n)) {
      To(n);
      return;
    }
    (n.producerRecomputeValue(n), To(n));
  }
}
function oa(n) {
  if (n.consumers === void 0) return;
  let e = Mo;
  Mo = !0;
  try {
    for (let t = n.consumers; t !== void 0; t = t.nextConsumer) {
      let i = t.consumer;
      i.dirty || dv(i);
    }
  } finally {
    Mo = e;
  }
}
function ra() {
  return De?.consumerAllowSignalWrites !== !1;
}
function dv(n) {
  ((n.dirty = !0), oa(n), n.consumerMarkedDirty?.(n));
}
function To(n) {
  ((n.dirty = !1), (n.lastCleanEpoch = ia));
}
function Ut(n) {
  return (n && Kf(n), M(n));
}
function Kf(n) {
  ((n.producersTail = void 0), (n.recomputing = !0));
}
function Tn(n, e) {
  (M(e), n && Xf(n));
}
function Xf(n) {
  n.recomputing = !1;
  let e = n.producersTail,
    t = e !== void 0 ? e.nextProducer : n.producers;
  if (t !== void 0) {
    if (_n(n))
      do t = sa(t);
      while (t !== void 0);
    e !== void 0 ? (e.nextProducer = void 0) : (n.producers = void 0);
  }
}
function ui(n) {
  for (let e = n.producers; e !== void 0; e = e.nextProducer) {
    let t = e.producer,
      i = e.lastReadVersion;
    if (i !== t.version || (No(t), i !== t.version)) return !0;
  }
  return !1;
}
function $t(n) {
  if (_n(n)) {
    let e = n.producers;
    for (; e !== void 0;) e = sa(e);
  }
  ((n.producers = void 0),
    (n.producersTail = void 0),
    (n.consumers = void 0),
    (n.consumersTail = void 0));
}
function Jf(n, e) {
  let t = n.consumersTail,
    i = _n(n);
  if (
    (t !== void 0
      ? ((e.nextConsumer = t.nextConsumer), (t.nextConsumer = e))
      : ((e.nextConsumer = void 0), (n.consumers = e)),
    (e.prevConsumer = t),
    (n.consumersTail = e),
    !i)
  )
    for (let o = n.producers; o !== void 0; o = o.nextProducer)
      Jf(o.producer, o);
}
function sa(n) {
  let e = n.producer,
    t = n.nextProducer,
    i = n.nextConsumer,
    o = n.prevConsumer;
  if (
    ((n.nextConsumer = void 0),
    (n.prevConsumer = void 0),
    i !== void 0 ? (i.prevConsumer = o) : (e.consumersTail = o),
    o !== void 0)
  )
    o.nextConsumer = i;
  else if (((e.consumers = i), !_n(e))) {
    let r = e.producers;
    for (; r !== void 0;) r = sa(r);
  }
  return t;
}
function _n(n) {
  return n.consumerIsAlwaysLive || n.consumers !== void 0;
}
function xo(n) {
  av?.(n);
}
function cv(n, e) {
  let t = e.producersTail;
  if (t !== void 0) {
    let i = e.producers;
    do {
      if (i === n) return !0;
      if (i === t) break;
      i = i.nextProducer;
    } while (i !== void 0);
  }
  return !1;
}
function Po(n, e) {
  return Object.is(n, e);
}
function fi(n, e) {
  let t = Object.create(lv);
  ((t.computation = n), e !== void 0 && (t.equal = e));
  let i = () => {
    if ((No(t), Sn(t), t.value === li)) throw t.error;
    return t.value;
  };
  return ((i[pe] = t), xo(t), i);
}
var bo = Symbol('UNSET'),
  So = Symbol('COMPUTING'),
  li = Symbol('ERRORED'),
  lv = y(h({}, jt), {
    value: bo,
    dirty: !0,
    error: null,
    equal: Po,
    kind: 'computed',
    producerMustRecompute(n) {
      return n.value === bo || n.value === So;
    },
    producerRecomputeValue(n) {
      if (n.value === So) throw new Error('');
      let e = n.value;
      n.value = So;
      let t = Ut(n),
        i,
        o = !1;
      try {
        ((i = n.computation()),
          M(null),
          (o = e !== bo && e !== li && i !== li && n.equal(e, i)));
      } catch (r) {
        ((i = li), (n.error = r));
      } finally {
        Tn(n, t);
      }
      if (o) {
        n.value = e;
        return;
      }
      ((n.value = i), n.version++);
    },
  });
function uv() {
  throw new Error();
}
var eg = uv;
function tg(n) {
  eg(n);
}
function aa(n) {
  eg = n;
}
var fv = null;
function da(n, e) {
  let t = Object.create(Ro);
  ((t.value = n), e !== void 0 && (t.equal = e));
  let i = () => ng(t);
  return ((i[pe] = t), xo(t), [i, (s) => Nn(t, s), (s) => ca(t, s)]);
}
function ng(n) {
  return (Sn(n), n.value);
}
function Nn(n, e) {
  (ra() || tg(n), n.equal(n.value, e) || ((n.value = e), gv(n)));
}
function ca(n, e) {
  (ra() || tg(n), Nn(n, e(n.value)));
}
var Ro = y(h({}, jt), { equal: Po, value: void 0, kind: 'signal' });
function gv(n) {
  (n.version++, Qf(), oa(n), fv?.(n));
}
var la = y(h({}, jt), {
  consumerIsAlwaysLive: !0,
  consumerAllowSignalWrites: !0,
  dirty: !0,
  kind: 'effect',
});
function ua(n) {
  if (((n.dirty = !1), n.version > 0 && !ui(n))) return;
  n.version++;
  let e = Ut(n);
  try {
    (n.cleanup(), n.fn());
  } finally {
    Tn(n, e);
  }
}
function Se(n) {
  return typeof n == 'function';
}
function ko(n) {
  let t = n((i) => {
    (Error.call(i), (i.stack = new Error().stack));
  });
  return (
    (t.prototype = Object.create(Error.prototype)),
    (t.prototype.constructor = t),
    t
  );
}
var Ao = ko(
  (n) =>
    function (t) {
      (n(this),
        (this.message = t
          ? `${t.length} errors occurred during unsubscription:
${t.map((i, o) => `${o + 1}) ${i.toString()}`).join(`
  `)}`
          : ''),
        (this.name = 'UnsubscriptionError'),
        (this.errors = t));
    },
);
function gi(n, e) {
  if (n) {
    let t = n.indexOf(e);
    0 <= t && n.splice(t, 1);
  }
}
var Ie = class n {
  constructor(e) {
    ((this.initialTeardown = e),
      (this.closed = !1),
      (this._parentage = null),
      (this._finalizers = null));
  }
  unsubscribe() {
    let e;
    if (!this.closed) {
      this.closed = !0;
      let { _parentage: t } = this;
      if (t)
        if (((this._parentage = null), Array.isArray(t)))
          for (let r of t) r.remove(this);
        else t.remove(this);
      let { initialTeardown: i } = this;
      if (Se(i))
        try {
          i();
        } catch (r) {
          e = r instanceof Ao ? r.errors : [r];
        }
      let { _finalizers: o } = this;
      if (o) {
        this._finalizers = null;
        for (let r of o)
          try {
            ig(r);
          } catch (s) {
            ((e = e ?? []),
              s instanceof Ao ? (e = [...e, ...s.errors]) : e.push(s));
          }
      }
      if (e) throw new Ao(e);
    }
  }
  add(e) {
    var t;
    if (e && e !== this)
      if (this.closed) ig(e);
      else {
        if (e instanceof n) {
          if (e.closed || e._hasParent(this)) return;
          e._addParent(this);
        }
        (this._finalizers =
          (t = this._finalizers) !== null && t !== void 0 ? t : []).push(e);
      }
  }
  _hasParent(e) {
    let { _parentage: t } = this;
    return t === e || (Array.isArray(t) && t.includes(e));
  }
  _addParent(e) {
    let { _parentage: t } = this;
    this._parentage = Array.isArray(t) ? (t.push(e), t) : t ? [t, e] : e;
  }
  _removeParent(e) {
    let { _parentage: t } = this;
    t === e ? (this._parentage = null) : Array.isArray(t) && gi(t, e);
  }
  remove(e) {
    let { _finalizers: t } = this;
    (t && gi(t, e), e instanceof n && e._removeParent(this));
  }
};
Ie.EMPTY = (() => {
  let n = new Ie();
  return ((n.closed = !0), n);
})();
var fa = Ie.EMPTY;
function Oo(n) {
  return (
    n instanceof Ie ||
    (n && 'closed' in n && Se(n.remove) && Se(n.add) && Se(n.unsubscribe))
  );
}
function ig(n) {
  Se(n) ? n() : n.unsubscribe();
}
var Ge = {
  onUnhandledError: null,
  onStoppedNotification: null,
  Promise: void 0,
  useDeprecatedSynchronousErrorHandling: !1,
  useDeprecatedNextContext: !1,
};
var xn = {
  setTimeout(n, e, ...t) {
    let { delegate: i } = xn;
    return i?.setTimeout ? i.setTimeout(n, e, ...t) : setTimeout(n, e, ...t);
  },
  clearTimeout(n) {
    let { delegate: e } = xn;
    return (e?.clearTimeout || clearTimeout)(n);
  },
  delegate: void 0,
};
function og(n) {
  xn.setTimeout(() => {
    let { onUnhandledError: e } = Ge;
    if (e) e(n);
    else throw n;
  });
}
function ga() {}
var rg = ha('C', void 0, void 0);
function sg(n) {
  return ha('E', void 0, n);
}
function ag(n) {
  return ha('N', n, void 0);
}
function ha(n, e, t) {
  return { kind: n, value: e, error: t };
}
var Gt = null;
function Pn(n) {
  if (Ge.useDeprecatedSynchronousErrorHandling) {
    let e = !Gt;
    if ((e && (Gt = { errorThrown: !1, error: null }), n(), e)) {
      let { errorThrown: t, error: i } = Gt;
      if (((Gt = null), t)) throw i;
    }
  } else n();
}
function dg(n) {
  Ge.useDeprecatedSynchronousErrorHandling &&
    Gt &&
    ((Gt.errorThrown = !0), (Gt.error = n));
}
var Wt = class extends Ie {
    constructor(e) {
      (super(),
        (this.isStopped = !1),
        e
          ? ((this.destination = e), Oo(e) && e.add(this))
          : (this.destination = mv));
    }
    static create(e, t, i) {
      return new Rn(e, t, i);
    }
    next(e) {
      this.isStopped ? ma(ag(e), this) : this._next(e);
    }
    error(e) {
      this.isStopped
        ? ma(sg(e), this)
        : ((this.isStopped = !0), this._error(e));
    }
    complete() {
      this.isStopped ? ma(rg, this) : ((this.isStopped = !0), this._complete());
    }
    unsubscribe() {
      this.closed ||
        ((this.isStopped = !0), super.unsubscribe(), (this.destination = null));
    }
    _next(e) {
      this.destination.next(e);
    }
    _error(e) {
      try {
        this.destination.error(e);
      } finally {
        this.unsubscribe();
      }
    }
    _complete() {
      try {
        this.destination.complete();
      } finally {
        this.unsubscribe();
      }
    }
  },
  hv = Function.prototype.bind;
function pa(n, e) {
  return hv.call(n, e);
}
var ya = class {
    constructor(e) {
      this.partialObserver = e;
    }
    next(e) {
      let { partialObserver: t } = this;
      if (t.next)
        try {
          t.next(e);
        } catch (i) {
          Fo(i);
        }
    }
    error(e) {
      let { partialObserver: t } = this;
      if (t.error)
        try {
          t.error(e);
        } catch (i) {
          Fo(i);
        }
      else Fo(e);
    }
    complete() {
      let { partialObserver: e } = this;
      if (e.complete)
        try {
          e.complete();
        } catch (t) {
          Fo(t);
        }
    }
  },
  Rn = class extends Wt {
    constructor(e, t, i) {
      super();
      let o;
      if (Se(e) || !e)
        o = { next: e ?? void 0, error: t ?? void 0, complete: i ?? void 0 };
      else {
        let r;
        this && Ge.useDeprecatedNextContext
          ? ((r = Object.create(e)),
            (r.unsubscribe = () => this.unsubscribe()),
            (o = {
              next: e.next && pa(e.next, r),
              error: e.error && pa(e.error, r),
              complete: e.complete && pa(e.complete, r),
            }))
          : (o = e);
      }
      this.destination = new ya(o);
    }
  };
function Fo(n) {
  Ge.useDeprecatedSynchronousErrorHandling ? dg(n) : og(n);
}
function pv(n) {
  throw n;
}
function ma(n, e) {
  let { onStoppedNotification: t } = Ge;
  t && xn.setTimeout(() => t(n, e));
}
var mv = { closed: !0, next: ga, error: pv, complete: ga };
var cg = (typeof Symbol == 'function' && Symbol.observable) || '@@observable';
function lg(n) {
  return n;
}
function ug(n) {
  return n.length === 0
    ? lg
    : n.length === 1
      ? n[0]
      : function (t) {
          return n.reduce((i, o) => o(i), t);
        };
}
var kn = (() => {
  class n {
    constructor(t) {
      t && (this._subscribe = t);
    }
    lift(t) {
      let i = new n();
      return ((i.source = this), (i.operator = t), i);
    }
    subscribe(t, i, o) {
      let r = vv(t) ? t : new Rn(t, i, o);
      return (
        Pn(() => {
          let { operator: s, source: a } = this;
          r.add(
            s ? s.call(r, a) : a ? this._subscribe(r) : this._trySubscribe(r),
          );
        }),
        r
      );
    }
    _trySubscribe(t) {
      try {
        return this._subscribe(t);
      } catch (i) {
        t.error(i);
      }
    }
    forEach(t, i) {
      return (
        (i = fg(i)),
        new i((o, r) => {
          let s = new Rn({
            next: (a) => {
              try {
                t(a);
              } catch (d) {
                (r(d), s.unsubscribe());
              }
            },
            error: r,
            complete: o,
          });
          this.subscribe(s);
        })
      );
    }
    _subscribe(t) {
      var i;
      return (i = this.source) === null || i === void 0
        ? void 0
        : i.subscribe(t);
    }
    [cg]() {
      return this;
    }
    pipe(...t) {
      return ug(t)(this);
    }
    toPromise(t) {
      return (
        (t = fg(t)),
        new t((i, o) => {
          let r;
          this.subscribe(
            (s) => (r = s),
            (s) => o(s),
            () => i(r),
          );
        })
      );
    }
  }
  return ((n.create = (e) => new n(e)), n);
})();
function fg(n) {
  var e;
  return (e = n ?? Ge.Promise) !== null && e !== void 0 ? e : Promise;
}
function yv(n) {
  return n && Se(n.next) && Se(n.error) && Se(n.complete);
}
function vv(n) {
  return (n && n instanceof Wt) || (yv(n) && Oo(n));
}
function wv(n) {
  return Se(n?.lift);
}
function gg(n) {
  return (e) => {
    if (wv(e))
      return e.lift(function (t) {
        try {
          return n(t, this);
        } catch (i) {
          this.error(i);
        }
      });
    throw new TypeError('Unable to lift unknown Observable type');
  };
}
function hg(n, e, t, i, o) {
  return new va(n, e, t, i, o);
}
var va = class extends Wt {
  constructor(e, t, i, o, r, s) {
    (super(e),
      (this.onFinalize = r),
      (this.shouldUnsubscribe = s),
      (this._next = t
        ? function (a) {
            try {
              t(a);
            } catch (d) {
              e.error(d);
            }
          }
        : super._next),
      (this._error = o
        ? function (a) {
            try {
              o(a);
            } catch (d) {
              e.error(d);
            } finally {
              this.unsubscribe();
            }
          }
        : super._error),
      (this._complete = i
        ? function () {
            try {
              i();
            } catch (a) {
              e.error(a);
            } finally {
              this.unsubscribe();
            }
          }
        : super._complete));
  }
  unsubscribe() {
    var e;
    if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
      let { closed: t } = this;
      (super.unsubscribe(),
        !t && ((e = this.onFinalize) === null || e === void 0 || e.call(this)));
    }
  }
};
var pg = ko(
  (n) =>
    function () {
      (n(this),
        (this.name = 'ObjectUnsubscribedError'),
        (this.message = 'object unsubscribed'));
    },
);
var yt = (() => {
    class n extends kn {
      constructor() {
        (super(),
          (this.closed = !1),
          (this.currentObservers = null),
          (this.observers = []),
          (this.isStopped = !1),
          (this.hasError = !1),
          (this.thrownError = null));
      }
      lift(t) {
        let i = new Lo(this, this);
        return ((i.operator = t), i);
      }
      _throwIfClosed() {
        if (this.closed) throw new pg();
      }
      next(t) {
        Pn(() => {
          if ((this._throwIfClosed(), !this.isStopped)) {
            this.currentObservers ||
              (this.currentObservers = Array.from(this.observers));
            for (let i of this.currentObservers) i.next(t);
          }
        });
      }
      error(t) {
        Pn(() => {
          if ((this._throwIfClosed(), !this.isStopped)) {
            ((this.hasError = this.isStopped = !0), (this.thrownError = t));
            let { observers: i } = this;
            for (; i.length;) i.shift().error(t);
          }
        });
      }
      complete() {
        Pn(() => {
          if ((this._throwIfClosed(), !this.isStopped)) {
            this.isStopped = !0;
            let { observers: t } = this;
            for (; t.length;) t.shift().complete();
          }
        });
      }
      unsubscribe() {
        ((this.isStopped = this.closed = !0),
          (this.observers = this.currentObservers = null));
      }
      get observed() {
        var t;
        return (
          ((t = this.observers) === null || t === void 0 ? void 0 : t.length) >
          0
        );
      }
      _trySubscribe(t) {
        return (this._throwIfClosed(), super._trySubscribe(t));
      }
      _subscribe(t) {
        return (
          this._throwIfClosed(),
          this._checkFinalizedStatuses(t),
          this._innerSubscribe(t)
        );
      }
      _innerSubscribe(t) {
        let { hasError: i, isStopped: o, observers: r } = this;
        return i || o
          ? fa
          : ((this.currentObservers = null),
            r.push(t),
            new Ie(() => {
              ((this.currentObservers = null), gi(r, t));
            }));
      }
      _checkFinalizedStatuses(t) {
        let { hasError: i, thrownError: o, isStopped: r } = this;
        i ? t.error(o) : r && t.complete();
      }
      asObservable() {
        let t = new kn();
        return ((t.source = this), t);
      }
    }
    return ((n.create = (e, t) => new Lo(e, t)), n);
  })(),
  Lo = class extends yt {
    constructor(e, t) {
      (super(), (this.destination = e), (this.source = t));
    }
    next(e) {
      var t, i;
      (i =
        (t = this.destination) === null || t === void 0 ? void 0 : t.next) ===
        null ||
        i === void 0 ||
        i.call(t, e);
    }
    error(e) {
      var t, i;
      (i =
        (t = this.destination) === null || t === void 0 ? void 0 : t.error) ===
        null ||
        i === void 0 ||
        i.call(t, e);
    }
    complete() {
      var e, t;
      (t =
        (e = this.destination) === null || e === void 0
          ? void 0
          : e.complete) === null ||
        t === void 0 ||
        t.call(e);
    }
    _subscribe(e) {
      var t, i;
      return (i =
        (t = this.source) === null || t === void 0
          ? void 0
          : t.subscribe(e)) !== null && i !== void 0
        ? i
        : fa;
    }
  };
var hi = class extends yt {
  constructor(e) {
    (super(), (this._value = e));
  }
  get value() {
    return this.getValue();
  }
  _subscribe(e) {
    let t = super._subscribe(e);
    return (!t.closed && e.next(this._value), t);
  }
  getValue() {
    let { hasError: e, thrownError: t, _value: i } = this;
    if (e) throw t;
    return (this._throwIfClosed(), i);
  }
  next(e) {
    super.next((this._value = e));
  }
};
function wa(n, e) {
  return gg((t, i) => {
    let o = 0;
    t.subscribe(
      hg(i, (r) => {
        i.next(n.call(e, r, o++));
      }),
    );
  });
}
var Da;
function Bo() {
  return Da;
}
function dt(n) {
  let e = Da;
  return ((Da = n), e);
}
var mg = Symbol('NotFound');
function An(n) {
  return n === mg || n?.name === '\u0275NotFound';
}
function yg(n) {
  let e = M(null);
  try {
    return n();
  } finally {
    M(e);
  }
}
var ka =
    'https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss',
  N = class extends Error {
    code;
    constructor(e, t) {
      (super(Go(e, t)), (this.code = e));
    }
  };
function Dv(n) {
  return `NG0${Math.abs(n)}`;
}
function Go(n, e) {
  return `${Dv(n)}${e ? ': ' + e : ''}`;
}
function H(n) {
  for (let e in n) if (n[e] === H) return e;
  throw Error('');
}
function Cg(n, e) {
  for (let t in e) e.hasOwnProperty(t) && !n.hasOwnProperty(t) && (n[t] = e[t]);
}
function Ei(n) {
  if (typeof n == 'string') return n;
  if (Array.isArray(n)) return `[${n.map(Ei).join(', ')}]`;
  if (n == null) return '' + n;
  let e = n.overriddenName || n.name;
  if (e) return `${e}`;
  let t = n.toString();
  if (t == null) return '' + t;
  let i = t.indexOf(`
`);
  return i >= 0 ? t.slice(0, i) : t;
}
function Wo(n, e) {
  return n ? (e ? `${n} ${e}` : n) : e || '';
}
var Ev = H({ __forward_ref__: H });
function qo(n) {
  return ((n.__forward_ref__ = qo), n);
}
function se(n) {
  return Aa(n) ? n() : n;
}
function Aa(n) {
  return (
    typeof n == 'function' && n.hasOwnProperty(Ev) && n.__forward_ref__ === qo
  );
}
function I(n) {
  return {
    token: n.token,
    providedIn: n.providedIn || null,
    factory: n.factory,
    value: void 0,
  };
}
function Ci(n) {
  return { providers: n.providers || [], imports: n.imports || [] };
}
function Zo(n) {
  return Cv(n, Yo);
}
function Cv(n, e) {
  return (n.hasOwnProperty(e) && n[e]) || null;
}
function Iv(n) {
  let e = n?.[Yo] ?? null;
  return e || null;
}
function Ca(n) {
  return n && n.hasOwnProperty(zo) ? n[zo] : null;
}
var Yo = H({ ɵprov: H }),
  zo = H({ ɵinj: H }),
  A = class {
    _desc;
    ngMetadataName = 'InjectionToken';
    ɵprov;
    constructor(e, t) {
      ((this._desc = e),
        (this.ɵprov = void 0),
        typeof t == 'number'
          ? (this.__NG_ELEMENT_ID__ = t)
          : t !== void 0 &&
            (this.ɵprov = I({
              token: this,
              providedIn: t.providedIn || 'root',
              factory: t.factory,
            })));
    }
    get multi() {
      return this;
    }
    toString() {
      return `InjectionToken ${this._desc}`;
    }
  };
function Oa(n) {
  return n && !!n.ɵproviders;
}
var Ii = H({ ɵcmp: H }),
  Mi = H({ ɵdir: H }),
  Fa = H({ ɵpipe: H }),
  La = H({ ɵmod: H }),
  mi = H({ ɵfac: H }),
  Jt = H({ __NG_ELEMENT_ID__: H }),
  vg = H({ __NG_ENV_ID__: H });
function Ig(n) {
  return (Ko(n, '@NgModule'), n[La] || null);
}
function en(n) {
  return (Ko(n, '@Component'), n[Ii] || null);
}
function Qo(n) {
  return (Ko(n, '@Directive'), n[Mi] || null);
}
function Mg(n) {
  return (Ko(n, '@Pipe'), n[Fa] || null);
}
function Ko(n, e) {
  if (n == null) throw new N(-919, !1);
}
function Ba(n) {
  return typeof n == 'string' ? n : n == null ? '' : String(n);
}
var bg = H({ ngErrorCode: H }),
  Mv = H({ ngErrorMessage: H }),
  bv = H({ ngTokenPath: H });
function Ha(n, e) {
  return Sg('', -200, e);
}
function Xo(n, e) {
  throw new N(-201, !1);
}
function Sg(n, e, t) {
  let i = new N(e, n);
  return ((i[bg] = e), (i[Mv] = n), t && (i[bv] = t), i);
}
function Sv(n) {
  return n[bg];
}
var Ia;
function Tg() {
  return Ia;
}
function Pe(n) {
  let e = Ia;
  return ((Ia = n), e);
}
function za(n, e, t) {
  let i = Zo(n);
  if (i && i.providedIn == 'root')
    return i.value === void 0 ? (i.value = i.factory()) : i.value;
  if (t & 8) return null;
  if (e !== void 0) return e;
  Xo(n, '');
}
var Tv = {},
  qt = Tv,
  _v = '__NG_DI_FLAG__',
  Ma = class {
    injector;
    constructor(e) {
      this.injector = e;
    }
    retrieve(e, t) {
      let i = Zt(t) || 0;
      try {
        return this.injector.get(e, i & 8 ? null : qt, i);
      } catch (o) {
        if (An(o)) return o;
        throw o;
      }
    }
  };
function Nv(n, e = 0) {
  let t = Bo();
  if (t === void 0) throw new N(-203, !1);
  if (t === null) return za(n, void 0, e);
  {
    let i = xv(e),
      o = t.retrieve(n, i);
    if (An(o)) {
      if (i.optional) return null;
      throw o;
    }
    return o;
  }
}
function V(n, e = 0) {
  return (Tg() || Nv)(se(n), e);
}
function m(n, e) {
  return V(n, Zt(e));
}
function Zt(n) {
  return typeof n > 'u' || typeof n == 'number'
    ? n
    : 0 | (n.optional && 8) | (n.host && 1) | (n.self && 2) | (n.skipSelf && 4);
}
function xv(n) {
  return {
    optional: !!(n & 8),
    host: !!(n & 1),
    self: !!(n & 2),
    skipSelf: !!(n & 4),
  };
}
function ba(n) {
  let e = [];
  for (let t = 0; t < n.length; t++) {
    let i = se(n[t]);
    if (Array.isArray(i)) {
      if (i.length === 0) throw new N(900, !1);
      let o,
        r = 0;
      for (let s = 0; s < i.length; s++) {
        let a = i[s],
          d = Pv(a);
        typeof d == 'number' ? (d === -1 ? (o = a.token) : (r |= d)) : (o = a);
      }
      e.push(V(o, r));
    } else e.push(V(i));
  }
  return e;
}
function Pv(n) {
  return n[_v];
}
function Yt(n, e) {
  let t = n.hasOwnProperty(mi);
  return t ? n[mi] : null;
}
function _g(n, e, t) {
  if (n.length !== e.length) return !1;
  for (let i = 0; i < n.length; i++) {
    let o = n[i],
      r = e[i];
    if ((t && ((o = t(o)), (r = t(r))), r !== o)) return !1;
  }
  return !0;
}
function Ng(n) {
  return n.flat(Number.POSITIVE_INFINITY);
}
function Jo(n, e) {
  n.forEach((t) => (Array.isArray(t) ? Jo(t, e) : e(t)));
}
function Va(n, e, t) {
  e >= n.length ? n.push(t) : n.splice(e, 0, t);
}
function bi(n, e) {
  return e >= n.length - 1 ? n.pop() : n.splice(e, 1)[0];
}
function xg(n, e) {
  let t = [];
  for (let i = 0; i < n; i++) t.push(e);
  return t;
}
function Pg(n, e, t, i) {
  let o = n.length;
  if (o == e) n.push(t, i);
  else if (o === 1) (n.push(i, n[0]), (n[0] = t));
  else {
    for (o--, n.push(n[o - 1], n[o]); o > e;) {
      let r = o - 2;
      ((n[o] = n[r]), o--);
    }
    ((n[e] = t), (n[e + 1] = i));
  }
}
function er(n, e, t) {
  let i = Fn(n, e);
  return (i >= 0 ? (n[i | 1] = t) : ((i = ~i), Pg(n, i, e, t)), i);
}
function tr(n, e) {
  let t = Fn(n, e);
  if (t >= 0) return n[t | 1];
}
function Fn(n, e) {
  return Rv(n, e, 1);
}
function Rv(n, e, t) {
  let i = 0,
    o = n.length >> t;
  for (; o !== i;) {
    let r = i + ((o - i) >> 1),
      s = n[r << t];
    if (e === s) return r << t;
    s > e ? (o = r) : (i = r + 1);
  }
  return ~(o << t);
}
var qe = {},
  Ee = [],
  Si = new A(''),
  ja = new A('', -1),
  Ua = new A(''),
  yi = class {
    get(e, t = qt) {
      if (t === qt) {
        let o = Sg('', -201);
        throw ((o.name = '\u0275NotFound'), o);
      }
      return t;
    }
  };
function $a(n) {
  return { ɵproviders: n };
}
function Rg(...n) {
  return { ɵproviders: Ga(!0, n), ɵfromNgModule: !0 };
}
function Ga(n, ...e) {
  let t = [],
    i = new Set(),
    o,
    r = (s) => {
      t.push(s);
    };
  return (
    Jo(e, (s) => {
      let a = s;
      Vo(a, r, [], i) && ((o ||= []), o.push(a));
    }),
    o !== void 0 && kg(o, r),
    t
  );
}
function kg(n, e) {
  for (let t = 0; t < n.length; t++) {
    let { ngModule: i, providers: o } = n[t];
    Wa(o, (r) => {
      e(r, i);
    });
  }
}
function Vo(n, e, t, i) {
  if (((n = se(n)), !n)) return !1;
  let o = null,
    r = Ca(n),
    s = !r && en(n);
  if (!r && !s) {
    let d = n.ngModule;
    if (((r = Ca(d)), r)) o = d;
    else return !1;
  } else {
    if (s && !s.standalone) return !1;
    o = n;
  }
  let a = i.has(o);
  if (s) {
    if (a) return !1;
    if ((i.add(o), s.dependencies)) {
      let d =
        typeof s.dependencies == 'function' ? s.dependencies() : s.dependencies;
      for (let c of d) Vo(c, e, t, i);
    }
  } else if (r) {
    if (r.imports != null && !a) {
      i.add(o);
      let c;
      (Jo(r.imports, (l) => {
        Vo(l, e, t, i) && ((c ||= []), c.push(l));
      }),
        c !== void 0 && kg(c, e));
    }
    if (!a) {
      let c = Yt(o) || (() => new o());
      (e({ provide: o, useFactory: c, deps: Ee }, o),
        e({ provide: Ua, useValue: o, multi: !0 }, o),
        e({ provide: Si, useValue: () => V(o), multi: !0 }, o));
    }
    let d = r.providers;
    if (d != null && !a) {
      let c = n;
      Wa(d, (l) => {
        e(l, c);
      });
    }
  } else return !1;
  return o !== n && n.providers !== void 0;
}
function Wa(n, e) {
  for (let t of n)
    (Oa(t) && (t = t.ɵproviders), Array.isArray(t) ? Wa(t, e) : e(t));
}
var kv = H({ provide: String, useValue: H });
function Ag(n) {
  return n !== null && typeof n == 'object' && kv in n;
}
function Av(n) {
  return !!(n && n.useExisting);
}
function Ov(n) {
  return !!(n && n.useFactory);
}
function Qt(n) {
  return typeof n == 'function';
}
function Og(n) {
  return !!n.useClass;
}
var Ti = new A(''),
  Ho = {},
  wg = {},
  Ea;
function _i() {
  return (Ea === void 0 && (Ea = new yi()), Ea);
}
var Fe = class {},
  Kt = class extends Fe {
    parent;
    source;
    scopes;
    records = new Map();
    _ngOnDestroyHooks = new Set();
    _onDestroyHooks = [];
    get destroyed() {
      return this._destroyed;
    }
    _destroyed = !1;
    injectorDefTypes;
    constructor(e, t, i, o) {
      (super(),
        (this.parent = t),
        (this.source = i),
        (this.scopes = o),
        Ta(e, (s) => this.processProvider(s)),
        this.records.set(ja, On(void 0, this)),
        o.has('environment') && this.records.set(Fe, On(void 0, this)));
      let r = this.records.get(Ti);
      (r != null && typeof r.value == 'string' && this.scopes.add(r.value),
        (this.injectorDefTypes = new Set(this.get(Ua, Ee, { self: !0 }))));
    }
    retrieve(e, t) {
      let i = Zt(t) || 0;
      try {
        return this.get(e, qt, i);
      } catch (o) {
        if (An(o)) return o;
        throw o;
      }
    }
    destroy() {
      (pi(this), (this._destroyed = !0));
      let e = M(null);
      try {
        for (let i of this._ngOnDestroyHooks) i.ngOnDestroy();
        let t = this._onDestroyHooks;
        this._onDestroyHooks = [];
        for (let i of t) i();
      } finally {
        (this.records.clear(),
          this._ngOnDestroyHooks.clear(),
          this.injectorDefTypes.clear(),
          M(e));
      }
    }
    onDestroy(e) {
      return (
        pi(this),
        this._onDestroyHooks.push(e),
        () => this.removeOnDestroy(e)
      );
    }
    runInContext(e) {
      pi(this);
      let t = dt(this),
        i = Pe(void 0),
        o;
      try {
        return e();
      } finally {
        (dt(t), Pe(i));
      }
    }
    get(e, t = qt, i) {
      if ((pi(this), e.hasOwnProperty(vg))) return e[vg](this);
      let o = Zt(i),
        r,
        s = dt(this),
        a = Pe(void 0);
      try {
        if (!(o & 4)) {
          let c = this.records.get(e);
          if (c === void 0) {
            let l = zv(e) && Zo(e);
            (l && this.injectableDefInScope(l)
              ? (c = On(Sa(e), Ho))
              : (c = null),
              this.records.set(e, c));
          }
          if (c != null) return this.hydrate(e, c, o);
        }
        let d = o & 2 ? _i() : this.parent;
        return ((t = o & 8 && t === qt ? null : t), d.get(e, t));
      } catch (d) {
        let c = Sv(d);
        throw c === -200 || c === -201 ? new N(c, null) : d;
      } finally {
        (Pe(a), dt(s));
      }
    }
    resolveInjectorInitializers() {
      let e = M(null),
        t = dt(this),
        i = Pe(void 0),
        o;
      try {
        let r = this.get(Si, Ee, { self: !0 });
        for (let s of r) s();
      } finally {
        (dt(t), Pe(i), M(e));
      }
    }
    toString() {
      return 'R3Injector[...]';
    }
    processProvider(e) {
      e = se(e);
      let t = Qt(e) ? e : se(e && e.provide),
        i = Lv(e);
      if (!Qt(e) && e.multi === !0) {
        let o = this.records.get(t);
        (o ||
          ((o = On(void 0, Ho, !0)),
          (o.factory = () => ba(o.multi)),
          this.records.set(t, o)),
          (t = e),
          o.multi.push(e));
      }
      this.records.set(t, i);
    }
    hydrate(e, t, i) {
      let o = M(null);
      try {
        if (t.value === wg) throw Ha('');
        return (
          t.value === Ho && ((t.value = wg), (t.value = t.factory(void 0, i))),
          typeof t.value == 'object' &&
            t.value &&
            Hv(t.value) &&
            this._ngOnDestroyHooks.add(t.value),
          t.value
        );
      } finally {
        M(o);
      }
    }
    injectableDefInScope(e) {
      if (!e.providedIn) return !1;
      let t = se(e.providedIn);
      return typeof t == 'string'
        ? t === 'any' || this.scopes.has(t)
        : this.injectorDefTypes.has(t);
    }
    removeOnDestroy(e) {
      let t = this._onDestroyHooks.indexOf(e);
      t !== -1 && this._onDestroyHooks.splice(t, 1);
    }
  };
function Sa(n) {
  let e = Zo(n),
    t = e !== null ? e.factory : Yt(n);
  if (t !== null) return t;
  if (n instanceof A) throw new N(-204, !1);
  if (n instanceof Function) return Fv(n);
  throw new N(-204, !1);
}
function Fv(n) {
  if (n.length > 0) throw new N(-204, !1);
  let t = Iv(n);
  return t !== null ? () => t.factory(n) : () => new n();
}
function Lv(n) {
  if (Ag(n)) return On(void 0, n.useValue);
  {
    let e = qa(n);
    return On(e, Ho);
  }
}
function qa(n, e, t) {
  let i;
  if (Qt(n)) {
    let o = se(n);
    return Yt(o) || Sa(o);
  } else if (Ag(n)) i = () => se(n.useValue);
  else if (Ov(n)) i = () => n.useFactory(...ba(n.deps || []));
  else if (Av(n))
    i = (o, r) => V(se(n.useExisting), r !== void 0 && r & 8 ? 8 : void 0);
  else {
    let o = se(n && (n.useClass || n.provide));
    if (Bv(n)) i = () => new o(...ba(n.deps));
    else return Yt(o) || Sa(o);
  }
  return i;
}
function pi(n) {
  if (n.destroyed) throw new N(-205, !1);
}
function On(n, e, t = !1) {
  return { factory: n, value: e, multi: t ? [] : void 0 };
}
function Bv(n) {
  return !!n.deps;
}
function Hv(n) {
  return (
    n !== null && typeof n == 'object' && typeof n.ngOnDestroy == 'function'
  );
}
function zv(n) {
  return (
    typeof n == 'function' ||
    (typeof n == 'object' && n.ngMetadataName === 'InjectionToken')
  );
}
function Ta(n, e) {
  for (let t of n)
    Array.isArray(t) ? Ta(t, e) : t && Oa(t) ? Ta(t.ɵproviders, e) : e(t);
}
function tn(n, e) {
  let t;
  n instanceof Kt ? (pi(n), (t = n)) : (t = new Ma(n));
  let i,
    o = dt(t),
    r = Pe(void 0);
  try {
    return e();
  } finally {
    (dt(o), Pe(r));
  }
}
function Fg() {
  return Tg() !== void 0 || Bo() != null;
}
var Ze = 0,
  b = 1,
  S = 2,
  ae = 3,
  Le = 4,
  Me = 5,
  nn = 6,
  Ln = 7,
  ne = 8,
  Dt = 9,
  ct = 10,
  G = 11,
  Bn = 12,
  Za = 13,
  on = 14,
  _e = 15,
  xt = 16,
  rn = 17,
  lt = 18,
  Et = 19,
  Ya = 20,
  vt = 21,
  nr = 22,
  _t = 23,
  Re = 24,
  ir = 25,
  Pt = 26,
  K = 27,
  Lg = 1,
  Qa = 6,
  Rt = 7,
  Ni = 8,
  sn = 9,
  X = 10;
function Ct(n) {
  return Array.isArray(n) && typeof n[Lg] == 'object';
}
function Ye(n) {
  return Array.isArray(n) && n[Lg] === !0;
}
function Ka(n) {
  return (n.flags & 4) !== 0;
}
function kt(n) {
  return n.componentOffset > -1;
}
function Hn(n) {
  return (n.flags & 1) === 1;
}
function Qe(n) {
  return !!n.template;
}
function zn(n) {
  return (n[S] & 512) !== 0;
}
function an(n) {
  return (n[S] & 256) === 256;
}
var Xa = 'svg',
  Bg = 'math';
function Be(n) {
  for (; Array.isArray(n);) n = n[Ze];
  return n;
}
function Ja(n, e) {
  return Be(e[n]);
}
function Ke(n, e) {
  return Be(e[n.index]);
}
function or(n, e) {
  return n.data[e];
}
function Hg(n, e) {
  return n[e];
}
function rr(n, e, t, i) {
  (t >= n.data.length && ((n.data[t] = null), (n.blueprint[t] = null)),
    (e[t] = i));
}
function Xe(n, e) {
  let t = e[n];
  return Ct(t) ? t : t[Ze];
}
function sr(n) {
  return (n[S] & 128) === 128;
}
function zg(n) {
  return Ye(n[ae]);
}
function He(n, e) {
  return e == null ? null : n[e];
}
function ed(n) {
  n[rn] = 0;
}
function td(n) {
  n[S] & 1024 || ((n[S] |= 1024), sr(n) && Vn(n));
}
function Vg(n, e) {
  for (; n > 0;) ((e = e[on]), n--);
  return e;
}
function xi(n) {
  return !!(n[S] & 9216 || n[Re]?.dirty);
}
function ar(n) {
  (n[ct].changeDetectionScheduler?.notify(8),
    n[S] & 64 && (n[S] |= 1024),
    xi(n) && Vn(n));
}
function Vn(n) {
  n[ct].changeDetectionScheduler?.notify(0);
  let e = Nt(n);
  for (; e !== null && !(e[S] & 8192 || ((e[S] |= 8192), !sr(e)));) e = Nt(e);
}
function nd(n, e) {
  if (an(n)) throw new N(911, !1);
  (n[vt] === null && (n[vt] = []), n[vt].push(e));
}
function jg(n, e) {
  if (n[vt] === null) return;
  let t = n[vt].indexOf(e);
  t !== -1 && n[vt].splice(t, 1);
}
function Nt(n) {
  let e = n[ae];
  return Ye(e) ? e[ae] : e;
}
function id(n) {
  return (n[Ln] ??= []);
}
function od(n) {
  return (n.cleanup ??= []);
}
function Ug(n, e, t, i) {
  let o = id(e);
  (o.push(t), n.firstCreatePass && od(n).push(i, o.length - 1));
}
var x = { lFrame: th(null), bindingsEnabled: !0, skipHydrationRootTNode: null };
var _a = !1;
function $g() {
  return x.lFrame.elementDepthCount;
}
function Gg() {
  x.lFrame.elementDepthCount++;
}
function rd() {
  x.lFrame.elementDepthCount--;
}
function dr() {
  return x.bindingsEnabled;
}
function sd() {
  return x.skipHydrationRootTNode !== null;
}
function ad(n) {
  return x.skipHydrationRootTNode === n;
}
function dd() {
  x.skipHydrationRootTNode = null;
}
function T() {
  return x.lFrame.lView;
}
function J() {
  return x.lFrame.tView;
}
function be() {
  let n = cd();
  for (; n !== null && n.type === 64;) n = n.parent;
  return n;
}
function cd() {
  return x.lFrame.currentTNode;
}
function Wg() {
  let n = x.lFrame,
    e = n.currentTNode;
  return n.isParent ? e : e.parent;
}
function dn(n, e) {
  let t = x.lFrame;
  ((t.currentTNode = n), (t.isParent = e));
}
function ld() {
  return x.lFrame.isParent;
}
function ud() {
  x.lFrame.isParent = !1;
}
function qg() {
  return x.lFrame.contextLView;
}
function fd() {
  return _a;
}
function vi(n) {
  let e = _a;
  return ((_a = n), e);
}
function gd() {
  let n = x.lFrame,
    e = n.bindingRootIndex;
  return (e === -1 && (e = n.bindingRootIndex = n.tView.bindingStartIndex), e);
}
function Zg(n) {
  return (x.lFrame.bindingIndex = n);
}
function cn() {
  return x.lFrame.bindingIndex++;
}
function hd(n) {
  let e = x.lFrame,
    t = e.bindingIndex;
  return ((e.bindingIndex = e.bindingIndex + n), t);
}
function Yg() {
  return x.lFrame.inI18n;
}
function Qg(n, e) {
  let t = x.lFrame;
  ((t.bindingIndex = t.bindingRootIndex = n), cr(e));
}
function Kg() {
  return x.lFrame.currentDirectiveIndex;
}
function cr(n) {
  x.lFrame.currentDirectiveIndex = n;
}
function Xg(n) {
  let e = x.lFrame.currentDirectiveIndex;
  return e === -1 ? null : n[e];
}
function Jg() {
  return x.lFrame.currentQueryIndex;
}
function lr(n) {
  x.lFrame.currentQueryIndex = n;
}
function Vv(n) {
  let e = n[b];
  return e.type === 2 ? e.declTNode : e.type === 1 ? n[Me] : null;
}
function pd(n, e, t) {
  if (t & 4) {
    let o = e,
      r = n;
    for (; (o = o.parent), o === null && !(t & 1);)
      if (((o = Vv(r)), o === null || ((r = r[on]), o.type & 10))) break;
    if (o === null) return !1;
    ((e = o), (n = r));
  }
  let i = (x.lFrame = eh());
  return ((i.currentTNode = e), (i.lView = n), !0);
}
function ur(n) {
  let e = eh(),
    t = n[b];
  ((x.lFrame = e),
    (e.currentTNode = t.firstChild),
    (e.lView = n),
    (e.tView = t),
    (e.contextLView = n),
    (e.bindingIndex = t.bindingStartIndex),
    (e.inI18n = !1));
}
function eh() {
  let n = x.lFrame,
    e = n === null ? null : n.child;
  return e === null ? th(n) : e;
}
function th(n) {
  let e = {
    currentTNode: null,
    isParent: !0,
    lView: null,
    tView: null,
    selectedIndex: -1,
    contextLView: null,
    elementDepthCount: 0,
    currentNamespace: null,
    currentDirectiveIndex: -1,
    bindingRootIndex: -1,
    bindingIndex: -1,
    currentQueryIndex: 0,
    parent: n,
    child: null,
    inI18n: !1,
  };
  return (n !== null && (n.child = e), e);
}
function nh() {
  let n = x.lFrame;
  return ((x.lFrame = n.parent), (n.currentTNode = null), (n.lView = null), n);
}
var md = nh;
function fr() {
  let n = nh();
  ((n.isParent = !0),
    (n.tView = null),
    (n.selectedIndex = -1),
    (n.contextLView = null),
    (n.elementDepthCount = 0),
    (n.currentDirectiveIndex = -1),
    (n.currentNamespace = null),
    (n.bindingRootIndex = -1),
    (n.bindingIndex = -1),
    (n.currentQueryIndex = 0));
}
function ih(n) {
  return (x.lFrame.contextLView = Vg(n, x.lFrame.contextLView))[ne];
}
function ut() {
  return x.lFrame.selectedIndex;
}
function At(n) {
  x.lFrame.selectedIndex = n;
}
function gr() {
  let n = x.lFrame;
  return or(n.tView, n.selectedIndex);
}
function de() {
  x.lFrame.currentNamespace = Xa;
}
function yd() {
  return x.lFrame.currentNamespace;
}
var oh = !0;
function hr() {
  return oh;
}
function Pi(n) {
  oh = n;
}
function Na(n, e = null, t = null, i) {
  let o = vd(n, e, t, i);
  return (o.resolveInjectorInitializers(), o);
}
function vd(n, e = null, t = null, i, o = new Set()) {
  let r = [t || Ee, Rg(n)],
    s;
  return new Kt(r, e || _i(), s || null, o);
}
var We = class n {
    static THROW_IF_NOT_FOUND = qt;
    static NULL = new yi();
    static create(e, t) {
      if (Array.isArray(e)) return Na({ name: '' }, t, e, '');
      {
        let i = e.name ?? '';
        return Na({ name: i }, e.parent, e.providers, i);
      }
    }
    static ɵprov = I({ token: n, providedIn: 'any', factory: () => V(ja) });
    static __NG_ELEMENT_ID__ = -1;
  },
  Je = new A(''),
  It = (() => {
    class n {
      static __NG_ELEMENT_ID__ = jv;
      static __NG_ENV_ID__ = (t) => t;
    }
    return n;
  })(),
  jo = class extends It {
    _lView;
    constructor(e) {
      (super(), (this._lView = e));
    }
    get destroyed() {
      return an(this._lView);
    }
    onDestroy(e) {
      let t = this._lView;
      return (nd(t, e), () => jg(t, e));
    }
  };
function jv() {
  return new jo(T());
}
var rh = !1,
  sh = new A(''),
  jn = (() => {
    class n {
      taskId = 0;
      pendingTasks = new Set();
      destroyed = !1;
      pendingTask = new hi(!1);
      debugTaskTracker = m(sh, { optional: !0 });
      get hasPendingTasks() {
        return this.destroyed ? !1 : this.pendingTask.value;
      }
      get hasPendingTasksObservable() {
        return this.destroyed
          ? new kn((t) => {
              (t.next(!1), t.complete());
            })
          : this.pendingTask;
      }
      add() {
        !this.hasPendingTasks && !this.destroyed && this.pendingTask.next(!0);
        let t = this.taskId++;
        return (this.pendingTasks.add(t), this.debugTaskTracker?.add(t), t);
      }
      has(t) {
        return this.pendingTasks.has(t);
      }
      remove(t) {
        (this.pendingTasks.delete(t),
          this.debugTaskTracker?.remove(t),
          this.pendingTasks.size === 0 &&
            this.hasPendingTasks &&
            this.pendingTask.next(!1));
      }
      ngOnDestroy() {
        (this.pendingTasks.clear(),
          this.hasPendingTasks && this.pendingTask.next(!1),
          (this.destroyed = !0),
          this.pendingTask.unsubscribe());
      }
      static ɵprov = I({
        token: n,
        providedIn: 'root',
        factory: () => new n(),
      });
    }
    return n;
  })(),
  xa = class extends yt {
    __isAsync;
    destroyRef = void 0;
    pendingTasks = void 0;
    constructor(e = !1) {
      (super(),
        (this.__isAsync = e),
        Fg() &&
          ((this.destroyRef = m(It, { optional: !0 }) ?? void 0),
          (this.pendingTasks = m(jn, { optional: !0 }) ?? void 0)));
    }
    emit(e) {
      let t = M(null);
      try {
        super.next(e);
      } finally {
        M(t);
      }
    }
    subscribe(e, t, i) {
      let o = e,
        r = t || (() => null),
        s = i;
      if (e && typeof e == 'object') {
        let d = e;
        ((o = d.next?.bind(d)),
          (r = d.error?.bind(d)),
          (s = d.complete?.bind(d)));
      }
      this.__isAsync &&
        ((r = this.wrapInTimeout(r)),
        o && (o = this.wrapInTimeout(o)),
        s && (s = this.wrapInTimeout(s)));
      let a = super.subscribe({ next: o, error: r, complete: s });
      return (e instanceof Ie && e.add(a), a);
    }
    wrapInTimeout(e) {
      return (t) => {
        let i = this.pendingTasks?.add();
        setTimeout(() => {
          try {
            e(t);
          } finally {
            i !== void 0 && this.pendingTasks?.remove(i);
          }
        });
      };
    }
  },
  F = xa;
function Uo(...n) {}
function wd(n) {
  let e, t;
  function i() {
    n = Uo;
    try {
      (t !== void 0 &&
        typeof cancelAnimationFrame == 'function' &&
        cancelAnimationFrame(t),
        e !== void 0 && clearTimeout(e));
    } catch {}
  }
  return (
    (e = setTimeout(() => {
      (n(), i());
    })),
    typeof requestAnimationFrame == 'function' &&
      (t = requestAnimationFrame(() => {
        (n(), i());
      })),
    () => i()
  );
}
function ah(n) {
  return (
    queueMicrotask(() => n()),
    () => {
      n = Uo;
    }
  );
}
var Dd = 'isAngularZone',
  wi = Dd + '_ID',
  Uv = 0,
  Te = class n {
    hasPendingMacrotasks = !1;
    hasPendingMicrotasks = !1;
    isStable = !0;
    onUnstable = new F(!1);
    onMicrotaskEmpty = new F(!1);
    onStable = new F(!1);
    onError = new F(!1);
    constructor(e) {
      let {
        enableLongStackTrace: t = !1,
        shouldCoalesceEventChangeDetection: i = !1,
        shouldCoalesceRunChangeDetection: o = !1,
        scheduleInRootZone: r = rh,
      } = e;
      if (typeof Zone > 'u') throw new N(908, !1);
      Zone.assertZonePatched();
      let s = this;
      ((s._nesting = 0),
        (s._outer = s._inner = Zone.current),
        Zone.TaskTrackingZoneSpec &&
          (s._inner = s._inner.fork(new Zone.TaskTrackingZoneSpec())),
        t &&
          Zone.longStackTraceZoneSpec &&
          (s._inner = s._inner.fork(Zone.longStackTraceZoneSpec)),
        (s.shouldCoalesceEventChangeDetection = !o && i),
        (s.shouldCoalesceRunChangeDetection = o),
        (s.callbackScheduled = !1),
        (s.scheduleInRootZone = r),
        Wv(s));
    }
    static isInAngularZone() {
      return typeof Zone < 'u' && Zone.current.get(Dd) === !0;
    }
    static assertInAngularZone() {
      if (!n.isInAngularZone()) throw new N(909, !1);
    }
    static assertNotInAngularZone() {
      if (n.isInAngularZone()) throw new N(909, !1);
    }
    run(e, t, i) {
      return this._inner.run(e, t, i);
    }
    runTask(e, t, i, o) {
      let r = this._inner,
        s = r.scheduleEventTask('NgZoneEvent: ' + o, e, $v, Uo, Uo);
      try {
        return r.runTask(s, t, i);
      } finally {
        r.cancelTask(s);
      }
    }
    runGuarded(e, t, i) {
      return this._inner.runGuarded(e, t, i);
    }
    runOutsideAngular(e) {
      return this._outer.run(e);
    }
  },
  $v = {};
function Ed(n) {
  if (n._nesting == 0 && !n.hasPendingMicrotasks && !n.isStable)
    try {
      (n._nesting++, n.onMicrotaskEmpty.emit(null));
    } finally {
      if ((n._nesting--, !n.hasPendingMicrotasks))
        try {
          n.runOutsideAngular(() => n.onStable.emit(null));
        } finally {
          n.isStable = !0;
        }
    }
}
function Gv(n) {
  if (n.isCheckStableRunning || n.callbackScheduled) return;
  n.callbackScheduled = !0;
  function e() {
    wd(() => {
      ((n.callbackScheduled = !1),
        Pa(n),
        (n.isCheckStableRunning = !0),
        Ed(n),
        (n.isCheckStableRunning = !1));
    });
  }
  (n.scheduleInRootZone
    ? Zone.root.run(() => {
        e();
      })
    : n._outer.run(() => {
        e();
      }),
    Pa(n));
}
function Wv(n) {
  let e = () => {
      Gv(n);
    },
    t = Uv++;
  n._inner = n._inner.fork({
    name: 'angular',
    properties: { [Dd]: !0, [wi]: t, [wi + t]: !0 },
    onInvokeTask: (i, o, r, s, a, d) => {
      if (qv(d)) return i.invokeTask(r, s, a, d);
      try {
        return (Dg(n), i.invokeTask(r, s, a, d));
      } finally {
        (((n.shouldCoalesceEventChangeDetection && s.type === 'eventTask') ||
          n.shouldCoalesceRunChangeDetection) &&
          e(),
          Eg(n));
      }
    },
    onInvoke: (i, o, r, s, a, d, c) => {
      try {
        return (Dg(n), i.invoke(r, s, a, d, c));
      } finally {
        (n.shouldCoalesceRunChangeDetection &&
          !n.callbackScheduled &&
          !Zv(d) &&
          e(),
          Eg(n));
      }
    },
    onHasTask: (i, o, r, s) => {
      (i.hasTask(r, s),
        o === r &&
          (s.change == 'microTask'
            ? ((n._hasPendingMicrotasks = s.microTask), Pa(n), Ed(n))
            : s.change == 'macroTask' &&
              (n.hasPendingMacrotasks = s.macroTask)));
    },
    onHandleError: (i, o, r, s) => (
      i.handleError(r, s),
      n.runOutsideAngular(() => n.onError.emit(s)),
      !1
    ),
  });
}
function Pa(n) {
  n._hasPendingMicrotasks ||
  ((n.shouldCoalesceEventChangeDetection ||
    n.shouldCoalesceRunChangeDetection) &&
    n.callbackScheduled === !0)
    ? (n.hasPendingMicrotasks = !0)
    : (n.hasPendingMicrotasks = !1);
}
function Dg(n) {
  (n._nesting++, n.isStable && ((n.isStable = !1), n.onUnstable.emit(null)));
}
function Eg(n) {
  (n._nesting--, Ed(n));
}
var Di = class {
  hasPendingMicrotasks = !1;
  hasPendingMacrotasks = !1;
  isStable = !0;
  onUnstable = new F();
  onMicrotaskEmpty = new F();
  onStable = new F();
  onError = new F();
  run(e, t, i) {
    return e.apply(t, i);
  }
  runGuarded(e, t, i) {
    return e.apply(t, i);
  }
  runOutsideAngular(e) {
    return e();
  }
  runTask(e, t, i, o) {
    return e.apply(t, i);
  }
};
function qv(n) {
  return dh(n, '__ignore_ng_zone__');
}
function Zv(n) {
  return dh(n, '__scheduler_tick__');
}
function dh(n, e) {
  return !Array.isArray(n) || n.length !== 1 ? !1 : n[0]?.data?.[e] === !0;
}
var wt = class {
    _console = console;
    handleError(e) {
      this._console.error('ERROR', e);
    }
  },
  ln = new A('', {
    factory: () => {
      let n = m(Te),
        e = m(Fe),
        t;
      return (i) => {
        n.runOutsideAngular(() => {
          e.destroyed && !t
            ? setTimeout(() => {
                throw i;
              })
            : ((t ??= e.get(wt)), t.handleError(i));
        });
      };
    },
  }),
  ch = {
    provide: Si,
    useValue: () => {
      let n = m(wt, { optional: !0 });
    },
    multi: !0,
  };
function P(n, e) {
  let [t, i, o] = da(n, e?.equal),
    r = t,
    s = r[pe];
  return ((r.set = i), (r.update = o), (r.asReadonly = lh.bind(r)), r);
}
function lh() {
  let n = this[pe];
  if (n.readonlyFn === void 0) {
    let e = () => this();
    ((e[pe] = n), (n.readonlyFn = e));
  }
  return n.readonlyFn;
}
var pr = (() => {
  class n {
    view;
    node;
    constructor(t, i) {
      ((this.view = t), (this.node = i));
    }
    static __NG_ELEMENT_ID__ = Yv;
  }
  return n;
})();
function Yv() {
  return new pr(T(), be());
}
var Xt = class {},
  Ri = new A('', { factory: () => !0 });
var Cd = new A('');
var mr = (() => {
    class n {
      static ɵprov = I({
        token: n,
        providedIn: 'root',
        factory: () => new Ra(),
      });
    }
    return n;
  })(),
  Ra = class {
    dirtyEffectCount = 0;
    queues = new Map();
    add(e) {
      (this.enqueue(e), this.schedule(e));
    }
    schedule(e) {
      e.dirty && this.dirtyEffectCount++;
    }
    remove(e) {
      let t = e.zone,
        i = this.queues.get(t);
      i.has(e) && (i.delete(e), e.dirty && this.dirtyEffectCount--);
    }
    enqueue(e) {
      let t = e.zone;
      this.queues.has(t) || this.queues.set(t, new Set());
      let i = this.queues.get(t);
      i.has(e) || i.add(e);
    }
    flush() {
      for (; this.dirtyEffectCount > 0;) {
        let e = !1;
        for (let [t, i] of this.queues)
          t === null
            ? (e ||= this.flushQueue(i))
            : (e ||= t.run(() => this.flushQueue(i)));
        e || (this.dirtyEffectCount = 0);
      }
    }
    flushQueue(e) {
      let t = !1;
      for (let i of e) i.dirty && (this.dirtyEffectCount--, (t = !0), i.run());
      return t;
    }
  },
  $o = class {
    [pe];
    constructor(e) {
      this[pe] = e;
    }
    destroy() {
      this[pe].destroy();
    }
  };
function fe(n, e) {
  let t = e?.injector ?? m(We),
    i = e?.manualCleanup !== !0 ? t.get(It) : null,
    o,
    r = t.get(pr, null, { optional: !0 }),
    s = t.get(Xt);
  return (
    r !== null
      ? ((o = Xv(r.view, s, n)),
        i instanceof jo && i._lView === r.view && (i = null))
      : (o = Jv(n, t.get(mr), s)),
    (o.injector = t),
    i !== null && (o.onDestroyFns = [i.onDestroy(() => o.destroy())]),
    new $o(o)
  );
}
var uh = y(h({}, la), {
    cleanupFns: void 0,
    zone: null,
    onDestroyFns: null,
    run() {
      let n = vi(!1);
      try {
        ua(this);
      } finally {
        vi(n);
      }
    },
    cleanup() {
      if (!this.cleanupFns?.length) return;
      let n = M(null);
      try {
        for (; this.cleanupFns.length;) this.cleanupFns.pop()();
      } finally {
        ((this.cleanupFns = []), M(n));
      }
    },
  }),
  Qv = y(h({}, uh), {
    consumerMarkedDirty() {
      (this.scheduler.schedule(this), this.notifier.notify(12));
    },
    destroy() {
      if (($t(this), this.onDestroyFns !== null))
        for (let n of this.onDestroyFns) n();
      (this.cleanup(), this.scheduler.remove(this));
    },
  }),
  Kv = y(h({}, uh), {
    consumerMarkedDirty() {
      ((this.view[S] |= 8192), Vn(this.view), this.notifier.notify(13));
    },
    destroy() {
      if (($t(this), this.onDestroyFns !== null))
        for (let n of this.onDestroyFns) n();
      (this.cleanup(), this.view[_t]?.delete(this));
    },
  });
function Xv(n, e, t) {
  let i = Object.create(Kv);
  return (
    (i.view = n),
    (i.zone = typeof Zone < 'u' ? Zone.current : null),
    (i.notifier = e),
    (i.fn = fh(i, t)),
    (n[_t] ??= new Set()),
    n[_t].add(i),
    i.consumerMarkedDirty(i),
    i
  );
}
function Jv(n, e, t) {
  let i = Object.create(Qv);
  return (
    (i.fn = fh(i, n)),
    (i.scheduler = e),
    (i.notifier = t),
    (i.zone = typeof Zone < 'u' ? Zone.current : null),
    i.scheduler.add(i),
    i.notifier.notify(12),
    i
  );
}
function fh(n, e) {
  return () => {
    e((t) => (n.cleanupFns ??= []).push(t));
  };
}
function Ui(n) {
  return { toString: n }.toString();
}
function fw(n) {
  return typeof n == 'function';
}
function $h(n, e, t, i) {
  e !== null ? e.applyValueToInputSignal(e, i) : (n[t] = i);
}
var Ir = class {
    previousValue;
    currentValue;
    firstChange;
    constructor(e, t, i) {
      ((this.previousValue = e),
        (this.currentValue = t),
        (this.firstChange = i));
    }
    isFirstChange() {
      return this.firstChange;
    }
  },
  lc = (() => {
    let n = () => Gh;
    return ((n.ngInherit = !0), n);
  })();
function Gh(n) {
  return (n.type.prototype.ngOnChanges && (n.setInput = hw), gw);
}
function gw() {
  let n = qh(this),
    e = n?.current;
  if (e) {
    let t = n.previous;
    if (t === qe) n.previous = e;
    else for (let i in e) t[i] = e[i];
    ((n.current = null), this.ngOnChanges(e));
  }
}
function hw(n, e, t, i, o) {
  let r = this.declaredInputs[i],
    s = qh(n) || pw(n, { previous: qe, current: null }),
    a = s.current || (s.current = {}),
    d = s.previous,
    c = d[r];
  ((a[r] = new Ir(c && c.currentValue, t, d === qe)), $h(n, e, o, t));
}
var Wh = '__ngSimpleChanges__';
function qh(n) {
  return n[Wh] || null;
}
function pw(n, e) {
  return (n[Wh] = e);
}
var gh = [];
var U = function (n, e = null, t) {
    for (let i = 0; i < gh.length; i++) {
      let o = gh[i];
      o(n, e, t);
    }
  },
  L = (function (n) {
    return (
      (n[(n.TemplateCreateStart = 0)] = 'TemplateCreateStart'),
      (n[(n.TemplateCreateEnd = 1)] = 'TemplateCreateEnd'),
      (n[(n.TemplateUpdateStart = 2)] = 'TemplateUpdateStart'),
      (n[(n.TemplateUpdateEnd = 3)] = 'TemplateUpdateEnd'),
      (n[(n.LifecycleHookStart = 4)] = 'LifecycleHookStart'),
      (n[(n.LifecycleHookEnd = 5)] = 'LifecycleHookEnd'),
      (n[(n.OutputStart = 6)] = 'OutputStart'),
      (n[(n.OutputEnd = 7)] = 'OutputEnd'),
      (n[(n.BootstrapApplicationStart = 8)] = 'BootstrapApplicationStart'),
      (n[(n.BootstrapApplicationEnd = 9)] = 'BootstrapApplicationEnd'),
      (n[(n.BootstrapComponentStart = 10)] = 'BootstrapComponentStart'),
      (n[(n.BootstrapComponentEnd = 11)] = 'BootstrapComponentEnd'),
      (n[(n.ChangeDetectionStart = 12)] = 'ChangeDetectionStart'),
      (n[(n.ChangeDetectionEnd = 13)] = 'ChangeDetectionEnd'),
      (n[(n.ChangeDetectionSyncStart = 14)] = 'ChangeDetectionSyncStart'),
      (n[(n.ChangeDetectionSyncEnd = 15)] = 'ChangeDetectionSyncEnd'),
      (n[(n.AfterRenderHooksStart = 16)] = 'AfterRenderHooksStart'),
      (n[(n.AfterRenderHooksEnd = 17)] = 'AfterRenderHooksEnd'),
      (n[(n.ComponentStart = 18)] = 'ComponentStart'),
      (n[(n.ComponentEnd = 19)] = 'ComponentEnd'),
      (n[(n.DeferBlockStateStart = 20)] = 'DeferBlockStateStart'),
      (n[(n.DeferBlockStateEnd = 21)] = 'DeferBlockStateEnd'),
      (n[(n.DynamicComponentStart = 22)] = 'DynamicComponentStart'),
      (n[(n.DynamicComponentEnd = 23)] = 'DynamicComponentEnd'),
      (n[(n.HostBindingsUpdateStart = 24)] = 'HostBindingsUpdateStart'),
      (n[(n.HostBindingsUpdateEnd = 25)] = 'HostBindingsUpdateEnd'),
      n
    );
  })(L || {});
function mw(n, e, t) {
  let { ngOnChanges: i, ngOnInit: o, ngDoCheck: r } = e.type.prototype;
  if (i) {
    let s = Gh(e);
    ((t.preOrderHooks ??= []).push(n, s),
      (t.preOrderCheckHooks ??= []).push(n, s));
  }
  (o && (t.preOrderHooks ??= []).push(0 - n, o),
    r &&
      ((t.preOrderHooks ??= []).push(n, r),
      (t.preOrderCheckHooks ??= []).push(n, r)));
}
function Zh(n, e) {
  for (let t = e.directiveStart, i = e.directiveEnd; t < i; t++) {
    let r = n.data[t].type.prototype,
      {
        ngAfterContentInit: s,
        ngAfterContentChecked: a,
        ngAfterViewInit: d,
        ngAfterViewChecked: c,
        ngOnDestroy: l,
      } = r;
    (s && (n.contentHooks ??= []).push(-t, s),
      a &&
        ((n.contentHooks ??= []).push(t, a),
        (n.contentCheckHooks ??= []).push(t, a)),
      d && (n.viewHooks ??= []).push(-t, d),
      c &&
        ((n.viewHooks ??= []).push(t, c), (n.viewCheckHooks ??= []).push(t, c)),
      l != null && (n.destroyHooks ??= []).push(t, l));
  }
}
function vr(n, e, t) {
  Yh(n, e, 3, t);
}
function wr(n, e, t, i) {
  (n[S] & 3) === t && Yh(n, e, t, i);
}
function Id(n, e) {
  let t = n[S];
  (t & 3) === e && ((t &= 16383), (t += 1), (n[S] = t));
}
function Yh(n, e, t, i) {
  let o = i !== void 0 ? n[rn] & 65535 : 0,
    r = i ?? -1,
    s = e.length - 1,
    a = 0;
  for (let d = o; d < s; d++)
    if (typeof e[d + 1] == 'number') {
      if (((a = e[d]), i != null && a >= i)) break;
    } else
      (e[d] < 0 && (n[rn] += 65536),
        (a < r || r == -1) &&
          (yw(n, t, e, d), (n[rn] = (n[rn] & 4294901760) + d + 2)),
        d++);
}
function hh(n, e) {
  U(L.LifecycleHookStart, n, e);
  let t = M(null);
  try {
    e.call(n);
  } finally {
    (M(t), U(L.LifecycleHookEnd, n, e));
  }
}
function yw(n, e, t, i) {
  let o = t[i] < 0,
    r = t[i + 1],
    s = o ? -t[i] : t[i],
    a = n[s];
  o
    ? n[S] >> 14 < n[rn] >> 16 &&
      (n[S] & 3) === e &&
      ((n[S] += 16384), hh(a, r))
    : hh(a, r);
}
var $n = -1,
  fn = class {
    factory;
    name;
    injectImpl;
    resolving = !1;
    canSeeViewProviders;
    multi;
    componentProviders;
    index;
    providerFactory;
    constructor(e, t, i, o) {
      ((this.factory = e),
        (this.name = o),
        (this.canSeeViewProviders = t),
        (this.injectImpl = i));
    }
  };
function vw(n) {
  return (n.flags & 8) !== 0;
}
function ww(n) {
  return (n.flags & 16) !== 0;
}
function Dw(n, e, t) {
  let i = 0;
  for (; i < t.length;) {
    let o = t[i];
    if (typeof o == 'number') {
      if (o !== 0) break;
      i++;
      let r = t[i++],
        s = t[i++],
        a = t[i++];
      n.setAttribute(e, s, a, r);
    } else {
      let r = o,
        s = t[++i];
      (Cw(r) ? n.setProperty(e, r, s) : n.setAttribute(e, r, s), i++);
    }
  }
  return i;
}
function Ew(n) {
  return n === 3 || n === 4 || n === 6;
}
function Cw(n) {
  return n.charCodeAt(0) === 64;
}
function Gn(n, e) {
  if (!(e === null || e.length === 0))
    if (n === null || n.length === 0) n = e.slice();
    else {
      let t = -1;
      for (let i = 0; i < e.length; i++) {
        let o = e[i];
        typeof o == 'number'
          ? (t = o)
          : t === 0 ||
            (t === -1 || t === 2
              ? ph(n, t, o, null, e[++i])
              : ph(n, t, o, null, null));
      }
    }
  return n;
}
function ph(n, e, t, i, o) {
  let r = 0,
    s = n.length;
  if (e === -1) s = -1;
  else
    for (; r < n.length;) {
      let a = n[r++];
      if (typeof a == 'number') {
        if (a === e) {
          s = -1;
          break;
        } else if (a > e) {
          s = r - 1;
          break;
        }
      }
    }
  for (; r < n.length;) {
    let a = n[r];
    if (typeof a == 'number') break;
    if (a === t) {
      o !== null && (n[r + 1] = o);
      return;
    }
    (r++, o !== null && r++);
  }
  (s !== -1 && (n.splice(s, 0, e), (r = s + 1)),
    n.splice(r++, 0, t),
    o !== null && n.splice(r++, 0, o));
}
function Qh(n) {
  return n !== $n;
}
function Mr(n) {
  return n & 32767;
}
function Iw(n) {
  return n >> 16;
}
function br(n, e) {
  let t = Iw(n),
    i = e;
  for (; t > 0;) ((i = i[on]), t--);
  return i;
}
var kd = !0;
function mh(n) {
  let e = kd;
  return ((kd = n), e);
}
var Mw = 256,
  Kh = Mw - 1,
  Xh = 5,
  bw = 0,
  ft = {};
function Sw(n, e, t) {
  let i;
  (typeof t == 'string'
    ? (i = t.charCodeAt(0) || 0)
    : t.hasOwnProperty(Jt) && (i = t[Jt]),
    i == null && (i = t[Jt] = bw++));
  let o = i & Kh,
    r = 1 << o;
  e.data[n + (o >> Xh)] |= r;
}
function Sr(n, e) {
  let t = Jh(n, e);
  if (t !== -1) return t;
  let i = e[b];
  i.firstCreatePass &&
    ((n.injectorIndex = e.length),
    Md(i.data, n),
    Md(e, null),
    Md(i.blueprint, null));
  let o = uc(n, e),
    r = n.injectorIndex;
  if (Qh(o)) {
    let s = Mr(o),
      a = br(o, e),
      d = a[b].data;
    for (let c = 0; c < 8; c++) e[r + c] = a[s + c] | d[s + c];
  }
  return ((e[r + 8] = o), r);
}
function Md(n, e) {
  n.push(0, 0, 0, 0, 0, 0, 0, 0, e);
}
function Jh(n, e) {
  return n.injectorIndex === -1 ||
    (n.parent && n.parent.injectorIndex === n.injectorIndex) ||
    e[n.injectorIndex + 8] === null
    ? -1
    : n.injectorIndex;
}
function uc(n, e) {
  if (n.parent && n.parent.injectorIndex !== -1) return n.parent.injectorIndex;
  let t = 0,
    i = null,
    o = e;
  for (; o !== null;) {
    if (((i = op(o)), i === null)) return $n;
    if ((t++, (o = o[on]), i.injectorIndex !== -1))
      return i.injectorIndex | (t << 16);
  }
  return $n;
}
function Ad(n, e, t) {
  Sw(n, e, t);
}
function ep(n, e, t) {
  if (t & 8 || n !== void 0) return n;
  Xo(e, 'NodeInjector');
}
function tp(n, e, t, i) {
  if ((t & 8 && i === void 0 && (i = null), (t & 3) === 0)) {
    let o = n[Dt],
      r = Pe(void 0);
    try {
      return o ? o.get(e, i, t & 8) : za(e, i, t & 8);
    } finally {
      Pe(r);
    }
  }
  return ep(i, e, t);
}
function np(n, e, t, i = 0, o) {
  if (n !== null) {
    if (e[S] & 2048 && !(i & 2)) {
      let s = xw(n, e, t, i, ft);
      if (s !== ft) return s;
    }
    let r = ip(n, e, t, i, ft);
    if (r !== ft) return r;
  }
  return tp(e, t, i, o);
}
function ip(n, e, t, i, o) {
  let r = _w(t);
  if (typeof r == 'function') {
    if (!pd(e, n, i)) return i & 1 ? ep(o, t, i) : tp(e, t, i, o);
    try {
      let s;
      if (((s = r(i)), s == null && !(i & 8))) Xo(t);
      else return s;
    } finally {
      md();
    }
  } else if (typeof r == 'number') {
    let s = null,
      a = Jh(n, e),
      d = $n,
      c = i & 1 ? e[_e][Me] : null;
    for (
      (a === -1 || i & 4) &&
      ((d = a === -1 ? uc(n, e) : e[a + 8]),
      d === $n || !vh(i, !1)
        ? (a = -1)
        : ((s = e[b]), (a = Mr(d)), (e = br(d, e))));
      a !== -1;
    ) {
      let l = e[b];
      if (yh(r, a, l.data)) {
        let u = Tw(a, e, t, s, i, c);
        if (u !== ft) return u;
      }
      ((d = e[a + 8]),
        d !== $n && vh(i, e[b].data[a + 8] === c) && yh(r, a, e)
          ? ((s = l), (a = Mr(d)), (e = br(d, e)))
          : (a = -1));
    }
  }
  return o;
}
function Tw(n, e, t, i, o, r) {
  let s = e[b],
    a = s.data[n + 8],
    d = i == null ? kt(a) && kd : i != s && (a.type & 3) !== 0,
    c = o & 1 && r === a,
    l = Dr(a, s, t, d, c);
  return l !== null ? Fi(e, s, l, a, o) : ft;
}
function Dr(n, e, t, i, o) {
  let r = n.providerIndexes,
    s = e.data,
    a = r & 1048575,
    d = n.directiveStart,
    c = n.directiveEnd,
    l = r >> 20,
    u = i ? a : a + l,
    f = o ? a + l : c;
  for (let g = u; g < f; g++) {
    let p = s[g];
    if ((g < d && t === p) || (g >= d && p.type === t)) return g;
  }
  if (o) {
    let g = s[d];
    if (g && Qe(g) && g.type === t) return d;
  }
  return null;
}
function Fi(n, e, t, i, o) {
  let r = n[t],
    s = e.data;
  if (r instanceof fn) {
    let a = r;
    if (a.resolving) throw Ha('');
    let d = mh(a.canSeeViewProviders);
    a.resolving = !0;
    let c = s[t].type || s[t],
      l,
      u = a.injectImpl ? Pe(a.injectImpl) : null,
      f = pd(n, i, 0);
    try {
      ((r = n[t] = a.factory(void 0, o, s, n, i)),
        e.firstCreatePass && t >= i.directiveStart && mw(t, s[t], e));
    } finally {
      (u !== null && Pe(u), mh(d), (a.resolving = !1), md());
    }
  }
  return r;
}
function _w(n) {
  if (typeof n == 'string') return n.charCodeAt(0) || 0;
  let e = n.hasOwnProperty(Jt) ? n[Jt] : void 0;
  return typeof e == 'number' ? (e >= 0 ? e & Kh : Nw) : e;
}
function yh(n, e, t) {
  let i = 1 << n;
  return !!(t[e + (n >> Xh)] & i);
}
function vh(n, e) {
  return !(n & 2) && !(n & 1 && e);
}
var un = class {
  _tNode;
  _lView;
  constructor(e, t) {
    ((this._tNode = e), (this._lView = t));
  }
  get(e, t, i) {
    return np(this._tNode, this._lView, e, Zt(i), t);
  }
};
function Nw() {
  return new un(be(), T());
}
function ze(n) {
  return Ui(() => {
    let e = n.prototype.constructor,
      t = e[mi] || Od(e),
      i = Object.prototype,
      o = Object.getPrototypeOf(n.prototype).constructor;
    for (; o && o !== i;) {
      let r = o[mi] || Od(o);
      if (r && r !== t) return r;
      o = Object.getPrototypeOf(o);
    }
    return (r) => new r();
  });
}
function Od(n) {
  return Aa(n)
    ? () => {
        let e = Od(se(n));
        return e && e();
      }
    : Yt(n);
}
function xw(n, e, t, i, o) {
  let r = n,
    s = e;
  for (; r !== null && s !== null && s[S] & 2048 && !zn(s);) {
    let a = ip(r, s, t, i | 2, ft);
    if (a !== ft) return a;
    let d = r.parent;
    if (!d) {
      let c = s[Ya];
      if (c) {
        let l = c.get(t, ft, i & -5);
        if (l !== ft) return l;
      }
      ((d = op(s)), (s = s[on]));
    }
    r = d;
  }
  return o;
}
function op(n) {
  let e = n[b],
    t = e.type;
  return t === 2 ? e.declTNode : t === 1 ? n[Me] : null;
}
function Pw() {
  return Kn(be(), T());
}
function Kn(n, e) {
  return new ie(Ke(n, e));
}
var ie = (() => {
  class n {
    nativeElement;
    constructor(t) {
      this.nativeElement = t;
    }
    static __NG_ELEMENT_ID__ = Pw;
  }
  return n;
})();
function Rw(n) {
  return n instanceof ie ? n.nativeElement : n;
}
function kw() {
  return this._results[Symbol.iterator]();
}
var Tr = class {
  _emitDistinctChangesOnly;
  dirty = !0;
  _onDirty = void 0;
  _results = [];
  _changesDetected = !1;
  _changes = void 0;
  length = 0;
  first = void 0;
  last = void 0;
  get changes() {
    return (this._changes ??= new yt());
  }
  constructor(e = !1) {
    this._emitDistinctChangesOnly = e;
  }
  get(e) {
    return this._results[e];
  }
  map(e) {
    return this._results.map(e);
  }
  filter(e) {
    return this._results.filter(e);
  }
  find(e) {
    return this._results.find(e);
  }
  reduce(e, t) {
    return this._results.reduce(e, t);
  }
  forEach(e) {
    this._results.forEach(e);
  }
  some(e) {
    return this._results.some(e);
  }
  toArray() {
    return this._results.slice();
  }
  toString() {
    return this._results.toString();
  }
  reset(e, t) {
    this.dirty = !1;
    let i = Ng(e);
    (this._changesDetected = !_g(this._results, i, t)) &&
      ((this._results = i),
      (this.length = i.length),
      (this.last = i[this.length - 1]),
      (this.first = i[0]));
  }
  notifyOnChanges() {
    this._changes !== void 0 &&
      (this._changesDetected || !this._emitDistinctChangesOnly) &&
      this._changes.next(this);
  }
  onDirty(e) {
    this._onDirty = e;
  }
  setDirty() {
    ((this.dirty = !0), this._onDirty?.());
  }
  destroy() {
    this._changes !== void 0 &&
      (this._changes.complete(), this._changes.unsubscribe());
  }
  [Symbol.iterator] = kw;
};
function rp(n) {
  return (n.flags & 128) === 128;
}
var fc = (function (n) {
    return (
      (n[(n.OnPush = 0)] = 'OnPush'),
      (n[(n.Eager = 1)] = 'Eager'),
      (n[(n.Default = 1)] = 'Default'),
      n
    );
  })(fc || {}),
  sp = new Map(),
  Aw = 0;
function Ow() {
  return Aw++;
}
function Fw(n) {
  sp.set(n[Et], n);
}
function Fd(n) {
  sp.delete(n[Et]);
}
var wh = '__ngContext__';
function Wn(n, e) {
  Ct(e) ? ((n[wh] = e[Et]), Fw(e)) : (n[wh] = e);
}
function ap(n) {
  return cp(n[Bn]);
}
function dp(n) {
  return cp(n[Le]);
}
function cp(n) {
  for (; n !== null && !Ye(n);) n = n[Le];
  return n;
}
var Lw;
function gc(n) {
  Lw = n;
}
var Lr = new A('', { factory: () => Bw }),
  Bw = 'ng';
var Br = new A(''),
  mn = new A('', { providedIn: 'platform', factory: () => 'unknown' });
var Hr = new A('', {
  factory: () =>
    m(Je).body?.querySelector('[ngCspNonce]')?.getAttribute('ngCspNonce') ||
    null,
});
var lp = 'r';
var up = 'di';
var fp = !1,
  gp = new A('', { factory: () => fp });
var Dh = new WeakMap();
function Hw(n, e) {
  if (n == null || typeof n != 'object') return;
  let t = Dh.get(n);
  (t || ((t = new WeakSet()), Dh.set(n, t)), t.add(e));
}
var zw = (n, e, t, i) => {};
function Vw(n, e, t, i) {
  zw(n, e, t, i);
}
function zr(n) {
  return (n.flags & 32) === 32;
}
var jw = () => null;
function hp(n, e, t = !1) {
  return jw(n, e, t);
}
function pp(n, e) {
  let t = n.contentQueries;
  if (t !== null) {
    let i = M(null);
    try {
      for (let o = 0; o < t.length; o += 2) {
        let r = t[o],
          s = t[o + 1];
        if (s !== -1) {
          let a = n.data[s];
          (lr(r), a.contentQueries(2, e[s], s));
        }
      }
    } finally {
      M(i);
    }
  }
}
function Ld(n, e, t) {
  lr(0);
  let i = M(null);
  try {
    e(n, t);
  } finally {
    M(i);
  }
}
function hc(n, e, t) {
  if (Ka(e)) {
    let i = M(null);
    try {
      let o = e.directiveStart,
        r = e.directiveEnd;
      for (let s = o; s < r; s++) {
        let a = n.data[s];
        if (a.contentQueries) {
          let d = t[s];
          a.contentQueries(1, d, s);
        }
      }
    } finally {
      M(i);
    }
  }
}
var nt = (function (n) {
  return (
    (n[(n.Emulated = 0)] = 'Emulated'),
    (n[(n.None = 2)] = 'None'),
    (n[(n.ShadowDom = 3)] = 'ShadowDom'),
    (n[(n.ExperimentalIsolatedShadowDom = 4)] =
      'ExperimentalIsolatedShadowDom'),
    n
  );
})(nt || {});
var Bd = class {
  changingThisBreaksApplicationSecurity;
  constructor(e) {
    this.changingThisBreaksApplicationSecurity = e;
  }
  toString() {
    return `SafeValue must use [property]=binding: ${this.changingThisBreaksApplicationSecurity} (see ${ka})`;
  }
};
function pc(n) {
  return n instanceof Bd ? n.changingThisBreaksApplicationSecurity : n;
}
var Uw = /^>|^->|<!--|-->|--!>|<!-$/g,
  $w = /(<|>)/g,
  Gw = '\u200B$1\u200B';
function Ww(n) {
  return n.replace(Uw, (e) => e.replace($w, Gw));
}
function qw(n, e) {
  return n.createText(e);
}
function Zw(n, e, t) {
  n.setValue(e, t);
}
function Yw(n, e) {
  return n.createComment(Ww(e));
}
function mp(n, e, t) {
  return n.createElement(e, t);
}
function _r(n, e, t, i, o) {
  n.insertBefore(e, t, i, o);
}
function yp(n, e, t) {
  n.appendChild(e, t);
}
function Eh(n, e, t, i, o) {
  i !== null ? _r(n, e, t, i, o) : yp(n, e, t);
}
function vp(n, e, t, i) {
  n.removeChild(null, e, t, i);
}
function Qw(n, e, t) {
  n.setAttribute(e, 'style', t);
}
function Kw(n, e, t) {
  t === '' ? n.removeAttribute(e, 'class') : n.setAttribute(e, 'class', t);
}
function wp(n, e, t) {
  let { mergedAttrs: i, classes: o, styles: r } = t;
  (i !== null && Dw(n, e, i),
    o !== null && Kw(n, e, o),
    r !== null && Qw(n, e, r));
}
function $i(n) {
  return n.ownerDocument;
}
function Xw(n) {
  return n instanceof Function ? n() : n;
}
function Jw(n, e, t) {
  let i = n.length;
  for (;;) {
    let o = n.indexOf(e, t);
    if (o === -1) return o;
    if (o === 0 || n.charCodeAt(o - 1) <= 32) {
      let r = e.length;
      if (o + r === i || n.charCodeAt(o + r) <= 32) return o;
    }
    t = o + 1;
  }
}
var Dp = 'ng-template';
function eD(n, e, t, i) {
  let o = 0;
  if (i) {
    for (; o < e.length && typeof e[o] == 'string'; o += 2)
      if (e[o] === 'class' && Jw(e[o + 1].toLowerCase(), t, 0) !== -1)
        return !0;
  } else if (mc(n)) return !1;
  if (((o = e.indexOf(1, o)), o > -1)) {
    let r;
    for (; ++o < e.length && typeof (r = e[o]) == 'string';)
      if (r.toLowerCase() === t) return !0;
  }
  return !1;
}
function mc(n) {
  return n.type === 4 && n.value !== Dp;
}
function tD(n, e, t) {
  let i = n.type === 4 && !t ? Dp : n.value;
  return e === i;
}
function nD(n, e, t) {
  let i = 4,
    o = n.attrs,
    r = o !== null ? rD(o) : 0,
    s = !1;
  for (let a = 0; a < e.length; a++) {
    let d = e[a];
    if (typeof d == 'number') {
      if (!s && !et(i) && !et(d)) return !1;
      if (s && et(d)) continue;
      ((s = !1), (i = d | (i & 1)));
      continue;
    }
    if (!s)
      if (i & 4) {
        if (
          ((i = 2 | (i & 1)),
          (d !== '' && !tD(n, d, t)) || (d === '' && e.length === 1))
        ) {
          if (et(i)) return !1;
          s = !0;
        }
      } else if (i & 8) {
        if (o === null || !eD(n, o, d, t)) {
          if (et(i)) return !1;
          s = !0;
        }
      } else {
        let c = e[++a],
          l = iD(d, o, mc(n), t);
        if (l === -1) {
          if (et(i)) return !1;
          s = !0;
          continue;
        }
        if (c !== '') {
          let u;
          if (
            (l > r ? (u = '') : (u = o[l + 1].toLowerCase()), i & 2 && c !== u)
          ) {
            if (et(i)) return !1;
            s = !0;
          }
        }
      }
  }
  return et(i) || s;
}
function et(n) {
  return (n & 1) === 0;
}
function iD(n, e, t, i) {
  if (e === null) return -1;
  let o = 0;
  if (i || !t) {
    let r = !1;
    for (; o < e.length;) {
      let s = e[o];
      if (s === n) return o;
      if (s === 3 || s === 6) r = !0;
      else if (s === 1 || s === 2) {
        let a = e[++o];
        for (; typeof a == 'string';) a = e[++o];
        continue;
      } else {
        if (s === 4) break;
        if (s === 0) {
          o += 4;
          continue;
        }
      }
      o += r ? 1 : 2;
    }
    return -1;
  } else return sD(e, n);
}
function Ep(n, e, t = !1) {
  for (let i = 0; i < e.length; i++) if (nD(n, e[i], t)) return !0;
  return !1;
}
function oD(n) {
  let e = n.attrs;
  if (e != null) {
    let t = e.indexOf(5);
    if ((t & 1) === 0) return e[t + 1];
  }
  return null;
}
function rD(n) {
  for (let e = 0; e < n.length; e++) {
    let t = n[e];
    if (Ew(t)) return e;
  }
  return n.length;
}
function sD(n, e) {
  let t = n.indexOf(4);
  if (t > -1)
    for (t++; t < n.length;) {
      let i = n[t];
      if (typeof i == 'number') return -1;
      if (i === e) return t;
      t++;
    }
  return -1;
}
function aD(n, e) {
  e: for (let t = 0; t < e.length; t++) {
    let i = e[t];
    if (n.length === i.length) {
      for (let o = 0; o < n.length; o++) if (n[o] !== i[o]) continue e;
      return !0;
    }
  }
  return !1;
}
function Ch(n, e) {
  return n ? ':not(' + e.trim() + ')' : e;
}
function dD(n) {
  let e = n[0],
    t = 1,
    i = 2,
    o = '',
    r = !1;
  for (; t < n.length;) {
    let s = n[t];
    if (typeof s == 'string')
      if (i & 2) {
        let a = n[++t];
        o += '[' + s + (a.length > 0 ? '="' + a + '"' : '') + ']';
      } else i & 8 ? (o += '.' + s) : i & 4 && (o += ' ' + s);
    else
      (o !== '' && !et(s) && ((e += Ch(r, o)), (o = '')),
        (i = s),
        (r = r || !et(i)));
    t++;
  }
  return (o !== '' && (e += Ch(r, o)), e);
}
function cD(n) {
  return n.map(dD).join(',');
}
function lD(n) {
  let e = [],
    t = [],
    i = 1,
    o = 2;
  for (; i < n.length;) {
    let r = n[i];
    if (typeof r == 'string')
      o === 2 ? r !== '' && e.push(r, n[++i]) : o === 8 && t.push(r);
    else {
      if (!et(o)) break;
      o = r;
    }
    i++;
  }
  return (t.length && e.push(1, ...t), e);
}
var Ve = {};
function yc(n, e, t, i, o, r, s, a, d, c, l) {
  let u = K + i,
    f = u + o,
    g = uD(u, f),
    p = typeof c == 'function' ? c() : c;
  return (g[b] = {
    type: n,
    blueprint: g,
    template: t,
    queries: null,
    viewQuery: a,
    declTNode: e,
    data: g.slice().fill(null, u),
    bindingStartIndex: u,
    expandoStartIndex: f,
    hostBindingOpCodes: null,
    firstCreatePass: !0,
    firstUpdatePass: !0,
    staticViewQueries: !1,
    staticContentQueries: !1,
    preOrderHooks: null,
    preOrderCheckHooks: null,
    contentHooks: null,
    contentCheckHooks: null,
    viewHooks: null,
    viewCheckHooks: null,
    destroyHooks: null,
    cleanup: null,
    contentQueries: null,
    components: null,
    directiveRegistry: typeof r == 'function' ? r() : r,
    pipeRegistry: typeof s == 'function' ? s() : s,
    firstChild: null,
    schemas: d,
    consts: p,
    incompleteFirstPass: !1,
    ssrId: l,
  });
}
function uD(n, e) {
  let t = [];
  for (let i = 0; i < e; i++) t.push(i < n ? null : Ve);
  return t;
}
function fD(n) {
  let e = n.tView;
  return e === null || e.incompleteFirstPass
    ? (n.tView = yc(
        1,
        null,
        n.template,
        n.decls,
        n.vars,
        n.directiveDefs,
        n.pipeDefs,
        n.viewQuery,
        n.schemas,
        n.consts,
        n.id,
      ))
    : e;
}
function vc(n, e, t, i, o, r, s, a, d, c, l) {
  let u = e.blueprint.slice();
  return (
    (u[Ze] = o),
    (u[S] = i | 4 | 128 | 8 | 64 | 1024),
    (c !== null || (n && n[S] & 2048)) && (u[S] |= 2048),
    ed(u),
    (u[ae] = u[on] = n),
    (u[ne] = t),
    (u[ct] = s || (n && n[ct])),
    (u[G] = a || (n && n[G])),
    (u[Dt] = d || (n && n[Dt]) || null),
    (u[Me] = r),
    (u[Et] = Ow()),
    (u[nn] = l),
    (u[Ya] = c),
    (u[_e] = e.type == 2 ? n[_e] : u),
    u
  );
}
function gD(n, e, t) {
  let i = Ke(e, n),
    o = fD(t),
    r = n[ct].rendererFactory,
    s = wc(
      n,
      vc(
        n,
        o,
        null,
        Cp(t),
        i,
        e,
        null,
        r.createRenderer(i, t),
        null,
        null,
        null,
      ),
    );
  return (n[e.index] = s);
}
function Cp(n) {
  let e = 16;
  return (n.signals ? (e = 4096) : n.onPush && (e = 64), e);
}
function Ip(n, e, t, i) {
  if (t === 0) return -1;
  let o = e.length;
  for (let r = 0; r < t; r++)
    (e.push(i), n.blueprint.push(i), n.data.push(null));
  return o;
}
function wc(n, e) {
  return (n[Bn] ? (n[Za][Le] = e) : (n[Bn] = e), (n[Za] = e), e);
}
function _(n = 1) {
  Mp(J(), T(), ut() + n, !1);
}
function Mp(n, e, t, i) {
  if (!i)
    if ((e[S] & 3) === 3) {
      let r = n.preOrderCheckHooks;
      r !== null && vr(e, r, t);
    } else {
      let r = n.preOrderHooks;
      r !== null && wr(e, r, 0, t);
    }
  At(t);
}
var Vr = (function (n) {
  return (
    (n[(n.None = 0)] = 'None'),
    (n[(n.SignalBased = 1)] = 'SignalBased'),
    (n[(n.HasDecoratorInputTransform = 2)] = 'HasDecoratorInputTransform'),
    n
  );
})(Vr || {});
function Hd(n, e, t, i) {
  let o = M(null);
  try {
    let [r, s, a] = n.inputs[t],
      d = null;
    ((s & Vr.SignalBased) !== 0 && (d = e[r][pe]),
      d !== null && d.transformFn !== void 0
        ? (i = d.transformFn(i))
        : a !== null && (i = a.call(e, i)),
      n.setInput !== null ? n.setInput(e, d, i, t, r) : $h(e, d, r, i));
  } finally {
    M(o);
  }
}
var gt = (function (n) {
    return (
      (n[(n.Important = 1)] = 'Important'),
      (n[(n.DashCase = 2)] = 'DashCase'),
      n
    );
  })(gt || {}),
  hD;
function Dc(n, e) {
  return hD(n, e);
}
var lP =
  typeof document < 'u' &&
  typeof document?.documentElement?.getAnimations == 'function';
var zd = new WeakMap(),
  ki = new WeakSet();
function pD(n, e) {
  let t = zd.get(n);
  if (!t || t.length === 0) return;
  let i = e.parentNode,
    o = e.previousSibling;
  for (let r = t.length - 1; r >= 0; r--) {
    let s = t[r],
      a = s.parentNode;
    s === e
      ? (t.splice(r, 1),
        ki.add(s),
        s.dispatchEvent(
          new CustomEvent('animationend', { detail: { cancel: !0 } }),
        ))
      : ((o && s === o) || (a && i && a !== i)) &&
        (t.splice(r, 1),
        s.dispatchEvent(
          new CustomEvent('animationend', { detail: { cancel: !0 } }),
        ),
        s.parentNode?.removeChild(s));
  }
}
function mD(n, e) {
  let t = zd.get(n);
  t ? t.includes(e) || t.push(e) : zd.set(n, [e]);
}
var gn = new Set(),
  Ec = (function (n) {
    return (
      (n[(n.CHANGE_DETECTION = 0)] = 'CHANGE_DETECTION'),
      (n[(n.AFTER_NEXT_RENDER = 1)] = 'AFTER_NEXT_RENDER'),
      n
    );
  })(Ec || {}),
  Xn = new A(''),
  Ih = new Set();
function Ft(n) {
  Ih.has(n) ||
    (Ih.add(n),
    performance?.mark?.('mark_feature_usage', { detail: { feature: n } }));
}
var bp = (() => {
  class n {
    impl = null;
    execute() {
      this.impl?.execute();
    }
    static ɵprov = I({ token: n, providedIn: 'root', factory: () => new n() });
  }
  return n;
})();
var Sp = new A('', {
  factory: () => ({
    queue: new Set(),
    isScheduled: !1,
    scheduler: null,
    injector: m(Fe),
  }),
});
function Tp(n, e, t) {
  let i = n.get(Sp);
  if (Array.isArray(e))
    for (let o of e) (i.queue.add(o), t?.detachedLeaveAnimationFns?.push(o));
  else (i.queue.add(e), t?.detachedLeaveAnimationFns?.push(e));
  i.scheduler && i.scheduler(n);
}
function yD(n, e) {
  let t = n.get(Sp);
  if (e.detachedLeaveAnimationFns) {
    for (let i of e.detachedLeaveAnimationFns) t.queue.delete(i);
    e.detachedLeaveAnimationFns = void 0;
  }
}
function vD(n, e) {
  for (let [t, i] of e) Tp(n, i.animateFns);
}
function Mh(n, e, t, i) {
  let o = n?.[Pt]?.enter;
  e !== null && o && o.has(t.index) && vD(i, o);
}
function Un(n, e, t, i, o, r, s, a) {
  if (o != null) {
    let d,
      c = !1;
    Ye(o) ? (d = o) : Ct(o) && ((c = !0), (o = o[Ze]));
    let l = Be(o);
    (n === 0 && i !== null
      ? (Mh(a, i, r, t), s == null ? yp(e, i, l) : _r(e, i, l, s || null, !0))
      : n === 1 && i !== null
        ? (Mh(a, i, r, t), _r(e, i, l, s || null, !0), pD(r, l))
        : n === 2
          ? (a?.[Pt]?.leave?.has(r.index) && mD(r, l),
            ki.delete(l),
            bh(a, r, t, (u) => {
              if (ki.has(l)) {
                ki.delete(l);
                return;
              }
              vp(e, l, c, u);
            }))
          : n === 3 &&
            (ki.delete(l),
            bh(a, r, t, () => {
              e.destroyNode(l);
            })),
      d != null && ND(e, n, t, d, r, i, s));
  }
}
function wD(n, e) {
  (_p(n, e), (e[Ze] = null), (e[Me] = null));
}
function DD(n, e, t, i, o, r) {
  ((i[Ze] = o), (i[Me] = e), Ur(n, i, t, 1, o, r));
}
function _p(n, e) {
  (e[ct].changeDetectionScheduler?.notify(9), Ur(n, e, e[G], 2, null, null));
}
function ED(n) {
  let e = n[Bn];
  if (!e) return bd(n[b], n);
  for (; e;) {
    let t = null;
    if (Ct(e)) t = e[Bn];
    else {
      let i = e[X];
      i && (t = i);
    }
    if (!t) {
      for (; e && !e[Le] && e !== n;) (Ct(e) && bd(e[b], e), (e = e[ae]));
      (e === null && (e = n), Ct(e) && bd(e[b], e), (t = e && e[Le]));
    }
    e = t;
  }
}
function Cc(n, e) {
  let t = n[sn],
    i = t.indexOf(e);
  t.splice(i, 1);
}
function jr(n, e) {
  if (an(e)) return;
  let t = e[G];
  (t.destroyNode && Ur(n, e, t, 3, null, null), ED(e));
}
function bd(n, e) {
  if (an(e)) return;
  let t = M(null);
  try {
    ((e[S] &= -129),
      (e[S] |= 256),
      e[Re] && $t(e[Re]),
      MD(n, e),
      ID(n, e),
      e[b].type === 1 && e[G].destroy());
    let i = e[xt];
    if (i !== null && Ye(e[ae])) {
      i !== e[ae] && Cc(i, e);
      let o = e[lt];
      o !== null && o.detachView(n);
    }
    Fd(e);
  } finally {
    M(t);
  }
}
function bh(n, e, t, i) {
  let o = n?.[Pt];
  if (o == null || o.leave == null || !o.leave.has(e.index)) return i(!1);
  (n && gn.add(n[Et]),
    Tp(
      t,
      () => {
        if (o.leave && o.leave.has(e.index)) {
          let s = o.leave.get(e.index),
            a = [];
          if (s) {
            for (let d = 0; d < s.animateFns.length; d++) {
              let c = s.animateFns[d],
                { promise: l } = c();
              a.push(l);
            }
            o.detachedLeaveAnimationFns = void 0;
          }
          ((o.running = Promise.allSettled(a)), CD(n, i));
        } else (n && gn.delete(n[Et]), i(!1));
      },
      o,
    ));
}
function CD(n, e) {
  let t = n[Pt]?.running;
  if (t) {
    t.then(() => {
      ((n[Pt].running = void 0), gn.delete(n[Et]), e(!0));
    });
    return;
  }
  e(!1);
}
function ID(n, e) {
  let t = n.cleanup,
    i = e[Ln];
  if (t !== null)
    for (let s = 0; s < t.length - 1; s += 2)
      if (typeof t[s] == 'string') {
        let a = t[s + 3];
        (a >= 0 ? i[a]() : i[-a].unsubscribe(), (s += 2));
      } else {
        let a = i[t[s + 1]];
        t[s].call(a);
      }
  i !== null && (e[Ln] = null);
  let o = e[vt];
  if (o !== null) {
    e[vt] = null;
    for (let s = 0; s < o.length; s++) {
      let a = o[s];
      a();
    }
  }
  let r = e[_t];
  if (r !== null) {
    e[_t] = null;
    for (let s of r) s.destroy();
  }
}
function MD(n, e) {
  let t;
  if (n != null && (t = n.destroyHooks) != null)
    for (let i = 0; i < t.length; i += 2) {
      let o = e[t[i]];
      if (!(o instanceof fn)) {
        let r = t[i + 1];
        if (Array.isArray(r))
          for (let s = 0; s < r.length; s += 2) {
            let a = o[r[s]],
              d = r[s + 1];
            U(L.LifecycleHookStart, a, d);
            try {
              d.call(a);
            } finally {
              U(L.LifecycleHookEnd, a, d);
            }
          }
        else {
          U(L.LifecycleHookStart, o, r);
          try {
            r.call(o);
          } finally {
            U(L.LifecycleHookEnd, o, r);
          }
        }
      }
    }
}
function Np(n, e, t) {
  return bD(n, e.parent, t);
}
function bD(n, e, t) {
  let i = e;
  for (; i !== null && i.type & 168;) ((e = i), (i = e.parent));
  if (i === null) return t[Ze];
  if (kt(i)) {
    let { encapsulation: o } = n.data[i.directiveStart + i.componentOffset];
    if (o === nt.None || o === nt.Emulated) return null;
  }
  return Ke(i, t);
}
function xp(n, e, t) {
  return TD(n, e, t);
}
function SD(n, e, t) {
  return n.type & 40 ? Ke(n, t) : null;
}
var TD = SD,
  Sh;
function Ic(n, e, t, i) {
  let o = Np(n, i, e),
    r = e[G],
    s = i.parent || e[Me],
    a = xp(s, i, e);
  if (o != null)
    if (Array.isArray(t))
      for (let d = 0; d < t.length; d++) Eh(r, o, t[d], a, !1);
    else Eh(r, o, t, a, !1);
  Sh !== void 0 && Sh(r, i, e, t, o);
}
function Ai(n, e) {
  if (e !== null) {
    let t = e.type;
    if (t & 3) return Ke(e, n);
    if (t & 4) return Vd(-1, n[e.index]);
    if (t & 8) {
      let i = e.child;
      if (i !== null) return Ai(n, i);
      {
        let o = n[e.index];
        return Ye(o) ? Vd(-1, o) : Be(o);
      }
    } else {
      if (t & 128) return Ai(n, e.next);
      if (t & 32) return Dc(e, n)() || Be(n[e.index]);
      {
        let i = Pp(n, e);
        if (i !== null) {
          if (Array.isArray(i)) return i[0];
          let o = Nt(n[_e]);
          return Ai(o, i);
        } else return Ai(n, e.next);
      }
    }
  }
  return null;
}
function Pp(n, e) {
  if (e !== null) {
    let i = n[_e][Me],
      o = e.projection;
    return i.projection[o];
  }
  return null;
}
function Vd(n, e) {
  let t = X + n + 1;
  if (t < e.length) {
    let i = e[t],
      o = i[b].firstChild;
    if (o !== null) return Ai(i, o);
  }
  return e[Rt];
}
function Mc(n, e, t, i, o, r, s) {
  for (; t != null;) {
    let a = i[Dt];
    if (t.type === 128) {
      t = t.next;
      continue;
    }
    let d = i[t.index],
      c = t.type;
    if ((s && e === 0 && (d && Wn(Be(d), i), (t.flags |= 2)), !zr(t)))
      if (c & 8) (Mc(n, e, t.child, i, o, r, !1), Un(e, n, a, o, d, t, r, i));
      else if (c & 32) {
        let l = Dc(t, i),
          u;
        for (; (u = l());) Un(e, n, a, o, u, t, r, i);
        Un(e, n, a, o, d, t, r, i);
      } else c & 16 ? Rp(n, e, i, t, o, r) : Un(e, n, a, o, d, t, r, i);
    t = s ? t.projectionNext : t.next;
  }
}
function Ur(n, e, t, i, o, r) {
  Mc(t, i, n.firstChild, e, o, r, !1);
}
function _D(n, e, t) {
  let i = e[G],
    o = Np(n, t, e),
    r = t.parent || e[Me],
    s = xp(r, t, e);
  Rp(i, 0, e, t, o, s);
}
function Rp(n, e, t, i, o, r) {
  let s = t[_e],
    d = s[Me].projection[i.projection];
  if (Array.isArray(d))
    for (let c = 0; c < d.length; c++) {
      let l = d[c];
      Un(e, n, t[Dt], o, l, i, r, t);
    }
  else {
    let c = d,
      l = s[ae];
    (rp(i) && (c.flags |= 128), Mc(n, e, c, l, o, r, !0));
  }
}
function ND(n, e, t, i, o, r, s) {
  let a = i[Rt],
    d = Be(i);
  a !== d && Un(e, n, t, r, a, o, s);
  for (let c = X; c < i.length; c++) {
    let l = i[c];
    Ur(l[b], l, n, e, r, a);
  }
}
function xD(n, e, t, i, o) {
  if (e) o ? n.addClass(t, i) : n.removeClass(t, i);
  else {
    let r = i.indexOf('-') === -1 ? void 0 : gt.DashCase;
    o == null
      ? n.removeStyle(t, i, r)
      : (typeof o == 'string' &&
          o.endsWith('!important') &&
          ((o = o.slice(0, -10)), (r |= gt.Important)),
        n.setStyle(t, i, o, r));
  }
}
function kp(n, e, t, i, o) {
  let r = ut(),
    s = i & 2;
  try {
    (At(-1), s && e.length > K && Mp(n, e, K, !1));
    let a = s ? L.TemplateUpdateStart : L.TemplateCreateStart;
    (U(a, o, t), t(i, o));
  } finally {
    At(r);
    let a = s ? L.TemplateUpdateEnd : L.TemplateCreateEnd;
    U(a, o, t);
  }
}
function $r(n, e, t) {
  (LD(n, e, t), (t.flags & 64) === 64 && BD(n, e, t));
}
function Gi(n, e, t = Ke) {
  let i = e.localNames;
  if (i !== null) {
    let o = e.index + 1;
    for (let r = 0; r < i.length; r += 2) {
      let s = i[r + 1],
        a = s === -1 ? t(e, n) : n[s];
      n[o++] = a;
    }
  }
}
function PD(n, e, t, i) {
  let r =
      i.get(gp, fp) ||
      t === nt.ShadowDom ||
      t === nt.ExperimentalIsolatedShadowDom,
    s = n.selectRootElement(e, r);
  return (RD(s), s);
}
function RD(n) {
  kD(n);
}
var kD = () => null;
function AD(n) {
  return n === 'class'
    ? 'className'
    : n === 'for'
      ? 'htmlFor'
      : n === 'formaction'
        ? 'formAction'
        : n === 'innerHtml'
          ? 'innerHTML'
          : n === 'readonly'
            ? 'readOnly'
            : n === 'tabindex'
              ? 'tabIndex'
              : n;
}
function OD(n, e, t, i, o, r) {
  let s = e[b];
  if (_c(n, s, e, t, i)) {
    kt(n) && FD(e, n.index);
    return;
  }
  (n.type & 3 && (t = AD(t)), Ap(n, e, t, i, o, r));
}
function Ap(n, e, t, i, o, r) {
  if (n.type & 3) {
    let s = Ke(n, e);
    ((i = r != null ? r(i, n.value || '', t) : i), o.setProperty(s, t, i));
  } else n.type & 12;
}
function FD(n, e) {
  let t = Xe(e, n);
  t[S] & 16 || (t[S] |= 64);
}
function LD(n, e, t) {
  let i = t.directiveStart,
    o = t.directiveEnd;
  (kt(t) && gD(e, t, n.data[i + t.componentOffset]),
    n.firstCreatePass || Sr(t, e));
  let r = t.initialInputs;
  for (let s = i; s < o; s++) {
    let a = n.data[s],
      d = Fi(e, n, s, t);
    if ((Wn(d, e), r !== null && jD(e, s - i, d, a, t, r), Qe(a))) {
      let c = Xe(t.index, e);
      c[ne] = Fi(e, n, s, t);
    }
  }
}
function BD(n, e, t) {
  let i = t.directiveStart,
    o = t.directiveEnd,
    r = t.index,
    s = Kg();
  try {
    At(r);
    for (let a = i; a < o; a++) {
      let d = n.data[a],
        c = e[a];
      (cr(a),
        (d.hostBindings !== null || d.hostVars !== 0 || d.hostAttrs !== null) &&
          HD(d, c));
    }
  } finally {
    (At(-1), cr(s));
  }
}
function HD(n, e) {
  n.hostBindings !== null && n.hostBindings(1, e);
}
function bc(n, e) {
  let t = n.directiveRegistry,
    i = null;
  if (t)
    for (let o = 0; o < t.length; o++) {
      let r = t[o];
      Ep(e, r.selectors, !1) && ((i ??= []), Qe(r) ? i.unshift(r) : i.push(r));
    }
  return i;
}
function zD(n, e, t, i, o, r) {
  let s = Ke(n, e);
  VD(e[G], s, r, n.value, t, i, o);
}
function VD(n, e, t, i, o, r, s) {
  if (r == null) n.removeAttribute(e, o, t);
  else {
    let a = s == null ? Ba(r) : s(r, i || '', o);
    n.setAttribute(e, o, a, t);
  }
}
function jD(n, e, t, i, o, r) {
  let s = r[e];
  if (s !== null)
    for (let a = 0; a < s.length; a += 2) {
      let d = s[a],
        c = s[a + 1];
      Hd(i, t, d, c);
    }
}
function Sc(n, e, t, i, o) {
  let r = K + t,
    s = e[b],
    a = o(s, e, n, i, t);
  ((e[r] = a), dn(n, !0));
  let d = n.type === 2;
  return (
    d ? (wp(e[G], a, n), ($g() === 0 || Hn(n)) && Wn(a, e), Gg()) : Wn(a, e),
    hr() && (!d || !zr(n)) && Ic(s, e, a, n),
    n
  );
}
function Tc(n) {
  let e = n;
  return (ld() ? ud() : ((e = e.parent), dn(e, !1)), e);
}
function UD(n, e) {
  let t = n[Dt];
  if (!t) return;
  let i;
  try {
    i = t.get(ln, null);
  } catch {
    i = null;
  }
  i?.(e);
}
function _c(n, e, t, i, o) {
  let r = n.inputs?.[i],
    s = n.hostDirectiveInputs?.[i],
    a = !1;
  if (s)
    for (let d = 0; d < s.length; d += 2) {
      let c = s[d],
        l = s[d + 1],
        u = e.data[c];
      (Hd(u, t[c], l, o), (a = !0));
    }
  if (r)
    for (let d of r) {
      let c = t[d],
        l = e.data[d];
      (Hd(l, c, i, o), (a = !0));
    }
  return a;
}
function $D(n, e) {
  let t = Xe(e, n),
    i = t[b];
  GD(i, t);
  let o = t[Ze];
  (o !== null && t[nn] === null && (t[nn] = hp(o, t[Dt])), U(L.ComponentStart));
  try {
    Nc(i, t, t[ne]);
  } finally {
    U(L.ComponentEnd, t[ne]);
  }
}
function GD(n, e) {
  for (let t = e.length; t < n.blueprint.length; t++) e.push(n.blueprint[t]);
}
function Nc(n, e, t) {
  ur(e);
  try {
    let i = n.viewQuery;
    i !== null && Ld(1, i, t);
    let o = n.template;
    (o !== null && kp(n, e, o, 1, t),
      n.firstCreatePass && (n.firstCreatePass = !1),
      e[lt]?.finishViewCreation(n),
      n.staticContentQueries && pp(n, e),
      n.staticViewQueries && Ld(2, n.viewQuery, t));
    let r = n.components;
    r !== null && WD(e, r);
  } catch (i) {
    throw (
      n.firstCreatePass &&
        ((n.incompleteFirstPass = !0), (n.firstCreatePass = !1)),
      i
    );
  } finally {
    ((e[S] &= -5), fr());
  }
}
function WD(n, e) {
  for (let t = 0; t < e.length; t++) $D(n, e[t]);
}
function Wi(n, e, t, i) {
  let o = M(null);
  try {
    let r = e.tView,
      a = n[S] & 4096 ? 4096 : 16,
      d = vc(
        n,
        r,
        t,
        a,
        null,
        e,
        null,
        null,
        i?.injector ?? null,
        i?.embeddedViewInjector ?? null,
        i?.dehydratedView ?? null,
      ),
      c = n[e.index];
    d[xt] = c;
    let l = n[lt];
    return (l !== null && (d[lt] = l.createEmbeddedView(r)), Nc(r, d, t), d);
  } finally {
    M(o);
  }
}
function qn(n, e) {
  return !e || e.firstChild === null || rp(n);
}
function Li(n, e, t, i, o = !1) {
  for (; t !== null;) {
    if (t.type === 128) {
      t = o ? t.projectionNext : t.next;
      continue;
    }
    let r = e[t.index];
    (r !== null && i.push(Be(r)), Ye(r) && Op(r, i));
    let s = t.type;
    if (s & 8) Li(n, e, t.child, i);
    else if (s & 32) {
      let a = Dc(t, e),
        d;
      for (; (d = a());) i.push(d);
    } else if (s & 16) {
      let a = Pp(e, t);
      if (Array.isArray(a)) i.push(...a);
      else {
        let d = Nt(e[_e]);
        Li(d[b], d, a, i, !0);
      }
    }
    t = o ? t.projectionNext : t.next;
  }
  return i;
}
function Op(n, e) {
  for (let t = X; t < n.length; t++) {
    let i = n[t],
      o = i[b].firstChild;
    o !== null && Li(i[b], i, o, e);
  }
  n[Rt] !== n[Ze] && e.push(n[Rt]);
}
function Fp(n) {
  if (n[ir] !== null) {
    for (let e of n[ir]) e.impl.addSequence(e);
    n[ir].length = 0;
  }
}
var Lp = [];
function qD(n) {
  return n[Re] ?? ZD(n);
}
function ZD(n) {
  let e = Lp.pop() ?? Object.create(QD);
  return ((e.lView = n), e);
}
function YD(n) {
  n.lView[Re] !== n && ((n.lView = null), Lp.push(n));
}
var QD = y(h({}, jt), {
  consumerIsAlwaysLive: !0,
  kind: 'template',
  consumerMarkedDirty: (n) => {
    Vn(n.lView);
  },
  consumerOnSignalRead() {
    this.lView[Re] = this;
  },
});
function KD(n) {
  let e = n[Re] ?? Object.create(XD);
  return ((e.lView = n), e);
}
var XD = y(h({}, jt), {
  consumerIsAlwaysLive: !0,
  kind: 'template',
  consumerMarkedDirty: (n) => {
    let e = Nt(n.lView);
    for (; e && !Bp(e[b]);) e = Nt(e);
    e && td(e);
  },
  consumerOnSignalRead() {
    this.lView[Re] = this;
  },
});
function Bp(n) {
  return n.type !== 2;
}
function Hp(n) {
  if (n[_t] === null) return;
  let e = !0;
  for (; e;) {
    let t = !1;
    for (let i of n[_t])
      i.dirty &&
        ((t = !0),
        i.zone === null || Zone.current === i.zone
          ? i.run()
          : i.zone.run(() => i.run()));
    e = t && !!(n[S] & 8192);
  }
}
var JD = 100;
function zp(n, e = 0) {
  let i = n[ct].rendererFactory,
    o = !1;
  o || i.begin?.();
  try {
    eE(n, e);
  } finally {
    o || i.end?.();
  }
}
function eE(n, e) {
  let t = fd();
  try {
    (vi(!0), jd(n, e));
    let i = 0;
    for (; xi(n);) {
      if (i === JD) throw new N(103, !1);
      (i++, jd(n, 1));
    }
  } finally {
    vi(t);
  }
}
function tE(n, e, t, i) {
  if (an(e)) return;
  let o = e[S],
    r = !1,
    s = !1;
  ur(e);
  let a = !0,
    d = null,
    c = null;
  r ||
    (Bp(n)
      ? ((c = qD(e)), (d = Ut(c)))
      : _o() === null
        ? ((a = !1), (c = KD(e)), (d = Ut(c)))
        : e[Re] && ($t(e[Re]), (e[Re] = null)));
  try {
    (ed(e), Zg(n.bindingStartIndex), t !== null && kp(n, e, t, 2, i));
    let l = (o & 3) === 3;
    if (!r)
      if (l) {
        let g = n.preOrderCheckHooks;
        g !== null && vr(e, g, null);
      } else {
        let g = n.preOrderHooks;
        (g !== null && wr(e, g, 0, null), Id(e, 0));
      }
    if (
      (s || nE(e), Hp(e), Vp(e, 0), n.contentQueries !== null && pp(n, e), !r)
    )
      if (l) {
        let g = n.contentCheckHooks;
        g !== null && vr(e, g);
      } else {
        let g = n.contentHooks;
        (g !== null && wr(e, g, 1), Id(e, 1));
      }
    oE(n, e);
    let u = n.components;
    u !== null && Up(e, u, 0);
    let f = n.viewQuery;
    if ((f !== null && Ld(2, f, i), !r))
      if (l) {
        let g = n.viewCheckHooks;
        g !== null && vr(e, g);
      } else {
        let g = n.viewHooks;
        (g !== null && wr(e, g, 2), Id(e, 2));
      }
    if ((n.firstUpdatePass === !0 && (n.firstUpdatePass = !1), e[nr])) {
      for (let g of e[nr]) g();
      e[nr] = null;
    }
    r || (Fp(e), (e[S] &= -73));
  } catch (l) {
    throw (r || Vn(e), l);
  } finally {
    (c !== null && (Tn(c, d), a && YD(c)), fr());
  }
}
function Vp(n, e) {
  for (let t = ap(n); t !== null; t = dp(t))
    for (let i = X; i < t.length; i++) {
      let o = t[i];
      jp(o, e);
    }
}
function nE(n) {
  for (let e = ap(n); e !== null; e = dp(e)) {
    if (!(e[S] & 2)) continue;
    let t = e[sn];
    for (let i = 0; i < t.length; i++) {
      let o = t[i];
      td(o);
    }
  }
}
function iE(n, e, t) {
  U(L.ComponentStart);
  let i = Xe(e, n);
  try {
    jp(i, t);
  } finally {
    U(L.ComponentEnd, i[ne]);
  }
}
function jp(n, e) {
  sr(n) && jd(n, e);
}
function jd(n, e) {
  let i = n[b],
    o = n[S],
    r = n[Re],
    s = !!(e === 0 && o & 16);
  if (
    ((s ||= !!(o & 64 && e === 0)),
    (s ||= !!(o & 1024)),
    (s ||= !!(r?.dirty && ui(r))),
    (s ||= !1),
    r && (r.dirty = !1),
    (n[S] &= -9217),
    s)
  )
    tE(i, n, i.template, n[ne]);
  else if (o & 8192) {
    let a = M(null);
    try {
      (Hp(n), Vp(n, 1));
      let d = i.components;
      (d !== null && Up(n, d, 1), Fp(n));
    } finally {
      M(a);
    }
  }
}
function Up(n, e, t) {
  for (let i = 0; i < e.length; i++) iE(n, e[i], t);
}
function oE(n, e) {
  let t = n.hostBindingOpCodes;
  if (t !== null)
    try {
      for (let i = 0; i < t.length; i++) {
        let o = t[i];
        if (o < 0) At(~o);
        else {
          let r = o,
            s = t[++i],
            a = t[++i];
          Qg(s, r);
          let d = e[r];
          U(L.HostBindingsUpdateStart, d);
          try {
            a(2, d);
          } finally {
            U(L.HostBindingsUpdateEnd, d);
          }
        }
      }
    } finally {
      At(-1);
    }
}
function xc(n, e) {
  let t = fd() ? 64 : 1088;
  for (n[ct].changeDetectionScheduler?.notify(e); n;) {
    n[S] |= t;
    let i = Nt(n);
    if (zn(n) && !i) return n;
    n = i;
  }
  return null;
}
function $p(n, e, t, i) {
  return [n, !0, 0, e, null, i, null, t, null, null];
}
function Gp(n, e) {
  let t = X + e;
  if (t < n.length) return n[t];
}
function qi(n, e, t, i = !0) {
  let o = e[b];
  if ((rE(o, e, n, t), i)) {
    let s = Vd(t, n),
      a = e[G],
      d = a.parentNode(n[Rt]);
    d !== null && DD(o, n[Me], a, e, d, s);
  }
  let r = e[nn];
  r !== null && r.firstChild !== null && (r.firstChild = null);
}
function Wp(n, e) {
  let t = Bi(n, e);
  return (t !== void 0 && jr(t[b], t), t);
}
function Bi(n, e) {
  if (n.length <= X) return;
  let t = X + e,
    i = n[t];
  if (i) {
    let o = i[xt];
    (o !== null && o !== n && Cc(o, i), e > 0 && (n[t - 1][Le] = i[Le]));
    let r = bi(n, X + e);
    wD(i[b], i);
    let s = r[lt];
    (s !== null && s.detachView(r[b]),
      (i[ae] = null),
      (i[Le] = null),
      (i[S] &= -129));
  }
  return i;
}
function rE(n, e, t, i) {
  let o = X + i,
    r = t.length;
  (i > 0 && (t[o - 1][Le] = e),
    i < r - X ? ((e[Le] = t[o]), Va(t, X + i, e)) : (t.push(e), (e[Le] = null)),
    (e[ae] = t));
  let s = e[xt];
  s !== null && t !== s && qp(s, e);
  let a = e[lt];
  (a !== null && a.insertView(n), ar(e), (e[S] |= 128));
}
function qp(n, e) {
  let t = n[sn],
    i = e[ae];
  if (Ct(i)) n[S] |= 2;
  else {
    let o = i[ae][_e];
    e[_e] !== o && (n[S] |= 2);
  }
  t === null ? (n[sn] = [e]) : t.push(e);
}
var Zn = class {
  _lView;
  _cdRefInjectingView;
  _appRef = null;
  _attachedToViewContainer = !1;
  exhaustive;
  get rootNodes() {
    let e = this._lView,
      t = e[b];
    return Li(t, e, t.firstChild, []);
  }
  constructor(e, t) {
    ((this._lView = e), (this._cdRefInjectingView = t));
  }
  get context() {
    return this._lView[ne];
  }
  set context(e) {
    this._lView[ne] = e;
  }
  get destroyed() {
    return an(this._lView);
  }
  destroy() {
    if (this._appRef) this._appRef.detachView(this);
    else if (this._attachedToViewContainer) {
      let e = this._lView[ae];
      if (Ye(e)) {
        let t = e[Ni],
          i = t ? t.indexOf(this) : -1;
        i > -1 && (Bi(e, i), bi(t, i));
      }
      this._attachedToViewContainer = !1;
    }
    jr(this._lView[b], this._lView);
  }
  onDestroy(e) {
    nd(this._lView, e);
  }
  markForCheck() {
    xc(this._cdRefInjectingView || this._lView, 4);
  }
  detach() {
    this._lView[S] &= -129;
  }
  reattach() {
    (ar(this._lView), (this._lView[S] |= 128));
  }
  detectChanges() {
    ((this._lView[S] |= 1024), zp(this._lView));
  }
  checkNoChanges() {}
  attachToViewContainerRef() {
    if (this._appRef) throw new N(902, !1);
    this._attachedToViewContainer = !0;
  }
  detachFromAppRef() {
    this._appRef = null;
    let e = zn(this._lView),
      t = this._lView[xt];
    (t !== null && !e && Cc(t, this._lView), _p(this._lView[b], this._lView));
  }
  attachToAppRef(e) {
    if (this._attachedToViewContainer) throw new N(902, !1);
    this._appRef = e;
    let t = zn(this._lView),
      i = this._lView[xt];
    (i !== null && !t && qp(i, this._lView), ar(this._lView));
  }
};
var Yn = (() => {
  class n {
    _declarationLView;
    _declarationTContainer;
    elementRef;
    static __NG_ELEMENT_ID__ = sE;
    constructor(t, i, o) {
      ((this._declarationLView = t),
        (this._declarationTContainer = i),
        (this.elementRef = o));
    }
    get ssrId() {
      return this._declarationTContainer.tView?.ssrId || null;
    }
    createEmbeddedView(t, i) {
      return this.createEmbeddedViewImpl(t, i);
    }
    createEmbeddedViewImpl(t, i, o) {
      let r = Wi(this._declarationLView, this._declarationTContainer, t, {
        embeddedViewInjector: i,
        dehydratedView: o,
      });
      return new Zn(r);
    }
  }
  return n;
})();
function sE() {
  return Pc(be(), T());
}
function Pc(n, e) {
  return n.type & 4 ? new Yn(e, n, Kn(n, e)) : null;
}
function yn(n, e, t, i, o) {
  let r = n.data[e];
  if (r === null) ((r = aE(n, e, t, i, o)), Yg() && (r.flags |= 32));
  else if (r.type & 64) {
    ((r.type = t), (r.value = i), (r.attrs = o));
    let s = Wg();
    r.injectorIndex = s === null ? -1 : s.injectorIndex;
  }
  return (dn(r, !0), r);
}
function aE(n, e, t, i, o) {
  let r = cd(),
    s = ld(),
    a = s ? r : r && r.parent,
    d = (n.data[e] = cE(n, a, t, e, i, o));
  return (dE(n, d, r, s), d);
}
function dE(n, e, t, i) {
  (n.firstChild === null && (n.firstChild = e),
    t !== null &&
      (i
        ? t.child == null && e.parent !== null && (t.child = e)
        : t.next === null && ((t.next = e), (e.prev = t))));
}
function cE(n, e, t, i, o, r) {
  let s = e ? e.injectorIndex : -1,
    a = 0;
  return (
    sd() && (a |= 128),
    {
      type: t,
      index: i,
      insertBeforeIndex: null,
      injectorIndex: s,
      directiveStart: -1,
      directiveEnd: -1,
      directiveStylingLast: -1,
      componentOffset: -1,
      controlDirectiveIndex: -1,
      customControlIndex: -1,
      propertyBindings: null,
      flags: a,
      providerIndexes: 0,
      value: o,
      namespace: yd(),
      attrs: r,
      mergedAttrs: null,
      localNames: null,
      initialInputs: null,
      inputs: null,
      hostDirectiveInputs: null,
      outputs: null,
      hostDirectiveOutputs: null,
      directiveToIndex: null,
      tView: null,
      next: null,
      prev: null,
      projectionNext: null,
      child: null,
      parent: e,
      projection: null,
      styles: null,
      stylesWithoutHost: null,
      residualStyles: void 0,
      classes: null,
      classesWithoutHost: null,
      residualClasses: void 0,
      classBindings: 0,
      styleBindings: 0,
    }
  );
}
function lE(n) {
  let e = n[Qa] ?? [],
    i = n[ae][G],
    o = [];
  for (let r of e) r.data[up] !== void 0 ? o.push(r) : uE(r, i);
  n[Qa] = o;
}
function uE(n, e) {
  let t = 0,
    i = n.firstChild;
  if (i) {
    let o = n.data[lp];
    for (; t < o;) {
      let r = i.nextSibling;
      (vp(e, i, !1), (i = r), t++);
    }
  }
}
var fE = () => null,
  gE = () => null;
function Nr(n, e) {
  return fE(n, e);
}
function Zp(n, e, t) {
  return gE(n, e, t);
}
var Yp = class {},
  Gr = class {},
  Ud = class {
    resolveComponentFactory(e) {
      throw new N(917, !1);
    }
  },
  Zi = class {
    static NULL = new Ud();
  },
  hn = class {},
  Wr = (() => {
    class n {
      destroyNode = null;
      static __NG_ELEMENT_ID__ = () => hE();
    }
    return n;
  })();
function hE() {
  let n = T(),
    e = be(),
    t = Xe(e.index, n);
  return (Ct(t) ? t : n)[G];
}
var Qp = (() => {
  class n {
    static ɵprov = I({ token: n, providedIn: 'root', factory: () => null });
  }
  return n;
})();
var Er = {},
  $d = class {
    injector;
    parentInjector;
    constructor(e, t) {
      ((this.injector = e), (this.parentInjector = t));
    }
    get(e, t, i) {
      let o = this.injector.get(e, Er, i);
      return o !== Er || t === Er ? o : this.parentInjector.get(e, t, i);
    }
  };
function xr(n, e, t) {
  let i = t ? n.styles : null,
    o = t ? n.classes : null,
    r = 0;
  if (e !== null)
    for (let s = 0; s < e.length; s++) {
      let a = e[s];
      if (typeof a == 'number') r = a;
      else if (r == 1) o = Wo(o, a);
      else if (r == 2) {
        let d = a,
          c = e[++s];
        i = Wo(i, d + ': ' + c + ';');
      }
    }
  (t ? (n.styles = i) : (n.stylesWithoutHost = i),
    t ? (n.classes = o) : (n.classesWithoutHost = o));
}
function Jn(n, e = 0) {
  let t = T();
  if (t === null) return V(n, e);
  let i = be();
  return np(i, t, se(n), e);
}
function Kp(n, e, t, i, o) {
  let r = i === null ? null : { '': -1 },
    s = o(n, t);
  if (s !== null) {
    let a = s,
      d = null,
      c = null;
    for (let l of s)
      if (l.resolveHostDirectives !== null) {
        [a, d, c] = l.resolveHostDirectives(s);
        break;
      }
    yE(n, e, t, a, r, d, c);
  }
  r !== null && i !== null && pE(t, i, r);
}
function pE(n, e, t) {
  let i = (n.localNames = []);
  for (let o = 0; o < e.length; o += 2) {
    let r = t[e[o + 1]];
    if (r == null) throw new N(-301, !1);
    i.push(e[o], r);
  }
}
function mE(n, e, t) {
  ((e.componentOffset = t), (n.components ??= []).push(e.index));
}
function yE(n, e, t, i, o, r, s) {
  let a = i.length,
    d = null;
  for (let f = 0; f < a; f++) {
    let g = i[f];
    (d === null && Qe(g) && ((d = g), mE(n, t, f)), Ad(Sr(t, e), n, g.type));
  }
  (IE(t, n.data.length, a),
    d?.viewProvidersResolver && d.viewProvidersResolver(d));
  for (let f = 0; f < a; f++) {
    let g = i[f];
    g.providersResolver && g.providersResolver(g);
  }
  let c = !1,
    l = !1,
    u = Ip(n, e, a, null);
  a > 0 && (t.directiveToIndex = new Map());
  for (let f = 0; f < a; f++) {
    let g = i[f];
    if (
      ((t.mergedAttrs = Gn(t.mergedAttrs, g.hostAttrs)),
      wE(n, t, e, u, g),
      CE(u, g, o),
      s !== null && s.has(g))
    ) {
      let [v, D] = s.get(g);
      t.directiveToIndex.set(g.type, [
        u,
        v + t.directiveStart,
        D + t.directiveStart,
      ]);
    } else (r === null || !r.has(g)) && t.directiveToIndex.set(g.type, u);
    (g.contentQueries !== null && (t.flags |= 4),
      (g.hostBindings !== null || g.hostAttrs !== null || g.hostVars !== 0) &&
        (t.flags |= 64));
    let p = g.type.prototype;
    (!c &&
      (p.ngOnChanges || p.ngOnInit || p.ngDoCheck) &&
      ((n.preOrderHooks ??= []).push(t.index), (c = !0)),
      !l &&
        (p.ngOnChanges || p.ngDoCheck) &&
        ((n.preOrderCheckHooks ??= []).push(t.index), (l = !0)),
      u++);
  }
  vE(n, t, r);
}
function vE(n, e, t) {
  for (let i = e.directiveStart; i < e.directiveEnd; i++) {
    let o = n.data[i];
    if (t === null || !t.has(o)) (Th(0, e, o, i), Th(1, e, o, i), Nh(e, i, !1));
    else {
      let r = t.get(o);
      (_h(0, e, r, i), _h(1, e, r, i), Nh(e, i, !0));
    }
  }
}
function Th(n, e, t, i) {
  let o = n === 0 ? t.inputs : t.outputs;
  for (let r in o)
    if (o.hasOwnProperty(r)) {
      let s;
      (n === 0 ? (s = e.inputs ??= {}) : (s = e.outputs ??= {}),
        (s[r] ??= []),
        s[r].push(i),
        Xp(e, r));
    }
}
function _h(n, e, t, i) {
  let o = n === 0 ? t.inputs : t.outputs;
  for (let r in o)
    if (o.hasOwnProperty(r)) {
      let s = o[r],
        a;
      (n === 0
        ? (a = e.hostDirectiveInputs ??= {})
        : (a = e.hostDirectiveOutputs ??= {}),
        (a[s] ??= []),
        a[s].push(i, r),
        Xp(e, s));
    }
}
function Xp(n, e) {
  e === 'class' ? (n.flags |= 8) : e === 'style' && (n.flags |= 16);
}
function Nh(n, e, t) {
  let { attrs: i, inputs: o, hostDirectiveInputs: r } = n;
  if (i === null || (!t && o === null) || (t && r === null) || mc(n)) {
    ((n.initialInputs ??= []), n.initialInputs.push(null));
    return;
  }
  let s = null,
    a = 0;
  for (; a < i.length;) {
    let d = i[a];
    if (d === 0) {
      a += 4;
      continue;
    } else if (d === 5) {
      a += 2;
      continue;
    } else if (typeof d == 'number') break;
    if (!t && o.hasOwnProperty(d)) {
      let c = o[d];
      for (let l of c)
        if (l === e) {
          ((s ??= []), s.push(d, i[a + 1]));
          break;
        }
    } else if (t && r.hasOwnProperty(d)) {
      let c = r[d];
      for (let l = 0; l < c.length; l += 2)
        if (c[l] === e) {
          ((s ??= []), s.push(c[l + 1], i[a + 1]));
          break;
        }
    }
    a += 2;
  }
  ((n.initialInputs ??= []), n.initialInputs.push(s));
}
function wE(n, e, t, i, o) {
  n.data[i] = o;
  let r = o.factory || (o.factory = Yt(o.type, !0)),
    s = new fn(r, Qe(o), Jn, null);
  ((n.blueprint[i] = s), (t[i] = s), DE(n, e, i, Ip(n, t, o.hostVars, Ve), o));
}
function DE(n, e, t, i, o) {
  let r = o.hostBindings;
  if (r) {
    let s = n.hostBindingOpCodes;
    s === null && (s = n.hostBindingOpCodes = []);
    let a = ~e.index;
    (EE(s) != a && s.push(a), s.push(t, i, r));
  }
}
function EE(n) {
  let e = n.length;
  for (; e > 0;) {
    let t = n[--e];
    if (typeof t == 'number' && t < 0) return t;
  }
  return 0;
}
function CE(n, e, t) {
  if (t) {
    if (e.exportAs)
      for (let i = 0; i < e.exportAs.length; i++) t[e.exportAs[i]] = n;
    Qe(e) && (t[''] = n);
  }
}
function IE(n, e, t) {
  ((n.flags |= 1),
    (n.directiveStart = e),
    (n.directiveEnd = e + t),
    (n.providerIndexes = e));
}
function Rc(n, e, t, i, o, r, s, a) {
  let d = e[b],
    c = d.consts,
    l = He(c, s),
    u = yn(d, n, t, i, l);
  return (
    r && Kp(d, e, u, He(c, a), o),
    (u.mergedAttrs = Gn(u.mergedAttrs, u.attrs)),
    u.attrs !== null && xr(u, u.attrs, !1),
    u.mergedAttrs !== null && xr(u, u.mergedAttrs, !0),
    d.queries !== null && d.queries.elementStart(d, u),
    u
  );
}
function kc(n, e) {
  (Zh(n, e), Ka(e) && n.queries.elementEnd(e));
}
function ME(n, e, t, i, o, r) {
  let s = e.consts,
    a = He(s, o),
    d = yn(e, n, t, i, a);
  if (((d.mergedAttrs = Gn(d.mergedAttrs, d.attrs)), r != null)) {
    let c = He(s, r);
    d.localNames = [];
    for (let l = 0; l < c.length; l += 2) d.localNames.push(c[l], -1);
  }
  return (
    d.attrs !== null && xr(d, d.attrs, !1),
    d.mergedAttrs !== null && xr(d, d.mergedAttrs, !0),
    e.queries !== null && e.queries.elementStart(e, d),
    d
  );
}
function Jp(n, e, t) {
  return (n[e] = t);
}
function it(n, e, t) {
  if (t === Ve) return !1;
  let i = n[e];
  return Object.is(i, t) ? !1 : ((n[e] = t), !0);
}
function bE(n, e, t, i) {
  let o = it(n, e, t);
  return it(n, e + 1, i) || o;
}
function Cr(n, e, t) {
  return function i(o) {
    let r = i.__ngNativeEl__;
    r !== void 0 && Hw(o, r);
    let s = kt(n) ? Xe(n.index, e) : e;
    xc(s, 5);
    let a = e[ne],
      d = xh(e, a, t, o),
      c = i.__ngNextListenerFn__;
    for (; c;) ((d = xh(e, a, c, o) && d), (c = c.__ngNextListenerFn__));
    return d;
  };
}
function xh(n, e, t, i) {
  let o = M(null);
  try {
    return (U(L.OutputStart, e, t), t(i) !== !1);
  } catch (r) {
    return (UD(n, r), !1);
  } finally {
    (U(L.OutputEnd, e, t), M(o));
  }
}
function em(n, e, t, i, o, r, s, a) {
  let d = Hn(n),
    c = !1,
    l = null;
  if ((!i && d && (l = TE(e, t, r, n.index)), l !== null)) {
    let u = l.__ngLastListenerFn__ || l;
    ((u.__ngNextListenerFn__ = s), (l.__ngLastListenerFn__ = s), (c = !0));
  } else {
    let u = Ke(n, t),
      f = i ? i(u) : u;
    (Vw(t, f, r, a), i || (a.__ngNativeEl__ = u));
    let g = o.listen(f, r, a);
    if (!SE(r)) {
      let p = i ? (v) => i(Be(v[n.index])) : n.index;
      tm(p, e, t, r, a, g, !1);
    }
  }
  return c;
}
function SE(n) {
  return n.startsWith('animation') || n.startsWith('transition');
}
function TE(n, e, t, i) {
  let o = n.cleanup;
  if (o != null)
    for (let r = 0; r < o.length - 1; r += 2) {
      let s = o[r];
      if (s === t && o[r + 1] === i) {
        let a = e[Ln],
          d = o[r + 2];
        return a && a.length > d ? a[d] : null;
      }
      typeof s == 'string' && (r += 2);
    }
  return null;
}
function tm(n, e, t, i, o, r, s) {
  let a = e.firstCreatePass ? od(e) : null,
    d = id(t),
    c = d.length;
  (d.push(o, r), a && a.push(i, n, c, (c + 1) * (s ? -1 : 1)));
}
function Ph(n, e, t, i, o, r) {
  let s = e[t],
    a = e[b],
    c = a.data[t].outputs[i],
    u = s[c].subscribe(r);
  tm(n.index, a, e, o, r, u, !0);
}
var Gd = Symbol('BINDING');
function nm(n) {
  return n.debugInfo?.className || n.type.name || null;
}
var Pr = class extends Zi {
  ngModule;
  constructor(e) {
    (super(), (this.ngModule = e));
  }
  resolveComponentFactory(e) {
    let t = en(e);
    return new Hi(t, this.ngModule);
  }
};
function _E(n) {
  return Object.keys(n).map((e) => {
    let [t, i, o] = n[e],
      r = {
        propName: t,
        templateName: e,
        isSignal: (i & Vr.SignalBased) !== 0,
      };
    return (o && (r.transform = o), r);
  });
}
function NE(n) {
  return Object.keys(n).map((e) => ({ propName: n[e], templateName: e }));
}
function xE(n, e, t) {
  let i = e instanceof Fe ? e : e?.injector;
  return (
    i &&
      n.getStandaloneInjector !== null &&
      (i = n.getStandaloneInjector(i) || i),
    i ? new $d(t, i) : t
  );
}
function PE(n) {
  let e = n.get(hn, null);
  if (e === null) throw new N(407, !1);
  let t = n.get(Qp, null),
    i = n.get(Xt, null),
    o = n.get(Xn, null, { optional: !0 });
  return {
    rendererFactory: e,
    sanitizer: t,
    changeDetectionScheduler: i,
    ngReflect: !1,
    tracingService: o,
  };
}
function RE(n, e) {
  let t = im(n);
  return mp(e, t, t === 'svg' ? Xa : t === 'math' ? Bg : null);
}
function kE(n) {
  if (n?.toLowerCase() === 'script') throw new N(905, !1);
}
function im(n) {
  return (n.selectors[0][0] || 'div').toLowerCase();
}
var Hi = class extends Gr {
  componentDef;
  ngModule;
  selector;
  componentType;
  ngContentSelectors;
  isBoundToModule;
  cachedInputs = null;
  cachedOutputs = null;
  get inputs() {
    return (
      (this.cachedInputs ??= _E(this.componentDef.inputs)),
      this.cachedInputs
    );
  }
  get outputs() {
    return (
      (this.cachedOutputs ??= NE(this.componentDef.outputs)),
      this.cachedOutputs
    );
  }
  constructor(e, t) {
    (super(),
      (this.componentDef = e),
      (this.ngModule = t),
      (this.componentType = e.type),
      (this.selector = cD(e.selectors)),
      (this.ngContentSelectors = e.ngContentSelectors ?? []),
      (this.isBoundToModule = !!t));
  }
  create(e, t, i, o, r, s) {
    U(L.DynamicComponentStart);
    let a = M(null);
    try {
      let d = this.componentDef,
        c = xE(d, o || this.ngModule, e),
        l = PE(c),
        u = l.tracingService;
      return u && u.componentCreate
        ? u.componentCreate(nm(d), () =>
            this.createComponentRef(l, c, t, i, r, s),
          )
        : this.createComponentRef(l, c, t, i, r, s);
    } finally {
      M(a);
    }
  }
  createComponentRef(e, t, i, o, r, s) {
    let a = this.componentDef,
      d = AE(o, a, s, r),
      c = e.rendererFactory.createRenderer(null, a),
      l = o ? PD(c, o, a.encapsulation, t) : RE(a, c);
    kE(l?.tagName);
    let u =
        s?.some(Rh) ||
        r?.some((p) => typeof p != 'function' && p.bindings.some(Rh)),
      f = vc(
        null,
        d,
        null,
        512 | Cp(a),
        null,
        null,
        e,
        c,
        t,
        null,
        hp(l, t, !0),
      );
    ((f[K] = l), ur(f));
    let g = null;
    try {
      let p = Rc(K, f, 2, '#host', () => d.directiveRegistry, !0, 0);
      (wp(c, l, p),
        Wn(l, f),
        $r(d, f, p),
        hc(d, p, f),
        kc(d, p),
        i !== void 0 && FE(p, this.ngContentSelectors, i),
        (g = Xe(p.index, f)),
        (f[ne] = g[ne]),
        Nc(d, f, null));
    } catch (p) {
      throw (g !== null && Fd(g), Fd(f), p);
    } finally {
      (U(L.DynamicComponentEnd), fr());
    }
    return new Rr(this.componentType, f, !!u);
  }
};
function AE(n, e, t, i) {
  let o = n ? ['ng-version', '21.2.25'] : lD(e.selectors[0]),
    r = null,
    s = null,
    a = 0;
  if (t)
    for (let l of t)
      ((a += l[Gd].requiredVars),
        l.create && ((l.targetIdx = 0), (r ??= []).push(l)),
        l.update && ((l.targetIdx = 0), (s ??= []).push(l)));
  if (i)
    for (let l = 0; l < i.length; l++) {
      let u = i[l];
      if (typeof u != 'function')
        for (let f of u.bindings) {
          a += f[Gd].requiredVars;
          let g = l + 1;
          (f.create && ((f.targetIdx = g), (r ??= []).push(f)),
            f.update && ((f.targetIdx = g), (s ??= []).push(f)));
        }
    }
  let d = [e];
  if (i)
    for (let l of i) {
      let u = typeof l == 'function' ? l : l.type,
        f = Qo(u);
      d.push(f);
    }
  return yc(0, null, OE(r, s), 1, a, d, null, null, null, [o], null);
}
function OE(n, e) {
  return !n && !e
    ? null
    : (t) => {
        if (t & 1 && n) for (let i of n) i.create();
        if (t & 2 && e) for (let i of e) i.update();
      };
}
function Rh(n) {
  let e = n[Gd].kind;
  return e === 'input' || e === 'twoWay';
}
var Rr = class extends Yp {
  _rootLView;
  _hasInputBindings;
  instance;
  hostView;
  changeDetectorRef;
  componentType;
  location;
  previousInputValues = null;
  _tNode;
  constructor(e, t, i) {
    (super(),
      (this._rootLView = t),
      (this._hasInputBindings = i),
      (this._tNode = or(t[b], K)),
      (this.location = Kn(this._tNode, t)),
      (this.instance = Xe(this._tNode.index, t)[ne]),
      (this.hostView = this.changeDetectorRef = new Zn(t, void 0)),
      (this.componentType = e));
  }
  setInput(e, t) {
    this._hasInputBindings;
    let i = this._tNode;
    if (
      ((this.previousInputValues ??= new Map()),
      this.previousInputValues.has(e) &&
        Object.is(this.previousInputValues.get(e), t))
    )
      return;
    let o = this._rootLView,
      r = _c(i, o[b], o, e, t);
    this.previousInputValues.set(e, t);
    let s = Xe(i.index, o);
    xc(s, 1);
  }
  get injector() {
    return new un(this._tNode, this._rootLView);
  }
  destroy() {
    this.hostView.destroy();
  }
  onDestroy(e) {
    this.hostView.onDestroy(e);
  }
};
function FE(n, e, t) {
  let i = (n.projection = []);
  for (let o = 0; o < e.length; o++) {
    let r = t[o];
    i.push(r != null && r.length ? Array.from(r) : null);
  }
}
var ei = (() => {
  class n {
    static __NG_ELEMENT_ID__ = LE;
  }
  return n;
})();
function LE() {
  let n = be();
  return om(n, T());
}
var Wd = class n extends ei {
  _lContainer;
  _hostTNode;
  _hostLView;
  constructor(e, t, i) {
    (super(),
      (this._lContainer = e),
      (this._hostTNode = t),
      (this._hostLView = i));
  }
  get element() {
    return Kn(this._hostTNode, this._hostLView);
  }
  get injector() {
    return new un(this._hostTNode, this._hostLView);
  }
  get parentInjector() {
    let e = uc(this._hostTNode, this._hostLView);
    if (Qh(e)) {
      let t = br(e, this._hostLView),
        i = Mr(e),
        o = t[b].data[i + 8];
      return new un(o, t);
    } else return new un(null, this._hostLView);
  }
  clear() {
    for (; this.length > 0;) this.remove(this.length - 1);
  }
  get(e) {
    let t = kh(this._lContainer);
    return (t !== null && t[e]) || null;
  }
  get length() {
    return this._lContainer.length - X;
  }
  createEmbeddedView(e, t, i) {
    let o, r;
    typeof i == 'number'
      ? (o = i)
      : i != null && ((o = i.index), (r = i.injector));
    let s = Nr(this._lContainer, e.ssrId),
      a = e.createEmbeddedViewImpl(t || {}, r, s);
    return (this.insertImpl(a, o, qn(this._hostTNode, s)), a);
  }
  createComponent(e, t, i, o, r, s, a) {
    let d = e && !fw(e),
      c;
    if (d) c = t;
    else {
      let D = t || {};
      ((c = D.index),
        (i = D.injector),
        (o = D.projectableNodes),
        (r = D.environmentInjector || D.ngModuleRef),
        (s = D.directives),
        (a = D.bindings));
    }
    let l = d ? e : new Hi(en(e)),
      u = i || this.parentInjector;
    if (!r && l.ngModule == null) {
      let C = (d ? u : this.parentInjector).get(Fe, null);
      C && (r = C);
    }
    let f = en(l.componentType ?? {}),
      g = Nr(this._lContainer, f?.id ?? null),
      p = g?.firstChild ?? null,
      v = l.create(u, o, p, r, s, a);
    return (this.insertImpl(v.hostView, c, qn(this._hostTNode, g)), v);
  }
  insert(e, t) {
    return this.insertImpl(e, t, !0);
  }
  insertImpl(e, t, i) {
    let o = e._lView;
    if (zg(o)) {
      let a = this.indexOf(e);
      if (a !== -1) this.detach(a);
      else {
        let d = o[ae],
          c = new n(d, d[Me], d[ae]);
        c.detach(c.indexOf(e));
      }
    }
    let r = this._adjustIndex(t),
      s = this._lContainer;
    return (qi(s, o, r, i), e.attachToViewContainerRef(), Va(Sd(s), r, e), e);
  }
  move(e, t) {
    return this.insert(e, t);
  }
  indexOf(e) {
    let t = kh(this._lContainer);
    return t !== null ? t.indexOf(e) : -1;
  }
  remove(e) {
    let t = this._adjustIndex(e, -1),
      i = Bi(this._lContainer, t);
    i && (bi(Sd(this._lContainer), t), jr(i[b], i));
  }
  detach(e) {
    let t = this._adjustIndex(e, -1),
      i = Bi(this._lContainer, t);
    return i && bi(Sd(this._lContainer), t) != null ? new Zn(i) : null;
  }
  _adjustIndex(e, t = 0) {
    return e ?? this.length + t;
  }
};
function kh(n) {
  return n[Ni];
}
function Sd(n) {
  return n[Ni] || (n[Ni] = []);
}
function om(n, e) {
  let t,
    i = e[n.index];
  return (
    Ye(i) ? (t = i) : ((t = $p(i, e, null, n)), (e[n.index] = t), wc(e, t)),
    HE(t, e, n, i),
    new Wd(t, n, e)
  );
}
function BE(n, e) {
  let t = n[G],
    i = t.createComment(''),
    o = Ke(e, n),
    r = t.parentNode(o);
  return (_r(t, r, i, t.nextSibling(o), !1), i);
}
var HE = jE,
  zE = () => !1;
function VE(n, e, t) {
  return zE(n, e, t);
}
function jE(n, e, t, i) {
  if (n[Rt]) return;
  let o;
  (t.type & 8 ? (o = Be(i)) : (o = BE(e, t)), (n[Rt] = o));
}
var qd = class n {
    queryList;
    matches = null;
    constructor(e) {
      this.queryList = e;
    }
    clone() {
      return new n(this.queryList);
    }
    setDirty() {
      this.queryList.setDirty();
    }
  },
  Zd = class n {
    queries;
    constructor(e = []) {
      this.queries = e;
    }
    createEmbeddedView(e) {
      let t = e.queries;
      if (t !== null) {
        let i = e.contentQueries !== null ? e.contentQueries[0] : t.length,
          o = [];
        for (let r = 0; r < i; r++) {
          let s = t.getByIndex(r),
            a = this.queries[s.indexInDeclarationView];
          o.push(a.clone());
        }
        return new n(o);
      }
      return null;
    }
    insertView(e) {
      this.dirtyQueriesWithMatches(e);
    }
    detachView(e) {
      this.dirtyQueriesWithMatches(e);
    }
    finishViewCreation(e) {
      this.dirtyQueriesWithMatches(e);
    }
    dirtyQueriesWithMatches(e) {
      for (let t = 0; t < this.queries.length; t++)
        am(e, t).matches !== null && this.queries[t].setDirty();
    }
  },
  Yd = class {
    flags;
    read;
    predicate;
    constructor(e, t, i = null) {
      ((this.flags = t),
        (this.read = i),
        typeof e == 'string' ? (this.predicate = YE(e)) : (this.predicate = e));
    }
  },
  Qd = class n {
    queries;
    constructor(e = []) {
      this.queries = e;
    }
    elementStart(e, t) {
      for (let i = 0; i < this.queries.length; i++)
        this.queries[i].elementStart(e, t);
    }
    elementEnd(e) {
      for (let t = 0; t < this.queries.length; t++)
        this.queries[t].elementEnd(e);
    }
    embeddedTView(e) {
      let t = null;
      for (let i = 0; i < this.length; i++) {
        let o = t !== null ? t.length : 0,
          r = this.getByIndex(i).embeddedTView(e, o);
        r &&
          ((r.indexInDeclarationView = i), t !== null ? t.push(r) : (t = [r]));
      }
      return t !== null ? new n(t) : null;
    }
    template(e, t) {
      for (let i = 0; i < this.queries.length; i++)
        this.queries[i].template(e, t);
    }
    getByIndex(e) {
      return this.queries[e];
    }
    get length() {
      return this.queries.length;
    }
    track(e) {
      this.queries.push(e);
    }
  },
  Kd = class n {
    metadata;
    matches = null;
    indexInDeclarationView = -1;
    crossesNgTemplate = !1;
    _declarationNodeIndex;
    _appliesToNextNode = !0;
    constructor(e, t = -1) {
      ((this.metadata = e), (this._declarationNodeIndex = t));
    }
    elementStart(e, t) {
      this.isApplyingToNode(t) && this.matchTNode(e, t);
    }
    elementEnd(e) {
      this._declarationNodeIndex === e.index && (this._appliesToNextNode = !1);
    }
    template(e, t) {
      this.elementStart(e, t);
    }
    embeddedTView(e, t) {
      return this.isApplyingToNode(e)
        ? ((this.crossesNgTemplate = !0),
          this.addMatch(-e.index, t),
          new n(this.metadata))
        : null;
    }
    isApplyingToNode(e) {
      if (this._appliesToNextNode && (this.metadata.flags & 1) !== 1) {
        let t = this._declarationNodeIndex,
          i = e.parent;
        for (; i !== null && i.type & 8 && i.index !== t;) i = i.parent;
        return t === (i !== null ? i.index : -1);
      }
      return this._appliesToNextNode;
    }
    matchTNode(e, t) {
      let i = this.metadata.predicate;
      if (Array.isArray(i))
        for (let o = 0; o < i.length; o++) {
          let r = i[o];
          (this.matchTNodeWithReadOption(e, t, UE(t, r)),
            this.matchTNodeWithReadOption(e, t, Dr(t, e, r, !1, !1)));
        }
      else
        i === Yn
          ? t.type & 4 && this.matchTNodeWithReadOption(e, t, -1)
          : this.matchTNodeWithReadOption(e, t, Dr(t, e, i, !1, !1));
    }
    matchTNodeWithReadOption(e, t, i) {
      if (i !== null) {
        let o = this.metadata.read;
        if (o !== null)
          if (o === ie || o === ei || (o === Yn && t.type & 4))
            this.addMatch(t.index, -2);
          else {
            let r = Dr(t, e, o, !1, !1);
            r !== null && this.addMatch(t.index, r);
          }
        else this.addMatch(t.index, i);
      }
    }
    addMatch(e, t) {
      this.matches === null ? (this.matches = [e, t]) : this.matches.push(e, t);
    }
  };
function UE(n, e) {
  let t = n.localNames;
  if (t !== null) {
    for (let i = 0; i < t.length; i += 2) if (t[i] === e) return t[i + 1];
  }
  return null;
}
function $E(n, e) {
  return n.type & 11 ? Kn(n, e) : n.type & 4 ? Pc(n, e) : null;
}
function GE(n, e, t, i) {
  return t === -1 ? $E(e, n) : t === -2 ? WE(n, e, i) : Fi(n, n[b], t, e);
}
function WE(n, e, t) {
  if (t === ie) return Kn(e, n);
  if (t === Yn) return Pc(e, n);
  if (t === ei) return om(e, n);
}
function rm(n, e, t, i) {
  let o = e[lt].queries[i];
  if (o.matches === null) {
    let r = n.data,
      s = t.matches,
      a = [];
    for (let d = 0; s !== null && d < s.length; d += 2) {
      let c = s[d];
      if (c < 0) a.push(null);
      else {
        let l = r[c];
        a.push(GE(e, l, s[d + 1], t.metadata.read));
      }
    }
    o.matches = a;
  }
  return o.matches;
}
function Xd(n, e, t, i) {
  let o = n.queries.getByIndex(t),
    r = o.matches;
  if (r !== null) {
    let s = rm(n, e, o, t);
    for (let a = 0; a < r.length; a += 2) {
      let d = r[a];
      if (d > 0) i.push(s[a / 2]);
      else {
        let c = r[a + 1],
          l = e[-d];
        for (let u = X; u < l.length; u++) {
          let f = l[u];
          f[xt] === f[ae] && Xd(f[b], f, c, i);
        }
        if (l[sn] !== null) {
          let u = l[sn];
          for (let f = 0; f < u.length; f++) {
            let g = u[f];
            Xd(g[b], g, c, i);
          }
        }
      }
    }
  }
  return i;
}
function sm(n, e) {
  return n[lt].queries[e].queryList;
}
function qE(n, e, t) {
  let i = new Tr((t & 4) === 4);
  return (
    Ug(n, e, i, i.destroy),
    (e[lt] ??= new Zd()).queries.push(new qd(i)) - 1
  );
}
function ZE(n, e, t) {
  let i = J();
  return (
    i.firstCreatePass &&
      (QE(i, new Yd(n, e, t), -1), (e & 2) === 2 && (i.staticViewQueries = !0)),
    qE(i, T(), e)
  );
}
function YE(n) {
  return n.split(',').map((e) => e.trim());
}
function QE(n, e, t) {
  (n.queries === null && (n.queries = new Qd()), n.queries.track(new Kd(e, t)));
}
function am(n, e) {
  return n.queries.getByIndex(e);
}
function KE(n, e) {
  let t = n[b],
    i = am(t, e);
  return i.crossesNgTemplate ? Xd(t, n, e, []) : rm(t, n, i, e);
}
function dm(n, e, t) {
  let i,
    o = fi(() => {
      i._dirtyCounter();
      let r = JE(i, n);
      if (e && r === void 0) throw new N(-951, !1);
      return r;
    });
  return ((i = o[pe]), (i._dirtyCounter = P(0)), (i._flatValue = void 0), o);
}
function cm(n) {
  return dm(!0, !1, n);
}
function lm(n) {
  return dm(!0, !0, n);
}
function XE(n, e) {
  let t = n[pe];
  ((t._lView = T()),
    (t._queryIndex = e),
    (t._queryList = sm(t._lView, e)),
    t._queryList.onDirty(() => t._dirtyCounter.update((i) => i + 1)));
}
function JE(n, e) {
  let t = n._lView,
    i = n._queryIndex;
  if (t === void 0 || i === void 0 || t[S] & 4) return e ? void 0 : Ee;
  let o = sm(t, i),
    r = KE(t, i);
  return (
    o.reset(r, Rw),
    e
      ? o.first
      : o._changesDetected || n._flatValue === void 0
        ? (n._flatValue = o.toArray())
        : n._flatValue
  );
}
var Ot = class {};
function Ac(n, e) {
  return new kr(n, e ?? null, []);
}
var kr = class extends Ot {
  ngModuleType;
  _parent;
  _bootstrapComponents = [];
  _r3Injector;
  instance;
  destroyCbs = [];
  componentFactoryResolver = new Pr(this);
  constructor(e, t, i, o = !0) {
    (super(), (this.ngModuleType = e), (this._parent = t));
    let r = Ig(e);
    ((this._bootstrapComponents = Xw(r.bootstrap)),
      (this._r3Injector = vd(
        e,
        t,
        [
          { provide: Ot, useValue: this },
          { provide: Zi, useValue: this.componentFactoryResolver },
          ...i,
        ],
        Ei(e),
        new Set(['environment']),
      )),
      o && this.resolveInjectorInitializers());
  }
  resolveInjectorInitializers() {
    (this._r3Injector.resolveInjectorInitializers(),
      (this.instance = this._r3Injector.get(this.ngModuleType)));
  }
  get injector() {
    return this._r3Injector;
  }
  destroy() {
    let e = this._r3Injector;
    (!e.destroyed && e.destroy(),
      this.destroyCbs.forEach((t) => t()),
      (this.destroyCbs = null));
  }
  onDestroy(e) {
    this.destroyCbs.push(e);
  }
};
var zi = class extends Ot {
  injector;
  componentFactoryResolver = new Pr(this);
  instance = null;
  constructor(e) {
    super();
    let t = new Kt(
      [
        ...e.providers,
        { provide: Ot, useValue: this },
        { provide: Zi, useValue: this.componentFactoryResolver },
      ],
      e.parent || _i(),
      e.debugName,
      new Set(['environment']),
    );
    ((this.injector = t),
      e.runEnvironmentInitializers && t.resolveInjectorInitializers());
  }
  destroy() {
    this.injector.destroy();
  }
  onDestroy(e) {
    this.injector.onDestroy(e);
  }
};
function um(n, e, t = null) {
  return new zi({
    providers: n,
    parent: e,
    debugName: t,
    runEnvironmentInitializers: !0,
  }).injector;
}
var eC = (() => {
  class n {
    _injector;
    cachedInjectors = new Map();
    constructor(t) {
      this._injector = t;
    }
    getOrCreateStandaloneInjector(t) {
      if (!t.standalone) return null;
      if (!this.cachedInjectors.has(t)) {
        let i = Ga(!1, t.type),
          o = i.length > 0 ? um([i], this._injector, '') : null;
        this.cachedInjectors.set(t, o);
      }
      return this.cachedInjectors.get(t);
    }
    ngOnDestroy() {
      try {
        for (let t of this.cachedInjectors.values()) t !== null && t.destroy();
      } finally {
        this.cachedInjectors.clear();
      }
    }
    static ɵprov = I({
      token: n,
      providedIn: 'environment',
      factory: () => new n(V(Fe)),
    });
  }
  return n;
})();
function k(n) {
  return Ui(() => {
    let e = fm(n),
      t = y(h({}, e), {
        decls: n.decls,
        vars: n.vars,
        template: n.template,
        consts: n.consts || null,
        ngContentSelectors: n.ngContentSelectors,
        onPush: n.changeDetection === fc.OnPush,
        directiveDefs: null,
        pipeDefs: null,
        dependencies: (e.standalone && n.dependencies) || null,
        getStandaloneInjector: e.standalone
          ? (o) => o.get(eC).getOrCreateStandaloneInjector(t)
          : null,
        getExternalStyles: null,
        signals: n.signals ?? !1,
        data: n.data || {},
        encapsulation: n.encapsulation || nt.Emulated,
        styles: n.styles || Ee,
        _: null,
        schemas: n.schemas || null,
        tView: null,
        id: '',
      });
    (e.standalone && Ft('NgStandalone'), gm(t));
    let i = n.dependencies;
    return (
      (t.directiveDefs = Ah(i, tC)),
      (t.pipeDefs = Ah(i, Mg)),
      (t.id = oC(t)),
      t
    );
  });
}
function tC(n) {
  return en(n) || Qo(n);
}
function qr(n) {
  return Ui(() => ({
    type: n.type,
    bootstrap: n.bootstrap || Ee,
    declarations: n.declarations || Ee,
    imports: n.imports || Ee,
    exports: n.exports || Ee,
    transitiveCompileScopes: null,
    schemas: n.schemas || null,
    id: n.id || null,
  }));
}
function nC(n, e) {
  if (n == null) return qe;
  let t = {};
  for (let i in n)
    if (n.hasOwnProperty(i)) {
      let o = n[i],
        r,
        s,
        a,
        d;
      (Array.isArray(o)
        ? ((a = o[0]), (r = o[1]), (s = o[2] ?? r), (d = o[3] || null))
        : ((r = o), (s = o), (a = Vr.None), (d = null)),
        (t[r] = [i, a, d]),
        (e[r] = s));
    }
  return t;
}
function iC(n) {
  if (n == null) return qe;
  let e = {};
  for (let t in n) n.hasOwnProperty(t) && (e[n[t]] = t);
  return e;
}
function B(n) {
  return Ui(() => {
    let e = fm(n);
    return (gm(e), e);
  });
}
function fm(n) {
  let e = {};
  return {
    type: n.type,
    providersResolver: null,
    viewProvidersResolver: null,
    factory: null,
    hostBindings: n.hostBindings || null,
    hostVars: n.hostVars || 0,
    hostAttrs: n.hostAttrs || null,
    contentQueries: n.contentQueries || null,
    declaredInputs: e,
    inputConfig: n.inputs || qe,
    exportAs: n.exportAs || null,
    standalone: n.standalone ?? !0,
    signals: n.signals === !0,
    selectors: n.selectors || Ee,
    viewQuery: n.viewQuery || null,
    features: n.features || null,
    setInput: null,
    resolveHostDirectives: null,
    hostDirectives: null,
    controlDef: null,
    inputs: nC(n.inputs, e),
    outputs: iC(n.outputs),
    debugInfo: null,
  };
}
function gm(n) {
  n.features?.forEach((e) => e(n));
}
function Ah(n, e) {
  return n
    ? () => {
        let t = typeof n == 'function' ? n() : n,
          i = [];
        for (let o of t) {
          let r = e(o);
          r !== null && i.push(r);
        }
        return i;
      }
    : null;
}
function oC(n) {
  let e = 0,
    t = typeof n.consts == 'function' ? '' : n.consts,
    i = [
      n.selectors,
      n.ngContentSelectors,
      n.hostVars,
      n.hostAttrs,
      t,
      n.vars,
      n.decls,
      n.encapsulation,
      n.standalone,
      n.signals,
      n.exportAs,
      JSON.stringify(n.inputs),
      JSON.stringify(n.outputs),
      Object.getOwnPropertyNames(n.type.prototype),
      !!n.contentQueries,
      !!n.viewQuery,
    ];
  for (let r of i.join('|')) e = (Math.imul(31, e) + r.charCodeAt(0)) << 0;
  return ((e += 2147483648), 'c' + e);
}
function ht(n) {
  let e = (t) => {
    let i = Array.isArray(n);
    t.hostDirectives === null
      ? ((t.resolveHostDirectives = rC),
        (t.hostDirectives = i ? n.map(Jd) : [n]))
      : i
        ? t.hostDirectives.unshift(...n.map(Jd))
        : t.hostDirectives.unshift(n);
  };
  return ((e.ngInherit = !0), e);
}
function rC(n) {
  let e = [],
    t = !1,
    i = null,
    o = null;
  for (let r = 0; r < n.length; r++) {
    let s = n[r];
    if (s.hostDirectives !== null) {
      let a = e.length;
      ((i ??= new Map()),
        (o ??= new Map()),
        hm(s, e, i),
        o.set(s, [a, e.length - 1]));
    }
    r === 0 && Qe(s) && ((t = !0), e.push(s));
  }
  for (let r = t ? 1 : 0; r < n.length; r++) e.push(n[r]);
  return [e, i, o];
}
function hm(n, e, t) {
  if (n.hostDirectives !== null)
    for (let i of n.hostDirectives)
      if (typeof i == 'function') {
        let o = i();
        for (let r of o) Oh(Jd(r), e, t);
      } else Oh(i, e, t);
}
function Oh(n, e, t) {
  let i = Qo(n.directive);
  (sC(i.declaredInputs, n.inputs), hm(i, e, t), t.set(i, n), e.push(i));
}
function Jd(n) {
  return typeof n == 'function'
    ? { directive: se(n), inputs: qe, outputs: qe }
    : {
        directive: se(n.directive),
        inputs: Fh(n.inputs),
        outputs: Fh(n.outputs),
      };
}
function Fh(n) {
  if (n === void 0 || n.length === 0) return qe;
  let e = {};
  for (let t = 0; t < n.length; t += 2) e[n[t]] = n[t + 1];
  return e;
}
function sC(n, e) {
  for (let t in e)
    if (e.hasOwnProperty(t)) {
      let i = e[t],
        o = n[t];
      n[i] = o;
    }
}
function aC(n) {
  return Object.getPrototypeOf(n.prototype).constructor;
}
function Mt(n) {
  let e = aC(n.type),
    t = !0,
    i = [n];
  for (; e && e !== Function.prototype && e !== Object.prototype;) {
    let o,
      r = Object.hasOwn(e, Ii) ? e[Ii] : void 0,
      s = Object.hasOwn(e, Mi) ? e[Mi] : void 0;
    if (Qe(n)) o = r ?? s;
    else {
      if (r) throw new N(903, !1);
      o = s;
    }
    if (o) {
      if (t) {
        i.push(o);
        let d = n;
        ((d.inputs = Td(n.inputs)),
          (d.declaredInputs = Td(n.declaredInputs)),
          (d.outputs = Td(n.outputs)));
        let c = o.hostBindings;
        c && fC(n, c);
        let l = o.viewQuery,
          u = o.contentQueries;
        if (
          (l && lC(n, l),
          u && uC(n, u),
          dC(n, o),
          Cg(n.outputs, o.outputs),
          Qe(o) && o.data.animation)
        ) {
          let f = n.data;
          f.animation = (f.animation || []).concat(o.data.animation);
        }
      }
      let a = o.features;
      if (a)
        for (let d = 0; d < a.length; d++) {
          let c = a[d];
          (c && c.ngInherit && c(n), c === Mt && (t = !1));
        }
    }
    e = Object.getPrototypeOf(e);
  }
  cC(i);
}
function dC(n, e) {
  for (let t in e.inputs) {
    if (!e.inputs.hasOwnProperty(t) || n.inputs.hasOwnProperty(t)) continue;
    let i = e.inputs[t];
    i !== void 0 &&
      ((n.inputs[t] = i), (n.declaredInputs[t] = e.declaredInputs[t]));
  }
}
function cC(n) {
  let e = 0,
    t = null;
  for (let i = n.length - 1; i >= 0; i--) {
    let o = n[i];
    ((o.hostVars = e += o.hostVars),
      (o.hostAttrs = Gn(o.hostAttrs, (t = Gn(t, o.hostAttrs)))));
  }
}
function Td(n) {
  return n === qe ? {} : n === Ee ? [] : n;
}
function lC(n, e) {
  let t = n.viewQuery;
  t
    ? (n.viewQuery = (i, o) => {
        (e(i, o), t(i, o));
      })
    : (n.viewQuery = e);
}
function uC(n, e) {
  let t = n.contentQueries;
  t
    ? (n.contentQueries = (i, o, r) => {
        (e(i, o, r), t(i, o, r));
      })
    : (n.contentQueries = e);
}
function fC(n, e) {
  let t = n.hostBindings;
  t
    ? (n.hostBindings = (i, o) => {
        (e(i, o), t(i, o));
      })
    : (n.hostBindings = e);
}
function pm(n, e, t, i, o, r, s, a) {
  if (t.firstCreatePass) {
    n.mergedAttrs = Gn(n.mergedAttrs, n.attrs);
    let l = (n.tView = yc(
      2,
      n,
      o,
      r,
      s,
      t.directiveRegistry,
      t.pipeRegistry,
      null,
      t.schemas,
      t.consts,
      null,
    ));
    t.queries !== null &&
      (t.queries.template(t, n), (l.queries = t.queries.embeddedTView(n)));
  }
  (a && (n.flags |= a), dn(n, !1));
  let d = hC(t, e, n, i);
  (hr() && Ic(t, e, d, n), Wn(d, e));
  let c = $p(d, e, d, n);
  ((e[i + K] = c), wc(e, c), VE(c, n, e));
}
function gC(n, e, t, i, o, r, s, a, d, c, l) {
  let u = t + K,
    f;
  return (
    e.firstCreatePass
      ? ((f = yn(e, u, 4, s || null, a || null)),
        dr() && Kp(e, n, f, He(e.consts, c), bc),
        Zh(e, f))
      : (f = e.data[u]),
    pm(f, n, e, t, i, o, r, d),
    Hn(f) && $r(e, n, f),
    c != null && Gi(n, f, l),
    f
  );
}
function Vi(n, e, t, i, o, r, s, a, d, c, l) {
  let u = t + K,
    f;
  if (e.firstCreatePass) {
    if (((f = yn(e, u, 4, s || null, a || null)), c != null)) {
      let g = He(e.consts, c);
      f.localNames = [];
      for (let p = 0; p < g.length; p += 2) f.localNames.push(g[p], -1);
    }
  } else f = e.data[u];
  return (pm(f, n, e, t, i, o, r, d), c != null && Gi(n, f, l), f);
}
function ti(n, e, t, i, o, r, s, a) {
  let d = T(),
    c = J(),
    l = He(c.consts, r);
  return (gC(d, c, n, e, t, i, o, l, void 0, s, a), ti);
}
var hC = pC;
function pC(n, e, t, i) {
  return (Pi(!0), e[G].createComment(''));
}
var Oc = new A('');
function Zr(n) {
  return !!n && typeof n.then == 'function';
}
function Fc(n) {
  return !!n && typeof n.subscribe == 'function';
}
var mm = new A('');
var Lc = (() => {
    class n {
      resolve;
      reject;
      initialized = !1;
      done = !1;
      donePromise = new Promise((t, i) => {
        ((this.resolve = t), (this.reject = i));
      });
      appInits = m(mm, { optional: !0 }) ?? [];
      injector = m(We);
      constructor() {}
      runInitializers() {
        if (this.initialized) return;
        let t = [];
        for (let o of this.appInits) {
          let r = tn(this.injector, o);
          if (Zr(r)) t.push(r);
          else if (Fc(r)) {
            let s = new Promise((a, d) => {
              r.subscribe({ complete: a, error: d });
            });
            t.push(s);
          }
        }
        let i = () => {
          ((this.done = !0), this.resolve());
        };
        (Promise.all(t)
          .then(() => {
            i();
          })
          .catch((o) => {
            this.reject(o);
          }),
          t.length === 0 && i(),
          (this.initialized = !0));
      }
      static ɵfac = function (i) {
        return new (i || n)();
      };
      static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
    }
    return n;
  })(),
  ym = new A('');
function vm() {
  aa(() => {
    let n = '';
    throw new N(600, n);
  });
}
function wm(n) {
  return n.isBoundToModule;
}
var mC = 10;
var Yr = (() => {
  class n {
    _runningTick = !1;
    _destroyed = !1;
    _destroyListeners = [];
    _views = [];
    internalErrorHandler = m(ln);
    afterRenderManager = m(bp);
    zonelessEnabled = m(Ri);
    rootEffectScheduler = m(mr);
    dirtyFlags = 0;
    tracingSnapshot = null;
    allTestViews = new Set();
    autoDetectTestViews = new Set();
    includeAllTestViews = !1;
    afterTick = new yt();
    get allViews() {
      return [
        ...(this.includeAllTestViews
          ? this.allTestViews
          : this.autoDetectTestViews
        ).keys(),
        ...this._views,
      ];
    }
    get destroyed() {
      return this._destroyed;
    }
    componentTypes = [];
    components = [];
    internalPendingTask = m(jn);
    get isStable() {
      return this.internalPendingTask.hasPendingTasksObservable.pipe(
        wa((t) => !t),
      );
    }
    constructor() {
      m(Xn, { optional: !0 });
    }
    whenStable() {
      let t;
      return new Promise((i) => {
        t = this.isStable.subscribe({
          next: (o) => {
            o && i();
          },
        });
      }).finally(() => {
        t.unsubscribe();
      });
    }
    _injector = m(Fe);
    _rendererFactory = null;
    get injector() {
      return this._injector;
    }
    bootstrap(t, i) {
      return this.bootstrapImpl(t, i);
    }
    bootstrapImpl(t, i, o = We.NULL) {
      return this._injector.get(Te).run(() => {
        U(L.BootstrapComponentStart);
        let s = t instanceof Gr;
        if (!this._injector.get(Lc).done) {
          let p = '';
          throw new N(405, p);
        }
        let d;
        (s ? (d = t) : (d = this._injector.get(Zi).resolveComponentFactory(t)),
          this.componentTypes.push(d.componentType));
        let c = wm(d) ? void 0 : this._injector.get(Ot),
          l = i || d.selector,
          u = d.create(o, [], l, c),
          f = u.location.nativeElement,
          g = u.injector.get(Oc, null);
        return (
          g?.registerApplication(f),
          u.onDestroy(() => {
            (this.detachView(u.hostView),
              Oi(this.components, u),
              g?.unregisterApplication(f));
          }),
          this._loadComponent(u),
          U(L.BootstrapComponentEnd, u),
          u
        );
      });
    }
    tick() {
      (this.zonelessEnabled || (this.dirtyFlags |= 1), this._tick());
    }
    _tick() {
      (U(L.ChangeDetectionStart),
        this.tracingSnapshot !== null
          ? this.tracingSnapshot.run(Ec.CHANGE_DETECTION, this.tickImpl)
          : this.tickImpl());
    }
    tickImpl = () => {
      if (this._runningTick) throw (U(L.ChangeDetectionEnd), new N(101, !1));
      let t = M(null);
      try {
        ((this._runningTick = !0), this.synchronize());
      } finally {
        ((this._runningTick = !1),
          this.tracingSnapshot?.dispose(),
          (this.tracingSnapshot = null),
          M(t),
          this.afterTick.next(),
          U(L.ChangeDetectionEnd));
      }
    };
    synchronize() {
      this._rendererFactory === null &&
        !this._injector.destroyed &&
        (this._rendererFactory = this._injector.get(hn, null, {
          optional: !0,
        }));
      let t = 0;
      for (; this.dirtyFlags !== 0 && t++ < mC;) {
        U(L.ChangeDetectionSyncStart);
        try {
          this.synchronizeOnce();
        } finally {
          U(L.ChangeDetectionSyncEnd);
        }
      }
    }
    synchronizeOnce() {
      this.dirtyFlags & 16 &&
        ((this.dirtyFlags &= -17), this.rootEffectScheduler.flush());
      let t = !1;
      if (this.dirtyFlags & 7) {
        let i = !!(this.dirtyFlags & 1);
        ((this.dirtyFlags &= -8), (this.dirtyFlags |= 8));
        for (let { _lView: o } of this.allViews) {
          if (!i && !xi(o)) continue;
          let r = i && !this.zonelessEnabled ? 0 : 1;
          (zp(o, r), (t = !0));
        }
        if (
          ((this.dirtyFlags &= -5),
          this.syncDirtyFlagsWithViews(),
          this.dirtyFlags & 23)
        )
          return;
      }
      (t || (this._rendererFactory?.begin?.(), this._rendererFactory?.end?.()),
        this.dirtyFlags & 8 &&
          ((this.dirtyFlags &= -9), this.afterRenderManager.execute()),
        this.syncDirtyFlagsWithViews());
    }
    syncDirtyFlagsWithViews() {
      if (this.allViews.some(({ _lView: t }) => xi(t))) {
        this.dirtyFlags |= 2;
        return;
      } else this.dirtyFlags &= -8;
    }
    attachView(t) {
      let i = t;
      (this._views.push(i), i.attachToAppRef(this));
    }
    detachView(t) {
      let i = t;
      (Oi(this._views, i), i.detachFromAppRef());
    }
    _loadComponent(t) {
      this.attachView(t.hostView);
      try {
        this.tick();
      } catch (o) {
        this.internalErrorHandler(o);
      }
      (this.components.push(t),
        this._injector.get(ym, []).forEach((o) => o(t)));
    }
    ngOnDestroy() {
      if (!this._destroyed)
        try {
          (this._destroyListeners.forEach((t) => t()),
            this._views.slice().forEach((t) => t.destroy()));
        } finally {
          ((this._destroyed = !0),
            (this._views = []),
            (this._destroyListeners = []));
        }
    }
    onDestroy(t) {
      return (
        this._destroyListeners.push(t),
        () => Oi(this._destroyListeners, t)
      );
    }
    destroy() {
      if (this._destroyed) throw new N(406, !1);
      let t = this._injector;
      t.destroy && !t.destroyed && t.destroy();
    }
    get viewCount() {
      return this._views.length;
    }
    static ɵfac = function (i) {
      return new (i || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
  }
  return n;
})();
function Oi(n, e) {
  let t = n.indexOf(e);
  t > -1 && n.splice(t, 1);
}
function q(n, e, t, i) {
  let o = T(),
    r = cn();
  if (it(o, r, e)) {
    let s = J(),
      a = gr();
    zD(a, o, n, e, t, i);
  }
  return q;
}
var ec = class {
  destroy(e) {}
  updateValue(e, t) {}
  swap(e, t) {
    let i = Math.min(e, t),
      o = Math.max(e, t),
      r = this.detach(o);
    if (o - i > 1) {
      let s = this.detach(i);
      (this.attach(i, r), this.attach(o, s));
    } else this.attach(i, r);
  }
  move(e, t) {
    this.attach(t, this.detach(e));
  }
};
function _d(n, e, t, i, o) {
  return n === t && Object.is(e, i) ? 1 : Object.is(o(n, e), o(t, i)) ? -1 : 0;
}
function yC(n, e, t, i) {
  let o,
    r,
    s = 0,
    a = n.length - 1,
    d = void 0;
  if (Array.isArray(e)) {
    M(i);
    let c = e.length - 1;
    for (M(null); s <= a && s <= c;) {
      let l = n.at(s),
        u = e[s],
        f = _d(s, l, s, u, t);
      if (f !== 0) {
        (f < 0 && n.updateValue(s, u), s++);
        continue;
      }
      let g = n.at(a),
        p = e[c],
        v = _d(a, g, c, p, t);
      if (v !== 0) {
        (v < 0 && n.updateValue(a, p), a--, c--);
        continue;
      }
      let D = t(s, l),
        C = t(a, g),
        Z = t(s, u);
      if (Object.is(Z, C)) {
        let we = t(c, p);
        (Object.is(we, D)
          ? (n.swap(s, a), n.updateValue(a, p), c--, a--)
          : n.move(a, s),
          n.updateValue(s, u),
          s++);
        continue;
      }
      if (((o ??= new Ar()), (r ??= Bh(n, s, a, t)), tc(n, o, s, Z)))
        (n.updateValue(s, u), s++, a++);
      else if (r.has(Z)) (o.set(D, n.detach(s)), a--);
      else {
        let we = n.create(s, e[s]);
        (n.attach(s, we), s++, a++);
      }
    }
    for (; s <= c;) (Lh(n, o, t, s, e[s]), s++);
  } else if (e != null) {
    M(i);
    let c = e[Symbol.iterator]();
    M(null);
    let l = c.next();
    for (; !l.done && s <= a;) {
      let u = n.at(s),
        f = l.value,
        g = _d(s, u, s, f, t);
      if (g !== 0) (g < 0 && n.updateValue(s, f), s++, (l = c.next()));
      else {
        ((o ??= new Ar()), (r ??= Bh(n, s, a, t)));
        let p = t(s, f);
        if (tc(n, o, s, p)) (n.updateValue(s, f), s++, a++, (l = c.next()));
        else if (!r.has(p))
          (n.attach(s, n.create(s, f)), s++, a++, (l = c.next()));
        else {
          let v = t(s, u);
          (o.set(v, n.detach(s)), a--);
        }
      }
    }
    for (; !l.done;) (Lh(n, o, t, n.length, l.value), (l = c.next()));
  }
  for (; s <= a;) n.destroy(n.detach(a--));
  o?.forEach((c) => {
    n.destroy(c);
  });
}
function tc(n, e, t, i) {
  return e !== void 0 && e.has(i)
    ? (n.attach(t, e.get(i)), e.delete(i), !0)
    : !1;
}
function Lh(n, e, t, i, o) {
  if (tc(n, e, i, t(i, o))) n.updateValue(i, o);
  else {
    let r = n.create(i, o);
    n.attach(i, r);
  }
}
function Bh(n, e, t, i) {
  let o = new Set();
  for (let r = e; r <= t; r++) o.add(i(r, n.at(r)));
  return o;
}
var Ar = class {
  kvMap = new Map();
  _vMap = void 0;
  has(e) {
    return this.kvMap.has(e);
  }
  delete(e) {
    if (!this.has(e)) return !1;
    let t = this.kvMap.get(e);
    return (
      this._vMap !== void 0 && this._vMap.has(t)
        ? (this.kvMap.set(e, this._vMap.get(t)), this._vMap.delete(t))
        : this.kvMap.delete(e),
      !0
    );
  }
  get(e) {
    return this.kvMap.get(e);
  }
  set(e, t) {
    if (this.kvMap.has(e)) {
      let i = this.kvMap.get(e);
      this._vMap === void 0 && (this._vMap = new Map());
      let o = this._vMap;
      for (; o.has(i);) i = o.get(i);
      o.set(i, t);
    } else this.kvMap.set(e, t);
  }
  forEach(e) {
    for (let [t, i] of this.kvMap)
      if ((e(i, t), this._vMap !== void 0)) {
        let o = this._vMap;
        for (; o.has(i);) ((i = o.get(i)), e(i, t));
      }
  }
};
function oe(n, e, t, i, o, r, s, a) {
  Ft('NgControlFlow');
  let d = T(),
    c = J(),
    l = He(c.consts, r);
  return (Vi(d, c, n, e, t, i, o, l, 256, s, a), Bc);
}
function Bc(n, e, t, i, o, r, s, a) {
  Ft('NgControlFlow');
  let d = T(),
    c = J(),
    l = He(c.consts, r);
  return (Vi(d, c, n, e, t, i, o, l, 512, s, a), Bc);
}
function re(n, e) {
  Ft('NgControlFlow');
  let t = T(),
    i = cn(),
    o = t[i] !== Ve ? t[i] : -1,
    r = o !== -1 ? Or(t, K + o) : void 0,
    s = 0;
  if (it(t, i, n)) {
    let a = M(null);
    try {
      if ((r !== void 0 && Wp(r, s), n !== -1)) {
        let d = K + n,
          c = Or(t, d),
          l = rc(t[b], d),
          u = Zp(c, l, t),
          f = Wi(t, l, e, { dehydratedView: u });
        qi(c, f, s, qn(l, u));
      }
    } finally {
      M(a);
    }
  } else if (r !== void 0) {
    let a = Gp(r, s);
    a !== void 0 && (a[ne] = e);
  }
}
var nc = class {
  lContainer;
  $implicit;
  $index;
  constructor(e, t, i) {
    ((this.lContainer = e), (this.$implicit = t), (this.$index = i));
  }
  get $count() {
    return this.lContainer.length - X;
  }
};
function Yi(n, e) {
  return e;
}
var ic = class {
  hasEmptyBlock;
  trackByFn;
  liveCollection;
  constructor(e, t, i) {
    ((this.hasEmptyBlock = e), (this.trackByFn = t), (this.liveCollection = i));
  }
};
function ot(n, e, t, i, o, r, s, a, d, c, l, u, f) {
  Ft('NgControlFlow');
  let g = T(),
    p = J(),
    v = d !== void 0,
    D = T(),
    C = a ? s.bind(D[_e][ne]) : s,
    Z = new ic(v, C);
  ((D[K + n] = Z),
    Vi(g, p, n + 1, e, t, i, o, He(p.consts, r), 256),
    v && Vi(g, p, n + 2, d, c, l, u, He(p.consts, f), 512));
}
var oc = class extends ec {
  lContainer;
  hostLView;
  templateTNode;
  operationsCounter = void 0;
  needsIndexUpdate = !1;
  constructor(e, t, i) {
    (super(),
      (this.lContainer = e),
      (this.hostLView = t),
      (this.templateTNode = i));
  }
  get length() {
    return this.lContainer.length - X;
  }
  at(e) {
    return this.getLView(e)[ne].$implicit;
  }
  attach(e, t) {
    let i = t[nn];
    ((this.needsIndexUpdate ||= e !== this.length),
      qi(this.lContainer, t, e, qn(this.templateTNode, i)),
      vC(this.lContainer, e));
  }
  detach(e) {
    return (
      (this.needsIndexUpdate ||= e !== this.length - 1),
      wC(this.lContainer, e),
      DC(this.lContainer, e)
    );
  }
  create(e, t) {
    let i = Nr(this.lContainer, this.templateTNode.tView.ssrId);
    return Wi(
      this.hostLView,
      this.templateTNode,
      new nc(this.lContainer, t, e),
      { dehydratedView: i },
    );
  }
  destroy(e) {
    jr(e[b], e);
  }
  updateValue(e, t) {
    this.getLView(e)[ne].$implicit = t;
  }
  reset() {
    this.needsIndexUpdate = !1;
  }
  updateIndexes() {
    if (this.needsIndexUpdate)
      for (let e = 0; e < this.length; e++) this.getLView(e)[ne].$index = e;
  }
  getLView(e) {
    return EC(this.lContainer, e);
  }
};
function rt(n) {
  let e = M(null),
    t = ut();
  try {
    let i = T(),
      o = i[b],
      r = i[t],
      s = t + 1,
      a = Or(i, s);
    if (r.liveCollection === void 0) {
      let c = rc(o, s);
      r.liveCollection = new oc(a, i, c);
    } else r.liveCollection.reset();
    let d = r.liveCollection;
    if ((yC(d, n, r.trackByFn, e), d.updateIndexes(), r.hasEmptyBlock)) {
      let c = cn(),
        l = d.length === 0;
      if (it(i, c, l)) {
        let u = t + 2,
          f = Or(i, u);
        if (l) {
          let g = rc(o, u),
            p = Zp(f, g, i),
            v = Wi(i, g, void 0, { dehydratedView: p });
          qi(f, v, 0, qn(g, p));
        } else (o.firstUpdatePass && lE(f), Wp(f, 0));
      }
    }
  } finally {
    M(e);
  }
}
function Or(n, e) {
  return n[e];
}
function vC(n, e) {
  if (n.length <= X) return;
  let t = X + e,
    i = n[t],
    o = i ? i[Pt] : void 0;
  if (
    i &&
    o &&
    o.detachedLeaveAnimationFns &&
    o.detachedLeaveAnimationFns.length > 0
  ) {
    let r = i[Dt];
    (yD(r, o), gn.delete(i[Et]), (o.detachedLeaveAnimationFns = void 0));
  }
}
function wC(n, e) {
  if (n.length <= X) return;
  let t = X + e,
    i = n[t],
    o = i ? i[Pt] : void 0;
  o && o.leave && o.leave.size > 0 && (o.detachedLeaveAnimationFns = []);
}
function DC(n, e) {
  return Bi(n, e);
}
function EC(n, e) {
  return Gp(n, e);
}
function rc(n, e) {
  return or(n, e);
}
function O(n, e, t) {
  let i = T(),
    o = cn();
  if (it(i, o, e)) {
    let r = J(),
      s = gr();
    OD(s, i, n, e, i[G], t);
  }
  return O;
}
function sc(n, e, t, i, o) {
  _c(e, n, t, o ? 'class' : 'style', i);
}
function W(n, e, t, i) {
  let o = T(),
    r = o[b],
    s = n + K,
    a = r.firstCreatePass ? Rc(s, o, 2, e, bc, dr(), t, i) : r.data[s];
  if (kt(a)) {
    let d = o[ct].tracingService;
    if (d && d.componentCreate) {
      let c = r.data[a.directiveStart + a.componentOffset];
      return d.componentCreate(nm(c), () => (Hh(n, e, o, a, i), W));
    }
  }
  return (Hh(n, e, o, a, i), W);
}
function Hh(n, e, t, i, o) {
  if ((Sc(i, t, n, e, Dm), Hn(i))) {
    let r = t[b];
    ($r(r, t, i), hc(r, i, t));
  }
  o != null && Gi(t, i);
}
function Y() {
  let n = J(),
    e = be(),
    t = Tc(e);
  return (
    n.firstCreatePass && kc(n, t),
    ad(t) && dd(),
    rd(),
    t.classesWithoutHost != null &&
      vw(t) &&
      sc(n, t, T(), t.classesWithoutHost, !0),
    t.stylesWithoutHost != null &&
      ww(t) &&
      sc(n, t, T(), t.stylesWithoutHost, !1),
    Y
  );
}
function $(n, e, t, i) {
  return (W(n, e, t, i), Y(), $);
}
function ge(n, e, t, i) {
  let o = T(),
    r = o[b],
    s = n + K,
    a = r.firstCreatePass ? ME(s, r, 2, e, t, i) : r.data[s];
  return (Sc(a, o, n, e, Dm), i != null && Gi(o, a), ge);
}
function he() {
  let n = be(),
    e = Tc(n);
  return (ad(e) && dd(), rd(), he);
}
function bt(n, e, t, i) {
  return (ge(n, e, t, i), he(), bt);
}
var Dm = (n, e, t, i, o) => (Pi(!0), mp(e[G], i, yd()));
function Hc(n, e, t) {
  let i = T(),
    o = i[b],
    r = n + K,
    s = o.firstCreatePass
      ? Rc(r, i, 8, 'ng-container', bc, dr(), e, t)
      : o.data[r];
  if ((Sc(s, i, n, 'ng-container', CC), Hn(s))) {
    let a = i[b];
    ($r(a, i, s), hc(a, s, i));
  }
  return (t != null && Gi(i, s), Hc);
}
function zc() {
  let n = J(),
    e = be(),
    t = Tc(e);
  return (n.firstCreatePass && kc(n, t), zc);
}
function ni(n, e, t) {
  return (Hc(n, e, t), zc(), ni);
}
var CC = (n, e, t, i, o) => (Pi(!0), Yw(e[G], ''));
function Lt(n, e, t) {
  let i = T(),
    o = cn();
  if (it(i, o, e)) {
    let r = J(),
      s = gr();
    Ap(s, i, n, e, i[G], t);
  }
  return Lt;
}
var Qi = 'en-US';
var IC = Qi;
function Em(n) {
  typeof n == 'string' && (IC = n.toLowerCase().replace(/_/g, '-'));
}
function ee(n, e, t) {
  let i = T(),
    o = J(),
    r = be();
  return (MC(o, i, i[G], r, n, e, t), ee);
}
function Ki(n, e, t) {
  let i = T(),
    o = J(),
    r = be();
  return ((r.type & 3 || t) && em(r, o, i, t, i[G], n, e, Cr(r, i, e)), Ki);
}
function MC(n, e, t, i, o, r, s) {
  let a = !0,
    d = null;
  if (
    ((i.type & 3 || s) &&
      ((d ??= Cr(i, e, r)), em(i, n, e, s, t, o, r, d) && (a = !1)),
    a)
  ) {
    let c = i.outputs?.[o],
      l = i.hostDirectiveOutputs?.[o];
    if (l && l.length)
      for (let u = 0; u < l.length; u += 2) {
        let f = l[u],
          g = l[u + 1];
        ((d ??= Cr(i, e, r)), Ph(i, e, f, g, o, d));
      }
    if (c && c.length)
      for (let u of c) ((d ??= Cr(i, e, r)), Ph(i, e, u, o, o, d));
  }
}
function R(n = 1) {
  return ih(n);
}
function bC(n, e) {
  let t = null,
    i = oD(n);
  for (let o = 0; o < e.length; o++) {
    let r = e[o];
    if (r === '*') {
      t = o;
      continue;
    }
    if (i === null ? Ep(n, r, !0) : aD(i, r)) return o;
  }
  return t;
}
function me(n) {
  let e = T()[_e][Me];
  if (!e.projection) {
    let t = n ? n.length : 1,
      i = (e.projection = xg(t, null)),
      o = i.slice(),
      r = e.child;
    for (; r !== null;) {
      if (r.type !== 128) {
        let s = n ? bC(r, n) : 0;
        s !== null &&
          (o[s] ? (o[s].projectionNext = r) : (i[s] = r), (o[s] = r));
      }
      r = r.next;
    }
  }
}
function ce(n, e = 0, t, i, o, r) {
  let s = T(),
    a = J(),
    d = i ? n + 1 : null;
  d !== null && Vi(s, a, d, i, o, r, null, t);
  let c = yn(a, K + n, 16, null, t || null);
  (c.projection === null && (c.projection = e), ud());
  let u = !s[nn] || sd();
  s[_e][Me].projection[c.projection] === null && d !== null
    ? SC(s, a, d)
    : u && !zr(c) && _D(a, s, c);
}
function SC(n, e, t) {
  let i = K + t,
    o = e.data[i],
    r = n[i],
    s = Nr(r, o.tView.ssrId),
    a = Wi(n, o, void 0, { dehydratedView: s });
  qi(r, a, 0, qn(o, s));
}
function Xi(n, e, t, i) {
  return (XE(n, ZE(e, t, i)), Xi);
}
function Qr(n = 1) {
  lr(Jg() + n);
}
function yr(n, e) {
  return (n << 17) | (e << 2);
}
function pn(n) {
  return (n >> 17) & 32767;
}
function TC(n) {
  return (n & 2) == 2;
}
function _C(n, e) {
  return (n & 131071) | (e << 17);
}
function ac(n) {
  return n | 2;
}
function Qn(n) {
  return (n & 131068) >> 2;
}
function Nd(n, e) {
  return (n & -131069) | (e << 2);
}
function NC(n) {
  return (n & 1) === 1;
}
function dc(n) {
  return n | 1;
}
function xC(n, e, t, i, o, r) {
  let s = r ? e.classBindings : e.styleBindings,
    a = pn(s),
    d = Qn(s);
  n[i] = t;
  let c = !1,
    l;
  if (Array.isArray(t)) {
    let u = t;
    ((l = u[1]), (l === null || Fn(u, l) > 0) && (c = !0));
  } else l = t;
  if (o)
    if (d !== 0) {
      let f = pn(n[a + 1]);
      ((n[i + 1] = yr(f, a)),
        f !== 0 && (n[f + 1] = Nd(n[f + 1], i)),
        (n[a + 1] = _C(n[a + 1], i)));
    } else
      ((n[i + 1] = yr(a, 0)), a !== 0 && (n[a + 1] = Nd(n[a + 1], i)), (a = i));
  else
    ((n[i + 1] = yr(d, 0)),
      a === 0 ? (a = i) : (n[d + 1] = Nd(n[d + 1], i)),
      (d = i));
  (c && (n[i + 1] = ac(n[i + 1])),
    zh(n, l, i, !0),
    zh(n, l, i, !1),
    PC(e, l, n, i, r),
    (s = yr(a, d)),
    r ? (e.classBindings = s) : (e.styleBindings = s));
}
function PC(n, e, t, i, o) {
  let r = o ? n.residualClasses : n.residualStyles;
  r != null &&
    typeof e == 'string' &&
    Fn(r, e) >= 0 &&
    (t[i + 1] = dc(t[i + 1]));
}
function zh(n, e, t, i) {
  let o = n[t + 1],
    r = e === null,
    s = i ? pn(o) : Qn(o),
    a = !1;
  for (; s !== 0 && (a === !1 || r);) {
    let d = n[s],
      c = n[s + 1];
    (RC(d, e) && ((a = !0), (n[s + 1] = i ? dc(c) : ac(c))),
      (s = i ? pn(c) : Qn(c)));
  }
  a && (n[t + 1] = i ? ac(o) : dc(o));
}
function RC(n, e) {
  return n === null || e == null || (Array.isArray(n) ? n[1] : n) === e
    ? !0
    : Array.isArray(n) && typeof e == 'string'
      ? Fn(n, e) >= 0
      : !1;
}
var tt = { textEnd: 0, key: 0, keyEnd: 0, value: 0, valueEnd: 0 };
function kC(n) {
  return n.substring(tt.key, tt.keyEnd);
}
function AC(n) {
  return (OC(n), Cm(n, Im(n, 0, tt.textEnd)));
}
function Cm(n, e) {
  let t = tt.textEnd;
  return t === e ? -1 : ((e = tt.keyEnd = FC(n, (tt.key = e), t)), Im(n, e, t));
}
function OC(n) {
  ((tt.key = 0),
    (tt.keyEnd = 0),
    (tt.value = 0),
    (tt.valueEnd = 0),
    (tt.textEnd = n.length));
}
function Im(n, e, t) {
  for (; e < t && n.charCodeAt(e) <= 32;) e++;
  return e;
}
function FC(n, e, t) {
  for (; e < t && n.charCodeAt(e) > 32;) e++;
  return e;
}
function ye(n, e, t) {
  return (Mm(n, e, t, !1), ye);
}
function Ne(n, e) {
  return (Mm(n, e, null, !0), Ne);
}
function je(n) {
  BC($C, LC, n, !0);
}
function LC(n, e) {
  for (let t = AC(e); t >= 0; t = Cm(e, t)) er(n, kC(e), !0);
}
function Mm(n, e, t, i) {
  let o = T(),
    r = J(),
    s = hd(2);
  if ((r.firstUpdatePass && Sm(r, n, s, i), e !== Ve && it(o, s, e))) {
    let a = r.data[ut()];
    Tm(r, a, o, o[G], n, (o[s + 1] = WC(e, t)), i, s);
  }
}
function BC(n, e, t, i) {
  let o = J(),
    r = hd(2);
  o.firstUpdatePass && Sm(o, null, r, i);
  let s = T();
  if (t !== Ve && it(s, r, t)) {
    let a = o.data[ut()];
    if (_m(a, i) && !bm(o, r)) {
      let d = i ? a.classesWithoutHost : a.stylesWithoutHost;
      (d !== null && (t = Wo(d, t || '')), sc(o, a, s, t, i));
    } else GC(o, a, s, s[G], s[r + 1], (s[r + 1] = UC(n, e, t)), i, r);
  }
}
function bm(n, e) {
  return e >= n.expandoStartIndex;
}
function Sm(n, e, t, i) {
  let o = n.data;
  if (o[t + 1] === null) {
    let r = o[ut()],
      s = bm(n, t);
    (_m(r, i) && e === null && !s && (e = !1),
      (e = HC(o, r, e, i)),
      xC(o, r, e, t, s, i));
  }
}
function HC(n, e, t, i) {
  let o = Xg(n),
    r = i ? e.residualClasses : e.residualStyles;
  if (o === null)
    (i ? e.classBindings : e.styleBindings) === 0 &&
      ((t = xd(null, n, e, t, i)), (t = ji(t, e.attrs, i)), (r = null));
  else {
    let s = e.directiveStylingLast;
    if (s === -1 || n[s] !== o)
      if (((t = xd(o, n, e, t, i)), r === null)) {
        let d = zC(n, e, i);
        d !== void 0 &&
          Array.isArray(d) &&
          ((d = xd(null, n, e, d[1], i)),
          (d = ji(d, e.attrs, i)),
          VC(n, e, i, d));
      } else r = jC(n, e, i);
  }
  return (
    r !== void 0 && (i ? (e.residualClasses = r) : (e.residualStyles = r)),
    t
  );
}
function zC(n, e, t) {
  let i = t ? e.classBindings : e.styleBindings;
  if (Qn(i) !== 0) return n[pn(i)];
}
function VC(n, e, t, i) {
  let o = t ? e.classBindings : e.styleBindings;
  n[pn(o)] = i;
}
function jC(n, e, t) {
  let i,
    o = e.directiveEnd;
  for (let r = 1 + e.directiveStylingLast; r < o; r++) {
    let s = n[r].hostAttrs;
    i = ji(i, s, t);
  }
  return ji(i, e.attrs, t);
}
function xd(n, e, t, i, o) {
  let r = null,
    s = t.directiveEnd,
    a = t.directiveStylingLast;
  for (
    a === -1 ? (a = t.directiveStart) : a++;
    a < s && ((r = e[a]), (i = ji(i, r.hostAttrs, o)), r !== n);
  )
    a++;
  return (n !== null && (t.directiveStylingLast = a), i);
}
function ji(n, e, t) {
  let i = t ? 1 : 2,
    o = -1;
  if (e !== null)
    for (let r = 0; r < e.length; r++) {
      let s = e[r];
      typeof s == 'number'
        ? (o = s)
        : o === i &&
          (Array.isArray(n) || (n = n === void 0 ? [] : ['', n]),
          er(n, s, t ? !0 : e[++r]));
    }
  return n === void 0 ? null : n;
}
function UC(n, e, t) {
  if (t == null || t === '') return Ee;
  let i = [],
    o = pc(t);
  if (Array.isArray(o)) for (let r = 0; r < o.length; r++) n(i, o[r], !0);
  else if (o instanceof Set) for (let r of o) n(i, r, !0);
  else if (typeof o == 'object')
    for (let r in o) o.hasOwnProperty(r) && n(i, r, o[r]);
  else typeof o == 'string' && e(i, o);
  return i;
}
function $C(n, e, t) {
  let i = String(e);
  i !== '' && !i.includes(' ') && er(n, i, t);
}
function GC(n, e, t, i, o, r, s, a) {
  o === Ve && (o = Ee);
  let d = 0,
    c = 0,
    l = 0 < o.length ? o[0] : null,
    u = 0 < r.length ? r[0] : null;
  for (; l !== null || u !== null;) {
    let f = d < o.length ? o[d + 1] : void 0,
      g = c < r.length ? r[c + 1] : void 0,
      p = null,
      v;
    (l === u
      ? ((d += 2), (c += 2), f !== g && ((p = u), (v = g)))
      : u === null || (l !== null && l < u)
        ? ((d += 2), (p = l))
        : ((c += 2), (p = u), (v = g)),
      p !== null && Tm(n, e, t, i, p, v, s, a),
      (l = d < o.length ? o[d] : null),
      (u = c < r.length ? r[c] : null));
  }
}
function Tm(n, e, t, i, o, r, s, a) {
  if (!(e.type & 3)) return;
  let d = n.data,
    c = d[a + 1],
    l = NC(c) ? Vh(d, e, t, o, Qn(c), s) : void 0;
  if (!Fr(l)) {
    Fr(r) || (TC(c) && (r = Vh(d, null, t, o, a, s)));
    let u = Ja(ut(), t);
    xD(i, s, u, o, r);
  }
}
function Vh(n, e, t, i, o, r) {
  let s = e === null,
    a;
  for (; o > 0;) {
    let d = n[o],
      c = Array.isArray(d),
      l = c ? d[1] : d,
      u = l === null,
      f = t[o + 1];
    f === Ve && (f = u ? Ee : void 0);
    let g = u ? tr(f, i) : l === i ? f : void 0;
    if ((c && !Fr(g) && (g = tr(d, i)), Fr(g) && ((a = g), s))) return a;
    let p = n[o + 1];
    o = s ? pn(p) : Qn(p);
  }
  if (e !== null) {
    let d = r ? e.residualClasses : e.residualStyles;
    d != null && (a = tr(d, i));
  }
  return a;
}
function Fr(n) {
  return n !== void 0;
}
function WC(n, e) {
  return (
    n == null ||
      n === '' ||
      (typeof e == 'string'
        ? (n = n + e)
        : typeof n == 'object' && (n = Ei(pc(n)))),
    n
  );
}
function _m(n, e) {
  return (n.flags & (e ? 8 : 16)) !== 0;
}
function pt(n, e = '') {
  let t = T(),
    i = J(),
    o = n + K,
    r = i.firstCreatePass ? yn(i, o, 1, e, null) : i.data[o],
    s = qC(i, t, r, e);
  ((t[o] = s), hr() && Ic(i, t, s, r), dn(r, !1));
}
var qC = (n, e, t, i) => (Pi(!0), qw(e[G], i));
function ZC(n, e, t, i = '') {
  return it(n, cn(), t) ? e + Ba(t) + i : Ve;
}
function vn(n) {
  return (Ji('', n), vn);
}
function Ji(n, e, t) {
  let i = T(),
    o = ZC(i, n, e, t);
  return (o !== Ve && YC(i, ut(), o), Ji);
}
function YC(n, e, t) {
  let i = Ja(e, n);
  Zw(n[G], i, t);
}
var Nm = {};
function eo(n) {
  Ft('NgLet');
  let e = J(),
    t = T(),
    i = n + K,
    o = yn(e, i, 128, null, null);
  return (dn(o, !1), rr(e, t, i, Nm), eo);
}
function Kr(n) {
  let e = J(),
    t = T(),
    i = ut();
  return (rr(e, t, i, n), n);
}
function Xr(n) {
  let e = qg(),
    t = Hg(e, K + n);
  if (t === Nm) throw new N(314, !1);
  return t;
}
function jh(n, e, t) {
  let i = J();
  i.firstCreatePass && xm(e, i.data, i.blueprint, Qe(n), t);
}
function xm(n, e, t, i, o) {
  if (((n = se(n)), Array.isArray(n)))
    for (let r = 0; r < n.length; r++) xm(n[r], e, t, i, o);
  else {
    let r = J(),
      s = T(),
      a = be(),
      d = Qt(n) ? n : se(n.provide),
      c = qa(n),
      l = a.providerIndexes & 1048575,
      u = a.directiveStart,
      f = a.providerIndexes >> 20;
    if (Qt(n) || !n.multi) {
      let g = new fn(c, o, Jn, null),
        p = Rd(d, e, o ? l : l + f, u);
      p === -1
        ? (Ad(Sr(a, s), r, d),
          Pd(r, n, e.length),
          e.push(d),
          a.directiveStart++,
          a.directiveEnd++,
          o && (a.providerIndexes += 1048576),
          t.push(g),
          s.push(g))
        : ((t[p] = g), (s[p] = g));
    } else {
      let g = Rd(d, e, l + f, u),
        p = Rd(d, e, l, l + f),
        v = g >= 0 && t[g],
        D = p >= 0 && t[p];
      if ((o && !D) || (!o && !v)) {
        Ad(Sr(a, s), r, d);
        let C = XC(o ? KC : QC, t.length, o, i, c, n);
        (!o && D && (t[p].providerFactory = C),
          Pd(r, n, e.length, 0),
          e.push(d),
          a.directiveStart++,
          a.directiveEnd++,
          o && (a.providerIndexes += 1048576),
          t.push(C),
          s.push(C));
      } else {
        let C = Pm(t[o ? p : g], c, !o && i);
        Pd(r, n, g > -1 ? g : p, C);
      }
      !o && i && D && t[p].componentProviders++;
    }
  }
}
function Pd(n, e, t, i) {
  let o = Qt(e),
    r = Og(e);
  if (o || r) {
    let d = (r ? se(e.useClass) : e).prototype.ngOnDestroy;
    if (d) {
      let c = n.destroyHooks || (n.destroyHooks = []);
      if (!o && e.multi) {
        let l = c.indexOf(t);
        l === -1 ? c.push(t, [i, d]) : c[l + 1].push(i, d);
      } else c.push(t, d);
    }
  }
}
function Pm(n, e, t) {
  return (t && n.componentProviders++, n.multi.push(e) - 1);
}
function Rd(n, e, t, i) {
  for (let o = t; o < i; o++) if (e[o] === n) return o;
  return -1;
}
function QC(n, e, t, i, o) {
  return cc(this.multi, []);
}
function KC(n, e, t, i, o) {
  let r = this.multi,
    s;
  if (this.providerFactory) {
    let a = this.providerFactory.componentProviders,
      d = Fi(i, i[b], this.providerFactory.index, o);
    ((s = d.slice(0, a)), cc(r, s));
    for (let c = a; c < d.length; c++) s.push(d[c]);
  } else ((s = []), cc(r, s));
  return s;
}
function cc(n, e) {
  for (let t = 0; t < n.length; t++) {
    let i = n[t];
    e.push(i());
  }
  return e;
}
function XC(n, e, t, i, o, r) {
  let s = new fn(n, t, Jn, null);
  return (
    (s.multi = []),
    (s.index = e),
    (s.componentProviders = 0),
    Pm(s, o, i && !t),
    s
  );
}
function wn(n, e) {
  return (t) => {
    ((t.providersResolver = (i, o) => jh(i, o ? o(n) : n, !1)),
      e && (t.viewProvidersResolver = (i, o) => jh(i, o ? o(e) : e, !0)));
  };
}
function Jr(n, e, t) {
  return JC(T(), gd(), n, e, t);
}
function Vc(n, e, t, i) {
  return e0(T(), gd(), n, e, t, i);
}
function Rm(n, e) {
  let t = n[e];
  return t === Ve ? void 0 : t;
}
function JC(n, e, t, i, o, r) {
  let s = e + t;
  return it(n, s, o) ? Jp(n, s + 1, r ? i.call(r, o) : i(o)) : Rm(n, s + 1);
}
function e0(n, e, t, i, o, r, s) {
  let a = e + t;
  return bE(n, a, o, r)
    ? Jp(n, a + 2, s ? i.call(s, o, r) : i(o, r))
    : Rm(n, a + 2);
}
var km = (() => {
  class n {
    applicationErrorHandler = m(ln);
    appRef = m(Yr);
    taskService = m(jn);
    ngZone = m(Te);
    zonelessEnabled = m(Ri);
    tracing = m(Xn, { optional: !0 });
    zoneIsDefined = typeof Zone < 'u' && !!Zone.root.run;
    schedulerTickApplyArgs = [{ data: { __scheduler_tick__: !0 } }];
    subscriptions = new Ie();
    angularZoneId = this.zoneIsDefined ? this.ngZone._inner?.get(wi) : null;
    scheduleInRootZone =
      !this.zonelessEnabled &&
      this.zoneIsDefined &&
      (m(Cd, { optional: !0 }) ?? !1);
    cancelScheduledCallback = null;
    useMicrotaskScheduler = !1;
    runningTick = !1;
    pendingRenderTaskId = null;
    constructor() {
      (this.subscriptions.add(
        this.appRef.afterTick.subscribe(() => {
          let t = this.taskService.add();
          if (
            !this.runningTick &&
            (this.cleanup(),
            !this.zonelessEnabled || this.appRef.includeAllTestViews)
          ) {
            this.taskService.remove(t);
            return;
          }
          (this.switchToMicrotaskScheduler(), this.taskService.remove(t));
        }),
      ),
        this.subscriptions.add(
          this.ngZone.onUnstable.subscribe(() => {
            this.runningTick || this.cleanup();
          }),
        ));
    }
    switchToMicrotaskScheduler() {
      this.ngZone.runOutsideAngular(() => {
        let t = this.taskService.add();
        ((this.useMicrotaskScheduler = !0),
          queueMicrotask(() => {
            ((this.useMicrotaskScheduler = !1), this.taskService.remove(t));
          }));
      });
    }
    notify(t) {
      if (!this.zonelessEnabled && t === 5) return;
      switch (t) {
        case 0: {
          this.appRef.dirtyFlags |= 2;
          break;
        }
        case 3:
        case 2:
        case 4:
        case 5:
        case 1: {
          this.appRef.dirtyFlags |= 4;
          break;
        }
        case 6: {
          this.appRef.dirtyFlags |= 2;
          break;
        }
        case 12: {
          this.appRef.dirtyFlags |= 16;
          break;
        }
        case 13: {
          this.appRef.dirtyFlags |= 2;
          break;
        }
        case 11:
          break;
        default:
          this.appRef.dirtyFlags |= 8;
      }
      if (
        ((this.appRef.tracingSnapshot =
          this.tracing?.snapshot(this.appRef.tracingSnapshot) ?? null),
        !this.shouldScheduleTick())
      )
        return;
      let i = this.useMicrotaskScheduler ? ah : wd;
      ((this.pendingRenderTaskId = this.taskService.add()),
        this.scheduleInRootZone
          ? (this.cancelScheduledCallback = Zone.root.run(() =>
              i(() => this.tick()),
            ))
          : (this.cancelScheduledCallback = this.ngZone.runOutsideAngular(() =>
              i(() => this.tick()),
            )));
    }
    shouldScheduleTick() {
      return !(
        this.appRef.destroyed ||
        this.pendingRenderTaskId !== null ||
        this.runningTick ||
        this.appRef._runningTick ||
        (!this.zonelessEnabled &&
          this.zoneIsDefined &&
          Zone.current.get(wi + this.angularZoneId))
      );
    }
    tick() {
      if (this.runningTick || this.appRef.destroyed) return;
      if (this.appRef.dirtyFlags === 0) {
        this.cleanup();
        return;
      }
      !this.zonelessEnabled &&
        this.appRef.dirtyFlags & 7 &&
        (this.appRef.dirtyFlags |= 1);
      let t = this.taskService.add();
      try {
        this.ngZone.run(
          () => {
            ((this.runningTick = !0), this.appRef._tick());
          },
          void 0,
          this.schedulerTickApplyArgs,
        );
      } catch (i) {
        this.applicationErrorHandler(i);
      } finally {
        (this.taskService.remove(t), this.cleanup());
      }
    }
    ngOnDestroy() {
      (this.subscriptions.unsubscribe(), this.cleanup());
    }
    cleanup() {
      if (
        ((this.runningTick = !1),
        this.cancelScheduledCallback?.(),
        (this.cancelScheduledCallback = null),
        this.pendingRenderTaskId !== null)
      ) {
        let t = this.pendingRenderTaskId;
        ((this.pendingRenderTaskId = null), this.taskService.remove(t));
      }
    }
    static ɵfac = function (i) {
      return new (i || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
  }
  return n;
})();
function jc() {
  return (Ft('NgZoneless'), $a([...Uc(), []]));
}
function Uc() {
  return [
    { provide: Xt, useExisting: km },
    { provide: Te, useClass: Di },
    { provide: Ri, useValue: !0 },
  ];
}
function t0() {
  return (typeof $localize < 'u' && $localize.locale) || Qi;
}
var es = new A('', {
  factory: () => m(es, { optional: !0, skipSelf: !0 }) || t0(),
});
function ke(n) {
  return yg(n);
}
function w(n, e) {
  return fi(n, e?.equal);
}
var Lm = Symbol('InputSignalNode#UNSET'),
  y0 = y(h({}, Ro), {
    transformFn: void 0,
    applyValueToInputSignal(n, e) {
      Nn(n, e);
    },
  });
function Bm(n, e) {
  let t = Object.create(y0);
  ((t.value = n), (t.transformFn = e?.transform));
  function i() {
    if ((Sn(t), t.value === Lm)) {
      let o = null;
      throw new N(-950, o);
    }
    return t.value;
  }
  return ((i[pe] = t), i);
}
function Am(n, e) {
  return Bm(n, e);
}
function v0(n) {
  return Bm(Lm, n);
}
var E = ((Am.required = v0), Am);
function Om(n, e) {
  return cm(e);
}
function w0(n, e) {
  return lm(e);
}
var Gc = ((Om.required = w0), Om);
var $c = new A(''),
  D0 = new A('');
function to(n) {
  return !n.moduleRef;
}
function E0(n) {
  let e = to(n) ? n.r3Injector : n.moduleRef.injector,
    t = e.get(Te);
  return t.run(() => {
    to(n)
      ? n.r3Injector.resolveInjectorInitializers()
      : n.moduleRef.resolveInjectorInitializers();
    let i = e.get(ln),
      o;
    if (
      (t.runOutsideAngular(() => {
        o = t.onError.subscribe({ next: i });
      }),
      to(n))
    ) {
      let r = () => e.destroy(),
        s = n.platformInjector.get($c);
      (s.add(r),
        e.onDestroy(() => {
          (o.unsubscribe(), s.delete(r));
        }));
    } else {
      let r = () => n.moduleRef.destroy(),
        s = n.platformInjector.get($c);
      (s.add(r),
        n.moduleRef.onDestroy(() => {
          (Oi(n.allPlatformModules, n.moduleRef), o.unsubscribe(), s.delete(r));
        }));
    }
    return I0(i, t, () => {
      let r = e.get(jn),
        s = r.add(),
        a = e.get(Lc);
      return (
        a.runInitializers(),
        a.donePromise
          .then(() => {
            let d = e.get(es, Qi);
            if ((Em(d || Qi), !e.get(D0, !0)))
              return to(n)
                ? e.get(Yr)
                : (n.allPlatformModules.push(n.moduleRef), n.moduleRef);
            if (to(n)) {
              let l = e.get(Yr);
              return (
                n.rootComponent !== void 0 && l.bootstrap(n.rootComponent),
                l
              );
            } else
              return (C0?.(n.moduleRef, n.allPlatformModules), n.moduleRef);
          })
          .finally(() => {
            r.remove(s);
          })
      );
    });
  });
}
var C0;
function I0(n, e, t) {
  try {
    let i = t();
    return Zr(i)
      ? i.catch((o) => {
          throw (e.runOutsideAngular(() => n(o)), o);
        })
      : i;
  } catch (i) {
    throw (e.runOutsideAngular(() => n(i)), i);
  }
}
var ts = null;
function M0(n = [], e) {
  return We.create({
    name: e,
    providers: [
      { provide: Ti, useValue: 'platform' },
      { provide: $c, useValue: new Set([() => (ts = null)]) },
      ...n,
    ],
  });
}
function b0(n = []) {
  if (ts) return ts;
  let e = M0(n);
  return ((ts = e), vm(), S0(e), e);
}
function S0(n) {
  let e = n.get(Br, null);
  tn(n, () => {
    e?.forEach((t) => t());
  });
}
var T0 = 1e4;
var WF = T0 - 1e3;
function Hm(n) {
  let {
    rootComponent: e,
    appProviders: t,
    platformProviders: i,
    platformRef: o,
  } = n;
  U(L.BootstrapApplicationStart);
  try {
    let r = o?.injector ?? b0(i),
      s = [Uc(), ch, ...(t || [])],
      a = new zi({
        providers: s,
        parent: r,
        debugName: '',
        runEnvironmentInitializers: !1,
      });
    return E0({
      r3Injector: a.injector,
      platformInjector: r,
      rootComponent: e,
    });
  } catch (r) {
    return Promise.reject(r);
  } finally {
    U(L.BootstrapApplicationEnd);
  }
}
function ns(n) {
  return typeof n == 'boolean' ? n : n != null && n !== 'false';
}
var zm = null;
function io() {
  return zm;
}
function Wc(n) {
  zm ??= n;
}
var no = class {};
var is = (() => {
  class n {
    _viewContainerRef;
    ngComponentOutlet = null;
    ngComponentOutletInputs;
    ngComponentOutletInjector;
    ngComponentOutletEnvironmentInjector;
    ngComponentOutletContent;
    ngComponentOutletNgModule;
    _componentRef;
    _moduleRef;
    _inputsUsed = new Map();
    get componentInstance() {
      return this._componentRef?.instance ?? null;
    }
    constructor(t) {
      this._viewContainerRef = t;
    }
    _needToReCreateNgModuleInstance(t) {
      return t.ngComponentOutletNgModule !== void 0;
    }
    _needToReCreateComponentInstance(t) {
      return (
        t.ngComponentOutlet !== void 0 ||
        t.ngComponentOutletContent !== void 0 ||
        t.ngComponentOutletInjector !== void 0 ||
        t.ngComponentOutletEnvironmentInjector !== void 0 ||
        this._needToReCreateNgModuleInstance(t)
      );
    }
    ngOnChanges(t) {
      if (
        this._needToReCreateComponentInstance(t) &&
        (this._viewContainerRef.clear(),
        this._inputsUsed.clear(),
        (this._componentRef = void 0),
        this.ngComponentOutlet)
      ) {
        let i =
          this.ngComponentOutletInjector ||
          this._viewContainerRef.parentInjector;
        (this._needToReCreateNgModuleInstance(t) &&
          (this._moduleRef?.destroy(),
          this.ngComponentOutletNgModule
            ? (this._moduleRef = Ac(this.ngComponentOutletNgModule, _0(i)))
            : (this._moduleRef = void 0)),
          (this._componentRef = this._viewContainerRef.createComponent(
            this.ngComponentOutlet,
            {
              injector: i,
              ngModuleRef: this._moduleRef,
              projectableNodes: this.ngComponentOutletContent,
              environmentInjector: this.ngComponentOutletEnvironmentInjector,
            },
          )));
      }
    }
    ngDoCheck() {
      if (this._componentRef) {
        if (this.ngComponentOutletInputs)
          for (let t of Object.keys(this.ngComponentOutletInputs))
            this._inputsUsed.set(t, !0);
        this._applyInputStateDiff(this._componentRef);
      }
    }
    ngOnDestroy() {
      this._moduleRef?.destroy();
    }
    _applyInputStateDiff(t) {
      for (let [i, o] of this._inputsUsed)
        o
          ? (t.setInput(i, this.ngComponentOutletInputs[i]),
            this._inputsUsed.set(i, !1))
          : (t.setInput(i, void 0), this._inputsUsed.delete(i));
    }
    static ɵfac = function (i) {
      return new (i || n)(Jn(ei));
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngComponentOutlet', '']],
      inputs: {
        ngComponentOutlet: 'ngComponentOutlet',
        ngComponentOutletInputs: 'ngComponentOutletInputs',
        ngComponentOutletInjector: 'ngComponentOutletInjector',
        ngComponentOutletEnvironmentInjector:
          'ngComponentOutletEnvironmentInjector',
        ngComponentOutletContent: 'ngComponentOutletContent',
        ngComponentOutletNgModule: 'ngComponentOutletNgModule',
      },
      exportAs: ['ngComponentOutlet'],
      features: [lc],
    });
  }
  return n;
})();
function _0(n) {
  return n.get(Ot).injector;
}
var oo = (() => {
  class n {
    static ɵfac = function (i) {
      return new (i || n)();
    };
    static ɵmod = qr({ type: n });
    static ɵinj = Ci({});
  }
  return n;
})();
function qc(n, e) {
  e = encodeURIComponent(e);
  for (let t of n.split(';')) {
    let i = t.indexOf('='),
      [o, r] = i == -1 ? [t, ''] : [t.slice(0, i), t.slice(i + 1)];
    if (o.trim() === e) return decodeURIComponent(r);
  }
  return null;
}
var ro = class {};
var Zc = 'browser';
function Vm(n) {
  return n === Zc;
}
var so = class {
    _doc;
    constructor(e) {
      this._doc = e;
    }
    manager;
  },
  os = (() => {
    class n extends so {
      constructor(t) {
        super(t);
      }
      supports(t) {
        return !0;
      }
      addEventListener(t, i, o, r) {
        return (
          t.addEventListener(i, o, r),
          () => this.removeEventListener(t, i, o, r)
        );
      }
      removeEventListener(t, i, o, r) {
        return t.removeEventListener(i, o, r);
      }
      static ɵfac = function (i) {
        return new (i || n)(V(Je));
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })(),
  as = new A(''),
  Xc = (() => {
    class n {
      _zone;
      _plugins;
      _eventNameToPlugin = new Map();
      constructor(t, i) {
        ((this._zone = i),
          t.forEach((s) => {
            s.manager = this;
          }));
        let o = t.filter((s) => !(s instanceof os));
        this._plugins = o.slice().reverse();
        let r = t.find((s) => s instanceof os);
        r && this._plugins.push(r);
      }
      addEventListener(t, i, o, r) {
        return this._findPluginFor(i).addEventListener(t, i, o, r);
      }
      getZone() {
        return this._zone;
      }
      _findPluginFor(t) {
        let i = this._eventNameToPlugin.get(t);
        if (i) return i;
        if (((i = this._plugins.find((r) => r.supports(t))), !i))
          throw new N(5101, !1);
        return (this._eventNameToPlugin.set(t, i), i);
      }
      static ɵfac = function (i) {
        return new (i || n)(V(as), V(Te));
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })(),
  Yc = 'ng-app-id';
function jm(n) {
  for (let e of n) e.remove();
}
function Um(n, e) {
  let t = e.createElement('style');
  return ((t.textContent = n), t);
}
function P0(n, e, t, i) {
  let o = n.head?.querySelectorAll(`style[${Yc}="${e}"],link[${Yc}="${e}"]`);
  if (o)
    for (let r of o)
      (r.removeAttribute(Yc),
        r instanceof HTMLLinkElement
          ? i.set(r.href.slice(r.href.lastIndexOf('/') + 1), {
              usage: 0,
              elements: [r],
            })
          : r.textContent && t.set(r.textContent, { usage: 0, elements: [r] }));
}
function Kc(n, e) {
  let t = e.createElement('link');
  return (t.setAttribute('rel', 'stylesheet'), t.setAttribute('href', n), t);
}
var Jc = (() => {
    class n {
      doc;
      appId;
      nonce;
      inline = new Map();
      external = new Map();
      hosts = new Set();
      constructor(t, i, o, r = {}) {
        ((this.doc = t),
          (this.appId = i),
          (this.nonce = o),
          P0(t, i, this.inline, this.external),
          this.hosts.add(t.head));
      }
      addStyles(t, i) {
        for (let o of t) this.addUsage(o, this.inline, Um);
        i?.forEach((o) => this.addUsage(o, this.external, Kc));
      }
      removeStyles(t, i) {
        for (let o of t) this.removeUsage(o, this.inline);
        i?.forEach((o) => this.removeUsage(o, this.external));
      }
      addUsage(t, i, o) {
        let r = i.get(t);
        r
          ? r.usage++
          : i.set(t, {
              usage: 1,
              elements: [...this.hosts].map((s) =>
                this.addElement(s, o(t, this.doc)),
              ),
            });
      }
      removeUsage(t, i) {
        let o = i.get(t);
        o && (o.usage--, o.usage <= 0 && (jm(o.elements), i.delete(t)));
      }
      ngOnDestroy() {
        for (let [, { elements: t }] of [...this.inline, ...this.external])
          jm(t);
        this.hosts.clear();
      }
      addHost(t) {
        this.hosts.add(t);
        for (let [i, { elements: o }] of this.inline)
          o.push(this.addElement(t, Um(i, this.doc)));
        for (let [i, { elements: o }] of this.external)
          o.push(this.addElement(t, Kc(i, this.doc)));
      }
      removeHost(t) {
        this.hosts.delete(t);
      }
      addElement(t, i) {
        return (
          this.nonce && i.setAttribute('nonce', this.nonce),
          t.appendChild(i)
        );
      }
      static ɵfac = function (i) {
        return new (i || n)(V(Je), V(Lr), V(Hr, 8), V(mn));
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })(),
  Qc = {
    svg: 'http://www.w3.org/2000/svg',
    xhtml: 'http://www.w3.org/1999/xhtml',
    xlink: 'http://www.w3.org/1999/xlink',
    xml: 'http://www.w3.org/XML/1998/namespace',
    xmlns: 'http://www.w3.org/2000/xmlns/',
    math: 'http://www.w3.org/1998/Math/MathML',
  },
  el = /%COMP%/g;
var Gm = '%COMP%',
  R0 = `_nghost-${Gm}`,
  k0 = `_ngcontent-${Gm}`,
  A0 = !0,
  O0 = new A('', { factory: () => A0 });
function F0(n) {
  return k0.replace(el, n);
}
function L0(n) {
  return R0.replace(el, n);
}
function Wm(n, e) {
  return e.map((t) => t.replace(el, n));
}
var tl = (() => {
    class n {
      eventManager;
      sharedStylesHost;
      appId;
      removeStylesOnCompDestroy;
      doc;
      ngZone;
      nonce;
      tracingService;
      rendererByCompId = new Map();
      defaultRenderer;
      constructor(t, i, o, r, s, a, d = null, c = null) {
        ((this.eventManager = t),
          (this.sharedStylesHost = i),
          (this.appId = o),
          (this.removeStylesOnCompDestroy = r),
          (this.doc = s),
          (this.ngZone = a),
          (this.nonce = d),
          (this.tracingService = c),
          (this.defaultRenderer = new ao(t, s, a, this.tracingService)));
      }
      createRenderer(t, i) {
        if (!t || !i) return this.defaultRenderer;
        let o = this.getOrCreateRenderer(t, i);
        return (
          o instanceof ss
            ? o.applyToHost(t)
            : o instanceof co && o.applyStyles(),
          o
        );
      }
      getOrCreateRenderer(t, i) {
        let o = this.rendererByCompId,
          r = o.get(i.id);
        if (!r) {
          let s = this.doc,
            a = this.ngZone,
            d = this.eventManager,
            c = this.sharedStylesHost,
            l = this.removeStylesOnCompDestroy,
            u = this.tracingService;
          switch (i.encapsulation) {
            case nt.Emulated:
              r = new ss(d, c, i, this.appId, l, s, a, u);
              break;
            case nt.ShadowDom:
              return new rs(d, t, i, s, a, this.nonce, u, c);
            case nt.ExperimentalIsolatedShadowDom:
              return new rs(d, t, i, s, a, this.nonce, u);
            default:
              r = new co(d, c, i, l, s, a, u);
              break;
          }
          o.set(i.id, r);
        }
        return r;
      }
      ngOnDestroy() {
        this.rendererByCompId.clear();
      }
      componentReplaced(t) {
        this.rendererByCompId.delete(t);
      }
      static ɵfac = function (i) {
        return new (i || n)(
          V(Xc),
          V(Jc),
          V(Lr),
          V(O0),
          V(Je),
          V(Te),
          V(Hr),
          V(Xn, 8),
        );
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })(),
  ao = class {
    eventManager;
    doc;
    ngZone;
    tracingService;
    data = Object.create(null);
    throwOnSyntheticProps = !0;
    constructor(e, t, i, o) {
      ((this.eventManager = e),
        (this.doc = t),
        (this.ngZone = i),
        (this.tracingService = o));
    }
    destroy() {}
    destroyNode = null;
    createElement(e, t) {
      return t
        ? this.doc.createElementNS(Qc[t] || t, e)
        : this.doc.createElement(e);
    }
    createComment(e) {
      return this.doc.createComment(e);
    }
    createText(e) {
      return this.doc.createTextNode(e);
    }
    appendChild(e, t) {
      ($m(e) ? e.content : e).appendChild(t);
    }
    insertBefore(e, t, i) {
      e && ($m(e) ? e.content : e).insertBefore(t, i);
    }
    removeChild(e, t) {
      t.remove();
    }
    selectRootElement(e, t) {
      let i = typeof e == 'string' ? this.doc.querySelector(e) : e;
      if (!i) throw new N(-5104, !1);
      return (t || (i.textContent = ''), i);
    }
    parentNode(e) {
      return e.parentNode;
    }
    nextSibling(e) {
      return e.nextSibling;
    }
    setAttribute(e, t, i, o) {
      if (o) {
        t = o + ':' + t;
        let r = Qc[o];
        r ? e.setAttributeNS(r, t, i) : e.setAttribute(t, i);
      } else e.setAttribute(t, i);
    }
    removeAttribute(e, t, i) {
      if (i) {
        let o = Qc[i];
        o ? e.removeAttributeNS(o, t) : e.removeAttribute(`${i}:${t}`);
      } else e.removeAttribute(t);
    }
    addClass(e, t) {
      e.classList.add(t);
    }
    removeClass(e, t) {
      e.classList.remove(t);
    }
    setStyle(e, t, i, o) {
      o & (gt.DashCase | gt.Important)
        ? e.style.setProperty(t, i, o & gt.Important ? 'important' : '')
        : (e.style[t] = i);
    }
    removeStyle(e, t, i) {
      i & gt.DashCase ? e.style.removeProperty(t) : (e.style[t] = '');
    }
    setProperty(e, t, i) {
      e != null && (e[t] = i);
    }
    setValue(e, t) {
      e.nodeValue = t;
    }
    listen(e, t, i, o) {
      if (
        typeof e == 'string' &&
        ((e = io().getGlobalEventTarget(this.doc, e)), !e)
      )
        throw new N(5102, !1);
      let r = this.decoratePreventDefault(i);
      return (
        this.tracingService?.wrapEventListener &&
          (r = this.tracingService.wrapEventListener(e, t, r)),
        this.eventManager.addEventListener(e, t, r, o)
      );
    }
    decoratePreventDefault(e) {
      return (t) => {
        if (t === '__ngUnwrap__') return e;
        e(t) === !1 && t.preventDefault();
      };
    }
  };
function $m(n) {
  return n.tagName === 'TEMPLATE' && n.content !== void 0;
}
var rs = class extends ao {
    hostEl;
    sharedStylesHost;
    shadowRoot;
    constructor(e, t, i, o, r, s, a, d) {
      (super(e, o, r, a),
        (this.hostEl = t),
        (this.sharedStylesHost = d),
        (this.shadowRoot = t.attachShadow({ mode: 'open' })),
        this.sharedStylesHost &&
          this.sharedStylesHost.addHost(this.shadowRoot));
      let c = i.styles;
      c = Wm(i.id, c);
      for (let u of c) {
        let f = document.createElement('style');
        (s && f.setAttribute('nonce', s),
          (f.textContent = u),
          this.shadowRoot.appendChild(f));
      }
      let l = i.getExternalStyles?.();
      if (l)
        for (let u of l) {
          let f = Kc(u, o);
          (s && f.setAttribute('nonce', s), this.shadowRoot.appendChild(f));
        }
    }
    nodeOrShadowRoot(e) {
      return e === this.hostEl ? this.shadowRoot : e;
    }
    appendChild(e, t) {
      return super.appendChild(this.nodeOrShadowRoot(e), t);
    }
    insertBefore(e, t, i) {
      return super.insertBefore(this.nodeOrShadowRoot(e), t, i);
    }
    removeChild(e, t) {
      return super.removeChild(null, t);
    }
    parentNode(e) {
      return this.nodeOrShadowRoot(super.parentNode(this.nodeOrShadowRoot(e)));
    }
    destroy() {
      this.sharedStylesHost &&
        this.sharedStylesHost.removeHost(this.shadowRoot);
    }
  },
  co = class extends ao {
    sharedStylesHost;
    removeStylesOnCompDestroy;
    styles;
    styleUrls;
    constructor(e, t, i, o, r, s, a, d) {
      (super(e, r, s, a),
        (this.sharedStylesHost = t),
        (this.removeStylesOnCompDestroy = o));
      let c = i.styles;
      ((this.styles = d ? Wm(d, c) : c),
        (this.styleUrls = i.getExternalStyles?.(d)));
    }
    applyStyles() {
      this.sharedStylesHost.addStyles(this.styles, this.styleUrls);
    }
    destroy() {
      this.removeStylesOnCompDestroy &&
        gn.size === 0 &&
        this.sharedStylesHost.removeStyles(this.styles, this.styleUrls);
    }
  },
  ss = class extends co {
    contentAttr;
    hostAttr;
    constructor(e, t, i, o, r, s, a, d) {
      let c = o + '-' + i.id;
      (super(e, t, i, r, s, a, d, c),
        (this.contentAttr = F0(c)),
        (this.hostAttr = L0(c)));
    }
    applyToHost(e) {
      (this.applyStyles(), this.setAttribute(e, this.hostAttr, ''));
    }
    createElement(e, t) {
      let i = super.createElement(e, t);
      return (super.setAttribute(i, this.contentAttr, ''), i);
    }
  };
var ds = class n extends no {
    supportsDOMEvents = !0;
    static makeCurrent() {
      Wc(new n());
    }
    onAndCancel(e, t, i, o) {
      return (
        e.addEventListener(t, i, o),
        () => {
          e.removeEventListener(t, i, o);
        }
      );
    }
    dispatchEvent(e, t) {
      e.dispatchEvent(t);
    }
    remove(e) {
      e.remove();
    }
    createElement(e, t) {
      return ((t = t || this.getDefaultDocument()), t.createElement(e));
    }
    createHtmlDocument() {
      return document.implementation.createHTMLDocument('fakeTitle');
    }
    getDefaultDocument() {
      return document;
    }
    isElementNode(e) {
      return e.nodeType === Node.ELEMENT_NODE;
    }
    isShadowRoot(e) {
      return e instanceof DocumentFragment;
    }
    getGlobalEventTarget(e, t) {
      return t === 'window'
        ? window
        : t === 'document'
          ? e
          : t === 'body'
            ? e.body
            : null;
    }
    getBaseHref(e) {
      let t = B0();
      return t == null ? null : H0(t);
    }
    resetBaseElement() {
      lo = null;
    }
    getUserAgent() {
      return window.navigator.userAgent;
    }
    getCookie(e) {
      return qc(document.cookie, e);
    }
  },
  lo = null;
function B0() {
  return (
    (lo = lo || document.head.querySelector('base')),
    lo ? lo.getAttribute('href') : null
  );
}
function H0(n) {
  return new URL(n, document.baseURI).pathname;
}
var z0 = (() => {
    class n {
      build() {
        return new XMLHttpRequest();
      }
      static ɵfac = function (i) {
        return new (i || n)();
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })(),
  qm = ['alt', 'control', 'meta', 'shift'],
  V0 = {
    '\b': 'Backspace',
    '	': 'Tab',
    '\x7F': 'Delete',
    '\x1B': 'Escape',
    Del: 'Delete',
    Esc: 'Escape',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Menu: 'ContextMenu',
    Scroll: 'ScrollLock',
    Win: 'OS',
  },
  j0 = {
    alt: (n) => n.altKey,
    control: (n) => n.ctrlKey,
    meta: (n) => n.metaKey,
    shift: (n) => n.shiftKey,
  },
  Zm = (() => {
    class n extends so {
      constructor(t) {
        super(t);
      }
      supports(t) {
        return n.parseEventName(t) != null;
      }
      addEventListener(t, i, o, r) {
        let s = n.parseEventName(i),
          a = n.eventCallback(s.fullKey, o, this.manager.getZone());
        return this.manager
          .getZone()
          .runOutsideAngular(() => io().onAndCancel(t, s.domEventName, a, r));
      }
      static parseEventName(t) {
        let i = t.toLowerCase().split('.'),
          o = i.shift();
        if (i.length === 0 || !(o === 'keydown' || o === 'keyup')) return null;
        let r = n._normalizeKey(i.pop()),
          s = '',
          a = i.indexOf('code');
        if (
          (a > -1 && (i.splice(a, 1), (s = 'code.')),
          qm.forEach((c) => {
            let l = i.indexOf(c);
            l > -1 && (i.splice(l, 1), (s += c + '.'));
          }),
          (s += r),
          i.length != 0 || r.length === 0)
        )
          return null;
        let d = {};
        return ((d.domEventName = o), (d.fullKey = s), d);
      }
      static matchEventFullKeyCode(t, i) {
        let o = V0[t.key] || t.key,
          r = '';
        return (
          i.indexOf('code.') > -1 && ((o = t.code), (r = 'code.')),
          o == null || !o
            ? !1
            : ((o = o.toLowerCase()),
              o === ' ' ? (o = 'space') : o === '.' && (o = 'dot'),
              qm.forEach((s) => {
                if (s !== o) {
                  let a = j0[s];
                  a(t) && (r += s + '.');
                }
              }),
              (r += o),
              r === i)
        );
      }
      static eventCallback(t, i, o) {
        return (r) => {
          n.matchEventFullKeyCode(r, t) && o.runGuarded(() => i(r));
        };
      }
      static _normalizeKey(t) {
        return t === 'esc' ? 'escape' : t;
      }
      static ɵfac = function (i) {
        return new (i || n)(V(Je));
      };
      static ɵprov = I({ token: n, factory: n.ɵfac });
    }
    return n;
  })();
async function nl(n, e, t) {
  let i = h({ rootComponent: n }, U0(e, t));
  return Hm(i);
}
function U0(n, e) {
  return {
    platformRef: e?.platformRef,
    appProviders: [...Z0, ...(n?.providers ?? [])],
    platformProviders: q0,
  };
}
function $0() {
  ds.makeCurrent();
}
function G0() {
  return new wt();
}
function W0() {
  return (gc(document), document);
}
var q0 = [
  { provide: mn, useValue: Zc },
  { provide: Br, useValue: $0, multi: !0 },
  { provide: Je, useFactory: W0 },
];
var Z0 = [
  { provide: Ti, useValue: 'root' },
  { provide: wt, useFactory: G0 },
  { provide: as, useClass: os, multi: !0 },
  { provide: as, useClass: Zm, multi: !0 },
  tl,
  Jc,
  Xc,
  { provide: hn, useExisting: tl },
  { provide: ro, useClass: z0 },
  [],
];
var Cy = ['contentProjection'],
  Oe = ['*'];
function Y0(n, e) {
  if ((n & 1 && bt(0, 'div'), n & 2)) {
    R();
    let t = Xr(0);
    ye('left', t.x, 'px')('top', t.y, 'px')('width', t.width, 'px')(
      'height',
      t.height,
      'px',
    );
  }
}
var Q0 = [
    [['ng-diagram-edge']],
    [['ng-diagram-marker-arrow']],
    [['ng-diagram-node']],
  ],
  K0 = ['ng-diagram-edge', 'ng-diagram-marker-arrow', 'ng-diagram-node'],
  Iy = (n, e) => e.end;
function X0(n, e) {
  if ((n & 1 && (de(), $(0, 'defs', 0)), n & 2)) {
    let t = R();
    O('sourceMarkerId', t.sourceMarkerId())(
      'targetMarkerId',
      t.targetMarkerId(),
    )('edgeId', t.edge().id);
  }
}
function J0(n, e) {
  if ((n & 1 && (de(), $(0, 'circle', 4)), n & 2)) {
    let t = e.$implicit,
      i = R(2);
    (ye('--ngd-relink-handle-inset-x', t.inset.x)(
      '--ngd-relink-handle-inset-y',
      t.inset.y,
    ),
      O('edge', i.edge())('end', t.end),
      q('data-relink-handle-hit', t.end)('cx', t.point.x)('cy', t.point.y)(
        'r',
        i.relinkHandleHitRadius(),
      ));
  }
}
function eI(n, e) {
  if ((n & 1 && ot(0, J0, 1, 10, ':svg:circle', 3, Iy), n & 2)) {
    let t = R();
    rt(t.relinkHandles());
  }
}
function tI(n, e) {
  if (
    (n & 1 && (de(), W(0, 'g', 5), $(1, 'circle', 6)(2, 'circle', 7), Y()),
    n & 2)
  ) {
    let t = e.$implicit,
      i = R();
    (ye('--ngd-relink-handle-inset-x', t.inset.x)(
      '--ngd-relink-handle-inset-y',
      t.inset.y,
    ),
      Ne('ng-diagram-edge__relink-handle--dragging', t.dragging),
      O('edge', i.edge())('end', t.end),
      q('data-relink-handle', t.end),
      _(),
      q('cx', t.point.x)('cy', t.point.y),
      _(),
      q('cx', t.point.x)('cy', t.point.y));
  }
}
function nI(n, e) {
  if (
    (n & 1 &&
      (W(
        0,
        'ng-diagram-base-edge-label',
        1,
      )(1, 'ng-diagram-default-edge-label'),
      pt(2),
      Y()()),
    n & 2)
  ) {
    let t = R(),
      i = Xr(1);
    (O('id', 'edge-label')('positionOnEdge', t.positionOnEdge()), _(2), vn(i));
  }
}
var iI = (n, e) => e.position;
function oI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-resize-line', 0), n & 2)) {
    let t = e.$implicit,
      i = R(2);
    O('position', t)('targetData', i.nodeData())(
      'active',
      i.activeSideSet().has(t),
    );
  }
}
function rI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-resize-handle', 1), n & 2)) {
    let t = R().$implicit,
      i = R(2);
    O('position', t.position)('targetData', i.nodeData());
  }
}
function sI(n, e) {
  if ((n & 1 && oe(0, rI, 1, 2, 'ng-diagram-resize-handle', 1), n & 2)) {
    let t = e.$implicit;
    re(t.active ? 0 : -1);
  }
}
function aI(n, e) {
  if (
    (n & 1 &&
      (ot(0, oI, 1, 3, 'ng-diagram-resize-line', 0, Yi),
      ot(2, sI, 1, 1, null, null, iI)),
    n & 2)
  ) {
    let t = R();
    (rt(t.linePositions), _(2), rt(t.handles()));
  }
}
function dI(n, e) {
  n & 1 && (de(), ge(0, 'svg', 2), bt(1, 'path', 3), he());
}
function cI(n, e) {
  if ((n & 1 && (W(0, 'ng-diagram-rotate-handle', 0), ce(1), Y()), n & 2)) {
    let t = R();
    O('data', t.nodeData());
  }
}
function lI(n, e) {
  n & 1 && $(0, 'ng-diagram-port', 1)(1, 'ng-diagram-port', 2);
}
var uI = [[['ng-diagram-background']]],
  fI = ['ng-diagram-background'],
  gI = (n) => ({ edge: n }),
  hI = (n) => ({ node: n });
function pI(n, e) {
  n & 1 && ni(0);
}
function mI(n, e) {
  if ((n & 1 && ti(0, pI, 1, 0, 'ng-container', 5), n & 2)) {
    let t = R().$implicit,
      i = R();
    O('ngComponentOutlet', i.getEdgeTemplate(t.type))(
      'ngComponentOutletInputs',
      Jr(2, gI, t),
    );
  }
}
function yI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-default-edge', 2), n & 2)) {
    let t = R().$implicit;
    O('edge', t);
  }
}
function vI(n, e) {
  if (
    (n & 1 &&
      (W(0, 'ng-diagram-edge', 2),
      oe(1, mI, 1, 4, 'ng-container')(
        2,
        yI,
        1,
        1,
        'ng-diagram-default-edge',
        2,
      ),
      Y()),
    n & 2)
  ) {
    let t = e.$implicit,
      i = R();
    (O('edge', t),
      q('data-edge-id', t.id),
      _(),
      re(i.getEdgeTemplate(t.type) ? 1 : 2));
  }
}
function wI(n, e) {
  n & 1 && ni(0);
}
function DI(n, e) {
  if ((n & 1 && ti(0, wI, 1, 0, 'ng-container', 5), n & 2)) {
    let t = R().$implicit,
      i = R();
    O('ngComponentOutlet', i.getNodeTemplate(t.type))(
      'ngComponentOutletInputs',
      Jr(2, hI, t),
    );
  }
}
function EI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-default-group-template', 6), n & 2)) {
    let t = R().$implicit,
      i = R();
    O('node', i.castToGroupNode(t));
  }
}
function CI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-default-node-template', 6), n & 2)) {
    let t = R().$implicit;
    O('node', t);
  }
}
function II(n, e) {
  if (
    (n & 1 &&
      (W(0, 'ng-diagram-node', 3),
      oe(1, DI, 1, 4, 'ng-container')(
        2,
        EI,
        1,
        1,
        'ng-diagram-default-group-template',
        6,
      )(3, CI, 1, 1, 'ng-diagram-default-node-template', 6),
      Y()),
    n & 2)
  ) {
    let t = e.$implicit,
      i = R();
    (O('node', t),
      q('data-node-id', t.id),
      _(),
      re(i.getNodeTemplate(t.type) ? 1 : i.isGroup(t) ? 2 : 3));
  }
}
function MI(n, e) {
  if ((n & 1 && $(0, 'ng-diagram-watermark', 4), n & 2)) {
    let t,
      i = R();
    O(
      'preferredPosition',
      (t = i.config()) == null ? null : t.watermarkPosition,
    )('tabbable', i.tabbable());
  }
}
var bI = ['ng-diagram-default-minimap-node', ''];
function SI(n, e) {
  if ((n & 1 && (de(), bt(0, 'circle')), n & 2)) {
    let t = R();
    q('cx', t.cx())('cy', t.cy())('r', t.radius());
  }
}
function TI(n, e) {
  if ((n & 1 && (de(), bt(0, 'ellipse')), n & 2)) {
    let t = R();
    q('cx', t.cx())('cy', t.cy())('rx', t.rx())('ry', t.ry());
  }
}
function _I(n, e) {
  if ((n & 1 && (de(), bt(0, 'rect')), n & 2)) {
    let t = R();
    q('x', t.bounds().x)('y', t.bounds().y)('width', t.bounds().width)(
      'height',
      t.bounds().height,
    );
  }
}
var NI = ['ng-diagram-minimap-diagram-bounds', ''],
  xI = (n, e) => ({ node: n, nodeStyle: e }),
  PI = (n, e) => e.bounds.id;
function RI(n, e) {
  n & 1 && ni(0);
}
function kI(n, e) {
  if (
    (n & 1 &&
      (de(), W(0, 'foreignObject'), ti(1, RI, 1, 0, 'ng-container', 6), Y()),
    n & 2)
  ) {
    let t = R().$implicit;
    (q('x', t.bounds.x)('y', t.bounds.y)('width', t.bounds.width)(
      'height',
      t.bounds.height,
    )('transform', t.bounds.transform),
      _(),
      O('ngComponentOutlet', t.template)(
        'ngComponentOutletInputs',
        Vc(7, xI, t.diagramNode, t.nodeStyle),
      ));
  }
}
function AI(n, e) {
  if ((n & 1 && (de(), $(0, 'g', 5)), n & 2)) {
    let t = R().$implicit;
    O('bounds', t.bounds)('nodeStyle', t.nodeStyle);
  }
}
function OI(n, e) {
  if (
    (n & 1 && oe(0, kI, 2, 10, ':svg:foreignObject')(1, AI, 1, 2, ':svg:g', 5),
    n & 2)
  ) {
    let t = e.$implicit;
    re(t.template ? 0 : 1);
  }
}
function FI(n, e) {
  if ((n & 1 && (de(), $(0, 'rect', 3)), n & 2)) {
    let t = R(2);
    O('diagramBounds', t.diagramBounds())('minimapTransform', t.transform());
  }
}
function LI(n, e) {
  if ((n & 1 && (de(), $(0, 'rect', 4)), n & 2)) {
    let t = R(2);
    q('x', t.viewportRect().x)('y', t.viewportRect().y)(
      'width',
      t.viewportRect().width,
    )('height', t.viewportRect().height);
  }
}
function BI(n, e) {
  if (
    (n & 1 &&
      (de(),
      W(0, 'g'),
      ot(1, OI, 2, 1, null, null, PI),
      Y(),
      oe(3, FI, 1, 2, ':svg:rect', 3),
      oe(4, LI, 1, 4, ':svg:rect', 4)),
    n & 2)
  ) {
    let t = R();
    (q('transform', t.nodesGroupTransform()),
      _(),
      rt(t.minimapNodes()),
      _(2),
      re(t.showDiagramBounds() ? 3 : -1),
      _(),
      re(t.hasValidViewport() ? 4 : -1));
  }
}
function HI(n, e) {
  n & 1 && $(0, 'ng-diagram-zoom-controls');
}
var uo = class n {
  boundingBox = P(null);
  static ɵfac = function (t) {
    return new (t || n)();
  };
  static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
};
(Set.prototype.difference ||
  (Set.prototype.difference = function (n) {
    let e = new Set();
    for (let t of this) n.has(t) || e.add(t);
    return e;
  }),
  Set.prototype.intersection ||
    (Set.prototype.intersection = function (n) {
      let e = new Set();
      for (let t of this) n.has(t) && e.add(t);
      return e;
    }));
var sl = class {
    eventManager;
    state;
    constructor(e) {
      ((this.eventManager = e),
        (this.state = new Proxy(
          {},
          { set: (t, i, o) => ((t[i] = o), this.emitStateChanged(), !0) },
        )));
    }
    getState() {
      return this.state;
    }
    emitStateChanged() {
      this.eventManager.emit('actionStateChanged', {
        actionState: h({}, this.state),
      });
    }
    get resize() {
      return this.state.resize;
    }
    set resize(e) {
      this.state.resize = e;
    }
    get linking() {
      return this.state.linking;
    }
    set linking(e) {
      this.state.linking = e;
    }
    get copyPaste() {
      return this.state.copyPaste;
    }
    set copyPaste(e) {
      this.state.copyPaste = e;
    }
    get highlightGroup() {
      return this.state.highlightGroup;
    }
    set highlightGroup(e) {
      this.state.highlightGroup = e;
    }
    get rotation() {
      return this.state.rotation;
    }
    set rotation(e) {
      this.state.rotation = e;
    }
    get dragging() {
      return this.state.dragging;
    }
    set dragging(e) {
      this.state.dragging = e;
    }
    get panning() {
      return this.state.panning;
    }
    set panning(e) {
      this.state.panning = e;
    }
    clearResize() {
      this.state.resize = void 0;
    }
    clearLinking() {
      this.state.linking = void 0;
    }
    clearCopyPaste() {
      this.state.copyPaste = void 0;
    }
    clearHighlightGroup() {
      this.state.highlightGroup = void 0;
    }
    clearRotation() {
      this.state.rotation = void 0;
    }
    clearDragging() {
      this.state.dragging = void 0;
    }
    isResizing() {
      return !!this.state.resize;
    }
    isLinking() {
      return !!this.state.linking;
    }
    isRotating() {
      return !!this.state.rotation;
    }
    isDragging() {
      return !!this.state.dragging;
    }
    clearPanning() {
      this.state.panning = void 0;
    }
    isPanning() {
      return !!this.state.panning?.active;
    }
    get selection() {
      return this.state.selection;
    }
    set selection(e) {
      this.state.selection = e;
    }
    clearSelection() {
      this.state.selection = void 0;
    }
  },
  zI = (n) => {
    if (!n || n.length === 0) return '';
    if (n.length === 1) return `M ${n[0].x},${n[0].y}`;
    if (n.length === 2) return `M ${n[0].x},${n[0].y} L ${n[1].x},${n[1].y}`;
    if (n.length === 3)
      return `M ${n[0].x},${n[0].y} Q ${n[1].x},${n[1].y} ${n[2].x},${n[2].y}`;
    if (n.length === 4)
      return `M ${n[0].x},${n[0].y} C ${n[1].x},${n[1].y} ${n[2].x},${n[2].y} ${n[3].x},${n[3].y}`;
    let e = [`M ${n[0].x},${n[0].y}`];
    for (let t = 1; t < n.length; t++) e.push(`L ${n[t].x},${n[t].y}`);
    return e.join(' ');
  },
  Gs = (n, e) => {
    let t = n >= 0 && !Object.is(n, -0) ? n : e + n;
    return Math.max(0, Math.min(t, e));
  };
function VI(n, e) {
  return Math.atan2(e.y - n.y, e.x - n.x) * (180 / Math.PI);
}
var Rf = (n) => ((n % 360) + 360) % 360,
  jI = (n, e = !1) => {
    let t = Rf(n),
      i;
    return (
      (i =
        t >= 315 || t < 45
          ? 'right'
          : t >= 45 && t < 135
            ? 'bottom'
            : t >= 135 && t < 225
              ? 'left'
              : 'top'),
      e ? { right: 'left', left: 'right', top: 'bottom', bottom: 'top' }[i] : i
    );
  },
  oi = ({ min: n, value: e, max: t }) => Math.min(Math.max(e, n), t),
  UI = (n, e, t, i) => {
    let { x: o, y: r, width: s, height: a } = n,
      { x: d, y: c } = e,
      l = 0,
      u = 0,
      f = d - o,
      g = o + s - d,
      p = c - r,
      v = r + a - c;
    if (
      (f < t
        ? (l = oi({ min: 0, max: t, value: -(f - t) }))
        : g < t && (l = -oi({ min: 0, max: t, value: -(g - t) })),
      p < t
        ? (u = oi({ min: 0, max: t, value: -(p - t) }))
        : v < t && (u = -oi({ min: 0, max: t, value: -(v - t) })),
      l === 0 && u === 0)
    )
      return null;
    let D = l / t,
      C = u / t;
    return (
      (D = isFinite(D) ? D : 1),
      (C = isFinite(C) ? C : 1),
      { x: D * i, y: C * i }
    );
  },
  $I = (n, e) => Math.sqrt((n.x - e.x) ** 2 + (n.y - e.y) ** 2);
function Ym(n) {
  return Math.abs(n - Math.trunc(n));
}
function GI(n, e) {
  let t = Math.round(n / e);
  if (t === 0 && e > 1) return 0;
  let i = Math.abs(t) === 1 && Math.abs(n) < e,
    o = oi({ min: 1, max: e / 2 - 1, value: Math.floor(e / 2 - 1) });
  if (i && e - Math.abs(n) > o) return 0;
  let r = t * e;
  if (e === 1) {
    let s = (r - 1) % 90 == 0;
    (r + 1) % 90 == 0
      ? 1 - Ym(n) < 0.9001 && (r += 1)
      : s && Ym(n) < 0.9001 && (r -= 1);
  }
  return Rf(r);
}
var al = (n, e, t = 0) => (e ? t + e * Math.round((n - t) / e) : n),
  WI = (n, e, t = { width: 0, height: 0 }) => ({
    x: al(n.x, e.width, t.width),
    y: al(n.y, e.height, t.height),
  }),
  qI = (n, e) => ({ x: n.x - e.x, y: n.y - e.y }),
  j = {
    angleBetweenPoints: VI,
    angleToSide: jI,
    clamp: oi,
    distanceBetweenPoints: $I,
    normalizeAngle: Rf,
    snapAngle: GI,
    snapNumber: al,
    snapPoint: WI,
    subtractPoints: qI,
    calculateEdgePanningForce: UI,
  },
  fs = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let t = j.clamp({ min: 0, value: e, max: 1 });
    if (n.length === 2) {
      let [f, g] = n;
      return { x: f.x + (g.x - f.x) * t, y: f.y + (g.y - f.y) * t };
    }
    if (n.length === 3) {
      let [f, g, p] = n,
        v = 1 - t,
        D = v * v,
        C = t * t;
      return {
        x: D * f.x + 2 * v * t * g.x + C * p.x,
        y: D * f.y + 2 * v * t * g.y + C * p.y,
      };
    }
    let [i, o, r, s] = n,
      a = 1 - t,
      d = a * a,
      c = d * a,
      l = t * t,
      u = l * t;
    return {
      x: c * i.x + 3 * d * t * o.x + 3 * a * l * r.x + u * s.x,
      y: c * i.y + 3 * d * t * o.y + 3 * a * l * r.y + u * s.y,
    };
  };
var ZI = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let t = [{ t: 0, length: 0 }],
      i = fs(n, 0),
      o = 0;
    for (let u = 1; u <= 100; u++) {
      let f = u / 100,
        g = fs(n, f);
      ((o += Math.hypot(g.x - i.x, g.y - i.y)),
        t.push({ t: f, length: o }),
        (i = g));
    }
    let r = Gs(e, o),
      s = 0,
      a = 100;
    for (; s < a;) {
      let u = (s + a) >> 1;
      t[u].length < r ? (s = u + 1) : (a = u);
    }
    let d = t[Math.max(0, s - 1)],
      c = t[s],
      l = c.length - d.length;
    return fs(n, d.t + (c.t - d.t) * (l > 0 ? (r - d.length) / l : 0));
  },
  Qm = (n, e) => {
    switch (n.side) {
      case 'right':
      default:
        return { x: n.x + e, y: n.y };
      case 'left':
        return { x: n.x - e, y: n.y };
      case 'bottom':
        return { x: n.x, y: n.y + e };
      case 'top':
        return { x: n.x, y: n.y - e };
    }
  },
  YI = (n, e, t = 100) => {
    if (!n || !e) return [];
    let i = Qm(n, Math.abs(t)),
      o = Qm(e, Math.abs(t));
    return [{ x: n.x, y: n.y }, i, o, { x: e.x, y: e.y }];
  };
var dl = class {
    name = 'bezier';
    computePoints(e, t) {
      let { sourcePoint: i, targetPoint: o } = e;
      return YI(i, o, t?.bezier?.bezierControlOffset ?? 100);
    }
    computeSvgPath(e) {
      return zI(e);
    }
    computePointOnPath(e, t) {
      return fs(e, t);
    }
    computePointAtDistance(e, t) {
      return ZI(e, t);
    }
  },
  QI = (n = [], e = 16) => {
    if (n.length === 0) return '';
    if (n.length === 1) return `M ${n[0].x},${n[0].y}`;
    if (n.length === 2) return `M ${n[0].x},${n[0].y} L ${n[1].x},${n[1].y}`;
    let t = n[0],
      i = n.slice(1, -1),
      o = n[n.length - 1],
      r = i.map((s, a) => {
        let d = n[a],
          c = n[a + 2],
          l = c.y - d.y,
          u = Math.min(Math.abs(c.x - d.x) / 2, Math.abs(l) / 2, e),
          f = d.x < s.x,
          g = d.x > s.x,
          p = d.y > s.y,
          v = d.y < s.y,
          D = c.x < s.x,
          C = c.x > s.x,
          Z = c.y > s.y,
          we = c.y < s.y,
          Ce = Math.abs(d.x - s.x) <= 1,
          te = Math.abs(d.y - s.y) <= 1,
          at = Math.abs(c.x - s.x) <= 1,
          Vt = Math.abs(c.y - s.y) <= 1;
        if (i.length <= 2 && ((Ce && te) || (at && Vt))) return '';
        if (d.y === s.y && s.y === c.y) return `L${s.x + (g ? u : -u)},${s.y}`;
        if (d.x === s.x && s.x === c.x) return `L${s.x},${s.y + (v ? -u : u)}`;
        let Wf = (f && Z) || (g && we) || (v && D) || (p && C);
        return d.x === s.x
          ? `L${s.x},${s.y + (v ? -u : u)} A${u},${u},0,0,${Wf ? 1 : 0},${s.x + (C ? u : -u)},${s.y}`
          : `L${s.x + (g ? u : -u)},${s.y} A${u},${u},0,0,${Wf ? 1 : 0},${s.x},${s.y + (we ? -u : u)}`;
      });
    return `M ${t.x},${t.y} ${r.join(' ')} L ${o.x},${o.y}`;
  },
  kf = (n) => {
    let e = [],
      t = 0;
    for (let i = 0; i < n.length - 1; i++) {
      let o = Math.hypot(n[i + 1].x - n[i].x, n[i + 1].y - n[i].y);
      (e.push(o), (t += o));
    }
    return { lengths: e, totalLength: t };
  },
  Af = (n, e, t) => {
    let i = 0;
    for (let o = 0; o < e.length; o++) {
      if (i + e[o] >= t) {
        let r = e[o] > 0 ? (t - i) / e[o] : 0;
        return {
          x: n[o].x + (n[o + 1].x - n[o].x) * r,
          y: n[o].y + (n[o + 1].y - n[o].y) * r,
        };
      }
      i += e[o];
    }
    return n[n.length - 1];
  },
  KI = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let { lengths: t, totalLength: i } = kf(n),
      o = Gs(e, i);
    return Af(n, t, o);
  },
  XI = (n, e) => {
    if (n.length < 2) return { x: 0, y: 0 };
    let t = j.clamp({ min: 0, value: e, max: 1 }),
      i = [],
      o = 0;
    for (let a = 0; a < n.length - 1; a++) {
      let d = Math.hypot(n[a + 1].x - n[a].x, n[a + 1].y - n[a].y);
      (i.push(d), (o += d));
    }
    let r = o * t,
      s = 0;
    for (let a = 0; a < i.length; a++) {
      let d = i[a];
      if (s + d >= r) {
        let c = n[a],
          l = n[a + 1],
          u = (r - s) / d;
        return { x: c.x + (l.x - c.x) * u, y: c.y + (l.y - c.y) * u };
      }
      s += d;
    }
    return n[n.length - 1];
  },
  Ht = (n, e, t = 20) => {
    let i = {
      left: { x: -t, y: 0 },
      right: { x: t, y: 0 },
      top: { x: 0, y: -t },
      bottom: { x: 0, y: t },
    }[e] || { x: 0, y: 0 };
    return { x: n.x + i.x, y: n.y + i.y };
  },
  JI = (n, e, t, i, o = 20) => {
    let r = Ht({ x: e.x, y: e.y }, 'bottom', o),
      s = Ht({ x: t.x, y: t.y }, n, o);
    return n === 'bottom'
      ? r.y > s.y
        ? [
            { x: r.x, y: r.y },
            { x: s.x, y: r.y },
          ]
        : [
            { x: r.x, y: s.y },
            { x: s.x, y: s.y },
          ]
      : n === 'left'
        ? r.y > s.y
          ? r.x > s.x
            ? [
                { x: r.x, y: r.y },
                { x: s.x, y: r.y },
                { x: s.x, y: s.y },
              ]
            : [
                { x: r.x, y: r.y },
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
              ]
          : r.x > s.x
            ? [
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
                { x: s.x, y: s.y },
              ]
            : [{ x: r.x, y: s.y }]
        : n === 'top'
          ? r.y > s.y
            ? [
                { x: r.x, y: r.y },
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
                { x: s.x, y: s.y },
              ]
            : [
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
              ]
          : n === 'right'
            ? r.y > s.y
              ? r.x > s.x
                ? [
                    { x: r.x, y: r.y },
                    { x: i.x, y: r.y },
                    { x: i.x, y: s.y },
                    { x: s.x, y: s.y },
                  ]
                : [
                    { x: r.x, y: r.y },
                    { x: s.x, y: r.y },
                    { x: s.x, y: s.y },
                  ]
              : r.x > s.x
                ? [{ x: r.x, y: s.y }]
                : [
                    { x: r.x, y: i.y },
                    { x: s.x, y: i.y },
                    { x: s.x, y: s.y },
                  ]
            : void 0;
  },
  My = (n, e, t, i, o = 20) => {
    let r = Ht({ x: e.x, y: e.y }, 'left', o),
      s = Ht({ x: t.x, y: t.y }, n, o);
    return n === 'left'
      ? r.x > s.x
        ? [
            { x: s.x, y: r.y },
            { x: s.x, y: s.y },
          ]
        : [
            { x: r.x, y: r.y },
            { x: r.x, y: s.y },
          ]
      : n === 'top'
        ? r.x > s.x
          ? r.y > s.y
            ? [
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
                { x: s.x, y: s.y },
              ]
            : [{ x: s.x, y: r.y }]
          : r.y > s.y
            ? [
                { x: r.x, y: r.y },
                { x: r.x, y: s.y },
                { x: s.x, y: s.y },
              ]
            : [
                { x: r.x, y: r.y },
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
              ]
        : n === 'bottom'
          ? r.x > s.x
            ? r.y > s.y
              ? [
                  { x: r.x, y: r.y },
                  { x: s.x, y: r.y },
                ]
              : [
                  { x: i.x, y: r.y },
                  { x: i.x, y: s.y },
                  { x: s.x, y: s.y },
                ]
            : r.y > s.y
              ? [
                  { x: r.x, y: r.y },
                  { x: r.x, y: i.y },
                  { x: s.x, y: i.y },
                ]
              : [
                  { x: r.x, y: r.y },
                  { x: r.x, y: s.y },
                  { x: s.x, y: s.y },
                ]
          : n === 'right'
            ? r.x > s.x
              ? [
                  { x: i.x, y: r.y },
                  { x: i.x, y: s.y },
                ]
              : [
                  { x: r.x, y: r.y },
                  { x: r.x, y: i.y },
                  { x: s.x, y: i.y },
                  { x: s.x, y: s.y },
                ]
            : void 0;
  },
  eM = (n, e, t, i, o = 20) => {
    let r = Ht({ x: e.x, y: e.y }, 'right', o),
      s = Ht({ x: t.x, y: t.y }, n, o);
    return n === 'right'
      ? r.x > s.x
        ? [
            { x: r.x, y: r.y },
            { x: r.x, y: s.y },
          ]
        : [
            { x: s.x, y: r.y },
            { x: s.x, y: s.y },
          ]
      : n === 'top'
        ? r.x < s.x
          ? r.y < s.y
            ? [{ x: s.x, y: r.y }]
            : [
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
                { x: s.x, y: s.y },
              ]
          : r.y < s.y
            ? [
                { x: r.x, y: r.y },
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
              ]
            : [
                { x: r.x, y: r.y },
                { x: r.x, y: s.y },
                { x: s.x, y: s.y },
              ]
        : n === 'bottom'
          ? r.x < s.x
            ? r.y < s.y
              ? [
                  { x: i.x, y: r.y },
                  { x: i.x, y: s.y },
                  { x: s.x, y: s.y },
                ]
              : [{ x: s.x, y: r.y }]
            : r.y < s.y
              ? [
                  { x: r.x, y: r.y },
                  { x: r.x, y: s.y },
                  { x: s.x, y: s.y },
                ]
              : [
                  { x: r.x, y: r.y },
                  { x: r.x, y: i.y },
                  { x: s.x, y: i.y },
                ]
          : n === 'left'
            ? r.x < s.x
              ? [
                  { x: i.x, y: r.y },
                  { x: i.x, y: s.y },
                ]
              : [
                  { x: r.x, y: r.y },
                  { x: r.x, y: i.y },
                  { x: s.x, y: i.y },
                  { x: s.x, y: s.y },
                ]
            : void 0;
  },
  tM = (n, e, t, i, o = 20) => {
    let r = Ht(e, 'top', o),
      s = Ht(t, n, o);
    return n === 'left'
      ? r.y > s.y
        ? r.x > s.x
          ? [
              { x: r.x, y: i.y },
              { x: s.x, y: i.y },
              { x: s.x, y: s.y },
            ]
          : [{ x: r.x, y: s.y }]
        : r.x > s.x
          ? [
              { x: r.x, y: r.y },
              { x: s.x, y: r.y },
              { x: s.x, y: s.y },
            ]
          : [
              { x: r.x, y: r.y },
              { x: i.x, y: r.y },
              { x: i.x, y: s.y },
            ]
      : n === 'right'
        ? r.y > s.y
          ? r.x > s.x
            ? [{ x: r.x, y: s.y }]
            : [
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
                { x: s.x, y: s.y },
              ]
          : r.x > s.x
            ? [
                { x: r.x, y: r.y },
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
              ]
            : [
                { x: r.x, y: r.y },
                { x: s.x, y: r.y },
                { x: s.x, y: s.y },
              ]
        : n === 'bottom'
          ? r.y > s.y
            ? [
                { x: r.x, y: i.y },
                { x: s.x, y: i.y },
                { x: s.x, y: s.y },
              ]
            : [
                { x: r.x, y: r.y },
                { x: i.x, y: r.y },
                { x: i.x, y: s.y },
                { x: s.x, y: s.y },
              ]
          : n === 'top'
            ? r.y > s.y
              ? [
                  { x: r.x, y: s.y },
                  { x: s.x, y: s.y },
                ]
              : [
                  { x: r.x, y: r.y },
                  { x: s.x, y: r.y },
                ]
            : void 0;
  },
  nM = { top: tM, right: eM, bottom: JI, left: My },
  iM = (n, e, t, i = 20) =>
    (nM[n.side] || My)(e.side, { x: n.x, y: n.y }, { x: e.x, y: e.y }, t, i),
  oM = (n, e, t = 20) => {
    let i = iM(n, e, { x: (n?.x + e?.x) / 2, y: (n.y + e.y) / 2 }, t) || [];
    return [{ x: n.x, y: n.y }, ...i, { x: e.x, y: e.y }];
  },
  cl = class {
    name = 'orthogonal';
    computePoints(e, t) {
      let { sourcePoint: i, targetPoint: o } = e,
        r = t?.orthogonal?.firstLastSegmentLength;
      return oM(i, o, r != null && r >= 0 ? r : 20);
    }
    computeSvgPath(e, t) {
      let i = t?.orthogonal?.maxCornerRadius;
      return QI(e, i != null && i >= 0 ? i : 16);
    }
    computePointOnPath(e, t) {
      return XI(e, t);
    }
    computePointAtDistance(e, t) {
      return KI(e, t);
    }
  },
  rM = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let { lengths: t, totalLength: i } = kf(n),
      o = Gs(e, i);
    return Af(n, t, o);
  },
  sM = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let t = j.clamp({ min: 0, value: e, max: 1 });
    if (n.length === 2) {
      let a = n[0],
        d = n[1];
      return { x: a.x + (d.x - a.x) * t, y: a.y + (d.y - a.y) * t };
    }
    let i = 0,
      o = [];
    for (let a = 0; a < n.length - 1; a++) {
      let d = n[a + 1].x - n[a].x,
        c = n[a + 1].y - n[a].y,
        l = Math.sqrt(d * d + c * c);
      (o.push(l), (i += l));
    }
    let r = i * t,
      s = 0;
    for (let a = 0; a < o.length; a++) {
      let d = o[a];
      if (s + d >= r) {
        let c = (r - s) / d,
          l = n[a],
          u = n[a + 1];
        return { x: l.x + (u.x - l.x) * c, y: l.y + (u.y - l.y) * c };
      }
      s += d;
    }
    return n[n.length - 1];
  },
  ll = class {
    name = 'polyline';
    computePoints(e) {
      let { sourcePoint: t, targetPoint: i, edge: o } = e;
      return o.routingMode === 'manual' && o.points && o.points.length > 2
        ? o.points
        : [
            { x: t.x, y: t.y },
            { x: i.x, y: i.y },
          ];
    }
    computeSvgPath(e) {
      return e.length === 0
        ? ''
        : e.length === 1
          ? `M ${e[0].x},${e[0].y}`
          : e
              .map((t, i) => (i === 0 ? `M ${t.x},${t.y}` : `L ${t.x},${t.y}`))
              .join(' ');
    }
    computePointOnPath(e, t) {
      return sM(e, t);
    }
    computePointAtDistance(e, t) {
      return rM(e, t);
    }
  },
  aM = `[ngDiagram] Routing must have a non-empty name property. Registration skipped.

To fix this:
  \u2022 Ensure your EdgeRouting implementation has a 'name' property
  \u2022 The name should be a non-empty string

Documentation: https://www.ngdiagram.dev/docs/guides/edges/routing/
`,
  cs = (
    n,
    e,
    t,
  ) => `[ngDiagram] Routing '${n}' is not registered. Falling back to '${t}' routing.

Available routings: ${e.join(', ')}

To fix this:
  \u2022 Register the routing using NgDiagramService.registerRouting()
  \u2022 Or use one of the available routings listed above

Documentation: https://www.ngdiagram.dev/docs/guides/edges/routing/
`,
  dM = (
    n,
    e,
  ) => `[ngDiagram] Cannot set default routing to '${n}': routing not registered. Default routing unchanged.

Available routings: ${e.join(', ')}

To fix this:
  \u2022 First register the routing using NgDiagramService.registerRouting()
  \u2022 Then set it as default

Documentation: https://www.ngdiagram.dev/docs/guides/edges/routing/
`;
var ul = class {
    routings = new Map();
    defaultRouting;
    getRoutingConfig;
    constructor(e, t) {
      ((this.defaultRouting = e || 'orthogonal'),
        (this.getRoutingConfig = t || (() => ({}))),
        this.registerRouting(new cl()),
        this.registerRouting(new dl()),
        this.registerRouting(new ll()));
    }
    registerRouting(e) {
      e.name ? this.routings.set(e.name, e) : console.warn(aM);
    }
    unregisterRouting(e) {
      this.routings.delete(e);
    }
    getRouting(e) {
      return this.routings.get(e);
    }
    getRegisteredRoutings() {
      return Array.from(this.routings.keys());
    }
    hasRouting(e) {
      return this.routings.has(e);
    }
    computePoints(e, t) {
      let i = e || this.defaultRouting,
        o = this.routings.get(i);
      if (!o) {
        let r = this.defaultRouting;
        if (
          (console.warn(cs(i, this.getRegisteredRoutings(), r)),
          (o = this.routings.get(r)),
          !o)
        )
          return [t.sourcePoint, t.targetPoint].filter((s) => !!s);
      }
      return o.computePoints(t, this.getRoutingConfig());
    }
    computePath(e, t) {
      let i = e || this.defaultRouting,
        o = this.routings.get(i);
      if (!o) {
        let r = this.defaultRouting;
        if (
          (console.warn(cs(i, this.getRegisteredRoutings(), r)),
          (o = this.routings.get(r)),
          !o)
        )
          return t.length === 0 ? '' : `M ${t[0].x},${t[0].y}`;
      }
      return o.computeSvgPath(t, this.getRoutingConfig());
    }
    computePointOnPath(e, t, i) {
      let o = e || this.defaultRouting,
        r = this.routings.get(o);
      if (!r) {
        let d = this.defaultRouting;
        (console.warn(cs(o, this.getRegisteredRoutings(), d)),
          (r = this.routings.get(d)));
      }
      if (r?.computePointOnPath) return r.computePointOnPath(t, i);
      if (t.length < 2) return t[0] || { x: 0, y: 0 };
      let s = t[0],
        a = t[t.length - 1];
      return { x: s.x + (a.x - s.x) * i, y: s.y + (a.y - s.y) * i };
    }
    computePointAtDistance(e, t, i) {
      let o = e || this.defaultRouting,
        r = this.routings.get(o);
      if (!r) {
        let s = this.defaultRouting;
        (console.warn(cs(o, this.getRegisteredRoutings(), s)),
          (r = this.routings.get(s)));
      }
      return r?.computePointAtDistance
        ? r.computePointAtDistance(t, i)
        : cM(t, i);
    }
    setDefaultRouting(e) {
      this.routings.has(e)
        ? (this.defaultRouting = e)
        : console.warn(dM(e, this.getRegisteredRoutings()));
    }
    getDefaultRouting() {
      return this.defaultRouting;
    }
  },
  cM = (n, e) => {
    if (n.length < 2) return n[0] || { x: 0, y: 0 };
    let { lengths: t, totalLength: i } = kf(n),
      o = Gs(e, i);
    return Af(n, t, o);
  },
  by = (n, e, t, i) => {
    if (typeof n == 'string') {
      let o = n.trim();
      if (o.endsWith('px')) {
        let r = parseFloat(o);
        return i.computePointAtDistance(e, t, r);
      }
      return i.computePointOnPath(e, t, parseFloat(o));
    }
    return i.computePointOnPath(e, t, n);
  },
  lM = (
    n,
    e,
    t,
  ) => `[ngDiagram] Event listener error: Listener for "${n}" event threw an error.

Event: ${n}
Listener type: ${e}
Error: ${t instanceof Error ? t.message : String(t)}

This indicates an error in your event listener callback.
Check your event listener implementation for the "${n}" event.
The diagram will continue to function, but this listener failed to execute.`,
  fl = class {
    listeners = new Map();
    enabled = !0;
    deferredEmits = [];
    on(e, t) {
      this.listeners.has(e) || this.listeners.set(e, new Set());
      let i = { callback: t, once: !1 };
      return (this.listeners.get(e).add(i), () => this.removeListener(e, i));
    }
    once(e, t) {
      this.listeners.has(e) || this.listeners.set(e, new Set());
      let i = { callback: t, once: !0 };
      return (this.listeners.get(e).add(i), () => this.removeListener(e, i));
    }
    emit(e, t) {
      if (!this.enabled) return;
      let i = this.listeners.get(e);
      if (!i || i.size === 0) return;
      let o = [];
      for (let r of i)
        try {
          (r.callback(t), r.once && o.push(r));
        } catch (s) {
          console.error(lM(String(e), r.once ? 'once' : 'on', s));
        }
      o.forEach((r) => {
        i.delete(r);
      });
    }
    deferredEmit(e, t) {
      this.enabled && this.deferredEmits.push({ event: e, payload: t });
    }
    off(e, t) {
      if (!t) return void this.listeners.delete(e);
      let i = this.listeners.get(e);
      if (!i) return;
      let o = Array.from(i).find((r) => r.callback === t);
      o && i.delete(o);
    }
    offAll() {
      this.listeners.clear();
    }
    setEnabled(e) {
      this.enabled = e;
    }
    isEnabled() {
      return this.enabled;
    }
    hasListeners(e) {
      return this.listeners.has(e) && this.listeners.get(e).size > 0;
    }
    flushDeferredEmits() {
      let e = [...this.deferredEmits];
      this.deferredEmits = [];
      for (let { event: t, payload: i } of e) this.emit(t, i);
    }
    clearDeferredEmits() {
      this.deferredEmits = [];
    }
    removeListener(e, t) {
      let i = this.listeners.get(e);
      i && (i.delete(t), i.size === 0 && this.listeners.delete(e));
    }
  },
  uM = async (n, { groupId: e, nodeIds: t }) => {
    let i = n.flowCore.actionStateManager.highlightGroup,
      o = t.map((a) => n.flowCore.modelLookup.getNodeById(a)).filter(Boolean),
      r = n.flowCore.modelLookup.getNodeById(e);
    if (!r) return;
    let s = [];
    for (let a of o)
      n.flowCore.modelLookup.wouldCreateCircularDependency(a.id, e) ||
        (a.groupId !== e &&
          n.flowCore.config.grouping.canGroup(a, r) &&
          s.push({ id: a.id, groupId: e }));
    (s.length > 0 &&
      (await n.flowCore.commandHandler.emit('updateNodes', { nodes: s })),
      s.some((a) => !!a.groupId) &&
        n.flowCore.actionStateManager.highlightGroup === i &&
        (await n.flowCore.commandHandler.emit('highlightGroupClear')));
  },
  gl = class {
    v = 0;
    bump() {
      this.v++;
    }
    get version() {
      return this.v;
    }
  },
  Km = (n, e, t) => {
    if (!n) return 'left';
    let i;
    if (e && n.measuredPorts) {
      let r = n.measuredPorts.find((s) => s.id === e);
      i = r?.position
        ? {
            x: n.position.x + r.position.x + (r.size?.width ?? 0) / 2,
            y: n.position.y + r.position.y + (r.size?.height ?? 0) / 2,
          }
        : {
            x: n.position.x + (n.size?.width ?? 100) / 2,
            y: n.position.y + (n.size?.height ?? 50) / 2,
          };
    } else
      i = {
        x: n.position.x + (n.size?.width ?? 100) / 2,
        y: n.position.y + (n.size?.height ?? 50) / 2,
      };
    let o = j.angleBetweenPoints(i, t);
    return j.angleToSide(o, !0);
  },
  Xm = (n, e) => {
    let t = j.angleBetweenPoints(n, e);
    return j.angleToSide(t, !1);
  },
  Of = 1e3 / 60,
  hs = (n, e) => ({ x: n.x - e, y: n.y - e, width: 2 * e, height: 2 * e }),
  Sy = (n, e) =>
    n?.x === e?.x &&
    n?.y === e?.y &&
    n?.width === e?.width &&
    n?.height === e?.height,
  Ae = ({
    position: n = { x: 0, y: 0 },
    size: e = { width: 1, height: 1 },
  }) => ({
    x: n?.x || 0,
    y: n?.y || 0,
    width: e?.width || 1,
    height: e?.height || 1,
  }),
  Ff = (n, e) =>
    !(
      n.x + n.width <= e.x ||
      e.x + e.width <= n.x ||
      n.y + n.height <= e.y ||
      e.y + e.height <= n.y
    ),
  fM = (n, e) =>
    n.x <= e.x &&
    n.x + n.width >= e.x + e.width &&
    n.y <= e.y &&
    n.y + n.height >= e.y + e.height,
  hl = (n, e) => {
    if (Ff(n, e)) return 0;
    let t = n.x + n.width,
      i = n.y + n.height,
      o = e.x + e.width,
      r = e.y + e.height;
    return t <= e.x
      ? i <= e.y
        ? Math.sqrt((t - e.x) ** 2 + (i - e.y) ** 2)
        : n.y >= r
          ? Math.sqrt((t - e.x) ** 2 + (n.y - r) ** 2)
          : e.x - t
      : n.x >= o
        ? i <= e.y
          ? Math.sqrt((n.x - o) ** 2 + (i - e.y) ** 2)
          : n.y >= r
            ? Math.sqrt((n.x - o) ** 2 + (n.y - r) ** 2)
            : n.x - o
        : i <= e.y
          ? e.y - i
          : n.y >= r
            ? n.y - r
            : 1 / 0;
  },
  Ue = (n, e) => n?.x === e?.x && n?.y === e?.y,
  Ty = (n, e) => n?.width === e?.width && n?.height === e?.height;
var Jm = (n) => ({
    left: n.x,
    top: n.y,
    right: n.x + n.width,
    bottom: n.y + n.height,
  }),
  gM = (n, e) => {
    if (n.length !== e.length) return !1;
    for (let t = 0; t < n.length; t++) if (!Ue(n[t], e[t])) return !1;
    return !0;
  };
function In(n) {
  if (n.length === 0) return null;
  let e = n[0].x,
    t = n[0].y,
    i = n[0].x + n[0].width,
    o = n[0].y + n[0].height;
  return (
    n.forEach((r) => {
      ((e = Math.min(e, r.x)),
        (t = Math.min(t, r.y)),
        (i = Math.max(i, r.x + r.width)),
        (o = Math.max(o, r.y + r.height)));
    }),
    { x: e, y: t, width: i - e, height: o - t }
  );
}
var Lf = (n) => {
    if (n.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let e = n[0].x,
      t = n[0].y,
      i = n[0].x,
      o = n[0].y;
    return (
      n.forEach((r) => {
        ((e = Math.min(e, r.x)),
          (t = Math.min(t, r.y)),
          (i = Math.max(i, r.x)),
          (o = Math.max(o, r.y)));
      }),
      { x: e, y: t, width: i - e, height: o - t }
    );
  },
  pl = (n, e = 0) => {
    let { x: t, y: i, width: o, height: r } = n,
      s = t + o / 2,
      a = i + r / 2,
      d = (e * Math.PI) / 180,
      c = Math.cos(d),
      l = Math.sin(d);
    return [
      { x: t, y: i },
      { x: t + o, y: i },
      { x: t + o, y: i + r },
      { x: t, y: i + r },
    ].map(({ x: u, y: f }) => {
      let g = u - s,
        p = f - a;
      return { x: s + g * c - p * l, y: a + g * l + p * c };
    });
  },
  Bf = (n, e = 0) => (e === 0 ? n : Lf(pl(n, e))),
  _y = (n, e) => {
    let t = Math.round(e / 90) % 4;
    return {
      top: ['top', 'right', 'bottom', 'left'],
      right: ['right', 'bottom', 'left', 'top'],
      bottom: ['bottom', 'left', 'top', 'right'],
      left: ['left', 'top', 'right', 'bottom'],
    }[n][t];
  },
  Ny = (n, e) => {
    let { x: t, y: i, width: o, height: r } = Ae(n),
      s = t + e.position.x,
      a = i + e.position.y,
      d = n.side;
    return (
      e.angle && e.angle !== 0 && (d = _y(n.side, e.angle)),
      d === 'left'
        ? { x: s, y: a + r / 2 }
        : d === 'top'
          ? { x: s + o / 2, y: a }
          : d === 'bottom'
            ? { x: s + o / 2, y: a + r }
            : d === 'right'
              ? { x: s + o, y: a + r / 2 }
              : { x: s, y: a }
    );
  },
  Co = (n, e) => {
    let t = n.measuredPorts?.find((i) => i.id === e);
    return t ? Ny(t, n) : null;
  },
  xy = (n, e) => {
    let t = n.measuredPorts?.find((r) => r.id === e);
    if (!t) return null;
    let i = Ny(t, n),
      o = t.side;
    return (
      n.angle && n.angle !== 0 && (o = _y(t.side, n.angle)),
      y(h({}, i), { side: o })
    );
  },
  hM = (n, e) =>
    e === 'source'
      ? !n.source
      : e === 'target'
        ? !n.target
        : !n.source || !n.target,
  Py = (n) => hM(n),
  pM = (n) => {
    let e = [];
    for (let t of n)
      t.temporary ||
        t.computedHidden ||
        (!t.source &&
          t.sourcePosition &&
          e.push({ edge: t, end: 'source', position: t.sourcePosition }),
        !t.target &&
          t.targetPosition &&
          e.push({ edge: t, end: 'target', position: t.targetPosition }));
    return e;
  },
  ml = (n, e, t) => {
    let i = e === 'source' ? n.sourcePort : n.targetPort;
    if (t && i) {
      let r = Co(t, i);
      if (r) return r;
    }
    let o = n.points;
    return o && o.length > 0
      ? e === 'source'
        ? o[0]
        : o[o.length - 1]
      : t
        ? {
            x: t.position.x + (t.size?.width ?? 0) / 2,
            y: t.position.y + (t.size?.height ?? 0) / 2,
          }
        : null;
  },
  En = (n, e, t) => {
    if (n.routingMode !== 'manual' || !n.points || n.points.length === 0)
      return {};
    let i = n.points.map((o) => h({}, o));
    return (
      (i[e === 'source' ? 0 : i.length - 1] = { x: t.x, y: t.y }),
      { points: i }
    );
  },
  mM = (n, e, t) => {
    let i = null,
      o = 'source',
      r = null,
      s = t * t,
      a = (d, c, l) => {
        if (!l) return;
        let u = l.x - e.x,
          f = l.y - e.y,
          g = u * u + f * f;
        g <= s && ((s = g), (i = d), (o = c), (r = l));
      };
    for (let d of n)
      d.temporary ||
        d.computedHidden ||
        (d.source || a(d, 'source', d.sourcePosition),
        d.target || a(d, 'target', d.targetPosition));
    return i && r ? { edge: i, end: o, position: r } : null;
  };
function Hf(n, e) {
  let t = h({}, n);
  for (let i in e)
    if (Object.hasOwn(e, i)) {
      let o = e[i],
        r = n[i];
      o !== void 0 &&
        (t[i] =
          typeof o != 'object' ||
          o === null ||
          Array.isArray(o) ||
          typeof o == 'function' ||
          typeof r != 'object' ||
          r === null ||
          Array.isArray(r) ||
          typeof r == 'function'
            ? o
            : Hf(r, o));
    }
  return t;
}
var il = (n, e, t) => {
    let i = Math.cos(t),
      o = Math.sin(t),
      r = n.x - e.x,
      s = n.y - e.y;
    return { x: e.x + r * i - s * o, y: e.y + r * o + s * i };
  },
  yM = (n, e, t, i) => {
    let o = (n.x - e.x) * (t.y - i.y) - (n.y - e.y) * (t.x - i.x);
    if (Math.abs(o) < 1e-10) return null;
    let r = ((n.x - t.x) * (t.y - i.y) - (n.y - t.y) * (t.x - i.x)) / o,
      s = -((n.x - e.x) * (n.y - t.y) - (n.y - e.y) * (n.x - t.x)) / o;
    return r >= 0 && r <= 1 && s >= 0 && s <= 1
      ? { x: n.x + r * (e.x - n.x), y: n.y + r * (e.y - n.y) }
      : null;
  },
  vM = (n, e) => {
    let t = e.y - n.y,
      i = -(e.x - n.x),
      o = Math.hypot(t, i);
    return o === 0 ? { x: 1, y: 0 } : { x: t / o, y: i / o };
  },
  ey = (n) =>
    Math.abs(n.x) >= Math.abs(n.y)
      ? n.x >= 0
        ? 'right'
        : 'left'
      : n.y >= 0
        ? 'bottom'
        : 'top',
  wM = (n, e) => {
    let t = Ae({ position: n.position, size: n.size }),
      i = ((n.angle || 0) * Math.PI) / 180,
      o = { x: t.x + t.width / 2, y: t.y + t.height / 2 };
    if (e.x === o.x && e.y === o.y) {
      let g =
          i !== 0
            ? il({ x: t.x + t.width, y: o.y }, o, i)
            : { x: t.x + t.width, y: o.y },
        p = i !== 0 ? il({ x: 1, y: 0 }, { x: 0, y: 0 }, i) : { x: 1, y: 0 };
      return { x: g.x, y: g.y, side: ey(p) };
    }
    let r = [
        { x: t.x, y: t.y },
        { x: t.x + t.width, y: t.y },
        { x: t.x + t.width, y: t.y + t.height },
        { x: t.x, y: t.y + t.height },
      ],
      s = i !== 0 ? r.map((g) => il(g, o, i)) : r,
      a = 1 / 0,
      d = null,
      c = null;
    for (let g = 0; g < 4; g++) {
      let p = s[g],
        v = s[(g + 1) % 4],
        D = yM(e, o, p, v);
      if (D) {
        let C = Math.hypot(D.x - e.x, D.y - e.y);
        C < a && ((a = C), (d = p), (c = v));
      }
    }
    if (!d || !c) return { x: o.x, y: o.y, side: 'right' };
    let l = vM(d, c),
      u = ey(l),
      f = { x: (d.x + c.x) / 2, y: (d.y + c.y) / 2 };
    return { x: f.x, y: f.y, side: u };
  },
  DM = (n) =>
    In(
      n
        .filter((e) => !e.computedHidden)
        .map((e) => e.measuredBounds)
        .filter((e) => e !== void 0),
    ),
  EM = (n) =>
    In(n.filter((e) => !e.computedHidden && e.points?.length).map(CM)),
  zf = (n, e) => In([DM(n), EM(e)].filter((t) => t !== null)),
  CM = (n) => {
    let e = Lf(n.points || []),
      t = n.measuredLabels || [];
    return t.length === 0
      ? e
      : In([
          e,
          ...t
            .filter((i) => i.position && i.size)
            .map((i) => ({
              x: i.position.x - i.size.width / 2,
              y: i.position.y - i.size.height / 2,
              width: i.size.width,
              height: i.size.height,
            })),
        ]);
  },
  Cn = (n, e) => {
    let t = (n.measuredPorts || []).filter((d) => !e?.isPortHidden(n.id, d.id)),
      { x: i, y: o, width: r, height: s } = Ae(n),
      a = In([
        Bf({ x: 0, y: 0, width: r, height: s }, n.angle || 0),
        ...t.map((d) => {
          let { x: c, y: l, width: u, height: f } = Ae(d);
          return { x: c, y: l, width: u, height: f };
        }),
      ]);
    return { x: i + a.x, y: o + a.y, width: a.width, height: a.height };
  },
  IM = (
    n,
    e,
    { useGroupRect: t = !0, allowResizeBelowChildrenBounds: i = !0 } = {},
  ) => {
    if (!e.size?.width || !e.size?.height)
      throw new Error('Group must have both width and height defined');
    if (i) return { left: 1 / 0, top: 1 / 0, right: -1 / 0, bottom: -1 / 0 };
    let o = Jm(Ae(e));
    return n.length
      ? n.reduce(
          (r, s) => {
            if (s.size && (!s.size.width || !s.size.height))
              throw new Error(
                `calculateGroupBounds: child node ${s.id} does not have both width and height defined`,
              );
            let a = Jm(s.measuredBounds ? s.measuredBounds : Cn(s));
            return (
              (r.left = Math.min(r.left, a.left)),
              (r.top = Math.min(r.top, a.top)),
              (r.right = Math.max(r.right, a.right)),
              (r.bottom = Math.max(r.bottom, a.bottom)),
              r
            );
          },
          t ? o : { left: 1 / 0, top: 1 / 0, right: -1 / 0, bottom: -1 / 0 },
        )
      : o;
  };
function ci(n) {
  return n.isGroup === !0;
}
var le = (n) => (n?.width ?? 0) > 0 && (n?.height ?? 0) > 0,
  ol = (n) => n?.width === 0 && n?.height === 0,
  xe = (n) => n?.x != null && n?.y != null && !isNaN(n.x) && !isNaN(n.y),
  ls = (n, e) => {
    let t = h({}, n);
    for (let i of e) delete t[i];
    return t;
  },
  MM = (n, e) => {
    if (Object.is(n, e)) return !0;
    if (
      typeof n != 'object' ||
      n === null ||
      typeof e != 'object' ||
      e === null
    )
      return !1;
    let t = Object.entries(n);
    return (
      t.length === Object.keys(e).length &&
      t.every(([i, o]) => Object.is(o, e[i]))
    );
  },
  ty = (n, e) => Object.keys(e).some((t) => e[t] !== void 0 && !MM(n[t], e[t])),
  ps = (n, e, t) => {
    let i = n.relinkable ?? t;
    return i === !0 || i === e;
  },
  yl = class {
    permits;
    waiting = [];
    constructor(e) {
      this.permits = e;
    }
    async acquire() {
      return this.permits > 0
        ? (this.permits--, Promise.resolve())
        : new Promise((e) => {
            this.waiting.push(e);
          });
    }
    release() {
      this.waiting.length > 0 ? this.waiting.shift()() : this.permits++;
    }
    availablePermits() {
      return this.permits;
    }
    getQueueLength() {
      return this.waiting.length;
    }
  },
  Ws = (n, e, t) => {
    if (!n.snapping.shouldSnapDragForNode(e)) return t;
    let i = n.snapping.computeSnapForNodeDrag(e) ?? n.snapping.defaultDragSnap;
    return j.snapPoint(t, i);
  };
function bM(n, e) {
  let t = SM(e);
  return [...n].sort(t);
}
function SM(n) {
  let e = new Map();
  return (
    n.forEach((t, i) => {
      e.set(t.id, i);
    }),
    (t, i) => {
      let o = t.computedZIndex ?? 0,
        r = i.computedZIndex ?? 0;
      if (o !== r) return r - o;
      let s = e.get(t.id) ?? 0;
      return (e.get(i.id) ?? 0) - s;
    }
  );
}
var TM = (n, e) => n.hidden === !0 || (e?.isNodeHidden(n.id) ?? !1),
  Ry = (n, e) => n.hidden === !0 || (e?.isEdgeHidden(n.id) ?? !1),
  ms = (n, e) => {
    let t = new Map(n.map((s) => [s.id, s])),
      i = new Map(),
      o = (s, a) => {
        let d = i.get(s.id);
        if (d !== void 0) return d;
        if (a.has(s.id)) return !1;
        a.add(s.id);
        let c = s.groupId ? t.get(s.groupId) : void 0,
          l = TM(s, e) || (!!c && o(c, a));
        return (i.set(s.id, l), l);
      },
      r = new Set();
    for (let s of n) o(s, new Set()) && r.add(s.id);
    return r;
  },
  ys = (n, e, t) => Ry(n, t) || e.has(n.source) || e.has(n.target),
  ky = (n, e, t, i) => {
    let o = n.config.danglingEdges,
      r = !!o?.enabled && !!o.detachOnNodeDelete,
      s = [],
      a = [],
      d = (l, u, f) => {
        let g = n.getNodeById(f);
        return (
          !!g &&
          (!o?.shouldDetachOnNodeDelete || o.shouldDetachOnNodeDelete(l, g, u))
        );
      },
      c = (l, u, f) => {
        if (!l.computedHidden || Ry(l, n.templateVisibilityRegistry)) return !1;
        let g = u && f ? '' : u ? l.target : l.source;
        return !(g && n.getNodeById(g)?.computedHidden);
      };
    for (let l of e) {
      let u = t.has(l.source),
        f = t.has(l.target);
      if (!u && !f) continue;
      let g = u && f && !o?.shouldDetachOnNodeDelete;
      if (!r || i?.has(l.id) || c(l, u, f) || g) {
        s.push(l.id);
        continue;
      }
      let p = !u || d(l, 'source', l.source),
        v = !f || d(l, 'target', l.target);
      if (!p || !v) {
        s.push(l.id);
        continue;
      }
      let D = { id: l.id };
      if (u) {
        let C = ml(l, 'source', n.getNodeById(l.source));
        if (!C) {
          s.push(l.id);
          continue;
        }
        D = h(
          y(h({}, D), { source: '', sourcePort: void 0, sourcePosition: C }),
          En(l, 'source', C),
        );
      }
      if (f) {
        let C = ml(l, 'target', n.getNodeById(l.target));
        if (!C) {
          s.push(l.id);
          continue;
        }
        D = h(
          y(h({}, D), { target: '', targetPort: void 0, targetPosition: C }),
          En(h(h({}, l), D), 'target', C),
        );
      }
      a.push(D);
    }
    return { edgesToRemove: s, edgesToUpdate: a };
  },
  _M = (n, e) => {
    let t = new Set(e.map((i) => i.id));
    return [...(n.measuredPorts ?? []).filter((i) => !t.has(i.id)), ...e];
  },
  NM = (n, e) => {
    let t = new Map(e.map(({ portId: i, portChanges: o }) => [i, o]));
    return n.map((i) => {
      let o = t.get(i.id);
      return o ? h(h({}, i), o) : i;
    });
  },
  xM = (n, e) => {
    let t = new Set(e);
    return (n ?? []).filter((i) => !t.has(i.id));
  },
  PM = async (n, e) => {
    let { nodes: t } = e;
    await n.flowCore.applyUpdate({ nodesToAdd: t }, 'addNodes');
  },
  RM = async (n, e) => {
    let { node: t } = e,
      i = Ws(n.flowCore.config, t, t.position);
    await n.flowCore.applyUpdate(
      { nodesToAdd: [y(h({}, t), { position: i })] },
      'paletteDropNode',
    );
  },
  kM = async (n, e) => {
    let { id: t, nodeChanges: i } = e;
    await n.flowCore.applyUpdate(
      { nodesToUpdate: [h({ id: t }, i)] },
      'updateNode',
    );
  },
  AM = async (n, e) => {
    let { nodes: t } = e;
    await n.flowCore.applyUpdate({ nodesToUpdate: t }, 'updateNodes');
  },
  OM = async (n, e) => {
    let { edges: t } = n.flowCore.getState(),
      { modelLookup: i } = n.flowCore,
      { ids: o } = e,
      r = new Set(o.flatMap((d) => [d, ...i.getAllDescendantIds(d)])),
      { edgesToRemove: s, edgesToUpdate: a } = ky(n.flowCore, t, r);
    await n.flowCore.applyUpdate(
      h(
        { nodesToRemove: Array.from(r), edgesToRemove: s },
        a.length > 0 ? { edgesToUpdate: a } : {},
      ),
      'deleteNodes',
    );
  },
  FM = async (n) => {
    let { edges: e, nodes: t } = n.flowCore.getState();
    await n.flowCore.applyUpdate(
      { nodesToRemove: t.map((i) => i.id), edgesToRemove: e.map((i) => i.id) },
      'clearModel',
    );
  },
  LM = async (n, e) => {
    let { edges: t } = e;
    await n.flowCore.applyUpdate({ edgesToAdd: t }, 'addEdges');
  },
  BM = async (n, e) => {
    let { id: t, edgeChanges: i } = e;
    await n.flowCore.applyUpdate(
      { edgesToUpdate: [h({ id: t }, i)] },
      'updateEdge',
    );
  },
  HM = async (n, e) => {
    let { edges: t } = e;
    await n.flowCore.applyUpdate({ edgesToUpdate: t }, 'updateEdges');
  },
  zM = async (n, e) => {
    let { ids: t } = e;
    await n.flowCore.applyUpdate({ edgesToRemove: t }, 'deleteEdges');
  },
  VM = async (n, e) => {
    let { additions: t } = e,
      i = [];
    (t.forEach((o, r) => {
      let s = n.flowCore.getNodeById(r);
      s && i.push({ id: r, measuredPorts: _M(s, o) });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate({ nodesToUpdate: i }, 'addPortsBulk')));
  },
  jM = async (n, e) => {
    let { updates: t } = e,
      i = [];
    (t.forEach((o, r) => {
      let s = n.flowCore.getNodeById(r);
      s &&
        s.measuredPorts &&
        i.push({ id: r, measuredPorts: NM(s.measuredPorts, o) });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate(
          { nodesToUpdate: i },
          'updatePortsBulk',
        )));
  },
  UM = async (n, e) => {
    let { deletions: t } = e,
      i = [];
    (t.forEach((o, r) => {
      let s = n.flowCore.getNodeById(r);
      s && i.push({ id: r, measuredPorts: xM(s.measuredPorts, o) });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate(
          { nodesToUpdate: i },
          'deletePortsBulk',
        )));
  },
  $M = async (n, e) => {
    let { additions: t } = e,
      i = [];
    (t.forEach((o, r) => {
      let s = n.flowCore.getEdgeById(r);
      if (!s) return;
      let a = [...(s.measuredLabels ?? []), ...o];
      i.push({ id: r, measuredLabels: a });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate(
          { edgesToUpdate: i },
          'addEdgeLabelsBulk',
        )));
  },
  GM = async (n, e) => {
    let { updates: t } = e,
      i = [],
      o = n.flowCore.edgeRoutingManager;
    (t.forEach((r, s) => {
      let a = n.flowCore.getEdgeById(s);
      if (!a) return;
      let d = a.points || [],
        c = new Map();
      r.forEach(({ labelId: g, labelChanges: p }) => {
        c.set(g, p);
      });
      let l = d.length >= 2,
        u = (g, p) => (l ? by(g, a.routing, d, o) : p),
        f = a.measuredLabels?.map((g) => {
          let p = c.get(g.id);
          if (!p)
            return l
              ? y(h({}, g), { position: u(g.positionOnEdge, g.position) })
              : g;
          let v = p.positionOnEdge ?? g.positionOnEdge;
          return y(h(h({}, g), p), { position: u(v, g.position) });
        });
      f && i.push({ id: s, measuredLabels: f });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate(
          { edgesToUpdate: i },
          'updateEdgeLabelsBulk',
        )));
  },
  WM = async (n, e) => {
    let { deletions: t } = e,
      i = [];
    (t.forEach((o, r) => {
      let s = n.flowCore.getEdgeById(r);
      if (!s) return;
      let a = new Set(o),
        d = s.measuredLabels?.filter((c) => !a.has(c.id));
      i.push({ id: r, measuredLabels: d });
    }),
      i.length !== 0 &&
        (await n.flowCore.applyUpdate(
          { edgesToUpdate: i },
          'deleteEdgeLabelsBulk',
        )));
  },
  Ay = ({ x: n, y: e, width: t, height: i }, o) =>
    !t || !i || t < 0 || i < 0
      ? null
      : o.width && o.height
        ? {
            x: o.width / 2 - (n + t / 2) * o.scale,
            y: o.height / 2 - (e + i / 2) * o.scale,
          }
        : null,
  qM = async (n, { rect: e }) => {
    let { viewport: t } = n.flowCore.getState().metadata,
      i = Ay(e, t);
    if (i) {
      if (Ue(t, { x: i.x, y: i.y })) return;
      await n.flowCore.applyUpdate(
        { metadataUpdate: { viewport: y(h({}, t), { x: i.x, y: i.y }) } },
        'centerOnRect',
      );
    }
  },
  ZM = async (n, { nodeOrId: e }) => {
    let t = typeof e == 'string' ? n.flowCore.getNodeById(e) : e,
      { viewport: i } = n.flowCore.getState().metadata;
    if (!t || !t.size?.width || !t.size?.height) return;
    let o = Ay(
      {
        x: t.position.x,
        y: t.position.y,
        width: t.size.width,
        height: t.size.height,
      },
      i,
    );
    if (o) {
      if (Ue(i, { x: o.x, y: o.y })) return;
      await n.flowCore.applyUpdate(
        { metadataUpdate: { viewport: y(h({}, i), { x: o.x, y: o.y }) } },
        'centerOnNode',
      );
    }
  };
var YM = (n) =>
    n.length === 0
      ? { x: 0, y: 0 }
      : {
          x: n.reduce((e, t) => e + t.x, 0) / n.length,
          y: n.reduce((e, t) => e + t.y, 0) / n.length,
        },
  Oy = (n) => ({
    nodeId: n.source,
    port: n.sourcePort,
    position: n.sourcePosition,
    freePosition: n.sourcePosition ?? n.points?.at(0),
  }),
  Fy = (n) => ({
    nodeId: n.target,
    port: n.targetPort,
    position: n.targetPosition,
    freePosition: n.targetPosition ?? n.points?.at(-1),
  }),
  QM = (n, e) => !n.nodeId || !e.has(n.nodeId),
  KM = (n, e) => {
    let t = [];
    for (let i of n)
      for (let o of [Oy(i), Fy(i)])
        QM(o, e) && o.freePosition && t.push(o.freePosition);
    return t;
  },
  XM = (n, e, t) => {
    if (!t.position) return { x: 20, y: 20 };
    if (n.length === 1 && e.length === 0) {
      let o = n[0];
      return j.subtractPoints(
        {
          x: t.position.x - (o.size?.width ?? 0) / 2,
          y: t.position.y - (o.size?.height ?? 0) / 2,
        },
        o.position,
      );
    }
    let i = YM([...n.map((o) => o.position), ...e]);
    return j.subtractPoints(t.position, i);
  },
  JM = (n) => {
    if (!n.measuredPorts || n.measuredPorts.length === 0) return n;
    let e = n.measuredPorts.map((t) => y(h({}, t), { nodeId: n.id }));
    return y(h({}, n), { measuredPorts: e });
  },
  eb = (n, e, t, i, o) => (
    e.forEach((r) => {
      let s = n.computeNodeId();
      i.set(r.id, s);
    }),
    e.map((r) => {
      let s = i.get(r.id),
        a = r.groupId ? i.get(r.groupId) : void 0,
        d = y(h({}, r), {
          id: s,
          groupId: a,
          position: { x: r.position.x + t.x, y: r.position.y + t.y },
          selected: !o.has(r.id),
        });
      return ((d = JM(d)), d);
    })
  ),
  ny = (n, e, t) => {
    let i = e.get(n.nodeId);
    return i
      ? y(h({}, n), { nodeId: i })
      : n.freePosition
        ? y(h({}, n), {
            nodeId: '',
            port: void 0,
            position: { x: n.freePosition.x + t.x, y: n.freePosition.y + t.y },
          })
        : void 0;
  },
  tb = (n, e, t, i, o) => {
    let r = [];
    for (let s of e) {
      let a = ny(Oy(s), t, o),
        d = ny(Fy(s), t, o);
      if (!a || !d) continue;
      let c =
        s.routingMode === 'manual' && s.points
          ? s.points.map((l) => ({ x: l.x + o.x, y: l.y + o.y }))
          : s.points;
      r.push(
        y(h({}, s), {
          id: n.computeEdgeId(),
          source: a.nodeId,
          sourcePort: a.port,
          sourcePosition: a.position,
          target: d.nodeId,
          targetPort: d.port,
          targetPosition: d.position,
          points: c,
          selected: !ys(s, i),
        }),
      );
    }
    return r;
  },
  nb = (n, e) => {
    let t = [],
      i = [];
    return (
      n.forEach((o) => {
        o.selected && t.push({ id: o.id, selected: !1 });
      }),
      e.forEach((o) => {
        o.selected && i.push({ id: o.id, selected: !1 });
      }),
      { nodesToUpdate: t, edgesToUpdate: i }
    );
  },
  Ly = async (n) => {
    let { nodes: e, edges: t } = n.flowCore.getState(),
      { modelLookup: i } = n.flowCore,
      o = new Set(
        e.filter((d) => d.selected && !d.computedHidden).map((d) => d.id),
      );
    for (let d of [...o]) for (let c of i.getAllDescendantIds(d)) o.add(c);
    let r = e.filter((d) => o.has(d.id)),
      s = n.flowCore.config.danglingEdges?.enabled,
      a = t.filter(
        (d) =>
          (d.selected && !d.computedHidden) ||
          ((c) => {
            if (s) {
              let l = [c.source, c.target].filter(Boolean);
              return l.length > 0 && l.every((u) => o.has(u));
            }
            return o.has(c.source) && o.has(c.target);
          })(d),
      );
    n.flowCore.actionStateManager.copyPaste = {
      copiedNodes: r,
      copiedEdges: a,
    };
  },
  ib = (n, e) => {
    for (let t of n) t.position = Ws(e, t, t.position);
  },
  ob = async (n, e) => {
    let t = n.flowCore.actionStateManager.copyPaste;
    if (!t || (t.copiedNodes.length === 0 && t.copiedEdges.length === 0))
      return;
    let { nodes: i, edges: o } = n.flowCore.getState(),
      r = new Map(),
      s = ms(t.copiedNodes),
      a = t.copiedNodes.filter((v) => !s.has(v.id)),
      d = new Set(t.copiedNodes.map((v) => v.id)),
      c = KM(t.copiedEdges, d),
      l = XM(a.length > 0 ? a : t.copiedNodes, c, e),
      u = eb(n.flowCore.config, t.copiedNodes, l, r, s);
    ib(u, n.flowCore.config);
    let f = tb(n.flowCore.config, t.copiedEdges, r, s, l);
    if (u.length === 0 && f.length === 0) return;
    let { nodesToUpdate: g, edgesToUpdate: p } = nb(i, o);
    ((n.flowCore.actionStateManager.selection = { selectionChanged: !0 }),
      await n.flowCore.applyUpdate(
        { nodesToAdd: u, edgesToAdd: f, nodesToUpdate: g, edgesToUpdate: p },
        'paste',
      ),
      await n.flowCore.applyUpdate({}, 'selectEnd'));
  },
  By = async (n) => {
    let { nodes: e, edges: t } = n.flowCore.getState(),
      { modelLookup: i } = n.flowCore,
      o = e.filter((u) => u.selected && !u.computedHidden).map((u) => u.id),
      r = [...new Set(o.flatMap((u) => [u, ...i.getAllDescendantIds(u)]))],
      s = new Set(r),
      a = new Set(
        t.filter((u) => u.selected && !u.computedHidden).map((u) => u.id),
      ),
      { edgesToRemove: d, edgesToUpdate: c } = ky(n.flowCore, t, s, a),
      l = [...new Set([...a, ...d])];
    (r.length === 0 && l.length === 0) ||
      (await n.flowCore.applyUpdate(
        h(
          { nodesToRemove: r, edgesToRemove: l },
          c.length > 0 ? { edgesToUpdate: c } : {},
        ),
        'deleteSelection',
      ));
  },
  rb = async (n) => {
    (await Ly(n), await By(n));
  },
  sb = async (n, { groupId: e, nodes: t }) => {
    let i = n.flowCore.actionStateManager.highlightGroup,
      o = i?.highlightedGroupId;
    if (o === e) return;
    let r = n.flowCore.modelLookup.getNodeById(e);
    if (!r || !t.some((a) => n.flowCore.config.grouping.canGroup(a, r))) return;
    let s = [{ id: e, highlighted: !0 }];
    (o && s.push({ id: o, highlighted: !1 }),
      (n.flowCore.actionStateManager.highlightGroup = {
        highlightedGroupId: e,
      }),
      await n.flowCore.applyUpdate({ nodesToUpdate: s }, 'highlightGroup'));
  },
  ab = async (n) => {
    let e = n.flowCore.actionStateManager.highlightGroup,
      t = e?.highlightedGroupId;
    t &&
      (await n.flowCore.applyUpdate(
        { nodesToUpdate: [{ id: t, highlighted: !1 }] },
        'highlightGroupClear',
      ),
      n.flowCore.actionStateManager.highlightGroup === e &&
        n.flowCore.actionStateManager.clearHighlightGroup());
  },
  db = async (n, e) => {
    await n.flowCore.applyUpdate(
      {
        renderedNodeIds: e.renderedNodeIds,
        renderedEdgeIds: e.renderedEdgeIds,
      },
      'init',
    );
  },
  cb = 0,
  qs = (n) => y(h({}, n), { _gestureId: ++cb }),
  Zs = (n, e) => {
    let t = n.linking;
    t && t._gestureId === e && n.clearLinking();
  },
  Hy = (n, e, t) => {
    let i = y(h(h({}, e), t), { temporary: !1 });
    return n.linking.finalEdgeDataBuilder(
      h(
        h(
          y(h({}, i), { id: n.computeEdgeId() }),
          i.source ? {} : { sourcePort: void 0 },
        ),
        i.target ? {} : { targetPort: void 0 },
      ),
    );
  },
  lb = (n, e, t) =>
    !(
      n.type === 'source' ||
      ((e || t) && (!e || n.nodeId === e) && (!t || n.id === t))
    ),
  ub = (n, e, t) =>
    !(
      n.type === 'target' ||
      ((e || t) && (!e || n.nodeId === e) && (!t || n.id === t))
    ),
  Ys = (n, e, t, i, o, r, s) => {
    let a = e ? n.getNodeById(e) : null,
      d = i ? n.getNodeById(i) : null,
      c = t ? (a?.measuredPorts?.find((u) => u.id === t) ?? null) : null,
      l = o ? (d?.measuredPorts?.find((u) => u.id === o) ?? null) : null;
    return (
      !(
        r ||
        !((s?.reason === 'relink' ? (s.end ?? 'target') : 'target') === 'target'
          ? c && !l
          : l && !c)
      ) ||
      n.config.linking.validateConnection(a, c, d, l, s ?? { reason: 'draw' })
    );
  },
  zy = (n) => ({
    type: n.type,
    data: n.data,
    routing: n.routing,
    sourceArrowhead: n.sourceArrowhead,
    targetArrowhead: n.targetArrowhead,
    measuredLabels: n.measuredLabels,
  }),
  Qs = (n, e) =>
    n.linking.temporaryEdgeDataBuilder(
      y(
        h(
          {
            id: 'TEMPORARY_EDGE',
            data: {},
            temporary: !0,
            targetArrowhead: 'ng-diagram-arrow',
          },
          e,
        ),
        { source: e.source || '', target: e.target || '' },
      ),
    ),
  Vy = (n, e, t, i) => {
    let o = n.getNodeById(t);
    if (!o || o.computedHidden) return !1;
    if (i) {
      let r = o.measuredPorts?.find((s) => s.id === i);
      if (
        !r ||
        (e === 'target' ? r?.type === 'source' : r?.type === 'target') ||
        n.templateVisibilityRegistry?.isPortHidden(t, i)
      )
        return !1;
    }
    return !0;
  },
  jy = (n, e) =>
    e
      ? {
          reason: 'relink',
          edge: n.getEdgeById(e.edgeId) ?? e.originalEdge,
          end: e.end,
        }
      : { reason: 'draw' },
  Dn = async (n) => {
    await n.flowCore.applyUpdate({}, 'finishLinking');
  },
  Uy = (n, e, t) => {
    let { config: i } = n.flowCore;
    if (
      !i.danglingEdges?.enabled ||
      (e.source && n.flowCore.getNodeById(e.source)?.computedHidden)
    )
      return null;
    let o = Hy(i, e, { target: '', targetPort: void 0, targetPosition: t });
    return i.danglingEdges.shouldKeepOnDrop &&
      !i.danglingEdges.shouldKeepOnDrop(o, t)
      ? null
      : o;
  },
  fb = (n, e, t) => {
    let i = e && n.flowCore.getNodeById(e);
    if (!i) return { isValid: !1, targetNode: null, targetPosition: null };
    if (i.computedHidden)
      return { isValid: !1, targetNode: i, targetPosition: null };
    if (
      t &&
      (i.measuredPorts?.find((r) => r.id === t)?.type === 'source' ||
        n.flowCore.templateVisibilityRegistry?.isPortHidden(i.id, t))
    )
      return { isValid: !1, targetNode: i, targetPosition: null };
    let o = e && t ? Co(i, t) : i.position;
    return o
      ? { isValid: !0, targetNode: i, targetPosition: o }
      : { isValid: !1, targetNode: i, targetPosition: null };
  },
  gb = async (n, e) => {
    let t = n.flowCore.actionStateManager.linking,
      i = t?.temporaryEdge;
    if (!t || t.relink || t._finishing) return;
    t._finishing = !0;
    let o = t._gestureId;
    try {
      if (!i) return void (await Dn(n));
      t.dropPosition = e.position ?? { x: 0, y: 0 };
      let { source: r, sourcePort: s, target: a, targetPort: d } = i,
        c = a || void 0,
        l = d || void 0;
      if (!c) {
        let { config: g } = n.flowCore,
          p =
            g.danglingEdges?.enabled &&
            n.flowCore.getNearestPortInRange(
              t.dropPosition,
              g.linking.portSnapDistance,
            )
              ? null
              : Uy(n, i, t.dropPosition);
        return p
          ? void (await n.flowCore.applyUpdate(
              { edgesToAdd: [p] },
              'finishLinking',
            ))
          : ((t.cancelReason = 'noTarget'), void (await Dn(n)));
      }
      if (n.flowCore.getNodeById(r)?.computedHidden)
        return ((t.cancelReason = 'cancelled'), void (await Dn(n)));
      if (!Ys(n.flowCore, r, s, c, l, !0))
        return ((t.cancelReason = 'invalidConnection'), void (await Dn(n)));
      let { isValid: u, targetPosition: f } = fb(n, c, l);
      if (!u) return ((t.cancelReason = 'invalidTarget'), void (await Dn(n)));
      await n.flowCore.applyUpdate(
        {
          edgesToAdd: [
            Hy(n.flowCore.config, i, {
              target: c,
              targetPort: l,
              targetPosition: f || void 0,
            }),
          ],
        },
        'finishLinking',
      );
    } finally {
      Zs(n.flowCore.actionStateManager, o);
    }
  },
  hb = async (n) => {
    let e = n.flowCore.actionStateManager.linking;
    if (!e || e._finishing) return;
    e._finishing = !0;
    let t = e._gestureId,
      i =
        e.relink?.end === 'source'
          ? e.temporaryEdge?.sourcePosition
          : e.temporaryEdge?.targetPosition;
    e.dropPosition ??= i ?? { x: 0, y: 0 };
    try {
      e.relink
        ? ((e.relinkCancelReason = 'cancelled'),
          await n.flowCore.applyUpdate({}, 'finishRelinking'))
        : ((e.cancelReason = 'cancelled'), await Dn(n));
    } finally {
      Zs(n.flowCore.actionStateManager, t);
    }
  },
  pb = async (n, e) => {
    let t = n.flowCore.actionStateManager.linking,
      i = t?.temporaryEdge,
      { position: o } = e;
    if (!t || t.relink || t._finishing) return;
    t._finishing = !0;
    let r = t._gestureId;
    try {
      if (!i) return;
      t.dropPosition = o;
      let s = Uy(n, i, o);
      if (!s) return ((t.cancelReason = 'noTarget'), void (await Dn(n)));
      await n.flowCore.applyUpdate({ edgesToAdd: [s] }, 'finishLinking');
    } finally {
      Zs(n.flowCore.actionStateManager, r);
    }
  },
  $y = (n, e, t, i = 'target') => {
    let o = n.flowCore.getNearestPortInRange(
        e,
        n.flowCore.config.linking.portSnapDistance,
      ),
      r =
        o &&
        (i === 'target'
          ? lb(o, t.source, t.sourcePort)
          : ub(o, t.target, t.targetPort));
    return {
      targetNodeId: r ? o.nodeId : '',
      targetPortId: r ? o.id : '',
      isValid: !!r,
      hitPort: o ?? null,
    };
  },
  mb = (n, e, t, i, o = 'target', r) => {
    let { targetNodeId: s, targetPortId: a } = t,
      { config: d } = n.flowCore,
      c =
        o === 'target'
          ? {
              source: e.source || '',
              sourcePort: e.sourcePort || '',
              sourcePosition: e.sourcePosition,
            }
          : {
              target: e.target || '',
              targetPort: e.targetPort || '',
              targetPosition: e.targetPosition,
            },
      l = (p) => Qs(d, h(h(h({}, r ? zy(r.originalEdge) : {}), c), p)),
      u = () =>
        l(
          o === 'target'
            ? { target: '', targetPort: '', targetPosition: i }
            : { source: '', sourcePort: '', sourcePosition: i },
        );
    if (!s) return u();
    let f = n.flowCore.getNodeById(s);
    if (
      !f ||
      !Ys(
        n.flowCore,
        o === 'target' ? e.source : s,
        o === 'target' ? e.sourcePort : a,
        o === 'target' ? s : e.target,
        o === 'target' ? a : e.targetPort,
        void 0,
        jy(n.flowCore, r),
      )
    )
      return u();
    let g = a && f.measuredPorts?.find((p) => p.id === a);
    return l(
      o === 'target'
        ? { target: s, targetPort: g ? a : '', targetPosition: i }
        : { source: s, sourcePort: g ? a : '', sourcePosition: i },
    );
  },
  yb = (n, e, t, i = 'target') =>
    i === 'target'
      ? e === n.target && t === n.targetPort
      : e === n.source && t === n.sourcePort,
  vb = async (n, e) => {
    let { position: t } = e,
      i = n.flowCore.actionStateManager.linking,
      o = i?.temporaryEdge;
    if (!i || !o) return;
    let r = i.relink?.end ?? 'target',
      s = $y(n, t, o, r);
    if (s.targetNodeId && yb(o, s.targetNodeId, s.targetPortId, r)) return;
    let a = mb(n, o, s, t, r, i.relink);
    ((n.flowCore.actionStateManager.linking = y(h({}, i), {
      temporaryEdge: a,
    })),
      await n.flowCore.applyUpdate({}, 'moveTemporaryEdge'));
  },
  wb = async (n, e) => {
    let { flowCore: t } = n,
      i = t.actionStateManager.linking;
    if (!i?.relink || i._finishing) return;
    i._finishing = !0;
    let o = i._gestureId;
    try {
      let { edgeId: r, end: s } = i.relink,
        a = i.temporaryEdge,
        d = e.position;
      i.dropPosition = d;
      let c = async (Ce) => {
          ((i.relinkCancelReason = Ce),
            await t.applyUpdate({}, 'finishRelinking'));
        },
        l = t.getEdgeById(r);
      if (!l || !a) return void (await c('cancelled'));
      let u = $y(n, d, a, s),
        { hitPort: f } = u,
        g = u.targetNodeId || void 0,
        p = u.targetPortId || void 0;
      if (
        f &&
        f.nodeId === ((s === 'source' ? l.source : l.target) || void 0) &&
        f.id === ((s === 'source' ? l.sourcePort : l.targetPort) || void 0)
      )
        return void (await c('cancelled'));
      let v = s === 'target' ? l.source : l.target;
      if (v && t.getNodeById(v)?.computedHidden)
        return void (await c('cancelled'));
      if (!f) {
        let { danglingEdges: Ce } = t.config;
        if (Ce?.enabled) {
          let te =
              s === 'target'
                ? { id: r, target: '', targetPort: void 0, targetPosition: d }
                : { id: r, source: '', sourcePort: void 0, sourcePosition: d },
            at = h(h({}, l), te);
          if (!Ce.shouldKeepOnDrop || Ce.shouldKeepOnDrop(at, d))
            return void (await t.applyUpdate(
              { edgesToUpdate: [h(h({}, te), En(l, s, d))] },
              'finishRelinking',
            ));
        }
        return void (await c('noTarget'));
      }
      if (!g) return void (await c('invalidConnection'));
      if (!Vy(t, s, g, p)) return void (await c('invalidConnection'));
      let D = t.getNodeById(g);
      if (
        !Ys(
          t,
          s === 'target' ? l.source || void 0 : g,
          s === 'target' ? l.sourcePort : p,
          s === 'target' ? g : l.target || void 0,
          s === 'target' ? p : l.targetPort,
          !0,
          jy(t, i.relink),
        )
      )
        return void (await c('invalidConnection'));
      let C =
          s === 'target'
            ? { id: r, target: g, targetPort: p, targetPosition: void 0 }
            : { id: r, source: g, sourcePort: p, sourcePosition: void 0 },
        Z = p && D ? Co(D, p) : null,
        we = Z ? En(l, s, Z) : {};
      await t.applyUpdate(
        { edgesToUpdate: [h(h({}, C), we)] },
        'finishRelinking',
      );
    } finally {
      Zs(t.actionStateManager, o);
    }
  },
  Db = async (n, e) => {
    let { source: t, sourcePort: i } = e,
      { actionStateManager: o } = n.flowCore,
      r = () => {
        o.isLinking() && o.clearLinking();
      },
      s = n.flowCore.getNodeById(t);
    if (!s) return void r();
    if (s.computedHidden)
      return (
        console.warn(
          `[ngDiagram] startLinking ignored: source node "${t}" is effectively hidden.`,
        ),
        void r()
      );
    if (
      i &&
      (s.measuredPorts?.find((c) => c.id === i)?.type === 'target' ||
        n.flowCore.templateVisibilityRegistry?.isPortHidden(t, i))
    )
      return void r();
    let a = i ? Co(s, i) : s.position;
    if (!a) return void r();
    let d = Qs(n.flowCore.config, {
      source: t,
      sourcePort: i,
      sourcePosition: a,
      target: '',
      targetPosition: a,
    });
    ((n.flowCore.actionStateManager.linking = qs({
      temporaryEdge: d,
      sourceNodeId: t,
      sourcePortId: i ?? '',
    })),
      await n.flowCore.applyUpdate({}, 'startLinking'));
  },
  Eb = async (n, e) => {
    let { position: t } = e;
    if (n.flowCore.actionStateManager.isLinking()) return;
    let i = Qs(n.flowCore.config, {
      source: '',
      sourcePosition: t,
      target: '',
      targetPosition: t,
    });
    ((n.flowCore.actionStateManager.linking = qs({
      sourceNodeId: '',
      sourcePortId: '',
      temporaryEdge: i,
    })),
      await n.flowCore.applyUpdate({}, 'startLinkingFromPosition'));
  },
  Cb = async (n, e) => {
    let { edgeId: t, end: i } = e,
      { flowCore: o } = n,
      { actionStateManager: r } = o;
    if (r.isLinking()) return;
    let s = o.getEdgeById(t);
    if (
      !s ||
      s.temporary ||
      s.computedHidden ||
      !ps(s, i, o.config.linking.defaultRelinkable)
    )
      return;
    let a = s.points,
      d =
        i === 'source'
          ? (a?.[0] ?? s.sourcePosition)
          : (a?.[a.length - 1] ?? s.targetPosition);
    if (!d) return;
    let c = zy(s),
      l = Qs(
        o.config,
        i === 'target'
          ? y(h({}, c), {
              source: s.source,
              sourcePort: s.sourcePort,
              sourcePosition: s.sourcePosition ?? a?.[0],
              target: '',
              targetPort: '',
              targetPosition: d,
            })
          : y(h({}, c), {
              source: '',
              sourcePort: '',
              sourcePosition: d,
              target: s.target,
              targetPort: s.targetPort,
              targetPosition: s.targetPosition ?? a?.[a.length - 1],
            }),
      );
    ((r.linking = qs({
      sourceNodeId: s.source,
      sourcePortId: s.sourcePort ?? '',
      temporaryEdge: l,
      relink: { edgeId: t, end: i, originalEdge: s },
    })),
      await o.applyUpdate({}, 'startRelinking'));
  },
  Ib = async (n, { delta: e, nodes: t }) => {
    let i = new Set(t.map((a) => a.id)),
      o = t.filter((a) => !a.groupId || !i.has(a.groupId)),
      r = n.flowCore.actionStateManager?.dragging?.accumulatedDeltas,
      s = Mb(n, o, i, e, r);
    s.length !== 0 &&
      (await n.flowCore.applyUpdate({ nodesToUpdate: s }, 'moveNodesBy'));
  },
  Mb = (n, e, t, i, o) => {
    let r = [],
      s = new Set();
    return (
      e.forEach((a) => {
        let { snappedPosition: d, actualDelta: c } = bb(n, a, i, o);
        (Ue(a.position, d) || r.push({ id: a.id, position: d }),
          s.add(a.id),
          Sb(n, a.id, c, t, s, r));
      }),
      r
    );
  },
  bb = (n, e, t, i) => {
    let { snappedPosition: o, newAccumulated: r } = Tb(n, e, t, i);
    return (
      i && i.set(e.id, r),
      { snappedPosition: o, actualDelta: j.subtractPoints(o, e.position) }
    );
  },
  Sb = (n, e, t, i, o, r) => {
    n.flowCore.modelLookup.getAllDescendants(e).forEach((s) => {
      if (i.has(s.id) && !o.has(s.id)) {
        let a = { x: s.position.x + t.x, y: s.position.y + t.y };
        (Ue(s.position, a) || r.push({ id: s.id, position: a }), o.add(s.id));
      }
    });
  },
  Tb = (n, e, t, i) => {
    let o = i?.get(e.id) ?? { x: 0, y: 0 },
      r = { x: o.x + t.x, y: o.y + t.y },
      s = Ws(n.flowCore.config, e, {
        x: e.position.x + r.x,
        y: e.position.y + r.y,
      }),
      a = j.subtractPoints(s, e.position);
    return { snappedPosition: s, newAccumulated: j.subtractPoints(r, a) };
  },
  _b = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeIds ? { gestureNodeIds: e.nodeIds } : {},
      'moveNodesStart',
    );
  },
  Nb = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeIds ? { gestureNodeIds: e.nodeIds } : {},
      'moveNodesStop',
    );
  },
  xb = async (n, { x: e, y: t }) => {
    let { metadata: i } = n.flowCore.getState();
    (e || t) &&
      (n.flowCore.actionStateManager.isPanning()
        ? n.flowCore.applyViewportOnlyUpdate({
            x: i.viewport.x + e,
            y: i.viewport.y + t,
          })
        : await n.flowCore.applyUpdate(
            {
              metadataUpdate: {
                viewport: y(h({}, i.viewport), {
                  x: i.viewport.x + e,
                  y: i.viewport.y + t,
                }),
              },
            },
            'moveViewport',
          ));
  },
  Pb = async (n, e) => {
    let { x: t, y: i } = e,
      { metadata: o } = n.flowCore.getState();
    Ue(o.viewport, { x: t, y: i }) ||
      (await n.flowCore.applyUpdate(
        { metadataUpdate: { viewport: y(h({}, o.viewport), { x: t, y: i }) } },
        'moveViewport',
      ));
  },
  Rb = async (n, { groupId: e, nodeIds: t }) => {
    let i = t.map((r) => n.flowCore.modelLookup.getNodeById(r)).filter(Boolean);
    if (!n.flowCore.modelLookup.getNodeById(e)) return;
    let o = [];
    for (let r of i) r.groupId === e && o.push({ id: r.id, groupId: void 0 });
    o.length > 0 &&
      (await n.flowCore.commandHandler.emit('updateNodes', { nodes: o }));
  },
  kb = (n) => `[ngDiagram] Resize node failed: Node not found.

Node ID: ${n}

This may occur if the node was deleted before the resize command executed.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/nodes/`,
  Ab = (n, e, t, i) => {
    let o = n.resize.getMinNodeSize(e),
      r = Math.max(t.width, o.width),
      s = Math.max(t.height, o.height);
    if (!i) return { size: { width: r, height: s }, position: i };
    let a = i.x,
      d = i.y;
    return (
      r !== t.width && i.x > e.position.x && (a = i.x - (r - t.width)),
      s !== t.height && i.y > e.position.y && (d = i.y - (s - t.height)),
      { size: { width: r, height: s }, position: { x: a, y: d } }
    );
  },
  Ob = (n, e, t, i) => {
    let o = {
        left: e?.x ?? t.x,
        top: e?.y ?? t.y,
        right: (e?.x ?? t.x) + n.width,
        bottom: (e?.y ?? t.y) + n.height,
      },
      r = {
        left: Math.min(o.left, i.left),
        top: Math.min(o.top, i.top),
        right: Math.max(o.right, i.right),
        bottom: Math.max(o.bottom, i.bottom),
      };
    return {
      size: { width: r.right - r.left, height: r.bottom - r.top },
      position: { x: r.left, y: r.top },
    };
  },
  Fb = async (n, e) => {
    let t = n.flowCore.getNodeById(e.id);
    t
      ? t.size || !e.size
        ? e.size &&
          (Ty(t.size, e.size) || (ci(t) ? await Lb(n, e, t) : await Gy(n, e)))
        : await Bb(n, e)
      : console.error(kb(e.id));
  },
  Lb = async (n, e, t) => {
    let i = n.flowCore.modelLookup
      .getNodeChildren(e.id, { directOnly: !1 })
      .filter((a) => !a.computedHidden);
    if (i.length === 0) return void (await Gy(n, e));
    let o = IM(i, t, {
        useGroupRect: !1,
        allowResizeBelowChildrenBounds:
          n.flowCore.config.resize.allowResizeBelowChildrenBounds,
      }),
      { size: r, position: s } = Ob(e.size, e.position, t.position, o);
    await Wy(n, t, s, r, !0, o);
  },
  Gy = async (n, e) => {
    let t = n.flowCore.getNodeById(e.id);
    t && (await Wy(n, t, e.position, e.size, e.disableAutoSize));
  },
  Bb = async (n, e) => {
    n.flowCore.getNodeById(e.id) &&
      (await n.emit('updateNode', { id: e.id, nodeChanges: { size: e.size } }));
  },
  Wy = async (n, e, t, i, o, r) => {
    let s = n.flowCore.config;
    if (!s.snapping.shouldSnapResizeForNode(e)) {
      let { size: a, position: d } = Ab(s, e, i, t),
        c = h({ id: e.id, size: a }, o !== void 0 && { autoSize: !o });
      return (
        d && (c.position = d),
        await n.flowCore.applyUpdate({ nodesToUpdate: [c] }, 'resizeNode')
      );
    }
    return await zb(n, e, t, i, o, r);
  },
  Hb = (n, e, t) => (e ? t + e * Math.ceil((n - t) / e) : n),
  iy = (n) => {
    let e = Math.round(n.position + n.size),
      t = n.nextPosition !== void 0 && n.nextPosition !== n.position,
      i =
        n.nextPosition === void 0
          ? void 0
          : t
            ? j.snapNumber(n.nextPosition, n.step, e - n.offset)
            : n.position,
      o = n.nextSize;
    n.size !== o &&
      (o = t && i !== void 0 ? e - i : j.snapNumber(o, n.step, n.offset));
    let r = Math.max(
      0,
      n.min,
      n.childrenNear !== void 0 && n.childrenFar !== void 0
        ? t
          ? e - n.childrenNear
          : n.childrenFar - n.position
        : 0,
    );
    return (
      (o < r || o <= 0) &&
        ((o = Hb(r, n.step, n.offset)), t && i !== void 0 && (i = e - o)),
      { position: i, size: o }
    );
  },
  zb = async (n, e, t, i, o, r) => {
    let {
        computeSnapForNodeSize: s,
        defaultResizeSnap: a,
        computeSnapOffsetForNodeSize: d,
        defaultResizeSnapOffset: c,
      } = n.flowCore.config.snapping,
      l = s(e) ?? a,
      u = d(e) ?? c,
      f = n.flowCore.config.resize.getMinNodeSize(e),
      g = iy({
        position: e.position.x,
        size: e.size?.width ?? 0,
        nextPosition: t?.x,
        nextSize: i.width,
        step: l.width,
        offset: u.width,
        min: f.width,
        childrenNear: r?.left,
        childrenFar: r?.right,
      }),
      p = iy({
        position: e.position.y,
        size: e.size?.height ?? 0,
        nextPosition: t?.y,
        nextSize: i.height,
        step: l.height,
        offset: u.height,
        min: f.height,
        childrenNear: r?.top,
        childrenFar: r?.bottom,
      }),
      v = h(
        { id: e.id, size: { width: g.size, height: p.size } },
        o !== void 0 && { autoSize: !o },
      );
    (g.position !== void 0 &&
      p.position !== void 0 &&
      (v.position = { x: g.position, y: p.position }),
      await n.flowCore.applyUpdate({ nodesToUpdate: [v] }, 'resizeNode'));
  },
  Vb = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeId ? { gestureNodeIds: [e.nodeId] } : {},
      'resizeNodeStart',
    );
  },
  jb = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeId ? { gestureNodeIds: [e.nodeId] } : {},
      'resizeNodeStop',
    );
  },
  Ub = [0, 90, 180, 270];
var $b = (n) => {
    let e = j.normalizeAngle(n);
    for (let t of Ub) {
      let i = Math.abs(e - t);
      if (Math.min(i, 360 - i) <= 2) return t;
    }
    return e;
  },
  Gb = async (n, { nodeId: e, angle: t }) => {
    let i = n.flowCore.getNodeById(e);
    if (!i) return;
    let o = i.angle ?? 0;
    if (o === t) return;
    let {
        shouldSnapForNode: r,
        computeSnapAngleForNode: s,
        defaultSnapAngle: a,
      } = n.flowCore.config.nodeRotation,
      d = j.normalizeAngle(t),
      c = d;
    if (r(i)) {
      let l = s(i) ?? a;
      if (((c = j.snapAngle(d, l)), c === o)) return;
    } else if (((c = $b(c)), c === o)) return;
    await n.flowCore.applyUpdate(
      { nodesToUpdate: [{ id: e, angle: c }] },
      'rotateNodeTo',
    );
  },
  Wb = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeId ? { gestureNodeIds: [e.nodeId] } : {},
      'rotateNodeStart',
    );
  },
  qb = async (n, e) => {
    await n.flowCore.applyUpdate(
      e.nodeId ? { gestureNodeIds: [e.nodeId] } : {},
      'rotateNodeStop',
    );
  },
  Ks = (n, e, t, i = !1) => {
    let o = [],
      r = [],
      s = new Set(e),
      a = new Set(t);
    for (let d of n.nodesMap.values()) {
      let c = s.has(d.id);
      !!d.selected === c ||
        (i && d.selected) ||
        o.push({ id: d.id, selected: c });
    }
    for (let d of n.edgesMap.values()) {
      let c = a.has(d.id);
      !!d.selected === c ||
        (i && d.selected) ||
        r.push({ id: d.id, selected: c });
    }
    return { nodesToUpdate: o, edgesToUpdate: r };
  },
  Xs = async (n, { nodesToUpdate: e, edgesToUpdate: t }) => {
    (e?.length === 0 && t?.length === 0) ||
      ((n.flowCore.actionStateManager.selection = { selectionChanged: !0 }),
      await n.flowCore.applyUpdate(
        { nodesToUpdate: e, edgesToUpdate: t },
        'changeSelection',
      ));
  },
  Zb = async (n, { nodeIds: e, edgeIds: t, multiSelection: i = !1 }) => {
    let { modelLookup: o } = n.flowCore,
      r = Ks(o, e ?? [], t ?? [], i);
    await Xs(n, r);
  },
  Yb = async (n, { nodeIds: e, edgeIds: t }) => {
    let { modelLookup: i } = n.flowCore,
      o = new Set(e),
      r = new Set(t),
      s = [];
    for (let c of i.nodesMap.values())
      !o.has(c.id) && c.selected && s.push(c.id);
    let a = [];
    for (let c of i.edgesMap.values())
      !r.has(c.id) && c.selected && a.push(c.id);
    let d = Ks(i, s, a);
    await Xs(n, d);
  },
  Qb = async (n) => {
    let { modelLookup: e } = n.flowCore,
      t = Ks(e, [], []);
    await Xs(n, t);
  },
  Kb = async (n) => {
    await n.flowCore.applyUpdate({}, 'selectEnd');
  },
  Xb = async (n) => {
    let { modelLookup: e } = n.flowCore,
      t = [...e.nodesMap.values()]
        .filter((r) => !r.computedHidden)
        .map((r) => r.id),
      i = [...e.edgesMap.values()]
        .filter((r) => !r.computedHidden)
        .map((r) => r.id),
      o = Ks(e, t, i);
    await Xs(n, o);
  };
function Js(n) {
  let e = new Map();
  for (let t of n.values())
    t.groupId != null &&
      (e.has(t.groupId) || e.set(t.groupId, []), e.get(t.groupId).push(t));
  return e;
}
function qy(n, e = !1) {
  return [...n].sort((t, i) => {
    if (!e) {
      let o = t.selected ? 1 : 0,
        r = i.selected ? 1 : 0;
      if (o !== r) return o - r;
    }
    return (t.zOrder ?? 0) - (i.zOrder ?? 0);
  });
}
function Jb(n, e, t, i = !1) {
  let o = [],
    r = new Set();
  function s(a) {
    if (r.has(a) || (r.add(a), !e.get(a))) return;
    o.push(a);
    let d = t.get(a);
    if (d) for (let c of qy(d, i)) s(c.id);
  }
  for (let a of n) s(a);
  return o;
}
function Zy(n, e, t, i, o) {
  let r = [],
    s = new Map(),
    a = o?.skipRoot ? n.id : void 0;
  return (
    Yy(
      n,
      e,
      t,
      i,
      (d, c, l) => {
        d.id !== a &&
          (r.push(y(h({}, d), { computedZIndex: c })), s.set(d.id, l));
      },
      !1,
      o?.initialCumulativeElevation ?? 0,
    ),
    { nodes: r, elevations: s }
  );
}
function eS(n, e, t, i) {
  let o = new Map();
  return (
    Yy(
      n,
      e,
      t,
      i,
      (r, s) => {
        o.set(r.id, s);
      },
      !0,
    ),
    o
  );
}
function Yy(n, e, t, i, o, r = !1, s = 0) {
  let a = !r && i?.elevateOnSelection ? i.selectedZIndex : 0,
    d = new Set();
  (function c(l, u, f) {
    if (d.has(l.id)) return;
    d.add(l.id);
    let g = l.groupId != null ? Math.max(l.zOrder ?? u, u) : (l.zOrder ?? u);
    if ((l.selected && a > 0 && (f += a), o(l, g + f, f), ci(l))) {
      let p = g;
      for (let v of qy(e.get(l.id) || [], r)) ((p += 1), c(v, p, f));
    }
  })(n, t, s);
}
function tS(n, e, t) {
  let i = Array.from(n.values()).filter((a) => a.groupId == null),
    o = t ?? Js(n),
    r = [],
    s = new Map();
  for (let a of i) {
    let d = Zy(a, o, 0, e);
    r.push(...d.nodes);
    for (let [c, l] of d.elevations) s.set(c, l);
  }
  return { nodes: r, elevations: s };
}
function nS(n, e, t) {
  let i = Array.from(n.values()).filter((s) => s.groupId == null),
    o = e ?? Js(n),
    r = new Map();
  for (let s of i) for (let [a, d] of eS(s, o, 0, t)) r.set(a, d);
  return r;
}
function iS(n, e) {
  let t = new Set(n),
    i = [...n];
  for (; i.length > 0;)
    for (let o of e.get(i.pop()) ?? [])
      t.has(o.id) || (t.add(o.id), i.push(o.id));
  return t;
}
function oS(n, e) {
  let t = new Set(n);
  return n.filter((i) => {
    let o = new Set(),
      r = e.get(i)?.groupId;
    for (; r != null && !o.has(r);) {
      if (t.has(r)) return !1;
      (o.add(r), (r = e.get(r)?.groupId));
    }
    return !0;
  });
}
function rS(n, e) {
  let t = [],
    i = new Set(),
    o = e.get(n);
  for (; o?.groupId != null && !i.has(o.groupId);)
    (i.add(o.groupId), t.push(o.groupId), (o = e.get(o.groupId)));
  return t;
}
function sS(n, e, t, i, o) {
  let r = 0;
  for (let [s, a] of n) i.has(s) || (r = t ? Math.max(r, a) : Math.min(r, a));
  for (let s of e) {
    if (o.has(s.id)) continue;
    let a = s.zOrder ?? 0;
    r = t ? Math.max(r, a) : Math.min(r, a);
  }
  return t ? r + 1 : r - 1;
}
function aS(n, e, t) {
  return t.nodeIds || t.edgeIds
    ? { nodeIds: t.nodeIds ?? [], edgeIds: t.edgeIds ?? [] }
    : {
        nodeIds: n.filter((i) => i.selected).map((i) => i.id),
        edgeIds: e.filter((i) => i.selected).map((i) => i.id),
      };
}
var Qy = async (n, e) => {
    let { nodes: t, edges: i } = n.flowCore.getState(),
      { nodeIds: o, edgeIds: r } = aS(t, i, e);
    if (o.length === 0 && r.length === 0) return;
    let s = new Map(t.map((v) => [v.id, v])),
      a = Js(s),
      d = nS(s, a, n.flowCore.config.zIndex),
      c = oS(o, s),
      l = iS(c, a),
      u = new Set(r),
      f = e.name === 'bringToFront',
      g = sS(d, i, f, l, u),
      p = [];
    if (f)
      for (let v of c) {
        let D = Jb([v], s, a, !0),
          C = g;
        for (let Z of D) (p.push({ id: Z, zOrder: C }), (C += 1));
      }
    else {
      let v = new Map();
      for (let D of o) {
        p.push({ id: D, zOrder: g });
        let C = rS(D, s),
          Z = g;
        for (let we of C) {
          Z -= 1;
          let Ce = v.get(we);
          (Ce == null || Z < Ce) && v.set(we, Z);
        }
      }
      for (let [D, C] of v) p.push({ id: D, zOrder: C });
    }
    await n.flowCore.applyUpdate(
      { nodesToUpdate: p, edgesToUpdate: r.map((v) => ({ id: v, zOrder: g })) },
      'changeZOrder',
    );
  },
  dS = async (n, e) => {
    await Qy(n, e);
  },
  cS = async (n, e) => {
    await Qy(n, e);
  },
  lS = (n) => `[ngDiagram] Invalid zoom scale: ${n}

Scale must be a positive finite number.

Documentation: https://www.ngdiagram.dev/docs/intro/coordinate-system/#viewport-and-scaling`,
  uS = async (n, { x: e, y: t, scale: i }) => {
    let { metadata: o } = n.flowCore.getState();
    if (i <= 0 || !isFinite(i) || isNaN(i)) return void console.error(lS(i));
    let { min: r, max: s } = n.flowCore.config.zoom;
    i < r || i > s
      ? console.warn(`Zoom scale ${i} is out of bounds [${r}, ${s}]`)
      : (e === o.viewport.x && t === o.viewport.y && i === o.viewport.scale) ||
        (await n.flowCore.applyUpdate(
          {
            metadataUpdate: {
              viewport: y(h({}, o.viewport), { x: e, y: t, scale: i }),
            },
          },
          'zoom',
        ));
  },
  fS = (n) => `[ngDiagram] Invalid scale calculated in zoom-to-fit: ${n}

Scale must be a positive finite number.

Documentation: https://www.ngdiagram.dev/docs/intro/coordinate-system/#viewport-and-scaling`,
  gS = `[ngDiagram] zoomToFit is disabled when virtualization is enabled.

When virtualization is active, only visible nodes and edges are rendered for performance reasons.
Zoom to fit requires all elements to be available for calculating bounds, which conflicts with virtualization.

To use zoomToFit, disable virtualization in your config:
  virtualization: { enabled: false }`,
  hS = (n, e) => {
    if (typeof n == 'number') return { top: n, right: n, bottom: n, left: n };
    switch (n.length) {
      case 2:
        return { top: n[0], right: n[1], bottom: n[0], left: n[1] };
      case 3:
        return { top: n[0], right: n[1], bottom: n[2], left: n[1] };
      case 4:
        return { top: n[0], right: n[1], bottom: n[2], left: n[3] };
      default:
        return { top: e, right: e, bottom: e, left: e };
    }
  },
  pS = (n, e, t, i) => {
    let o = t?.length ? new Set(t) : void 0,
      r = o ? n.filter((a) => o.has(a.id)) : n,
      s;
    return (
      (s = i?.length
        ? e.filter((a) => i.includes(a.id))
        : o
          ? e.filter((a) => o.has(a.source) && o.has(a.target))
          : e),
      { targetNodes: r, targetEdges: s }
    );
  },
  mS = (n, e, t, i, o, r) => {
    let s = Math.min(t / n, i / e);
    return Math.max(o, Math.min(r, s));
  },
  yS = (n, e, t, i) => ({
    x: e.width / 2 - (n.x + n.width / 2) * i + (t.left - t.right) / 2,
    y: e.height / 2 - (n.y + n.height / 2) * i + (t.top - t.bottom) / 2,
  }),
  vS = (n) => !!n.width && !!n.height && n.width > 0 && n.height > 0,
  wS = async (n, { nodeIds: e, edgeIds: t, padding: i }) => {
    if (n.flowCore.isVirtualizationActive) return void console.warn(gS);
    let { nodes: o, edges: r, metadata: s } = n.flowCore.getState(),
      { viewport: a } = s;
    if (!vS(a)) return;
    let d = a.width,
      c = a.height,
      l = n.flowCore.config.zoom.zoomToFit.padding,
      u = i ?? l,
      { targetNodes: f, targetEdges: g } = pS(o, r, e, t),
      p = zf(f, g);
    if (!p) return;
    let v = Array.isArray(l) ? l[0] : l,
      D = hS(u, v),
      C = d - D.left - D.right,
      Z = c - D.top - D.bottom;
    if (C <= 0 || Z <= 0) return;
    let { min: we, max: Ce } = n.flowCore.config.zoom,
      te = mS(p.width, p.height, C, Z, we, Ce);
    if (te <= 0 || !isFinite(te) || isNaN(te))
      return void console.error(fS(te));
    let { x: at, y: Vt } = yS(p, { width: d, height: c }, D, te);
    (a.x === at && a.y === Vt && a.scale === te) ||
      (await n.flowCore.applyUpdate(
        {
          metadataUpdate: {
            viewport: y(h({}, a), { x: at, y: Vt, scale: te }),
          },
        },
        'zoomToFit',
      ));
  },
  DS = {
    init: db,
    select: Zb,
    selectAll: Xb,
    selectEnd: Kb,
    deselect: Yb,
    deselectAll: Qb,
    moveNodesBy: Ib,
    moveNodesStart: _b,
    moveNodesStop: Nb,
    deleteSelection: By,
    addNodes: PM,
    updateNode: kM,
    updateNodes: AM,
    deleteNodes: OM,
    clearModel: FM,
    addEdges: LM,
    updateEdge: BM,
    updateEdges: HM,
    deleteEdges: zM,
    copy: Ly,
    cut: rb,
    paste: ob,
    moveViewport: Pb,
    moveViewportBy: xb,
    startLinking: Db,
    moveTemporaryEdge: vb,
    finishLinking: gb,
    cancelLinking: hb,
    finishLinkingToPosition: pb,
    startLinkingFromPosition: Eb,
    startRelinking: Cb,
    finishRelinking: wb,
    resizeNode: Fb,
    resizeNodeStart: Vb,
    resizeNodeStop: jb,
    zoom: uS,
    addPortsBulk: VM,
    updatePortsBulk: jM,
    deletePortsBulk: UM,
    bringToFront: dS,
    sendToBack: cS,
    addEdgeLabelsBulk: $M,
    updateEdgeLabelsBulk: GM,
    deleteEdgeLabelsBulk: WM,
    rotateNodeTo: Gb,
    rotateNodeStart: Wb,
    rotateNodeStop: qb,
    highlightGroup: sb,
    highlightGroupClear: ab,
    addToGroup: uM,
    removeFromGroup: Rb,
    paletteDropNode: RM,
    centerOnNode: ZM,
    centerOnRect: qM,
    zoomToFit: wS,
  },
  vl = class {
    callbacks = {};
    flowCore;
    constructor(e) {
      ((this.flowCore = e),
        Object.entries(DS).forEach(([t, i]) => {
          this.register(t, (o) => i(this, o));
        }));
    }
    async emit(e, ...t) {
      return await this.emitInternal(e, !1, ...t);
    }
    async emitInternal(e, t, ...i) {
      if (!t && this.flowCore.transactionManager.isActive()) {
        let r = this.flowCore.transactionManager.getCurrentTransaction();
        if (r && !r.isAborted()) return r.context.emit(e, ...i);
      }
      let o = this.callbacks[e];
      if (o) {
        let r = h({ name: e }, i[0]);
        await Promise.all(o.map((s) => s(r)));
      }
    }
    register(e, t) {
      return (
        this.getCommandCallbacks(e).push(t),
        () => {
          let i = this.getCommandCallbacks(e).filter((o) => o !== t);
          this.callbacks[e] = i;
        }
      );
    }
    getCommandCallbacks(e) {
      return (this.callbacks[e] ||= []);
    }
  },
  ES = [
    {
      actionName: 'copy',
      bindings: [{ key: 'c', modifiers: { primary: !0 } }],
    },
    { actionName: 'cut', bindings: [{ key: 'x', modifiers: { primary: !0 } }] },
    {
      actionName: 'paste',
      bindings: [{ key: 'v', modifiers: { primary: !0 } }],
    },
    {
      actionName: 'deleteSelection',
      bindings: [{ key: 'Delete' }, { key: 'Backspace' }],
    },
    { actionName: 'cancelInteraction', bindings: [{ key: 'Escape' }] },
    { actionName: 'keyboardMoveSelectionUp', bindings: [{ key: 'ArrowUp' }] },
    {
      actionName: 'keyboardMoveSelectionDown',
      bindings: [{ key: 'ArrowDown' }],
    },
    {
      actionName: 'keyboardMoveSelectionLeft',
      bindings: [{ key: 'ArrowLeft' }],
    },
    {
      actionName: 'keyboardMoveSelectionRight',
      bindings: [{ key: 'ArrowRight' }],
    },
    { actionName: 'keyboardPanUp', bindings: [{ key: 'ArrowUp' }] },
    { actionName: 'keyboardPanDown', bindings: [{ key: 'ArrowDown' }] },
    { actionName: 'keyboardPanLeft', bindings: [{ key: 'ArrowLeft' }] },
    { actionName: 'keyboardPanRight', bindings: [{ key: 'ArrowRight' }] },
    { actionName: 'boxSelection', bindings: [{ modifiers: { shift: !0 } }] },
    {
      actionName: 'multiSelection',
      bindings: [{ modifiers: { primary: !0 } }],
    },
    {
      actionName: 'selectAll',
      bindings: [{ key: 'a', modifiers: { primary: !0 } }],
    },
    {
      actionName: 'undo',
      bindings: [{ key: 'z', modifiers: { primary: !0 } }],
    },
    {
      actionName: 'redo',
      bindings: [{ key: 'y', modifiers: { primary: !0 } }],
    },
    { actionName: 'zoom', bindings: [{ modifiers: { primary: !0 } }] },
    { actionName: 'keyboardZoomIn', bindings: [{ key: '=' }] },
    { actionName: 'keyboardZoomOut', bindings: [{ key: '-' }] },
  ];
var wl = class {
    flowCore;
    constructor(e) {
      this.flowCore = e;
    }
    match(e) {
      let { shortcuts: t } = this.flowCore.config,
        i = [];
      for (let o of t)
        for (let r of o.bindings)
          if (this.matchBinding(e, r)) {
            i.push(o);
            break;
          }
      return i;
    }
    matchesAction(e, t) {
      let { shortcuts: i } = this.flowCore.config,
        o = i.find((r) => r.actionName === e);
      return !!o && o.bindings.some((r) => this.matchBinding(t, r));
    }
    matchBinding(e, t) {
      return (
        !(t.key !== void 0 && !this.keysMatch(e.key, t.key)) &&
        (t.key !== void 0 || e.key === void 0) &&
        this.matchModifiers(e.modifiers, t)
      );
    }
    matchModifiers(e, t) {
      return (
        e.primary === (t.modifiers?.primary ?? !1) &&
        e.shift === (t.modifiers?.shift ?? !1) &&
        e.secondary === (t.modifiers?.secondary ?? !1) &&
        (t.modifiers?.meta === void 0 || e.meta === t.modifiers.meta)
      );
    }
    keysMatch(e, t) {
      return (
        e !== void 0 &&
        (e.length === 1 && t.length === 1
          ? e.toLowerCase() === t.toLowerCase()
          : e === t)
      );
    }
  },
  Dl = { width: 20, height: 20 },
  CS = {
    getMinNodeSize: () => h({}, Dl),
    allowResizeBelowChildrenBounds: !0,
    defaultResizable: !0,
  },
  IS = {
    portSnapDistance: 10,
    edgePanningEnabled: !0,
    edgePanningForce: 10,
    edgePanningThreshold: 30,
    selectNodeOnPortPress: !0,
    defaultRelinkable: !1,
    validateConnection: () => !0,
    temporaryEdgeDataBuilder: (n) => h({}, n),
    finalEdgeDataBuilder: (n) => h({}, n),
  },
  MS = { enabled: !1, detachOnNodeDelete: !1 },
  bS = { canGroup: () => !0 },
  SS = { padding: 50, onInit: !1 },
  TS = { min: 0.01, max: 10, step: 0.03, zoomToFit: SS },
  _S = {
    dotSpacing: 30,
    cellSize: { width: 10, height: 10 },
    majorLinesFrequency: { x: 5, y: 5 },
  },
  NS = {
    shouldSnapForNode: () => !1,
    computeSnapAngleForNode: () => null,
    defaultSnapAngle: 30,
    defaultRotatable: !0,
  },
  xS = {
    shouldSnapDragForNode: () => !1,
    shouldSnapResizeForNode: () => !1,
    computeSnapForNodeDrag: () => null,
    computeSnapForNodeSize: () => null,
    computeSnapOffsetForNodeSize: () => null,
    defaultDragSnap: { width: 10, height: 10 },
    defaultResizeSnap: { width: 10, height: 10 },
    defaultResizeSnapOffset: { width: 0, height: 0 },
  },
  PS = {
    edgePanningForce: 10,
    edgePanningThreshold: 30,
    edgePanningEnabled: !0,
  },
  RS = {
    enabled: !0,
    selectedZIndex: 1e4,
    temporaryEdgeZIndex: 2147483647,
    edgesAboveConnectedNodes: !1,
    elevateOnSelection: !0,
  },
  kS = {
    defaultRouting: 'orthogonal',
    bezier: { bezierControlOffset: 100 },
    orthogonal: { maxCornerRadius: 15, firstLastSegmentLength: 20 },
  },
  AS = { partialInclusion: !0, realtime: !0 },
  OS = { enabled: !1, padding: 0.5, idleDelay: 100 },
  FS = (n, e) =>
    Hf(
      {
        computeNodeId: () => e.environment.generateId(),
        computeEdgeId: () => e.environment.generateId(),
        resize: CS,
        linking: IS,
        danglingEdges: MS,
        grouping: bS,
        zoom: TS,
        background: _S,
        nodeRotation: NS,
        snapping: xS,
        selectionMoving: PS,
        edgeRouting: kS,
        zIndex: RS,
        boxSelection: AS,
        virtualization: OS,
        shortcuts: ES,
        debugMode: !1,
        viewportPanningEnabled: !0,
        nodeDraggingEnabled: !0,
      },
      n,
    ),
  El = class {
    flowCore;
    cleanups = new Set();
    cancelling = !1;
    cancellableGestures = [
      {
        event: 'linking',
        isActive: () => this.flowCore.actionStateManager.isLinking(),
      },
      {
        event: 'pointerMoveSelection',
        isActive: () => this.flowCore.actionStateManager.isDragging(),
      },
      {
        event: 'resize',
        isActive: () => this.flowCore.actionStateManager.isResizing(),
      },
      {
        event: 'rotate',
        isActive: () => this.flowCore.actionStateManager.isRotating(),
      },
      {
        event: 'panning',
        isActive: () => this.flowCore.actionStateManager.isPanning(),
      },
    ];
    constructor(e) {
      this.flowCore = e;
    }
    registerInteractionCleanup(e) {
      return (
        this.cleanups.add(e),
        () => {
          this.cleanups.delete(e);
        }
      );
    }
    isCancellingInteraction() {
      return this.cancelling;
    }
    hasActiveInteraction() {
      return (
        this.cancellableGestures.some((e) => e.isActive()) ||
        this.cleanups.size > 0
      );
    }
    async cancelActiveInteraction() {
      if (this.cancelling) return !1;
      if (this.flowCore.transactionManager.isActive())
        return (
          console.warn(
            '[ngDiagram] cancelActiveInteraction() called while a transaction is active \u2014 ignored. The rollback would merge into the transaction and could be discarded with it; await the transaction and cancel afterwards.',
          ),
          !1
        );
      let e = this.cancellableGestures
        .filter((t) => t.isActive())
        .map((t) => t.event);
      this.cancelling = !0;
      try {
        let t = [...this.cleanups];
        this.cleanups.clear();
        for (let r of t) r();
        let i = !1,
          o = [];
        for (let r of e)
          try {
            i = (await this.flowCore.inputEventsRouter.cancel(r)) || i;
          } catch (s) {
            o.push(s);
          }
        if (o.length > 0) throw o[0];
        return i || t.length > 0;
      } finally {
        this.cancelling = !1;
      }
    }
  },
  vs = class {
    getMeasuredIds;
    pendingAdds = new Map();
    pendingUpdates = new Map();
    pendingDeletes = new Map();
    flushScheduled = !1;
    lastFlush = Promise.resolve();
    constructor(e) {
      this.getMeasuredIds = e;
    }
    processAdd(e, t, i) {
      (this.getOrCreate(this.pendingAdds, e, i).items.push(t),
        this.scheduleFlush());
    }
    processUpdate(e, t, i) {
      (this.getOrCreate(this.pendingUpdates, e, i).items.push(t),
        this.scheduleFlush());
    }
    processDelete(e, t, i) {
      (this.getOrCreate(this.pendingDeletes, e, i).items.push(t),
        this.scheduleFlush());
    }
    scheduleFlush() {
      this.flushScheduled ||
        ((this.flushScheduled = !0),
        queueMicrotask(() => {
          this.lastFlush = this.lastFlush
            .then(() => this.flush())
            .catch((e) => {
              console.error('[ngDiagram] BatchProcessor flush failed.', e);
            });
        }));
    }
    async flush() {
      ((this.flushScheduled = !1),
        this.cancelMatchingIntents(),
        this.filterAlreadyMeasuredAdds());
      let e = this.takeAll(this.pendingAdds),
        t = this.takeAll(this.pendingUpdates),
        i = this.takeAll(this.pendingDeletes);
      (await this.invokeCallbacks(e),
        await this.invokeCallbacks(t),
        await this.invokeCallbacks(i));
    }
    async invokeCallbacks(e) {
      if (e.size === 0) return;
      let t = new Map();
      for (let [i, { items: o, onFlush: r }] of e) {
        let s = t.get(r);
        (s || ((s = new Map()), t.set(r, s)), s.set(i, o));
      }
      for (let [i, o] of t)
        try {
          await i(o);
        } catch (r) {
          console.error('[ngDiagram] BatchProcessor flush callback failed.', r);
        }
    }
    cancelMatchingIntents() {
      for (let [e, t] of this.pendingDeletes) {
        let i = this.pendingAdds.get(e);
        if (!i) continue;
        let o = new Set(t.items),
          r = i.items.filter((s) => !o.has(s.id) || (o.delete(s.id), !1));
        r.length !== i.items.length &&
          (r.length === 0 ? this.pendingAdds.delete(e) : (i.items = r),
          o.size === 0 ? this.pendingDeletes.delete(e) : (t.items = [...o]));
      }
    }
    filterAlreadyMeasuredAdds() {
      if (this.getMeasuredIds)
        for (let [e, t] of this.pendingAdds) {
          let i = this.getMeasuredIds(e);
          if (i.size === 0) continue;
          let o = t.items.filter((r) => !i.has(r.id));
          o.length !== t.items.length &&
            (o.length === 0 ? this.pendingAdds.delete(e) : (t.items = o));
        }
    }
    getOrCreate(e, t, i) {
      let o = e.get(t);
      return (o || ((o = { items: [], onFlush: i }), e.set(t, o)), o);
    }
    takeAll(e) {
      let t = new Map(e);
      return (e.clear(), t);
    }
  },
  Cl = class extends vs {
    constructor(e) {
      super((t) => {
        let i = e(t)?.measuredLabels ?? [],
          o = new Set();
        for (let r of i) le(r.size) && o.add(r.id);
        return o;
      });
    }
  };
var Il = class {
    phase = 'idle';
    participantIds = new Set();
    pendingConfig = null;
    discoveryWindow = { timeoutId: null, expiresAt: 0, durationMs: 70 };
    debounce = { timeoutId: null, expiresAt: 0, durationMs: 50 };
    settlementPromise = null;
    settlementResolve = null;
    requestTracking(e) {
      this.pendingConfig = e ?? {};
    }
    isTrackingRequested() {
      return this.pendingConfig !== null;
    }
    cancelTrackingRequest() {
      this.pendingConfig = null;
    }
    registerParticipants(e) {
      let t = this.pendingConfig;
      ((this.pendingConfig = null), this.register(e, t));
    }
    trackParticipants(e, t) {
      this.register(e, t ?? null);
    }
    unregisterParticipants(e) {
      if (this.phase !== 'idle') for (let t of e) this.participantIds.delete(t);
    }
    register(e, t) {
      if (e.length !== 0) {
        t &&
          ((this.discoveryWindow.durationMs = t.discoveryWindowMs ?? 70),
          (this.debounce.durationMs = t.debounceMs ?? 50));
        for (let i of e) this.participantIds.add(i);
        (this.clearTimer(this.debounce),
          (this.phase = 'discoveryWindow'),
          this.startTimer(this.discoveryWindow));
      }
    }
    signalObserverActivity(e) {
      if (this.phase === 'idle' || !this.participantIds.has(e)) return;
      let t = this.activeTimer();
      this.remainingTime(t) < 40 && this.startTimer(t);
    }
    signalMeasurement(e) {
      this.phase !== 'idle' &&
        this.participantIds.has(e) &&
        (this.phase === 'discoveryWindow' &&
          this.clearTimer(this.discoveryWindow),
        (this.phase = 'debounce'),
        this.startTimer(this.debounce));
    }
    waitForMeasurements() {
      return this.hasPendingMeasurements()
        ? (this.settlementPromise ||
            (this.settlementPromise = new Promise((e) => {
              this.settlementResolve = e;
            })),
          this.settlementPromise)
        : Promise.resolve();
    }
    hasPendingMeasurements() {
      return this.phase !== 'idle';
    }
    activeTimer() {
      return this.phase === 'discoveryWindow'
        ? this.discoveryWindow
        : this.debounce;
    }
    remainingTime(e) {
      return e.expiresAt - Date.now();
    }
    startTimer(e) {
      (this.clearTimer(e),
        (e.expiresAt = Date.now() + e.durationMs),
        (e.timeoutId = setTimeout(() => {
          this.resolve();
        }, e.durationMs)));
    }
    clearTimer(e) {
      e.timeoutId && (clearTimeout(e.timeoutId), (e.timeoutId = null));
    }
    resolve() {
      ((this.phase = 'idle'),
        this.participantIds.clear(),
        this.clearTimer(this.discoveryWindow),
        this.clearTimer(this.debounce),
        (this.discoveryWindow.durationMs = 70),
        (this.debounce.durationMs = 50),
        this.settlementResolve &&
          (this.settlementResolve(),
          (this.settlementResolve = null),
          (this.settlementPromise = null)));
    }
  },
  Ml = class {
    resolvePass;
    rejectPass;
    outcome = null;
    suspended = [];
    constructor(e, t) {
      ((this.resolvePass = e), (this.rejectPass = t));
    }
    isSettled() {
      return this.outcome !== null;
    }
    suspend(e) {
      this.suspended.push(e);
    }
    settle(e) {
      if (this.outcome === null)
        switch (((this.outcome = e), e.kind)) {
          case 'completed':
            (this.resolvePass(e.state), this.drain((t) => t.resolve(e.state)));
            break;
          case 'cancelled':
            (this.drain((t) => t.resolve(e.state)), this.resolvePass(void 0));
            break;
          case 'failed':
            (this.drain((t) => t.reject(e.error)), this.rejectPass(e.error));
        }
      else e.kind === 'failed' && this.reportStrayError(e.error);
    }
    lateNextResult() {
      let e = this.outcome;
      if (e === null)
        throw new Error('lateNextResult() requires a settled pass');
      return e.kind === 'failed'
        ? Promise.reject(e.error)
        : Promise.resolve(e.state);
    }
    reportStrayError(e) {
      (this.outcome?.kind === 'failed' && e === this.outcome.error) ||
        console.error('[ngDiagram]', e);
    }
    drain(e) {
      for (; this.suspended.length > 0;) e(this.suspended.pop());
    }
  },
  bl = class {
    flowCore;
    middlewareChain;
    history = [];
    initialState;
    initialStateUpdate;
    modelActionTypes;
    metadata;
    edgesMap = new Map();
    nodesMap = new Map();
    initialNodesMap = new Map();
    initialEdgesMap = new Map();
    initialConnectedEdgesMap = new Map();
    addedNodesIds = new Set();
    removedNodesIds = new Set();
    addedEdgesIds = new Set();
    removedEdgesIds = new Set();
    updatedPropsToNodeIds = new Map();
    updatedPropsToEdgeIds = new Map();
    updatedNodeIdsToProps = new Map();
    updatedEdgeIdsToProps = new Map();
    constructor(e, t) {
      ((this.flowCore = e), (this.middlewareChain = t));
    }
    async run(e, t, i) {
      return (
        (this.initialState = e),
        (this.modelActionTypes = i),
        (this.metadata = e.metadata),
        this.isMetadataOnlyUpdate(t)
          ? ((this.nodesMap = this.flowCore.modelLookup.nodesMap),
            (this.edgesMap = this.flowCore.modelLookup.edgesMap),
            (this.initialNodesMap = this.nodesMap),
            (this.initialEdgesMap = this.edgesMap))
          : ((this.nodesMap = new Map(this.flowCore.modelLookup.nodesMap)),
            (this.edgesMap = new Map(this.flowCore.modelLookup.edgesMap)),
            (this.initialNodesMap = new Map(
              this.flowCore.modelLookup.nodesMap,
            )),
            (this.initialEdgesMap = new Map(
              this.flowCore.modelLookup.edgesMap,
            ))),
        (this.initialConnectedEdgesMap =
          this.flowCore.modelLookup.connectedEdgesMap),
        (this.initialStateUpdate = t),
        this.applyStateUpdate(t),
        await this.resolveMiddlewares()
      );
    }
    isMetadataOnlyUpdate(e) {
      return !(
        e.nodesToAdd?.length ||
        e.nodesToUpdate?.length ||
        e.nodesToRemove?.length ||
        e.edgesToAdd?.length ||
        e.edgesToUpdate?.length ||
        e.edgesToRemove?.length ||
        !e.metadataUpdate
      );
    }
    helpers = () => ({
      checkIfNodeChanged: (e) => this.updatedNodeIdsToProps.has(e),
      checkIfEdgeChanged: (e) => this.updatedEdgeIdsToProps.has(e),
      checkIfNodeAdded: (e) => this.addedNodesIds.has(e),
      checkIfNodeRemoved: (e) => this.removedNodesIds.has(e),
      checkIfEdgeAdded: (e) => this.addedEdgesIds.has(e),
      checkIfEdgeRemoved: (e) => this.removedEdgesIds.has(e),
      checkIfAnyNodePropsChanged: (e) =>
        e.some((t) => this.updatedPropsToNodeIds.has(t)),
      checkIfAnyEdgePropsChanged: (e) =>
        e.some((t) => this.updatedPropsToEdgeIds.has(t)),
      anyNodesAdded: () => this.addedNodesIds.size > 0,
      anyEdgesAdded: () => this.addedEdgesIds.size > 0,
      anyNodesRemoved: () => this.removedNodesIds.size > 0,
      anyEdgesRemoved: () => this.removedEdgesIds.size > 0,
      getAffectedNodeIds: (e) =>
        e.flatMap((t) => [...(this.updatedPropsToNodeIds.get(t) ?? [])]),
      getAffectedEdgeIds: (e) =>
        e.flatMap((t) => [...(this.updatedPropsToEdgeIds.get(t) ?? [])]),
      getChangedNodeIds: () => [...this.updatedNodeIdsToProps.keys()],
      getChangedEdgeIds: () => [...this.updatedEdgeIdsToProps.keys()],
      getAddedNodes: () =>
        Array.from(this.addedNodesIds)
          .map((e) => this.nodesMap.get(e))
          .filter((e) => e !== void 0),
      getAddedEdges: () =>
        Array.from(this.addedEdgesIds)
          .map((e) => this.edgesMap.get(e))
          .filter((e) => e !== void 0),
      getRemovedNodes: () =>
        Array.from(this.removedNodesIds)
          .map((e) => this.initialNodesMap.get(e))
          .filter((e) => e !== void 0),
      getRemovedEdges: () =>
        Array.from(this.removedEdgesIds)
          .map((e) => this.initialEdgesMap.get(e))
          .filter((e) => e !== void 0),
    });
    getState = () => ({
      nodes: Array.from(this.nodesMap.values()),
      edges: Array.from(this.edgesMap.values()),
      metadata: this.metadata,
    });
    getContext = () => ({
      state: this.getState(),
      nodesMap: this.nodesMap,
      edgesMap: this.edgesMap,
      initialNodesMap: this.initialNodesMap,
      initialEdgesMap: this.initialEdgesMap,
      initialConnectedEdgesMap: this.initialConnectedEdgesMap,
      initialState: this.initialState,
      modelActionType: this.modelActionTypes[0],
      modelActionTypes: this.modelActionTypes,
      actionStateManager: this.flowCore.actionStateManager,
      edgeRoutingManager: this.flowCore.edgeRoutingManager,
      helpers: this.helpers(),
      history: this.history,
      initialUpdate: this.initialStateUpdate,
      config: this.flowCore.config,
      environment: this.flowCore.environment,
    });
    resolveMiddlewares = () =>
      new Promise((e, t) => {
        let i = new Ml(e, t),
          o = (s) => i.settle({ kind: 'failed', error: s }),
          r = (s) =>
            new Promise((a, d) => {
              let c = this.middlewareChain[s];
              if (!c)
                return void i.settle({
                  kind: 'completed',
                  state: this.getState(),
                });
              let l = c.name;
              i.suspend({ resolve: a, reject: d });
              let u = !1,
                f = (v) => {
                  let D;
                  if (u) {
                    let C = new Error(
                      `Middleware ${l} executed next() multiple times`,
                    );
                    (i.reportStrayError(C), (D = Promise.reject(C)));
                  } else
                    i.isSettled()
                      ? ((u = !0), (D = i.lateNextResult()))
                      : ((u = !0),
                        v &&
                          Object.keys(v).length > 0 &&
                          this.applyStateUpdate(v, l),
                        (D = r(s + 1)));
                  return (D.then(void 0, () => {}), D);
                },
                g = () =>
                  i.settle({ kind: 'cancelled', state: this.initialState }),
                p = this.getContext();
              try {
                let v = c.execute(p, f, g);
                v && typeof v.then == 'function' && v.then(void 0, o);
              } catch (v) {
                o(v);
              }
            });
        r(0).catch(() => {});
      });
    applyStateUpdate = (e, t) => {
      (t && this.history.push({ name: t, stateUpdate: e }),
        e.nodesToAdd?.forEach((i) => this.addNode(i)),
        e.edgesToAdd?.forEach((i) => this.addEdge(i)),
        e.edgesToRemove?.forEach((i) => this.removeEdge(i)),
        e.nodesToRemove?.forEach((i) => this.removeNode(i)),
        e.nodesToUpdate?.forEach((i) => this.updateNode(i)),
        e.edgesToUpdate?.forEach((i) => this.updateEdge(i)),
        e.metadataUpdate &&
          (this.metadata = h(h({}, this.metadata), e.metadataUpdate)));
    };
    removeNode = (e) => {
      (this.nodesMap.delete(e),
        this.removedNodesIds.add(e),
        this.addedNodesIds.delete(e));
    };
    removeEdge = (e) => {
      (this.edgesMap.delete(e),
        this.removedEdgesIds.add(e),
        this.addedEdgesIds.delete(e));
    };
    addEdge = (e) => {
      (this.edgesMap.set(e.id, e),
        this.addedEdgesIds.add(e.id),
        this.removedEdgesIds.delete(e.id));
    };
    addNode = (e) => {
      (this.nodesMap.set(e.id, e),
        this.addedNodesIds.add(e.id),
        this.removedNodesIds.delete(e.id));
    };
    updateNode = (i) => {
      var o = i,
        { id: e } = o,
        t = bn(o, ['id']);
      let r = {},
        s = this.nodesMap.get(e);
      s &&
        (Object.entries(t).forEach(([a, d]) => {
          a === 'position'
            ? Ue(s.position, d) ||
              ((r.position = d), this.updateNodeProp(e, 'position'))
            : a === 'size'
              ? Ty(s.size, d) || ((r.size = d), this.updateNodeProp(e, 'size'))
              : s[a] !== d && ((r[a] = d), this.updateNodeProp(e, a));
        }),
        Object.keys(r).length > 0 && this.nodesMap.set(e, h(h({}, s), r)));
    };
    updateNodeProp = (e, t) => {
      (this.updatedPropsToNodeIds.has(t) ||
        this.updatedPropsToNodeIds.set(t, new Set([])),
        this.updatedPropsToNodeIds.get(t).add(e),
        this.updatedNodeIdsToProps.has(e) ||
          this.updatedNodeIdsToProps.set(e, new Set([])),
        this.updatedNodeIdsToProps.get(e).add(t));
    };
    updateEdge = (i) => {
      var o = i,
        { id: e } = o,
        t = bn(o, ['id']);
      let r = {},
        s = this.edgesMap.get(e);
      s &&
        (Object.entries(t).forEach(([a, d]) => {
          a === 'targetPosition'
            ? Ue(s.targetPosition, d) ||
              ((r.targetPosition = d), this.updateEdgeProp(e, 'targetPosition'))
            : a === 'sourcePosition'
              ? Ue(s.sourcePosition, d) ||
                ((r.sourcePosition = d),
                this.updateEdgeProp(e, 'sourcePosition'))
              : s[a] !== d && ((r[a] = d), this.updateEdgeProp(e, a));
        }),
        Object.keys(r).length > 0 && this.edgesMap.set(e, h(h({}, s), r)));
    };
    updateEdgeProp = (e, t) => {
      (this.updatedPropsToEdgeIds.has(t) ||
        this.updatedPropsToEdgeIds.set(t, new Set([])),
        this.updatedPropsToEdgeIds.get(t).add(e),
        this.updatedEdgeIdsToProps.has(e) ||
          this.updatedEdgeIdsToProps.set(e, new Set([])),
        this.updatedEdgeIdsToProps.get(e).add(t));
    };
  },
  LS = (n, e) => {
    if (!n.source && !n.target && n.sourcePosition && n.targetPosition)
      return {
        sourceSide: Xm(n.sourcePosition, n.targetPosition),
        targetSide: Xm(n.targetPosition, n.sourcePosition),
      };
    if (!n.target && n.targetPosition) {
      let t = e.get(n.source);
      return { targetSide: Km(t, n.sourcePort, n.targetPosition) };
    }
    if (!n.source && n.sourcePosition) {
      let t = e.get(n.target);
      return { sourceSide: Km(t, n.targetPort, n.sourcePosition) };
    }
    return {};
  },
  BS = (n, e) => {
    let t = LS(n, e),
      i = t.sourceSide ?? 'right',
      o = t.targetSide ?? 'left',
      r = e.get(n.source),
      s = e.get(n.target),
      a = ry(r, n.sourcePort, n.sourcePosition),
      d = ry(s, n.targetPort, n.targetPosition),
      c = sy(e, n.source, i, n.sourcePort, n.sourcePosition, d),
      l = sy(e, n.target, o, n.targetPort, n.targetPosition, a);
    return { source: oy(c) ? c : void 0, target: oy(l) ? l : void 0 };
  },
  oy = (n) => !!n && n.x !== void 0 && n.y !== void 0 && !!n.side,
  ry = (n, e, t) => {
    if (!n) return t || { x: 0, y: 0 };
    if (e) {
      let i = xy(n, e);
      if (i) return { x: i.x, y: i.y };
    }
    return {
      x: n.position.x + (n.size?.width || 0) / 2,
      y: n.position.y + (n.size?.height || 0) / 2,
    };
  },
  HS = (n, e, t, i, o) =>
    n
      ? t
        ? xy(n, t) || y(h({}, i), { side: e })
        : wM(n, o || i || { x: 0, y: 0 })
      : y(h({}, i), { side: e }),
  sy = (n, e, t, i, o, r) => {
    let s = n.get(e);
    return s ? HS(s, t, i, o, r) : y(h({}, o), { side: t });
  },
  zS = (
    n,
    e,
    t,
    i,
    o,
  ) => `[ngDiagram] Invalid edge coordinates detected for edge '${n}'.

Edge details:
  \u2022 source: ${e} (port: ${t || 'not specified'})
  \u2022 target: ${i} (port: ${o || 'not specified'})

Documentation: https://www.ngdiagram.dev/docs/guides/edges/edges/
`,
  VS = (
    n,
  ) => `[ngDiagram] Edge routing '${n}' is not registered. Falling back to default routing.

Documentation: https://www.ngdiagram.dev/docs/guides/edges/routing/
`,
  jS = (n, e, t) => {
    if (n.sourcePort) {
      let i = e?.measuredPorts;
      if (!i) return !1;
      let o = i.find((r) => r.id === n.sourcePort);
      if (!o || !o.position || !o.size) return !1;
    }
    if (n.targetPort) {
      let i = t?.measuredPorts;
      if (!i) return !1;
      let o = i.find((r) => r.id === n.targetPort);
      if (!o || !o.position || !o.size) return !1;
    }
    return !0;
  },
  US = (n) => n.routingMode === 'manual' && !!n.points && n.points.length > 0,
  ws = (n) =>
    n?.x !== void 0 && n?.y !== void 0 ? { x: n.x, y: n.y } : void 0,
  ay = (n, e) => (n && e ? n.measuredPorts?.find((t) => t.id === e) : void 0),
  $S = (n, e, t, i, o, r) => {
    let s = {
      sourcePoint: e,
      targetPoint: t,
      edge: n,
      sourceNode: i,
      targetNode: o,
      sourcePort: ay(i, n.sourcePort),
      targetPort: ay(o, n.targetPort),
    };
    if (n.routing && r.hasRouting(n.routing))
      return r.computePoints(n.routing, s);
    n.routing && !r.hasRouting(n.routing) && console.warn(VS(n.routing));
    let a = r.getDefaultRouting();
    return r.hasRouting(a)
      ? r.computePoints(a, s)
      : [ws(e), ws(t)].filter((d) => !!d);
  },
  Ky = (n, e, t) => {
    let i = e.get(n.source),
      o = e.get(n.target);
    if (!US(n) && !jS(n, i, o))
      return { sourcePoint: void 0, targetPoint: void 0, points: [] };
    let { source: r, target: s } = BS(n, e),
      a = ws(r),
      d = ws(s);
    return r && s && xe(a) && xe(d)
      ? {
          sourcePoint: a,
          targetPoint: d,
          points:
            n.routingMode === 'manual' && n.points && n.points.length > 0
              ? n.points
              : $S(n, r, s, i, o, t),
        }
      : (console.error(
          zS(n.id, n.source, n.sourcePort, n.target, n.targetPort),
        ),
        { sourcePoint: void 0, targetPoint: void 0, points: [] });
  },
  GS = ({ helpers: n, modelActionTypes: e, actionStateManager: t }) =>
    !e.includes('zoom') &&
    (!e.includes('resizeNode') || !t.isResizing()) &&
    (e.includes('init') ||
      n.anyEdgesAdded() ||
      n.checkIfAnyNodePropsChanged([
        'position',
        'size',
        'angle',
        'measuredPorts',
      ]) ||
      n.checkIfAnyEdgePropsChanged([
        'targetPosition',
        'sourcePosition',
        'points',
        'sourcePort',
        'targetPort',
        'source',
        'target',
        'routing',
        'routingMode',
        'measuredLabels',
        'computedHidden',
      ])),
  WS = (n, e, t) =>
    !n.computedHidden &&
    (e.checkIfEdgeAdded(n.id) ||
      e.checkIfEdgeChanged(n.id) ||
      e.checkIfNodeChanged(n.source) ||
      e.checkIfNodeChanged(n.target) ||
      t.includes('init')),
  qS = (n, e) => !n || n.length !== e.length || !n.every((t, i) => Ue(t, e[i])),
  Vf = (n, e, t) =>
    e.length < 2
      ? n.measuredLabels
      : n.measuredLabels?.map((i) =>
          y(h({}, i), { position: by(i.positionOnEdge, n.routing, e, t) }),
        ),
  ZS = (n, e, t, i, o) => {
    let r = Vf(n, i, o);
    return r?.length || e || t
      ? { id: n.id, sourcePosition: e, targetPosition: t, measuredLabels: r }
      : null;
  },
  YS = (n, e, t, i, o) => {
    let r = qS(n.points, i),
      s = n.measuredLabels?.some((d) => !xe(d.position));
    if (!r && !s) return null;
    let a = Vf(n, i, o);
    return y(h({ id: n.id }, r ? { points: i } : {}), {
      sourcePosition: e,
      targetPosition: t,
      measuredLabels: a,
    });
  },
  QS = (n, e, t, i, o) => {
    let r = [];
    return (
      n.forEach((s) => {
        if (!WS(s, i, o)) return;
        let { sourcePoint: a, targetPoint: d, points: c } = Ky(s, e, t);
        if (!c || c.length === 0) return;
        let l =
          s.routingMode === 'manual' ? ZS(s, a, d, c, t) : YS(s, a, d, c, t);
        l && r.push(l);
      }),
      r
    );
  },
  KS = (n, e, t, i) => {
    let { sourcePoint: o, targetPoint: r, points: s } = Ky(n, e, t);
    return y(h({}, n), {
      points: s,
      sourcePosition: o,
      targetPosition: r,
      measuredLabels: Vf(n, s ?? [], t),
      computedZIndex: i,
    });
  },
  XS = {
    name: 'edges-routing',
    execute: (n, e) => {
      let {
          state: { edges: t },
          nodesMap: i,
          edgeRoutingManager: o,
          actionStateManager: r,
          helpers: s,
          modelActionTypes: a,
          config: { zIndex: d },
        } = n,
        c = d.temporaryEdgeZIndex || d.selectedZIndex,
        l = GS(n),
        u = r.linking?.temporaryEdge;
      if (!l && !u) return void e();
      let f = l ? QS(t, i, o, s, a) : [],
        g = r.linking?.relink?.end === 'source' ? u?.target : u?.source,
        p = !!g && i.get(g)?.computedHidden,
        v = u && !p ? KS(u, i, o, c) : void 0;
      (v &&
        r.linking &&
        (r.linking = y(h({}, r.linking), { temporaryEdge: v })),
        e(h({}, f.length > 0 ? { edgesToUpdate: f } : {})));
    },
  },
  Sl = class {
    name = 'ClipboardPastedEmitter';
    emit(e, t) {
      if (
        !e.modelActionTypes.includes('paste') ||
        !e.actionStateManager.getState().copyPaste
      )
        return;
      let {
          initialNodesMap: i,
          initialEdgesMap: o,
          nodesMap: r,
          edgesMap: s,
        } = e,
        a = [];
      for (let [c, l] of r) i.has(c) || a.push(l);
      let d = [];
      for (let [c, l] of s) o.has(c) || d.push(l);
      (a.length > 0 || d.length > 0) &&
        t.deferredEmit('clipboardPasted', { nodes: a, edges: d });
    }
  },
  Tl = class {
    templateVisibilityRegistry;
    name = 'DiagramInitEmitter';
    constructor(e) {
      this.templateVisibilityRegistry = e;
    }
    unmeasuredNodes = new Set();
    unmeasuredNodePorts = new Set();
    unmeasuredEdgeLabels = new Set();
    initialized = !1;
    initEventEmitted = !1;
    safetyHatchTimeoutId = null;
    SAFETY_HATCH_TIMEOUT_MS = 2e3;
    emit(e, t) {
      let { modelActionTypes: i } = e;
      i.includes('init')
        ? this.handleInit(e, t)
        : (i.includes('updateNode') || i.includes('updateEdge')) &&
          this.handleUpdate(e, t);
    }
    handleInit(e, t) {
      this.initialized = !0;
      let { nodesMap: i, edgesMap: o, initialUpdate: r } = e;
      (this.collectUnmeasuredItems(
        i,
        o,
        r.renderedNodeIds ?? Array.from(i.keys()),
        r.renderedEdgeIds ?? Array.from(o.keys()),
      ),
        this.areAllMeasured()
          ? this.emitInitEvent(e, t)
          : this.restartSafetyHatchTimeout(e, t));
    }
    handleUpdate(e, t) {
      if (!this.initialized || this.initEventEmitted) return;
      let {
          modelActionTypes: i,
          initialUpdate: o,
          nodesMap: r,
          edgesMap: s,
        } = e,
        a = this.countUnmeasuredItems();
      (i.includes('updateNode') && this.processNodeUpdates(o, r),
        i.includes('updateEdge') && this.processEdgeUpdates(o, s),
        this.countUnmeasuredItems() < a && this.restartSafetyHatchTimeout(e, t),
        this.areAllMeasured() && this.emitInitEvent(e, t));
    }
    collectUnmeasuredItems(e, t, i, o) {
      (this.unmeasuredNodes.clear(),
        this.unmeasuredNodePorts.clear(),
        this.unmeasuredEdgeLabels.clear());
      for (let r of i) {
        let s = e.get(r);
        if (s && !s.computedHidden) {
          le(s.size) || this.unmeasuredNodes.add(r);
          for (let a of s.measuredPorts ?? [])
            this.templateVisibilityRegistry?.isPortHidden(r, a.id) ||
              (le(a.size) && xe(a.position)) ||
              this.unmeasuredNodePorts.add(`${r}:${a.id}`);
        }
      }
      for (let r of o) {
        let s = t.get(r);
        if (s && !s.computedHidden)
          for (let a of s.measuredLabels ?? [])
            this.templateVisibilityRegistry?.isLabelHidden(r, a.id) ||
              (le(a.size) && xe(a.position)) ||
              this.unmeasuredEdgeLabels.add(`${r}:${a.id}`);
      }
    }
    processNodeUpdates(e, t) {
      if (e?.nodesToUpdate?.length) {
        for (let i of e.nodesToUpdate)
          if (
            t.has(i.id) &&
            (this.unmeasuredNodes.has(i.id) &&
              le(i.size) &&
              this.unmeasuredNodes.delete(i.id),
            i.measuredPorts)
          )
            for (let o of i.measuredPorts) {
              let r = `${i.id}:${o.id}`;
              this.unmeasuredNodePorts.has(r) &&
                le(o.size) &&
                xe(o.position) &&
                this.unmeasuredNodePorts.delete(r);
            }
      }
    }
    processEdgeUpdates(e, t) {
      if (e?.edgesToUpdate?.length) {
        for (let i of e.edgesToUpdate)
          if (t.has(i.id) && i.measuredLabels)
            for (let o of i.measuredLabels) {
              let r = `${i.id}:${o.id}`;
              this.unmeasuredEdgeLabels.has(r) &&
                le(o.size) &&
                xe(o.position) &&
                this.unmeasuredEdgeLabels.delete(r);
            }
      }
    }
    areAllMeasured() {
      return (
        this.unmeasuredNodes.size === 0 &&
        this.unmeasuredNodePorts.size === 0 &&
        this.unmeasuredEdgeLabels.size === 0
      );
    }
    emitInitEvent(e, t, i = !0) {
      this.clearSafetyHatchTimeout();
      let { nodesMap: o, edgesMap: r, initialUpdate: s } = e,
        a = new Set(s.renderedNodeIds ?? o.keys()),
        d = new Set(s.renderedEdgeIds ?? r.keys()),
        c = {
          nodes: Array.from(o.values()).filter((l) => a.has(l.id)),
          edges: Array.from(r.values()).filter((l) => d.has(l.id)),
          viewport: e.state.metadata.viewport,
        };
      (i ? t.deferredEmit('diagramInit', c) : t.emit('diagramInit', c),
        (this.initEventEmitted = !0));
    }
    restartSafetyHatchTimeout(e, t) {
      (this.clearSafetyHatchTimeout(),
        (this.safetyHatchTimeoutId = setTimeout(() => {
          this.initEventEmitted || this.emitInitEventWithWarning(e, t);
        }, this.SAFETY_HATCH_TIMEOUT_MS)));
    }
    clearSafetyHatchTimeout() {
      this.safetyHatchTimeoutId !== null &&
        (clearTimeout(this.safetyHatchTimeoutId),
        (this.safetyHatchTimeoutId = null));
    }
    emitInitEventWithWarning(e, t) {
      let i = {
          nodes: Array.from(this.unmeasuredNodes),
          nodePorts: Array.from(this.unmeasuredNodePorts),
          edgeLabels: Array.from(this.unmeasuredEdgeLabels),
        },
        o = this.countUnmeasuredItems();
      (console.warn(
        '[DiagramInitEmitter] Measurement timeout reached from last measurement. Emitting diagramInit event anyway. Ensure the model provided to ng-diagram was created with initializeModel() or initializeModelAdapter() (for custom ModelAdapter). To intentionally hide elements, use the `hidden` flag on nodes/edges or the `hidden` input on ports and edge labels \u2014 hidden elements create no measurement expectations.',
      ),
        console.warn(`Total unmeasured elements: ${o}`),
        i.nodes.length > 0 &&
          console.warn(`Unmeasured nodes (${i.nodes.length}):`, i.nodes),
        i.nodePorts.length > 0 &&
          console.warn(
            `Unmeasured node ports (${i.nodePorts.length}):`,
            i.nodePorts,
          ),
        i.edgeLabels.length > 0 &&
          console.warn(
            `Unmeasured edge labels (${i.edgeLabels.length}):`,
            i.edgeLabels,
          ),
        this.emitInitEvent(e, t, !1));
    }
    countUnmeasuredItems() {
      return (
        this.unmeasuredNodes.size +
        this.unmeasuredEdgeLabels.size +
        this.unmeasuredNodePorts.size
      );
    }
  },
  _l = class {
    name = 'EdgeDrawEndedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('finishLinking')) return;
      let i = e.actionStateManager.linking;
      if (!i || i.relink) return;
      let o = i.sourceNodeId ? e.nodesMap.get(i.sourceNodeId) : void 0;
      if (i.sourceNodeId && !o) return;
      let r = i.dropPosition ?? { x: 0, y: 0 };
      if (e.helpers.anyEdgesAdded()) {
        for (let [s, a] of e.edgesMap)
          if (!e.initialEdgesMap.has(s)) {
            let d = a.target ? e.nodesMap.get(a.target) : void 0;
            t.deferredEmit('edgeDrawEnded', {
              source: o,
              sourcePort: a.sourcePort,
              dropPosition: r,
              success: !0,
              edge: a,
              target: d,
              targetPort: a.targetPort,
            });
            break;
          }
      } else
        t.deferredEmit('edgeDrawEnded', {
          source: o,
          sourcePort: i.sourcePortId || void 0,
          dropPosition: r,
          success: !1,
          reason: i.cancelReason,
        });
    }
  },
  Nl = class {
    name = 'EdgeDrawnEmitter';
    emit(e, t) {
      if (
        !e.modelActionTypes.includes('finishLinking') ||
        !e.helpers.anyEdgesAdded()
      )
        return;
      let { initialEdgesMap: i, edgesMap: o, nodesMap: r } = e;
      this.emitNewEdges(i, o, r, t);
    }
    emitNewEdges(e, t, i, o) {
      for (let [r, s] of t)
        if (!e.has(r)) {
          let a = i.get(s.source),
            d = i.get(s.target);
          a &&
            d &&
            o.deferredEmit('edgeDrawn', {
              edge: s,
              source: a,
              target: d,
              sourcePort: s.sourcePort,
              targetPort: s.targetPort,
            });
        }
    }
  },
  xl = class {
    name = 'EdgeRelinkStartedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('startRelinking')) return;
      let i = e.actionStateManager.linking?.relink;
      i &&
        t.deferredEmit('edgeRelinkStarted', {
          edge: i.originalEdge,
          end: i.end,
        });
    }
  },
  Pl = class {
    name = 'EdgeRelinkEndedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('finishRelinking')) return;
      let i = e.actionStateManager.linking,
        o = i?.relink;
      if (!i || !o) return;
      let { originalEdge: r, end: s } = o,
        a = !i.relinkCancelReason,
        d = e.edgesMap.get(o.edgeId),
        c = a ? (d ?? r) : r,
        l = s === 'source' ? r.source : r.target,
        u = s === 'source' ? r.sourcePort : r.targetPort,
        f = s === 'source' ? r.sourcePosition : r.targetPosition,
        g = a ? (s === 'source' ? c.source : c.target) : '',
        p = {
          edge: c,
          end: s,
          previousNode: l ? e.nodesMap.get(l) : void 0,
          previousPort: u || void 0,
          previousPosition: l ? void 0 : f,
          dropPosition: i.dropPosition ?? { x: 0, y: 0 },
          success: a,
          target: g ? e.nodesMap.get(g) : void 0,
          targetPort:
            (a && (s === 'source' ? c.sourcePort : c.targetPort)) || void 0,
          reason: i.relinkCancelReason,
        };
      t.deferredEmit('edgeRelinkEnded', p);
    }
  };
function Xy(n, e) {
  let t = [];
  for (let i of n) {
    let o = e.get(i);
    o && t.push(o);
  }
  return t;
}
var Rl = class {
    name = 'NodeDragStartedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('moveNodesStart')) return;
      let i =
        e.initialUpdate.gestureNodeIds ??
        e.actionStateManager.dragging?.nodeIds;
      if (!i || i.length === 0) return;
      let o = Xy(i, e.nodesMap);
      o.length !== 0 && t.deferredEmit('nodeDragStarted', { nodes: o });
    }
  },
  kl = class {
    name = 'NodeDragEndedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('moveNodesStop')) return;
      let i = e.actionStateManager.dragging,
        o = e.initialUpdate.gestureNodeIds ?? i?.nodeIds;
      if (!o || o.length === 0) return;
      let r = Xy(o, e.nodesMap);
      r.length !== 0 &&
        t.deferredEmit(
          'nodeDragEnded',
          h({ nodes: r }, i?.cancelReason && { cancelReason: i.cancelReason }),
        );
    }
  },
  Al = class {
    name = 'NodeResizeStartedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('resizeNodeStart')) return;
      let i =
        e.initialUpdate.gestureNodeIds?.[0] ??
        e.actionStateManager.resize?.resizingNode.id;
      if (!i) return;
      let o = e.nodesMap.get(i);
      o && t.deferredEmit('nodeResizeStarted', { node: o });
    }
  },
  Ol = class {
    name = 'NodeResizeEndedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('resizeNodeStop')) return;
      let i = e.actionStateManager.resize,
        o = e.initialUpdate.gestureNodeIds?.[0] ?? i?.resizingNode.id;
      if (!o) return;
      let r = e.nodesMap.get(o);
      r &&
        t.deferredEmit(
          'nodeResizeEnded',
          h({ node: r }, i?.cancelReason && { cancelReason: i.cancelReason }),
        );
    }
  },
  Fl = class {
    name = 'NodeRotateStartedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('rotateNodeStart')) return;
      let i =
        e.initialUpdate.gestureNodeIds?.[0] ??
        e.actionStateManager.rotation?.nodeId;
      if (!i) return;
      let o = e.nodesMap.get(i);
      o && t.deferredEmit('nodeRotateStarted', { node: o });
    }
  },
  Ll = class {
    name = 'NodeRotateEndedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('rotateNodeStop')) return;
      let i = e.actionStateManager.rotation,
        o = e.initialUpdate.gestureNodeIds?.[0] ?? i?.nodeId;
      if (!o) return;
      let r = e.nodesMap.get(o);
      r &&
        t.deferredEmit(
          'nodeRotateEnded',
          h({ node: r }, i?.cancelReason && { cancelReason: i.cancelReason }),
        );
    }
  },
  Bl = class {
    name = 'PaletteItemDroppedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('paletteDropNode')) return;
      let i = e.initialUpdate.nodesToAdd?.[0];
      if (!i) return;
      let o = i.id,
        r = e.initialNodesMap.get(o),
        s = e.nodesMap.get(o);
      !r &&
        s &&
        t.deferredEmit('paletteItemDropped', {
          node: s,
          dropPosition: s.position,
        });
    }
  },
  Hl = class {
    name = 'SelectionChangedEmitter';
    emit(e, t) {
      if (!(
        e.modelActionTypes.includes('changeSelection') ||
        e.helpers.checkIfAnyNodePropsChanged(['selected']) ||
        e.helpers.checkIfAnyEdgePropsChanged(['selected']) ||
        e.helpers.anyNodesAdded() ||
        e.helpers.anyEdgesAdded() ||
        e.helpers.anyNodesRemoved() ||
        e.helpers.anyEdgesRemoved()
      ))
        return;
      let {
          initialNodesMap: i,
          initialEdgesMap: o,
          nodesMap: r,
          edgesMap: s,
        } = e,
        a = this.collectSelectedNodes(i),
        d = this.collectSelectedNodes(r),
        c = this.collectSelectedEdges(o),
        l = this.collectSelectedEdges(s),
        u = !this.areSelectionsEqual(
          a.map((g) => g.id),
          d.map((g) => g.id),
        ),
        f = !this.areSelectionsEqual(
          c.map((g) => g.id),
          l.map((g) => g.id),
        );
      (u || f) &&
        t.deferredEmit('selectionChanged', {
          selectedNodes: d,
          selectedEdges: l,
          previousNodes: a,
          previousEdges: c,
        });
    }
    collectSelectedNodes(e) {
      let t = [];
      for (let [, i] of e) i.selected && t.push(i);
      return t;
    }
    collectSelectedEdges(e) {
      let t = [];
      for (let [, i] of e) i.selected && t.push(i);
      return t;
    }
    areSelectionsEqual(e, t) {
      if (e.length !== t.length) return !1;
      let i = new Set(e),
        o = new Set(t);
      return i.size === o.size && [...i].every((r) => o.has(r));
    }
  },
  zl = class {
    name = 'SelectionGestureEndedEmitter';
    emit(e, t) {
      if (
        !e.modelActionTypes.includes('selectEnd') ||
        !e.actionStateManager.selection?.selectionChanged
      )
        return;
      e.actionStateManager.clearSelection();
      let i = [];
      for (let r of e.nodesMap.values()) r.selected && i.push(r);
      let o = [];
      for (let r of e.edgesMap.values()) r.selected && o.push(r);
      t.deferredEmit('selectionGestureEnded', { nodes: i, edges: o });
    }
  },
  Vl = class {
    name = 'GroupMembershipChangedEmitter';
    emit(e, t) {
      if (
        !e.modelActionTypes.includes('updateNodes') ||
        !e.helpers.checkIfAnyNodePropsChanged(['groupId'])
      )
        return;
      let { initialNodesMap: i, nodesMap: o } = e,
        r = e.helpers.getAffectedNodeIds(['groupId']),
        s = new Map(),
        a = [];
      for (let c of r) {
        let l = i.get(c),
          u = o.get(c);
        if (!l || !u) continue;
        let f = l.groupId,
          g = u.groupId;
        g != null
          ? (s.has(g) || s.set(g, []), s.get(g).push(u))
          : f != null && a.push(u);
      }
      let d = [];
      for (let [c, l] of s) {
        let u = o.get(c);
        u && u.isGroup && d.push({ nodes: l, targetGroup: u });
      }
      (d.length > 0 || a.length > 0) &&
        t.deferredEmit('groupMembershipChanged', { grouped: d, ungrouped: a });
    }
  },
  jl = class {
    name = 'SelectionMovedEmitter';
    moveActions = ['moveNodes', 'moveNodesBy'];
    emit(e, t) {
      if (!this.moveActions.some((c) => e.modelActionTypes.includes(c))) return;
      let { initialNodesMap: i, nodesMap: o, initialUpdate: r, history: s } = e,
        a = this.collectUpdatedNodeIds(r, s);
      if (a.size === 0) return;
      let d = this.getMovedNodes(a, i, o);
      d && d.length !== 0 && t.deferredEmit('selectionMoved', { nodes: d });
    }
    collectUpdatedNodeIds(e, t) {
      let i = new Set();
      if (e?.nodesToUpdate) for (let o of e.nodesToUpdate) i.add(o.id);
      for (let o of t)
        if (o.stateUpdate?.nodesToUpdate)
          for (let r of o.stateUpdate.nodesToUpdate) i.add(r.id);
      return i;
    }
    getMovedNodes(e, t, i) {
      let o = [];
      for (let r of e) {
        let s = i.get(r);
        if (!s) continue;
        let a = t.get(r);
        s.position &&
          a?.position &&
          ((s.position.x === a.position.x && s.position.y === a.position.y) ||
            o.push(s));
      }
      return o.length > 0 ? o : null;
    }
  },
  Ul = class {
    name = 'SelectionRemovedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('deleteSelection')) return;
      let {
          initialNodesMap: i,
          initialEdgesMap: o,
          nodesMap: r,
          edgesMap: s,
        } = e,
        a = [];
      for (let [l, u] of i) r.has(l) || a.push(u);
      let d = [];
      for (let [l, u] of o) s.has(l) || d.push(u);
      let c = [];
      for (let l of e.initialUpdate.edgesToUpdate ?? []) {
        let u = s.get(l.id);
        u && ('source' in l || 'target' in l) && c.push(u);
      }
      (a.length > 0 || d.length > 0 || c.length > 0) &&
        t.deferredEmit('selectionRemoved', {
          deletedNodes: a,
          deletedEdges: d,
          detachedEdges: c,
        });
    }
  },
  $l = class {
    name = 'SelectionRotatedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('rotateNodeTo')) return;
      let { initialNodesMap: i, nodesMap: o } = e,
        r = e.initialUpdate.nodesToUpdate?.[0];
      if (!r) return;
      let s = r.id,
        a = i.get(s),
        d = o.get(s);
      if (!a || !d) return;
      let c = a.angle ?? 0,
        l = d.angle ?? 0;
      c !== l &&
        t.deferredEmit('selectionRotated', {
          node: d,
          angle: l,
          previousAngle: c,
        });
    }
  },
  Gl = class {
    name = 'NodeResizedEmitter';
    emit(e, t) {
      if (!e.modelActionTypes.includes('resizeNode')) return;
      let i = e.initialUpdate.nodesToUpdate?.[0];
      if (!i) return;
      let o = i.id,
        r = e.initialNodesMap.get(o),
        s = e.nodesMap.get(o);
      if (!r || !s) return;
      let a = r.size,
        d = s.size;
      a &&
        d &&
        (d.width !== a.width || d.height !== a.height) &&
        t.deferredEmit('nodeResized', {
          node: s,
          previousSize: { width: a.width, height: a.height },
        });
    }
  },
  Wl = class {
    name = 'ViewportChangedEmitter';
    emit({ initialState: e, state: t }, i) {
      let o = e.metadata.viewport,
        r = t.metadata.viewport;
      (o.x === r.x &&
        o.y === r.y &&
        o.scale === r.scale &&
        o.width === r.width &&
        o.height === r.height) ||
        i.deferredEmit('viewportChanged', { viewport: r, previousViewport: o });
    }
  },
  JS = (n, e, t) => `[ngDiagram] Event emitter error: ${n} failed.

Action types: ${e.join(', ')}
Error: ${t instanceof Error ? t.message : String(t)}

This may indicate an issue with event handling logic.
The diagram will continue to function, but some events may not be emitted.
`,
  eT = (n, e) => {
    let t = [
      new Tl(e),
      new Hl(),
      new zl(),
      new jl(),
      new Ul(),
      new Vl(),
      new $l(),
      new Wl(),
      new Nl(),
      new _l(),
      new xl(),
      new Pl(),
      new Sl(),
      new Gl(),
      new Bl(),
      new Al(),
      new Ol(),
      new Fl(),
      new Ll(),
      new Rl(),
      new kl(),
    ];
    return {
      name: '__internal_event_emitter',
      execute: (i, o) => {
        if ((o(), n.isEnabled()))
          for (let r of t)
            try {
              r.emit(i, n);
            } catch (s) {
              console.error(JS(r.name, i.modelActionTypes, s));
            }
      },
    };
  },
  tT = ['hidden', 'groupId'],
  nT = ['hidden', 'source', 'target'],
  dy = (
    n,
    { name: e, cleanupRemovedEntries: t = !1, visibilityGeneration: i },
  ) => ({
    name: e,
    execute: (o, r) => {
      let { state: s, modelActionTypes: a, helpers: d } = o;
      if (t) {
        if (d.anyNodesRemoved())
          for (let D of d.getRemovedNodes()) n.removeNodeEntries(D.id);
        if (d.anyEdgesRemoved())
          for (let D of d.getRemovedEdges()) n.removeEdgeEntries(D.id);
      }
      if (!(
        a.includes('init') ||
        a.includes('templateVisibilityChange') ||
        d.anyNodesAdded() ||
        d.anyNodesRemoved() ||
        d.anyEdgesAdded() ||
        d.checkIfAnyNodePropsChanged(tT) ||
        d.checkIfAnyEdgePropsChanged(nT)
      ))
        return void r();
      let c = ms(s.nodes, n),
        l = new Set(d.getAddedNodes().map((D) => D.id)),
        u = new Set(d.getAddedEdges().map((D) => D.id)),
        f = [],
        g = [];
      for (let D of s.nodes) {
        let C = c.has(D.id);
        C !== (D.computedHidden ?? !1) &&
          (l.has(D.id)
            ? f.push(y(h({}, D), { computedHidden: C }))
            : g.push({ id: D.id, computedHidden: C }));
      }
      let p = [],
        v = [];
      for (let D of s.edges) {
        let C = ys(D, c, n);
        C !== (D.computedHidden ?? !1) &&
          (u.has(D.id)
            ? p.push(y(h({}, D), { computedHidden: C }))
            : v.push({ id: D.id, computedHidden: C }));
      }
      ((f.length || g.length || p.length || v.length) && i?.bump(),
        r(
          h(
            h(
              h(
                h({}, f.length ? { nodesToAdd: f } : {}),
                g.length ? { nodesToUpdate: g } : {},
              ),
              p.length ? { edgesToAdd: p } : {},
            ),
            v.length ? { edgesToUpdate: v } : {},
          ),
        ));
    },
  });
function Ds(n, e) {
  return y(h({}, n), { _internalId: `${n.id}-${e()}` });
}
var iT = {
    name: 'internal-id-assignment',
    execute: async (n, e) => {
      let { helpers: t, environment: i } = n;
      if (!t.anyNodesAdded() && !t.anyEdgesAdded()) return void e();
      let o = t
          .getAddedNodes()
          .map((s) => Ds({ id: s.id }, () => i.generateId())),
        r = t
          .getAddedEdges()
          .map((s) => Ds({ id: s.id }, () => i.generateId()));
      e(
        h(
          h({}, o.length ? { nodesToUpdate: o } : {}),
          r.length ? { edgesToUpdate: r } : {},
        ),
      );
    },
  },
  gs = {
    name: 'logger',
    execute: (n, e) => {
      (n.config.debugMode &&
        console.log(`[ngDiagram] ${n.modelActionTypes.join(', ')}`, {
          initialState: n.initialState,
          finalState: n.state,
          history: n.history,
          initialUpdate: n.initialUpdate,
        }),
        e());
    },
  },
  rl = (n, e) => {
    if (!le(n.size) || !xe(n.position)) return !1;
    if (n.measuredPorts) {
      for (let t of n.measuredPorts)
        if (!(e?.isPortHidden(n.id, t.id) || (le(t.size) && xe(t.position))))
          return !1;
    }
    return !0;
  },
  oT = (n) => ({
    name: 'measured-bounds',
    execute: (e, t) => {
      let { nodesMap: i, modelActionTypes: o, helpers: r } = e;
      if (o.includes('init')) {
        let d = [];
        return (
          i.forEach((c) => {
            rl(c, n) && d.push({ id: c.id, measuredBounds: Cn(c, n) });
          }),
          void t(h({}, d.length ? { nodesToUpdate: d } : {}))
        );
      }
      if (
        !r.anyNodesAdded() &&
        !r.checkIfAnyNodePropsChanged([
          'position',
          'size',
          'angle',
          'measuredPorts',
        ])
      )
        return void t();
      let s = [],
        a = [];
      if (r.anyNodesAdded()) {
        let d = r.getAddedNodes();
        for (let c of d)
          rl(c, n) && s.push(y(h({}, c), { measuredBounds: Cn(c, n) }));
      }
      if (
        r.checkIfAnyNodePropsChanged([
          'position',
          'size',
          'angle',
          'measuredPorts',
        ])
      ) {
        let d = r.getAffectedNodeIds([
          'position',
          'size',
          'angle',
          'measuredPorts',
        ]);
        for (let c of d) {
          let l = i.get(c);
          l && rl(l, n) && a.push({ id: l.id, measuredBounds: Cn(l, n) });
        }
      }
      t(
        h(
          h({}, s.length ? { nodesToAdd: s } : {}),
          a.length ? { nodesToUpdate: a } : {},
        ),
      );
    },
  }),
  rT = (n) => ({
    name: 'measurement-tracking',
    execute: (e, t) => {
      let i = n.isTrackingRequested(),
        o = n.hasPendingMeasurements();
      if (!i && !o) return void t();
      let { helpers: r, nodesMap: s, edgesMap: a } = e,
        d = (l) => s.get(l)?.computedHidden === !0,
        c = (l) => a.get(l)?.computedHidden === !0;
      if (i) {
        let l = [],
          u = [];
        if (r.anyNodesAdded())
          for (let f of r.getAddedNodes())
            (f.computedHidden ? u : l).push(`node:${f.id}`);
        if (r.anyEdgesAdded())
          for (let f of r.getAddedEdges())
            (f.computedHidden ? u : l).push(`edge:${f.id}`);
        for (let f of r.getChangedNodeIds()) (d(f) ? u : l).push(`node:${f}`);
        for (let f of r.getChangedEdgeIds()) (c(f) ? u : l).push(`edge:${f}`);
        (n.registerParticipants(l), n.unregisterParticipants(u));
      } else {
        let l = [
          ...r
            .getAffectedNodeIds(['computedHidden'])
            .filter(d)
            .map((u) => `node:${u}`),
          ...r
            .getAffectedEdgeIds(['computedHidden'])
            .filter(c)
            .map((u) => `edge:${u}`),
        ];
        if (
          (n.unregisterParticipants(l),
          r.checkIfAnyNodePropsChanged([
            'size',
            'position',
            'measuredPorts',
            'angle',
          ]))
        )
          for (let u of r.getAffectedNodeIds([
            'size',
            'position',
            'measuredPorts',
            'angle',
          ]))
            n.signalMeasurement(`node:${u}`);
        if (r.checkIfAnyEdgePropsChanged(['points', 'measuredLabels']))
          for (let u of r.getAffectedEdgeIds(['points', 'measuredLabels']))
            n.signalMeasurement(`edge:${u}`);
      }
      t();
    },
  });
function sT(n, e, t, i = !1) {
  let o = e.get(n.source) ?? t.get(n.source)?.computedZIndex ?? 0,
    r = e.get(n.target) ?? t.get(n.target)?.computedZIndex ?? 0,
    s = Math.max(o, r),
    a = n.zOrder ?? (i ? s + 1 : s);
  return y(h({}, n), { computedZIndex: a });
}
var aT = (n) => n.includes('init'),
  dT = (n) => n.includes('finishLinking') || n.includes('addEdges');
function cT(n, e) {
  let t = new Set();
  if (n.anyNodesAdded())
    for (let i of n.getAddedNodes()) e.has(i.id) && t.add(i.id);
  for (let i of ['selected', 'groupId', 'zOrder'])
    if (n.checkIfAnyNodePropsChanged([i]))
      for (let o of n.getAffectedNodeIds([i])) e.has(o) && t.add(o);
  return t;
}
function lT(n, e, t, i, o, r, s) {
  let a = new Set();
  if (i) for (let d of n.getAddedEdges()) a.add(d.id);
  if (o) for (let d of n.getAffectedEdgeIds(['selected'])) a.add(d);
  if (r) for (let d of n.getAffectedEdgeIds(['zOrder'])) a.add(d);
  if (s) for (let d of n.getAffectedEdgeIds(['source', 'target'])) a.add(d);
  if (e.size > 0)
    for (let d of e.keys()) for (let c of t.get(d) ?? []) a.add(c);
  return a;
}
function uT(n, e) {
  let t = new Set();
  for (let o of n) {
    let r = e.get(o);
    r &&
      (r.groupId != null
        ? n.has(r.groupId) || t.add(e.has(r.groupId) ? r.groupId : o)
        : t.add(o));
  }
  let i = [];
  for (let o of t) {
    let r = new Set(),
      s = e.get(o)?.groupId,
      a = !1;
    for (; s != null && !r.has(s);) {
      if (t.has(s)) {
        a = !0;
        break;
      }
      (r.add(s), (s = e.get(s)?.groupId));
    }
    if (!a) {
      let d = e.get(o);
      d && i.push(d);
    }
  }
  return i;
}
function fT(n, e, t) {
  if (!t.elevateOnSelection) return 0;
  let i = new Set(),
    o = 0,
    r = n;
  for (; r != null && !i.has(r.id);)
    (i.add(r.id),
      r.selected && (o += t.selectedZIndex),
      (r = r.groupId != null ? e.get(r.groupId) : void 0));
  return o;
}
function gT(n, e, t, i, o) {
  let r = new Map(),
    s = new Map();
  for (let a of n) {
    let d, c;
    if (e.has(a.id) || a.computedZIndex == null) d = 0;
    else {
      let f = fT(a, t, o);
      ((d = a.computedZIndex - f),
        (c = {
          initialCumulativeElevation: f - (a.selected ? o.selectedZIndex : 0),
          skipRoot: !0,
        }),
        s.set(a.id, f));
    }
    let { nodes: l, elevations: u } = Zy(a, i, d, o, c);
    for (let f of l) r.set(f.id, f);
    for (let [f, g] of u) s.set(f, g);
  }
  return { nodesWithZIndexMap: r, nodeElevationMap: s };
}
function hT(n, e) {
  let t = [];
  for (let i of n.values()) {
    let o = e.get(i.id);
    o &&
      i.computedZIndex !== o.computedZIndex &&
      t.push({ id: i.id, computedZIndex: i.computedZIndex });
  }
  return t;
}
function pT(n, e, t, i, o, r) {
  let s = [],
    a = new Map();
  for (let [d, c] of t) a.set(d, c.computedZIndex ?? 0);
  for (let d of n) {
    let c = e.get(d);
    if (!c) continue;
    let l = sT(c, a, i, o.edgesAboveConnectedNodes).computedZIndex ?? 0;
    if (o.elevateOnSelection) {
      if (c.zOrder != null) {
        let u = r.get(c.source) ?? 0,
          f = r.get(c.target) ?? 0;
        l += Math.max(u, f);
      }
      c.selected && (l += o.selectedZIndex);
    }
    l !== c.computedZIndex && s.push({ id: c.id, computedZIndex: l });
  }
  return s;
}
var mT = {
    name: 'z-index',
    execute: (n, e) => {
      let {
          state: { edges: t },
          nodesMap: i,
          edgesMap: o,
          initialConnectedEdgesMap: r,
          helpers: s,
          modelActionTypes: a,
          config: d,
        } = n,
        c = d.zIndex;
      if (!c.enabled) return void e();
      let l = aT(a),
        u = dT(a),
        f = s.checkIfAnyEdgePropsChanged(['selected']),
        g = s.checkIfAnyEdgePropsChanged(['zOrder']),
        p = s.checkIfAnyEdgePropsChanged(['source', 'target']),
        v,
        D = () => ((v ??= Js(i)), v),
        C,
        Z;
      if (l) {
        let { nodes: te, elevations: at } = tS(i, c, D());
        ((C = new Map(te.map((Vt) => [Vt.id, Vt]))), (Z = at));
      } else {
        let te = cT(s, i);
        if (!(te.size !== 0 || u || f || g || p)) return void e();
        if (te.size > 0) {
          let at = uT(te, i);
          ({ nodesWithZIndexMap: C, nodeElevationMap: Z } = gT(
            at,
            te,
            i,
            D(),
            c,
          ));
        } else ((C = new Map()), (Z = new Map()));
      }
      let we = hT(C, i),
        Ce = pT(
          l ? new Set(t.map((te) => te.id)) : lT(s, C, r, u, f, g, p),
          o,
          C,
          i,
          c,
          Z,
        );
      e(
        h(
          h({}, we.length > 0 ? { nodesToUpdate: we } : {}),
          Ce.length > 0 ? { edgesToUpdate: Ce } : {},
        ),
      );
    },
  },
  ql = class {
    middlewareChain = [];
    eventEmitterMiddleware = null;
    measurementTrackingMiddleware = null;
    hiddenComputationMiddleware = null;
    hiddenComputationFinalizeMiddleware = null;
    measuredBoundsMiddleware = null;
    flowCore;
    constructor(e, t) {
      ((this.flowCore = e), t && t.forEach((i) => this.register(i)));
    }
    isRegistered(e) {
      return !!this.middlewareChain.find((t) => t.name === e);
    }
    register(e) {
      if (this.isRegistered(e.name))
        throw new Error(`Middleware ${e.name} already registered`);
      return (this.middlewareChain.push(e), () => this.unregister(e.name));
    }
    unregister(e) {
      let t = this.middlewareChain.findIndex((i) => i.name === e);
      t !== -1 && this.middlewareChain.splice(t, 1);
    }
    async execute(e, t, i) {
      if (
        (!this.eventEmitterMiddleware &&
          this.flowCore.eventManager &&
          (this.eventEmitterMiddleware = eT(
            this.flowCore.eventManager,
            this.flowCore.templateVisibilityRegistry,
          )),
        !this.measurementTrackingMiddleware &&
          this.flowCore.measurementTracker &&
          (this.measurementTrackingMiddleware = rT(
            this.flowCore.measurementTracker,
          )),
        this.measuredBoundsMiddleware ||
          (this.measuredBoundsMiddleware = oT(
            this.flowCore.templateVisibilityRegistry,
          )),
        !this.hiddenComputationMiddleware &&
          this.flowCore.templateVisibilityRegistry)
      ) {
        let s = this.flowCore.visibilityGeneration;
        ((this.hiddenComputationMiddleware = dy(
          this.flowCore.templateVisibilityRegistry,
          {
            name: 'hidden-computation',
            cleanupRemovedEntries: !0,
            visibilityGeneration: s,
          },
        )),
          (this.hiddenComputationFinalizeMiddleware = dy(
            this.flowCore.templateVisibilityRegistry,
            { name: 'hidden-computation-finalize', visibilityGeneration: s },
          )));
      }
      let o = [
        ...(this.hiddenComputationMiddleware
          ? [this.hiddenComputationMiddleware]
          : []),
        ...this.middlewareChain,
        ...(this.hiddenComputationFinalizeMiddleware
          ? [this.hiddenComputationFinalizeMiddleware]
          : []),
        this.measuredBoundsMiddleware,
        gs,
        ...(this.measurementTrackingMiddleware
          ? [this.measurementTrackingMiddleware]
          : []),
        ...(this.eventEmitterMiddleware ? [this.eventEmitterMiddleware] : []),
      ];
      return await new bl(this.flowCore, o).run(e, t, i);
    }
  },
  yT = (
    n,
    e,
  ) => `[ngDiagram] Model integrity error: Node references non-existent parent.

Node ID: ${n}
Parent ID: ${e}

This indicates corrupted model data. The group hierarchy will be incomplete.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/groups/`,
  vT = (
    n,
    e,
    t,
  ) => `[ngDiagram] Model integrity error: Node's parent is not a group.

Node ID: ${n}
Parent ID: ${e}
Parent type: ${t}

This indicates incorrect model structure. The group hierarchy will be incomplete.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/groups/`,
  Zl = class {
    flowCore;
    _nodesMap = { map: new Map(), synchronized: !1 };
    _edgesMap = { map: new Map(), synchronized: !1 };
    _directChildrenMap = { map: new Map(), synchronized: !1 };
    _descendantsCache = { map: new Map(), synchronized: !1 };
    _connectedEdgesMap = { map: new Map(), synchronized: !1 };
    _danglingEdges = { edges: [], synchronized: !1 };
    constructor(e) {
      this.flowCore = e;
    }
    desynchronize() {
      ((this._nodesMap.synchronized = !1),
        (this._edgesMap.synchronized = !1),
        (this._directChildrenMap.synchronized = !1),
        (this._descendantsCache.synchronized = !1),
        (this._connectedEdgesMap.synchronized = !1),
        (this._danglingEdges.synchronized = !1));
    }
    get nodesMap() {
      return (
        this._nodesMap.synchronized ||
          (this._nodesMap = {
            map: new Map(this.flowCore.getState().nodes.map((e) => [e.id, e])),
            synchronized: !0,
          }),
        this._nodesMap.map
      );
    }
    get edgesMap() {
      return (
        this._edgesMap.synchronized ||
          (this._edgesMap = {
            map: new Map(this.flowCore.getState().edges.map((e) => [e.id, e])),
            synchronized: !0,
          }),
        this._edgesMap.map
      );
    }
    get directChildrenMap() {
      return (
        this._directChildrenMap.synchronized ||
          (this._directChildrenMap = {
            map: this.buildDirectChildrenMap(this.flowCore.getState().nodes),
            synchronized: !0,
          }),
        this._directChildrenMap.map
      );
    }
    get connectedEdgesMap() {
      return (
        this._connectedEdgesMap.synchronized ||
          (this._connectedEdgesMap = {
            map: this.buildConnectedEdgesMap(this.flowCore.getState().edges),
            synchronized: !0,
          }),
        this._connectedEdgesMap.map
      );
    }
    get danglingEdges() {
      return (
        this._danglingEdges.synchronized ||
          (this._danglingEdges = {
            edges: this.flowCore
              .getState()
              .edges.filter((e) => !e.source || !e.target),
            synchronized: !0,
          }),
        this._danglingEdges.edges
      );
    }
    get descendantsCache() {
      return (
        this._descendantsCache.synchronized ||
          (this._descendantsCache = { map: new Map(), synchronized: !0 }),
        this._descendantsCache.map
      );
    }
    buildDirectChildrenMap(e) {
      let t = new Map();
      for (let i of e)
        if (i.groupId) {
          let o = t.get(i.groupId) || [];
          (o.push(i.id), t.set(i.groupId, o));
        }
      return t;
    }
    buildConnectedEdgesMap(e) {
      let t = new Map();
      for (let i of e) {
        let o = t.get(i.source) || [];
        (o.push(i.id), t.set(i.source, o));
        let r = t.get(i.target) || [];
        (r.push(i.id), t.set(i.target, r));
      }
      return t;
    }
    getNodeById(e) {
      return this.nodesMap.get(e) ?? null;
    }
    getEdgeById(e) {
      return this.edgesMap.get(e) ?? null;
    }
    getConnectedEdges(e) {
      return (this.connectedEdgesMap.get(e) ?? [])
        .map((t) => this.getEdgeById(t))
        .filter((t) => t !== null);
    }
    getConnectedNodes(e) {
      let t = this.connectedEdgesMap.get(e) ?? [],
        i = new Set();
      for (let o of t) {
        let r = this.getEdgeById(o);
        r && i.add(r.source === e ? r.target : r.source);
      }
      return Array.from(i)
        .map((o) => this.getNodeById(o))
        .filter((o) => o !== null);
    }
    getNodeEnds(e) {
      let t = this.getEdgeById(e);
      if (!t) return null;
      let i = this.getNodeById(t.source),
        o = this.getNodeById(t.target);
      return i && o ? { source: i, target: o } : null;
    }
    getChildrenIds(e) {
      return this.directChildrenMap.get(e) ?? [];
    }
    getChildren(e) {
      let t = this.getChildrenIds(e);
      return t
        ? t.map((i) => this.getNodeById(i)).filter((i) => i !== null)
        : [];
    }
    getAllDescendantIds(e) {
      if (this.descendantsCache.has(e)) return this.descendantsCache.get(e);
      let t = this.computeAllDescendants(e);
      return (this.descendantsCache.set(e, t), t);
    }
    computeAllDescendants(e) {
      let t = this.getChildrenIds(e);
      if (!t || t.length === 0) return [];
      let i = [...t];
      for (let o of t) {
        let r = this.computeAllDescendants(o);
        i.push(...r);
      }
      return i;
    }
    getAllDescendants(e) {
      return this.getAllDescendantIds(e)
        .map((t) => this.getNodeById(t))
        .filter((t) => t !== null);
    }
    hasChildren(e) {
      return (
        this.directChildrenMap.has(e) &&
        this.directChildrenMap.get(e).length > 0
      );
    }
    hasDescendants(e) {
      return this.getAllDescendantIds(e).length > 0;
    }
    getChildrenMap() {
      return this.directChildrenMap;
    }
    getSelectedNodes() {
      return this.flowCore.getState().nodes.filter((e) => e.selected);
    }
    getNodeChildren(e, { directOnly: t = !0 } = {}) {
      return t ? this.getChildren(e) : this.getAllDescendants(e);
    }
    getNodeChildrenIds(e, { directOnly: t = !0 } = {}) {
      return t ? this.getChildrenIds(e) : this.getAllDescendantIds(e);
    }
    getSelectedNodesWithChildren({ directOnly: e = !0 } = {}) {
      let t = this.getSelectedNodes(),
        i = new Set(),
        o = [];
      for (let r of t) {
        if (i.has(r.id)) continue;
        (i.add(r.id), o.push(r));
        let s = this.getNodeChildren(r.id, { directOnly: e });
        for (let a of s) i.has(a.id) || (i.add(a.id), o.push(a));
      }
      return o;
    }
    getSelectedEdges() {
      return this.flowCore.getState().edges.filter((e) => e.selected);
    }
    isNodeDescendantOfGroup(e, t) {
      return this.getAllDescendantIds(t).includes(e);
    }
    wouldCreateCircularDependency(e, t) {
      return e === t || this.isNodeDescendantOfGroup(t, e);
    }
    getParentChain(e) {
      let t = [],
        i = this.getNodeById(e);
      for (; i && i.groupId;) {
        let o = this.getNodeById(i.groupId);
        if (!o) return (console.error(yT(i.id, i.groupId)), t);
        if (!ci(o))
          return (console.error(vT(i.id, o.id, o.type || 'unknown')), t);
        (t.push(o), (i = o));
      }
      return t;
    }
  },
  Es = (n) =>
    n.map(({ id: e, size: t, position: i }) => ({
      portId: e,
      portChanges: { size: t, position: i },
    })),
  Yl = class extends vs {
    constructor(e) {
      super((t) => {
        let i = e(t)?.measuredPorts ?? [],
          o = new Set();
        for (let r of i) le(r.size) && xe(r.position) && o.add(r.id);
        return o;
      });
    }
  },
  Ql = class {
    lastVisibleNodeIds = null;
    withPerformanceLogging(e, t, i) {
      if (!i) return void e();
      let { added: o, removed: r, total: s } = this.calculateNodeDiff(t),
        a = o > 0 || r > 0,
        d = performance.now();
      (e(),
        a &&
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              console.log(
                `[ngDiagram] Render: +${o} -${r} nodes (total: ${s}): ${(performance.now() - d).toFixed(2)}ms`,
              );
            });
          }));
    }
    calculateNodeDiff(e) {
      let t = new Set(e.map((s) => s.id)),
        i = this.lastVisibleNodeIds ?? new Set(),
        o = 0,
        r = 0;
      for (let s of t) i.has(s) || o++;
      for (let s of i) t.has(s) || r++;
      return (
        (this.lastVisibleNodeIds = t),
        { added: o, removed: r, total: t.size }
      );
    }
  },
  Cs = class {
    flowCore;
    performanceLogger;
    constructor(e) {
      ((this.flowCore = e), (this.performanceLogger = new Ql()));
    }
    render() {
      let { nodes: e, edges: t, metadata: i } = this.flowCore.getState(),
        o = this.flowCore.actionStateManager.linking,
        r = o?.temporaryEdge,
        { nodes: s, edges: a } = this.process(e, t, i.viewport),
        d = o?.relink?.edgeId,
        c = d ? a.filter((f) => f.id !== d) : a,
        l = o?.relink?.end === 'source' ? r?.target : r?.source,
        u =
          !r?.temporary || (l && this.flowCore.getNodeById(l)?.computedHidden)
            ? c
            : [...c, r];
      this.performanceLogger.withPerformanceLogging(
        () => this.flowCore.renderer.draw(s, u, i.viewport),
        s,
        this.flowCore.config.debugMode,
      );
    }
  },
  cy = new Set(),
  Kl = class extends Cs {
    constructor(e) {
      super(e);
    }
    init() {
      (this.render(),
        this.flowCore.model.onChange((i) => {
          (this.flowCore.spatialHash.process(i.nodes),
            this.flowCore.modelLookup.desynchronize(),
            this.render());
        }));
      let e = this.flowCore.model.getNodes(),
        t = this.flowCore.model.getEdges();
      this.flowCore.initUpdater.start(e, t, async () => {
        await this.flowCore.commandHandler.emit('init', {
          renderedNodeIds: e.map((i) => i.id),
          renderedEdgeIds: t.map((i) => i.id),
        });
      });
    }
    process(e, t) {
      return { nodes: e, edges: t, nodeIds: cy, edgeIds: cy };
    }
    isNodeRendered(e) {
      return !0;
    }
  },
  Xl = class {
    flowCore;
    onIdle;
    wasPanning = !1;
    idleTimeout = null;
    unsubscribeActionState = null;
    constructor(e, t) {
      ((this.flowCore = e), (this.onIdle = t));
    }
    init() {
      this.unsubscribeActionState = this.flowCore.eventManager.on(
        'actionStateChanged',
        ({ actionState: e }) => {
          let t = !!e.panning?.active;
          (this.wasPanning && !t
            ? this.scheduleIdleRender()
            : t &&
              this.idleTimeout &&
              (clearTimeout(this.idleTimeout), (this.idleTimeout = null)),
            (this.wasPanning = t));
        },
      );
    }
    scheduleIdleRender() {
      (this.idleTimeout && clearTimeout(this.idleTimeout),
        (this.idleTimeout = setTimeout(() => {
          (this.onIdle(), (this.idleTimeout = null));
        }, this.flowCore.config.virtualization.idleDelay ?? 100)));
    }
    destroy() {
      (this.idleTimeout &&
        (clearTimeout(this.idleTimeout), (this.idleTimeout = null)),
        this.unsubscribeActionState &&
          (this.unsubscribeActionState(),
          (this.unsubscribeActionState = null)));
    }
  };
function ly(n) {
  return !!n;
}
function wT(n, e) {
  let { x: t, y: i, scale: o, width: r, height: s } = n,
    a = r || 1920,
    d = s || 1080,
    c = -t / o,
    l = -i / o,
    u = a / o,
    f = d / o,
    g = e * Math.min(1, o),
    p = (Math.max(a, d) * g) / o;
  return { x: c - p, y: l - p, width: u + 2 * p, height: f + 2 * p };
}
function DT(n, e) {
  let t = 0.25 * n.width,
    i = 0.25 * n.height,
    o = 0.1 * n.width,
    r = 0.1 * n.height;
  return (
    Math.abs(n.x - e.x) < t &&
    Math.abs(n.y - e.y) < i &&
    Math.abs(n.width - e.width) < o &&
    Math.abs(n.height - e.height) < r
  );
}
function ET(n, e) {
  let t = 0.4 * e.width,
    i = 0.4 * e.height;
  return Math.abs(n.x - e.x) > t || Math.abs(n.y - e.y) > i;
}
var Jl = class {
    cachedResult = null;
    lastViewportRect = null;
    lastNodesLength = 0;
    lastEdgesLength = 0;
    hasCache() {
      return this.cachedResult !== null;
    }
    isNodeInCache(e) {
      return this.cachedResult?.nodeIds.has(e) ?? !1;
    }
    get(e, t) {
      let i = this.cachedResult;
      return {
        nodes: e.filter((o) => i.nodeIds.has(o.id)),
        edges: t.filter((o) => i.edgeIds.has(o.id)),
        nodeIds: i.nodeIds,
        edgeIds: i.edgeIds,
      };
    }
    set(e, t, i, o) {
      ((this.cachedResult = e),
        (this.lastViewportRect = o),
        (this.lastNodesLength = t.length),
        (this.lastEdgesLength = i.length));
    }
    canUse(e, t, i) {
      return (
        !(!this.cachedResult || !this.lastViewportRect) &&
        e === this.lastNodesLength &&
        t === this.lastEdgesLength &&
        DT(this.lastViewportRect, i)
      );
    }
    hasMovedTooFar(e) {
      return !this.lastViewportRect || ET(e, this.lastViewportRect);
    }
    invalidateViewport() {
      this.lastViewportRect = null;
    }
    invalidate() {
      ((this.cachedResult = null),
        (this.lastViewportRect = null),
        (this.lastNodesLength = 0),
        (this.lastEdgesLength = 0));
    }
  },
  eu = class {
    flowCore;
    constructor(e) {
      this.flowCore = e;
    }
    resolve(e) {
      let t = this.getPrimaryVisibleIds(e),
        {
          edges: i,
          edgeIds: o,
          externalNodeIds: r,
        } = this.collectVisibleEdges(t);
      this.collectVisibleDanglingEdges(e, t, i, o, r);
      let { nodes: s, nodeIds: a } = this.buildNodeList(t, r);
      return { nodes: s, edges: i, nodeIds: a, edgeIds: o };
    }
    collectVisibleDanglingEdges(e, t, i, o, r) {
      for (let s of this.flowCore.modelLookup.danglingEdges) {
        if (o.has(s.id) || s.computedHidden || !this.intersectsViewport(s, e))
          continue;
        (i.push(s), o.add(s.id));
        let a = s.source || s.target;
        a && !t.has(a) && r.add(a);
      }
    }
    intersectsViewport(e, t) {
      let i = [
        ...(e.points ?? []),
        ...(!e.source && e.sourcePosition ? [e.sourcePosition] : []),
        ...(!e.target && e.targetPosition ? [e.targetPosition] : []),
      ];
      return i.length !== 0 && Ff(Lf(i), t);
    }
    getPrimaryVisibleIds(e) {
      let t = new Set(this.flowCore.spatialHash.queryIds(e));
      return (this.addGroupDescendants(t), t);
    }
    addGroupDescendants(e) {
      let t = this.flowCore.modelLookup.nodesMap,
        i = Array.from(e);
      for (let o of i) {
        let r = t.get(o);
        if (r && ci(r))
          for (let s of this.flowCore.modelLookup.getAllDescendantIds(o))
            t.get(s)?.computedHidden || e.add(s);
      }
    }
    collectVisibleEdges(e) {
      let t = [],
        i = new Set(),
        o = new Set();
      for (let r of e)
        for (let s of this.flowCore.modelLookup.getConnectedEdges(r))
          i.has(s.id) ||
            s.computedHidden ||
            (t.push(s),
            i.add(s.id),
            e.has(s.source) || o.add(s.source),
            e.has(s.target) || o.add(s.target));
      return { edges: t, edgeIds: i, externalNodeIds: o };
    }
    buildNodeList(e, t) {
      let i = this.flowCore.modelLookup.nodesMap,
        o = new Set(e);
      for (let s of t) o.add(s);
      let r = [];
      for (let s of o) {
        let a = i.get(s);
        a && r.push(a);
      }
      return { nodes: r, nodeIds: o };
    }
  };
var tu = class {
    onZoomEnd;
    lastScale = null;
    isZooming = !1;
    zoomIdleTimeout = null;
    constructor(e) {
      this.onZoomEnd = e;
    }
    handleScaleChange(e) {
      (this.lastScale !== null &&
        this.lastScale !== e &&
        ((this.isZooming = !0), this.scheduleZoomIdle()),
        (this.lastScale = e));
    }
    getIsZooming() {
      return this.isZooming;
    }
    destroy() {
      this.zoomIdleTimeout &&
        (clearTimeout(this.zoomIdleTimeout), (this.zoomIdleTimeout = null));
    }
    scheduleZoomIdle() {
      (this.zoomIdleTimeout && clearTimeout(this.zoomIdleTimeout),
        (this.zoomIdleTimeout = setTimeout(() => {
          ((this.isZooming = !1),
            (this.zoomIdleTimeout = null),
            this.onZoomEnd());
        }, 300)));
    }
  },
  uy = new Set(),
  nu = class extends Cs {
    cache = new Jl();
    visibleElementsResolver;
    zoomTracker;
    idleRenderScheduler;
    lastNodesRef = null;
    lastVisibilityVersion = 0;
    constructor(e) {
      (super(e),
        (this.visibleElementsResolver = new eu(e)),
        (this.zoomTracker = new tu(() => this.invalidateAndRender())),
        (this.idleRenderScheduler = new Xl(e, () =>
          this.invalidateAndRender(),
        )));
    }
    init() {
      (this.flowCore.spatialHash.process(this.flowCore.model.getNodes()),
        (this.lastVisibilityVersion =
          this.flowCore.visibilityGeneration.version),
        this.flowCore.model.onChange((r) => {
          (r.nodes !== this.lastNodesRef &&
            (this.flowCore.spatialHash.process(r.nodes),
            this.flowCore.modelLookup.desynchronize(),
            (this.lastNodesRef = r.nodes)),
            this.flowCore.visibilityGeneration.version !==
              this.lastVisibilityVersion &&
              ((this.lastVisibilityVersion =
                this.flowCore.visibilityGeneration.version),
              this.cache.invalidate()),
            this.render());
        }),
        this.idleRenderScheduler.init(),
        this.render());
      let { nodes: e, edges: t, metadata: i } = this.flowCore.getState(),
        o = this.process(e, t, i.viewport);
      this.flowCore.initUpdater.start(o.nodes, o.edges, async () => {
        await this.flowCore.commandHandler.emit('init', {
          renderedNodeIds: o.nodes.map((r) => r.id),
          renderedEdgeIds: o.edges.map((r) => r.id),
        });
      });
    }
    process(e, t, i) {
      let o = this.flowCore.config.virtualization;
      if (!ly(i)) return { nodes: e, edges: t, nodeIds: uy, edgeIds: uy };
      this.zoomTracker.handleScaleChange(i.scale);
      let r = wT(i, o.padding),
        s = this.cache.hasCache();
      if (this.zoomTracker.getIsZooming() && s) return this.cache.get(e, t);
      if (this.flowCore.actionStateManager.isPanning() && s)
        return this.cache.get(e, t);
      if (this.cache.canUse(e.length, t.length, r)) return this.cache.get(e, t);
      let a = this.visibleElementsResolver.resolve(r);
      return (this.cache.set(a, e, t, r), a);
    }
    destroy() {
      (this.zoomTracker.destroy(), this.idleRenderScheduler.destroy());
    }
    isNodeRendered(e) {
      return (
        !ly(this.flowCore.model.getMetadata().viewport) ||
        this.cache.isNodeInCache(e)
      );
    }
    invalidateAndRender() {
      (this.cache.invalidateViewport(), this.render());
    }
  },
  CT = (
    n,
    e,
  ) => `[ngDiagram] Spatial hash error: Attempted to remove from non-existent cell "${n}".

Node ID: ${e}

This may indicate a state synchronization issue.`,
  IT = (
    n,
    e,
  ) => `[ngDiagram] Spatial hash error: Attempted to update non-existent cell "${n}".

Node ID: ${e}

This may indicate a state synchronization issue.`,
  iu = class {
    cellSize = 100;
    grid = new Map();
    idToCells = new Map();
    idToRect = new Map();
    process(e) {
      let t = new Set(this.idToRect.keys()),
        i = new Set();
      for (let o of e) {
        if (o.computedHidden) continue;
        i.add(o.id);
        let r = this.idToRect.get(o.id);
        if (r) {
          let s = this.nodeToRect(o);
          Sy(r, s) || this.updateInGrid(s);
        } else this.addToGrid(this.nodeToRect(o));
      }
      for (let o of t.difference(i)) this.removeFromGrid(o);
    }
    query(e) {
      let t = [];
      return (this._query(e, (i) => t.push(i)), t);
    }
    queryIds(e) {
      let t = [];
      return (this._query(e, (i) => t.push(i.id)), t);
    }
    _query(e, t) {
      let i = this.getCells(e),
        o = new Set();
      for (let r of i) {
        let s = this.grid.get(r);
        if (s) for (let a of s) o.has(a.id) || (o.add(a.id), Ff(a, e) && t(a));
      }
    }
    nodeToRect(e) {
      let t = e.measuredBounds ?? Cn(e);
      return h({ id: e.id }, t);
    }
    addToCell(e, t) {
      (this.grid.has(e) || this.grid.set(e, []), this.grid.get(e).push(t));
    }
    removeFromCell(e, t) {
      let i = this.grid.get(e);
      if (!i) return void console.error(CT(e, t));
      let o = i.filter((r) => r.id !== t);
      this.grid.set(e, o);
    }
    updateInCell(e, t) {
      let i = this.grid.get(e);
      if (!i) return void console.error(IT(e, t.id));
      let o = i.filter(({ id: r }) => r !== t.id);
      this.grid.set(e, [...o, t]);
    }
    addToGrid(e) {
      let t = this.getCells(e);
      for (let i of t) this.addToCell(i, e);
      (this.idToCells.set(e.id, t), this.idToRect.set(e.id, e));
    }
    updateInGrid(e) {
      let t = this.getCells(e),
        i = new Set(t),
        o = new Set(this.idToCells.get(e.id) || []),
        r = o.difference(i),
        s = i.difference(o),
        a = i.intersection(o);
      for (let d of r) this.removeFromCell(d, e.id);
      for (let d of s) this.addToCell(d, e);
      for (let d of a) this.updateInCell(d, e);
      (this.idToRect.set(e.id, e), this.idToCells.set(e.id, t));
    }
    removeFromGrid(e) {
      let t = this.idToCells.get(e);
      if (t) {
        for (let i of t) {
          this.removeFromCell(i, e);
          let o = this.grid.get(i);
          o && o.length === 0 && this.grid.delete(i);
        }
        (this.idToCells.delete(e), this.idToRect.delete(e));
      }
    }
    getCellsRange(e, t) {
      return [
        Math.floor(e / this.cellSize),
        Math.floor((e + t) / this.cellSize),
      ];
    }
    getCells(e) {
      let [t, i] = this.getCellsRange(e.x, e.width),
        [o, r] = this.getCellsRange(e.y, e.height),
        s = [];
      for (let a = t; a <= i; a++)
        for (let d = o; d <= r; d++) s.push(`${a}-${d}`);
      return s;
    }
  },
  jf = (n, e) => {
    if ((ou(n) && !n.size) || (ou(e) && !e.size)) return !1;
    let t = fy(n),
      i = fy(e);
    if (t.length === 0 || i.length === 0) return !1;
    let o = [...hy(t), ...hy(i)];
    for (let r of o) {
      let s = gy(t, r),
        a = gy(i, r);
      if (!MT(s, a)) return !1;
    }
    return !0;
  },
  ou = (n) => 'position' in n,
  fy = (n) =>
    ou(n) ? (n.size ? pl(Ae(n), n.angle ?? 0) : []) : pl(n, n.angle ?? 0),
  gy = (n, e) => {
    let t = n[0].x * e.x + n[0].y * e.y,
      i = t;
    for (let o = 1; o < n.length; o++) {
      let r = n[o].x * e.x + n[o].y * e.y;
      (r < t && (t = r), r > i && (i = r));
    }
    return { min: t, max: i };
  },
  MT = (n, e) => !(n.max < e.min || e.max < n.min),
  hy = (n) => {
    let e = [];
    for (let t = 0; t < n.length; t++) {
      let i = n[t],
        o = n[(t + 1) % n.length],
        r = { x: o.x - i.x, y: o.y - i.y },
        s = Math.sqrt(r.x * r.x + r.y * r.y);
      s > 0 && e.push({ x: -r.y / s, y: r.x / s });
    }
    return e;
  },
  Uf = (n, e, t) => {
    let i = hs(e, t),
      o = n.spatialHash.queryIds(i),
      r = [];
    for (let s of o) {
      let a = n.modelLookup.getNodeById(s);
      a && jf(i, a) && r.push(a);
    }
    return r;
  },
  bT = (n, e, t) =>
    Uf(n, e, t).sort((i, o) => hl(Ae(i), hs(e, 1)) - hl(Ae(o), hs(e, 1)))[0] ||
    null,
  ST = (n, e, t) => {
    let i = new Map();
    Uf(n, e, t).forEach((s) => {
      let a = (s.measuredPorts || []).filter(
        (d) => !n.templateVisibilityRegistry?.isPortHidden(s.id, d.id),
      );
      i.set(s, a);
    });
    let o = 1 / 0,
      r = null;
    for (let [s, a] of i.entries())
      for (let d of a) {
        let { x: c, y: l } = Ae(d),
          u = hl(
            Ae({
              size: d.size,
              position: { x: c + s.position.x, y: l + s.position.y },
            }),
            hs(e, 1),
          );
        u <= t && u < o && ((o = u), (r = d));
      }
    return r;
  },
  TT = (n, e, t = !0) => {
    let i = n.spatialHash.queryIds(e),
      o = [];
    for (let r of i) {
      let s = n.modelLookup.getNodeById(r);
      s && jf(e, s) && o.push(s);
    }
    return t
      ? o
      : o.filter((r) => {
          let s = Ae(r);
          return fM(e, s);
        });
  };
function _T(n, e) {
  let t = typeof e == 'string',
    i = t ? n.modelLookup.getNodeById(e) : e;
  if (!i) return [];
  let o = t ? (i.measuredBounds ?? Cn(i)) : Cn(i),
    r = n.spatialHash.queryIds(o),
    s = [];
  for (let a of r) {
    if (a === i.id) continue;
    let d = n.modelLookup.getNodeById(a);
    d && jf(i, d) && s.push(d);
  }
  return s;
}
function NT(n, e) {
  return {
    emit: async (t, ...i) => {
      if (n.isAborted())
        throw new Error('Cannot emit on rolled back transaction');
      await e.commandHandler.emitInternal(t, !0, ...i);
    },
    abort: () => {
      n.abort();
    },
    savepoint: (t) => {
      if (n.isAborted())
        throw new Error('Cannot create savepoint on rolled back transaction');
      n.addSavepoint(t);
    },
    rollbackTo: (t) => {
      if (n.isAborted())
        throw new Error(
          'Cannot rollback to savepoint on already rolled back transaction',
        );
      n.rollback(t);
    },
    transaction: (t, i) => e.transactionManager.transaction(t, i),
    hasChanges: () => n.hasChanges(),
    isDirty: () => !n.isAborted() && n.hasChanges(),
    getQueuedUpdates: () => n.getQueue(),
  };
}
var ru = class {
    name;
    parent;
    flowCore;
    queue = [];
    savepoints = new Map();
    _isAborted = !1;
    children = [];
    _context = null;
    constructor(e, t, i) {
      ((this.name = e),
        (this.parent = t),
        (this.flowCore = i),
        t && t.children.push(this));
    }
    get context() {
      return (
        this._context || (this._context = NT(this, this.flowCore)),
        this._context
      );
    }
    isAborted() {
      return this._isAborted;
    }
    abort() {
      this._isAborted ||
        ((this._isAborted = !0),
        (this.queue = []),
        this.savepoints.clear(),
        this.children.forEach((e) => e.abort()));
    }
    addSavepoint(e) {
      (this.ensureNotAborted(), this.savepoints.set(e, this.queue.length));
    }
    rollback(e) {
      if ((this.ensureNotAborted(), e === void 0))
        return (
          (this.queue = []),
          this.savepoints.clear(),
          void this.children.forEach((o) => o.rollback())
        );
      let t = this.savepoints.get(e);
      if (t === void 0) throw new Error(`Savepoint '${e}' not found`);
      this.queue = this.queue.slice(0, t);
      let i = [];
      (this.savepoints.forEach((o, r) => {
        o > t && i.push(r);
      }),
        i.forEach((o) => this.savepoints.delete(o)),
        this.children.forEach((o) => o.rollback()));
    }
    commit() {
      (this.ensureNotAborted(), this.parent && this.mergeToParent());
    }
    canCommit() {
      return !this._isAborted && this.hasChanges();
    }
    ensureNotAborted() {
      if (this._isAborted)
        throw new Error('Cannot perform operation on aborted transaction');
    }
    hasChanges() {
      return this.queue.length > 0 || this.children.some((e) => e.hasChanges());
    }
    getQueue() {
      return [...this.queue];
    }
    queueUpdate(e, t) {
      (this.ensureNotAborted(), this.queue.push({ update: e, actionTypes: t }));
    }
    getState() {
      return {
        name: this.name,
        queue: [...this.queue],
        savepoints: new Map(this.savepoints),
        isAborted: this._isAborted,
        parent: this.parent,
      };
    }
    mergeToParent() {
      (this.ensureNotAborted(),
        this.parent &&
          this.queue.forEach((e) => {
            this.parent.queueUpdate(e.update, e.actionTypes);
          }));
    }
    getMergedUpdates() {
      if (this._isAborted)
        return { mergedUpdate: {}, commandsCount: 0, actionTypes: [] };
      let e = this.queue.length,
        t = new Set([this.name]),
        i = [],
        o = [],
        r = [],
        s = [],
        a = [],
        d = [],
        c = [];
      for (let { update: u, actionTypes: f } of this.queue)
        (f.forEach((g) => t.add(g)),
          u.nodesToAdd?.length && i.push(u.nodesToAdd),
          u.nodesToRemove?.length && o.push(u.nodesToRemove),
          u.nodesToUpdate?.length && r.push(u.nodesToUpdate),
          u.edgesToAdd?.length && s.push(u.edgesToAdd),
          u.edgesToRemove?.length && a.push(u.edgesToRemove),
          u.edgesToUpdate?.length && d.push(u.edgesToUpdate),
          u.metadataUpdate && c.push(u.metadataUpdate));
      let l = {};
      return (
        i.length > 0 && (l.nodesToAdd = i.flat()),
        o.length > 0 && (l.nodesToRemove = o.flat()),
        r.length > 0 && (l.nodesToUpdate = r.flat()),
        s.length > 0 && (l.edgesToAdd = s.flat()),
        a.length > 0 && (l.edgesToRemove = a.flat()),
        d.length > 0 && (l.edgesToUpdate = d.flat()),
        c.length > 0 && (l.metadataUpdate = Object.assign({}, ...c)),
        { mergedUpdate: l, commandsCount: e, actionTypes: [...t] }
      );
    }
  },
  su = class {
    flowCore;
    transactionStack = [];
    pendingOptions = null;
    constructor(e) {
      this.flowCore = e;
    }
    async transaction(e, t, i) {
      let [o, r, s] = this.parseArgs(e, t, i),
        a = this.getCurrentTransaction(),
        d = new ru(o, a, this.flowCore);
      (!a && s && (this.pendingOptions = s), this.transactionStack.push(d));
      try {
        if ((await r(d.context), !d.isAborted())) {
          if (!a || !this.transactionStack.includes(a)) {
            a &&
              console.warn(
                '[ngDiagram] A nested transaction outlived its parent transaction \u2014 committing its updates independently. Await transactions instead of running them fire-and-forget.',
              );
            let {
              mergedUpdate: c,
              commandsCount: l,
              actionTypes: u,
            } = d.getMergedUpdates();
            return { results: c, commandsCount: l, actionTypes: u };
          }
          d.mergeToParent();
        }
        return { results: {}, commandsCount: 0, actionTypes: [] };
      } catch (c) {
        throw (d.rollback(), c);
      } finally {
        let c = this.transactionStack.lastIndexOf(d);
        (c !== -1 && this.transactionStack.splice(c, 1),
          a || (this.pendingOptions = null));
      }
    }
    getCurrentOptions() {
      return this.pendingOptions;
    }
    queueUpdate(e, t) {
      let i = this.getCurrentTransaction();
      if (!i) throw new Error('No active transaction. Cannot queue update.');
      i.queueUpdate(e, t);
    }
    isActive() {
      return this.transactionStack.length > 0;
    }
    getTransactionName() {
      let e = this.getCurrentTransaction();
      return e ? e.getState().name : null;
    }
    getCurrentTransaction() {
      return this.transactionStack[this.transactionStack.length - 1] || null;
    }
    parseArgs(e, t, i) {
      if (typeof e == 'function') return ['transaction', e, t];
      if (typeof t != 'function')
        throw new Error(
          'Callback is required when transaction name is provided',
        );
      return [e, t, i];
    }
  };
var xT = {
    isNodeMeasurable: () => !0,
    isPortMeasurable: () => !0,
    isLabelMeasurable: () => !0,
  },
  au = class {
    measurementFilter;
    constructor(e = xT) {
      this.measurementFilter = e;
    }
    initializedPorts = new Map();
    initializedLabels = new Map();
    nodeSizes = new Map();
    portRects = new Map();
    edgeLabelSizes = new Map();
    portsToMeasure = new Set();
    labelsToMeasure = new Set();
    nodesToMeasure = new Set();
    measuredNodes = new Set();
    measuredPorts = new Set();
    measuredLabels = new Set();
    trackNodeMeasurement(e, t) {
      (this.nodeSizes.set(e, t), le(t) && this.measuredNodes.add(e));
    }
    trackPortMeasurement(e, t, i, o) {
      let r = this.getCompoundId(e, t);
      (this.portRects.set(r, { size: i, position: o }),
        le(i) && xe(o) && this.measuredPorts.add(r));
    }
    trackLabelMeasurement(e, t, i) {
      let o = this.getCompoundId(e, t);
      (this.edgeLabelSizes.set(o, i), le(i) && this.measuredLabels.add(o));
    }
    addPort(e, t) {
      let i = this.getCompoundId(e, t.id);
      (this.initializedPorts.set(i, t),
        this.measurementFilter.isPortMeasurable(e, t.id) &&
          this.portsToMeasure.add(i));
    }
    addLabel(e, t) {
      let i = this.getCompoundId(e, t.id);
      (this.initializedLabels.set(i, t),
        this.measurementFilter.isLabelMeasurable(e, t.id) &&
          this.labelsToMeasure.add(i));
    }
    collectAlreadyMeasuredItems(e, t) {
      for (let i of e) {
        let o = this.measurementFilter.isNodeMeasurable(i.id);
        (o && this.nodesToMeasure.add(i.id),
          le(i.size) && this.measuredNodes.add(i.id));
        for (let r of i.measuredPorts ?? [])
          if (
            (o &&
              this.measurementFilter.isPortMeasurable(i.id, r.id) &&
              this.trackPreExistingPort(i.id, r.id),
            le(r.size) && xe(r.position))
          ) {
            let s = this.getCompoundId(i.id, r.id);
            this.measuredPorts.add(s);
          }
      }
      for (let i of t)
        for (let o of i.measuredLabels ?? [])
          if (
            (this.measurementFilter.isLabelMeasurable(i.id, o.id) &&
              this.trackPreExistingLabel(i.id, o.id),
            le(o.size))
          ) {
            let r = this.getCompoundId(i.id, o.id);
            this.measuredLabels.add(r);
          }
    }
    allEntitiesHaveMeasurements() {
      let e = [...this.nodesToMeasure].every((o) => this.measuredNodes.has(o)),
        t = [...this.portsToMeasure].every((o) => this.measuredPorts.has(o)),
        i = [...this.labelsToMeasure].every((o) => this.measuredLabels.has(o));
      return e && t && i;
    }
    pruneUnmeasurableExpectations() {
      for (let e of [...this.nodesToMeasure])
        this.measurementFilter.isNodeMeasurable(e) ||
          this.nodesToMeasure.delete(e);
      for (let e of [...this.portsToMeasure]) {
        let { entityId: t, itemId: i } = this.splitCompoundId(e);
        (this.measurementFilter.isNodeMeasurable(t) &&
          this.measurementFilter.isPortMeasurable(t, i)) ||
          this.portsToMeasure.delete(e);
      }
      for (let e of [...this.labelsToMeasure]) {
        let { entityId: t, itemId: i } = this.splitCompoundId(e);
        this.measurementFilter.isLabelMeasurable(t, i) ||
          this.labelsToMeasure.delete(e);
      }
    }
    applyToDiagramState(e) {
      let c = e.getState(),
        { nodes: t, edges: i } = c,
        o = bn(c, ['nodes', 'edges']),
        r = this.groupPortsByNode(),
        s = this.groupLabelsByEdge(),
        a = this.updateNodes(t, r),
        d = this.updateEdges(i, s);
      e.setState(y(h({}, o), { nodes: a, edges: d }));
    }
    getCompoundId(e, t) {
      return `${e}->${t}`;
    }
    splitCompoundId(e) {
      let [t, i] = e.split('->');
      return { entityId: t, itemId: i };
    }
    trackPreExistingPort(e, t) {
      let i = this.getCompoundId(e, t);
      this.portsToMeasure.add(i);
    }
    trackPreExistingLabel(e, t) {
      let i = this.getCompoundId(e, t);
      this.labelsToMeasure.add(i);
    }
    groupPortsByNode() {
      let e = new Map();
      for (let [t, i] of this.initializedPorts.entries()) {
        let { entityId: o } = this.splitCompoundId(t),
          r = e.get(o) || [];
        (r.push(i), e.set(o, r));
      }
      return e;
    }
    groupLabelsByEdge() {
      let e = new Map();
      for (let [t, i] of this.initializedLabels.entries()) {
        let { entityId: o } = this.splitCompoundId(t),
          r = e.get(o) || [];
        (r.push(i), e.set(o, r));
      }
      return e;
    }
    updateNodes(e, t) {
      return e.map((i) => {
        let o = this.nodeSizes.get(i.id),
          r = o && le(o) ? o : i.size,
          s = t.get(i.id),
          a = new Map();
        if (i.measuredPorts) for (let c of i.measuredPorts) a.set(c.id, c);
        if (s) for (let c of s) a.set(c.id, c);
        let d = a.size > 0 ? Array.from(a.values()) : void 0;
        return (
          d &&
            (d = d.map((c) => {
              let l = this.getCompoundId(i.id, c.id),
                u = this.portRects.get(l);
              return u && le(u.size) && xe(u.position)
                ? y(h({}, c), { size: u.size, position: u.position })
                : c;
            })),
          y(h({}, i), { size: r, measuredPorts: d })
        );
      });
    }
    updateEdges(e, t) {
      return e.map((i) => {
        let o = t.get(i.id),
          r = new Map();
        if (i.measuredLabels) for (let a of i.measuredLabels) r.set(a.id, a);
        if (o) for (let a of o) r.set(a.id, a);
        let s = r.size > 0 ? Array.from(r.values()) : void 0;
        return (
          s &&
            (s = s.map((a) => {
              let d = this.getCompoundId(i.id, a.id),
                c = this.edgeLabelSizes.get(d);
              return c && le(c) ? y(h({}, a), { size: c }) : a;
            })),
          y(h({}, i), { measuredLabels: s })
        );
      });
    }
  },
  du = class {
    queue = [];
    isProcessing = !1;
    get isFinishing() {
      return this.isProcessing;
    }
    get length() {
      return this.queue.length;
    }
    startFinishing() {
      this.isProcessing = !0;
    }
    enqueue(e) {
      this.queue.push(e);
    }
    processAll(e) {
      if (this.queue.length !== 0) {
        for (let t of this.queue)
          switch (t.method) {
            case 'addPort':
              e.addPort(...t.args);
              break;
            case 'addEdgeLabel':
              e.addEdgeLabel(...t.args);
              break;
            case 'applyNodeSize':
              e.applyNodeSize(...t.args);
              break;
            case 'applyPortChanges':
              e.applyPortChanges(...t.args);
              break;
            case 'applyEdgeLabelChanges':
              e.applyEdgeLabelChanges(...t.args);
              break;
            case 'deleteEdgeLabel':
              e.deleteEdgeLabel(...t.args);
          }
        this.queue = [];
      }
    }
  },
  Is = class {
    shouldWait;
    stabilityDelay;
    stabilityTimeout = null;
    stabilityPromise;
    resolveStability = () => null;
    eventCount = 0;
    constructor(e, t) {
      ((this.shouldWait = e),
        (this.stabilityDelay = t),
        (this.stabilityPromise = new Promise((i) => {
          this.resolveStability = i;
        })));
    }
    notify() {
      (this.eventCount++, this.resetStabilityTimer());
    }
    waitForStability() {
      return (
        this.shouldWait
          ? this.eventCount === 0 && this.resetStabilityTimer()
          : this.resolveStability(),
        this.stabilityPromise
      );
    }
    resetStabilityTimer() {
      (this.stabilityTimeout && clearTimeout(this.stabilityTimeout),
        (this.stabilityTimeout = setTimeout(() => {
          (this.resolveStability(), (this.stabilityTimeout = null));
        }, this.stabilityDelay)));
    }
  };
var PT = (n) => `[ngDiagram] Initialization stabilization failed.

Error: ${n instanceof Error ? n.message : String(n)}

The diagram will force-finish initialization without waiting for all measurements.
This may result in:
  \u2022 Ports without measured positions/sizes
  \u2022 Edge labels without measured sizes
  \u2022 Incorrect initial edge routing

This usually indicates:
  \u2022 Model provided to ng-diagram was not created with initializeModel() or initializeModelAdapter() (for custom ModelAdapter)
  \u2022 Resize observers not functioning properly
  \u2022 Port/label elements not rendering
  \u2022 Very slow initial render (> 50ms between additions)

The diagram will still be functional, but initial layout may be incomplete.

Documentation: https://www.ngdiagram.dev/docs/guides/model-initialization/
`,
  cu = class {
    flowCore;
    isInitialized = !1;
    entitiesStabilized = !1;
    portStabilityDetector;
    labelStabilityDetector;
    initState;
    lateArrivalQueue;
    onCompleteCallback;
    measurementTimeout = null;
    hiddenNodeIds = new Set();
    hiddenEdgeIds = new Set();
    constructor(e) {
      ((this.flowCore = e),
        (this.initState = new au({
          isNodeMeasurable: (t) => !this.hiddenNodeIds.has(t),
          isPortMeasurable: (t, i) =>
            !this.hiddenNodeIds.has(t) &&
            !this.flowCore.templateVisibilityRegistry?.isPortHidden(t, i),
          isLabelMeasurable: (t, i) =>
            !this.hiddenEdgeIds.has(t) &&
            !this.flowCore.templateVisibilityRegistry?.isLabelHidden(t, i),
        })),
        (this.lateArrivalQueue = new du()));
    }
    start(e, t, i) {
      this.onCompleteCallback = i;
      let o = this.flowCore.templateVisibilityRegistry;
      ((this.hiddenNodeIds = ms(e, o)),
        (this.hiddenEdgeIds = new Set(
          t.filter((s) => ys(s, this.hiddenNodeIds, o)).map((s) => s.id),
        )));
      let r = t.length > 0;
      ((this.portStabilityDetector = new Is(e.length > 0, 50)),
        (this.labelStabilityDetector = new Is(r, 50)),
        this.initState.collectAlreadyMeasuredItems(e, t),
        Promise.all([
          this.portStabilityDetector.waitForStability(),
          this.labelStabilityDetector.waitForStability(),
        ])
          .then(() => {
            ((this.entitiesStabilized = !0),
              this.startMeasurementTimeout(),
              this.tryFinish());
          })
          .catch((s) => {
            (console.error(PT(s)), this.forceFinish());
          }));
    }
    refreshHiddenEntities() {
      if (this.isInitialized) return;
      let { nodes: e, edges: t } = this.flowCore.getState(),
        i = this.flowCore.templateVisibilityRegistry;
      ((this.hiddenNodeIds = ms(e, i)),
        (this.hiddenEdgeIds = new Set(
          t.filter((o) => ys(o, this.hiddenNodeIds, i)).map((o) => o.id),
        )),
        this.initState.pruneUnmeasurableExpectations(),
        this.tryFinish());
    }
    applyNodeSize(e, t) {
      this.lateArrivalQueue.isFinishing
        ? this.lateArrivalQueue.enqueue({
            method: 'applyNodeSize',
            args: [e, t],
          })
        : (this.initState.trackNodeMeasurement(e, t), this.tryFinish());
    }
    applyNodeSizes(e) {
      for (let { id: t, size: i } of e) this.applyNodeSize(t, i);
    }
    addPort(e, t) {
      this.lateArrivalQueue.isFinishing
        ? this.lateArrivalQueue.enqueue({ method: 'addPort', args: [e, t] })
        : (this.initState.addPort(e, t), this.portStabilityDetector.notify());
    }
    applyPortChanges(e, t) {
      if (this.lateArrivalQueue.isFinishing)
        this.lateArrivalQueue.enqueue({
          method: 'applyPortChanges',
          args: [e, t],
        });
      else {
        for (let { portId: i, portChanges: o } of t)
          o.size &&
            o.position &&
            this.initState.trackPortMeasurement(e, i, o.size, o.position);
        this.tryFinish();
      }
    }
    addEdgeLabel(e, t) {
      this.lateArrivalQueue.isFinishing
        ? this.lateArrivalQueue.enqueue({
            method: 'addEdgeLabel',
            args: [e, t],
          })
        : (this.initState.addLabel(e, t), this.labelStabilityDetector.notify());
    }
    deleteEdgeLabel(e, t) {
      this.lateArrivalQueue.enqueue({
        method: 'deleteEdgeLabel',
        args: [e, t],
      });
    }
    applyEdgeLabelChanges(e, t) {
      if (this.lateArrivalQueue.isFinishing)
        this.lateArrivalQueue.enqueue({
          method: 'applyEdgeLabelChanges',
          args: [e, t],
        });
      else {
        for (let { labelId: i, labelChanges: o } of t)
          o.size && this.initState.trackLabelMeasurement(e, i, o.size);
        this.tryFinish();
      }
    }
    tryFinish() {
      this.lateArrivalQueue.isFinishing ||
        this.isInitialized ||
        (this.entitiesStabilized &&
          this.initState.allEntitiesHaveMeasurements() &&
          this.finish());
    }
    async finish() {
      if (
        (this.clearMeasurementTimeout(),
        this.lateArrivalQueue.startFinishing(),
        this.initState.applyToDiagramState(this.flowCore),
        this.onCompleteCallback)
      )
        try {
          await this.onCompleteCallback();
        } catch (e) {
          console.error(
            '[ngDiagram] Initialization completion failed \u2014 continuing initialization.',
            e,
          );
        }
      ((this.isInitialized = !0),
        this.lateArrivalQueue.processAll(this.flowCore.internalUpdater));
    }
    forceFinish() {
      this.finish();
    }
    startMeasurementTimeout() {
      this.measurementTimeout = setTimeout(() => {
        this.isInitialized ||
          (console.warn(
            '[InitUpdater] Measurement timeout reached. Some entities may not be measurable (e.g., display: none). Ensure the model provided to ng-diagram was created with initializeModel() or initializeModelAdapter() (for custom ModelAdapter). To intentionally hide elements, use the `hidden` flag on nodes/edges or the `hidden` input on ports and edge labels \u2014 hidden elements create no measurement expectations.',
            {
              nodes: {
                expected: this.initState.nodesToMeasure.size,
                measured: this.initState.measuredNodes.size,
              },
              ports: {
                expected: this.initState.portsToMeasure.size,
                measured: this.initState.measuredPorts.size,
              },
              labels: {
                expected: this.initState.labelsToMeasure.size,
                measured: this.initState.measuredLabels.size,
              },
            },
          ),
          this.forceFinish());
      }, 2e3);
    }
    clearMeasurementTimeout() {
      this.measurementTimeout !== null &&
        (clearTimeout(this.measurementTimeout),
        (this.measurementTimeout = null));
    }
  },
  py = ['size', 'position'],
  my = ['size', 'position'],
  RT = ['top', 'bottom', 'left', 'right'],
  lu = class {
    flowCore;
    onPortAddsFlush = (e) =>
      this.flowCore.commandHandler.emit('addPortsBulk', { additions: e });
    onPortUpdatesFlush = (e) =>
      this.flowCore.commandHandler.emit('updatePortsBulk', { updates: e });
    onPortDeletesFlush = (e) =>
      this.flowCore.commandHandler.emit('deletePortsBulk', { deletions: e });
    onLabelAddsFlush = (e) =>
      this.flowCore.commandHandler.emit('addEdgeLabelsBulk', { additions: e });
    onLabelUpdatesFlush = (e) =>
      this.flowCore.commandHandler.emit('updateEdgeLabelsBulk', { updates: e });
    onLabelDeletesFlush = (e) =>
      this.flowCore.commandHandler.emit('deleteEdgeLabelsBulk', {
        deletions: e,
      });
    constructor(e) {
      this.flowCore = e;
    }
    applyNodeSize(e, t) {
      this.applyNodeSizes([{ id: e, size: t }]);
    }
    applyNodeSizes(e) {
      let t = this.flowCore.actionStateManager.isResizing(),
        i = e.filter(({ id: o, size: r }) => {
          if (ol(r)) return !1;
          let s = this.flowCore.getNodeById(o);
          return !(!s || (s.size && t) || Sy(Ae(s), Ae({ size: r })));
        });
      i.length > 0 &&
        this.flowCore.commandHandler.emit('updateNodes', { nodes: i });
    }
    addPort(e, t) {
      (this.flowCore
        .getNodeById(e)
        ?.measuredPorts?.some(({ id: o }) => o === t.id) &&
        this.applyPortChanges(e, [{ portId: t.id, portChanges: ls(t, my) }]),
        this.flowCore.portBatchProcessor.processAdd(
          e,
          t,
          this.onPortAddsFlush,
        ));
    }
    deletePort(e, t) {
      this.flowCore.portBatchProcessor.processDelete(
        e,
        t,
        this.onPortDeletesFlush,
      );
    }
    applyPortChanges(e, t) {
      let i = this.flowCore.getNodeById(e);
      if (!i) return;
      let o = this.filterUnchangedPortUpdates(
        i,
        this.rejectZeroSizePortGeometry(t),
      );
      if (o.length !== 0)
        for (let r of o)
          this.flowCore.portBatchProcessor.processUpdate(
            e,
            r,
            this.onPortUpdatesFlush,
          );
    }
    addEdgeLabel(e, t) {
      (this.flowCore
        .getEdgeById(e)
        ?.measuredLabels?.some(({ id: o }) => o === t.id) &&
        this.applyEdgeLabelChanges(e, [
          { labelId: t.id, labelChanges: ls(t, py) },
        ]),
        this.flowCore.labelBatchProcessor.processAdd(
          e,
          t,
          this.onLabelAddsFlush,
        ));
    }
    deleteEdgeLabel(e, t) {
      this.flowCore.labelBatchProcessor.processDelete(
        e,
        t,
        this.onLabelDeletesFlush,
      );
    }
    applyEdgeLabelChanges(e, t) {
      let i = this.filterUnchangedLabelUpdates(
        e,
        this.rejectZeroSizeLabelGeometry(t),
      );
      if (i.length !== 0)
        for (let o of i)
          this.flowCore.labelBatchProcessor.processUpdate(
            e,
            o,
            this.onLabelUpdatesFlush,
          );
    }
    rejectZeroSizePortGeometry(e) {
      return e
        .map((t) =>
          ol(t.portChanges.size)
            ? y(h({}, t), { portChanges: ls(t.portChanges, my) })
            : t,
        )
        .filter(({ portChanges: t }) => Object.keys(t).length > 0);
    }
    rejectZeroSizeLabelGeometry(e) {
      return e
        .map((t) =>
          ol(t.labelChanges.size)
            ? y(h({}, t), { labelChanges: ls(t.labelChanges, py) })
            : t,
        )
        .filter(({ labelChanges: t }) => Object.keys(t).length > 0);
    }
    filterUnchangedPortUpdates(e, t) {
      let i = new Map((e.measuredPorts ?? []).map((o) => [o.id, o]));
      return t.filter(({ portId: o, portChanges: r }) => {
        let s = i.get(o);
        return !!s && ty(s, r);
      });
    }
    filterUnchangedLabelUpdates(e, t) {
      let i = this.flowCore.getEdgeById(e);
      if (!i) return [];
      let o = new Map((i.measuredLabels ?? []).map((r) => [r.id, r]));
      return t.filter(({ labelId: r, labelChanges: s }) => {
        let a = o.get(r);
        return !!a && ty(a, s);
      });
    }
  },
  uu = class {
    hiddenNodes = new Set();
    hiddenEdges = new Set();
    hiddenPorts = new Map();
    hiddenLabels = new Map();
    onNodeOrEdgeVisibilityChange;
    onPortOrLabelVisibilityChange;
    setNodeHidden(e, t) {
      this.setFlag(this.hiddenNodes, e, t) &&
        this.onNodeOrEdgeVisibilityChange?.();
    }
    setEdgeHidden(e, t) {
      this.setFlag(this.hiddenEdges, e, t) &&
        this.onNodeOrEdgeVisibilityChange?.();
    }
    setPortHidden(e, t, i) {
      this.setNestedFlag(this.hiddenPorts, e, t, i) &&
        this.onPortOrLabelVisibilityChange?.();
    }
    setLabelHidden(e, t, i) {
      this.setNestedFlag(this.hiddenLabels, e, t, i) &&
        this.onPortOrLabelVisibilityChange?.();
    }
    isNodeHidden(e) {
      return this.hiddenNodes.has(e);
    }
    isEdgeHidden(e) {
      return this.hiddenEdges.has(e);
    }
    isPortHidden(e, t) {
      return this.hiddenPorts.get(e)?.has(t) ?? !1;
    }
    isLabelHidden(e, t) {
      return this.hiddenLabels.get(e)?.has(t) ?? !1;
    }
    removeNodeEntries(e) {
      (this.hiddenNodes.delete(e), this.hiddenPorts.delete(e));
    }
    removeEdgeEntries(e) {
      (this.hiddenEdges.delete(e), this.hiddenLabels.delete(e));
    }
    setFlag(e, t, i) {
      return i ? !e.has(t) && (e.add(t), !0) : e.delete(t);
    }
    setNestedFlag(e, t, i, o) {
      if (o) {
        let s = e.get(t) ?? new Set();
        return !s.has(i) && (s.add(i), e.set(t, s), !0);
      }
      let r = e.get(t);
      return !!r?.delete(i) && (r.size === 0 && e.delete(t), !0);
    }
  },
  fu = class {
    renderer;
    inputEventsRouter;
    environment;
    _model;
    _config;
    initUpdater;
    internalUpdater;
    updateSemaphore = new yl(1);
    commandHandler;
    middlewareManager;
    spatialHash;
    modelLookup;
    transactionManager;
    portBatchProcessor;
    labelBatchProcessor;
    actionStateManager;
    edgeRoutingManager;
    eventManager;
    shortcutManager;
    measurementTracker;
    templateVisibilityRegistry;
    visibilityGeneration = new gl();
    interactionCoordinator;
    directRenderStrategy;
    virtualizedRenderStrategy;
    getFlowOffset;
    getViewportSize;
    constructor(e, t, i, o, r, s, a, d = {}) {
      ((this.renderer = t),
        (this.inputEventsRouter = i),
        (this.environment = o),
        (this._model = e),
        (this._config = FS(d, this)),
        (this.environment = o),
        (this.commandHandler = new vl(this)),
        (this.spatialHash = new iu()),
        (this.initUpdater = new cu(this)),
        (this.internalUpdater = new lu(this)),
        (this.modelLookup = new Zl(this)),
        (this.eventManager = new fl()),
        (this.actionStateManager = new sl(this.eventManager)),
        (this.directRenderStrategy = new Kl(this)),
        (this.virtualizedRenderStrategy = new nu(this)),
        (this.middlewareManager = new ql(this, r)),
        (this.transactionManager = new su(this)),
        (this.interactionCoordinator = new El(this)),
        (this.portBatchProcessor = new Yl(this.getNodeById.bind(this))),
        (this.labelBatchProcessor = new Cl(this.getEdgeById.bind(this))),
        (this.measurementTracker = new Il()),
        (this.templateVisibilityRegistry = new uu()),
        (this.templateVisibilityRegistry.onNodeOrEdgeVisibilityChange = () =>
          this.scheduleTemplateVisibilityFlush(!0)),
        (this.templateVisibilityRegistry.onPortOrLabelVisibilityChange = () =>
          this.scheduleTemplateVisibilityFlush(!1)),
        (this.edgeRoutingManager = new ul(
          this.config.edgeRouting.defaultRouting,
          () => this.config.edgeRouting || {},
        )),
        (this.getFlowOffset = s || (() => ({ x: 0, y: 0 }))),
        (this.getViewportSize = a || (() => ({ width: 0, height: 0 }))),
        (this.shortcutManager = new wl(this)),
        this.inputEventsRouter.registerDefaultCallbacks(this),
        this.init());
    }
    destroy() {
      ((this.destroyed = !0),
        this.virtualizedRenderStrategy.destroy(),
        this.eventManager.offAll(),
        this.model.destroy());
    }
    destroyed = !1;
    templateVisibilityFlushScheduled = !1;
    templateVisibilityFlushNeedsPass = !1;
    scheduleTemplateVisibilityFlush(e) {
      ((this.templateVisibilityFlushNeedsPass ||= e),
        this.templateVisibilityFlushScheduled ||
          ((this.templateVisibilityFlushScheduled = !0),
          queueMicrotask(() => {
            this.templateVisibilityFlushScheduled = !1;
            let t = this.templateVisibilityFlushNeedsPass;
            ((this.templateVisibilityFlushNeedsPass = !1),
              this.destroyed ||
                (this.initUpdater.refreshHiddenEntities(),
                t &&
                  this.applyUpdate({}, 'templateVisibilityChange').catch(
                    (i) => {
                      console.error(
                        '[ngDiagram] Failed to apply template visibility change.',
                        i,
                      );
                    },
                  )));
          })));
    }
    init() {
      (this.initializeViewportSize(), this.renderStrategy.init());
    }
    initializeViewportSize() {
      let { width: e, height: t } = this.getViewportSize();
      if (e > 0 && t > 0) {
        let i = this.model.getMetadata();
        this.model.updateMetadata(
          y(h({}, i), {
            viewport: y(h({}, i.viewport), { width: e, height: t }),
          }),
        );
      }
    }
    get model() {
      return this._model;
    }
    getEnvironment() {
      return this.environment;
    }
    get config() {
      return this._config;
    }
    updateConfig(e) {
      this._config = Hf(this._config, e);
    }
    registerMiddleware(e) {
      return this.middlewareManager.register(e);
    }
    unregisterMiddleware(e) {
      this.middlewareManager.unregister(e);
    }
    getState() {
      return {
        nodes: this.model.getNodes(),
        edges: this.model.getEdges(),
        metadata: this.model.getMetadata(),
      };
    }
    get renderStrategy() {
      return this.isVirtualizationActive
        ? this.virtualizedRenderStrategy
        : this.directRenderStrategy;
    }
    setState(e) {
      (this.model.updateNodes(e.nodes),
        this.model.updateEdges(e.edges),
        this.model.updateMetadata(e.metadata),
        this.modelLookup.desynchronize());
    }
    async transaction(e, t, i) {
      let o, r;
      if (
        ((r = typeof e == 'function' ? t : i),
        r?.waitForMeasurements &&
          this.transactionManager.isActive() &&
          console.warn(
            '[ngDiagram] waitForMeasurements is ignored on a nested transaction \u2014 its updates are applied (and measured) only when the root transaction commits. Pass the option to the root transaction instead.',
          ),
        typeof e == 'function')
      )
        o = await this.transactionManager.transaction(e, r ?? {});
      else {
        let a = t;
        if (!a)
          throw new Error(
            'Callback is required when transaction name is provided',
          );
        o = await this.transactionManager.transaction(e, a, r ?? {});
      }
      let s = null;
      return (
        o.commandsCount > 0 &&
          (r?.waitForMeasurements &&
            (s = {
              discoveryWindowMs: r._measurementDiscoveryWindowTimeout,
              debounceMs: r._measurementDebounceTimeout,
            }),
          await this.applyUpdateToModel(o.results, o.actionTypes, s)),
        s && (await this.measurementTracker.waitForMeasurements()),
        o
      );
    }
    async applyUpdate(e, t) {
      let i = Array.isArray(t) ? t : [t];
      if (!this.transactionManager.isActive())
        return this.applyUpdateToModel(e, i);
      this.transactionManager.queueUpdate(e, i);
    }
    async applyUpdateToModel(e, t, i = null) {
      let o = Array.isArray(t) ? t : [t];
      await this.updateSemaphore.acquire();
      try {
        i && this.measurementTracker.requestTracking(i);
        let r = this.getState(),
          s = await this.middlewareManager.execute(r, e, o);
        s
          ? (this.setState(s), this.eventManager.flushDeferredEmits())
          : this.eventManager.clearDeferredEmits();
      } finally {
        (i &&
          this.measurementTracker.isTrackingRequested() &&
          this.measurementTracker.cancelTrackingRequest(),
          this.updateSemaphore.release());
      }
    }
    async trackMeasurements(e) {
      await this.updateSemaphore.acquire();
      try {
        this.measurementTracker.trackParticipants(e);
      } finally {
        this.updateSemaphore.release();
      }
      return this.measurementTracker.waitForMeasurements();
    }
    applyViewportOnlyUpdate(e) {
      let t = this.model.getMetadata(),
        i = t.viewport,
        o = h(h({}, i), e);
      (o.x === i.x && o.y === i.y && o.scale === i.scale) ||
        (this.model.updateMetadata(y(h({}, t), { viewport: o })),
        this.eventManager.emit('viewportChanged', {
          viewport: o,
          previousViewport: i,
        }));
    }
    clientToFlowPosition(e) {
      let { x: t, y: i, scale: o } = this.model.getMetadata().viewport,
        { x: r, y: s } = this.getFlowOffset();
      return { x: (e.x - t - r) / o, y: (e.y - i - s) / o };
    }
    flowToClientPosition(e) {
      let { x: t, y: i, scale: o } = this.model.getMetadata().viewport,
        { x: r, y: s } = this.getFlowOffset();
      return { x: e.x * o + t + r, y: e.y * o + i + s };
    }
    clientToFlowViewportPosition(e) {
      let { x: t, y: i } = this.getFlowOffset();
      return { x: e.x - t, y: e.y - i };
    }
    getNodeById(e) {
      return this.modelLookup.getNodeById(e);
    }
    getEdgeById(e) {
      return this.modelLookup.getEdgeById(e);
    }
    registerInteractionCleanup(e) {
      return this.interactionCoordinator.registerInteractionCleanup(e);
    }
    isCancellingInteraction() {
      return this.interactionCoordinator.isCancellingInteraction();
    }
    hasActiveInteraction() {
      return this.interactionCoordinator.hasActiveInteraction();
    }
    cancelActiveInteraction() {
      return this.interactionCoordinator.cancelActiveInteraction();
    }
    getNodesInRange(e, t) {
      return Uf(this, e, t);
    }
    getNearestNodeInRange(e, t) {
      return bT(this, e, t);
    }
    getNearestPortInRange(e, t) {
      return ST(this, e, t);
    }
    getConnectedEdges(e) {
      return this.modelLookup.getConnectedEdges(e);
    }
    getConnectedNodes(e) {
      return this.modelLookup.getConnectedNodes(e);
    }
    getNodeEnds(e) {
      return this.modelLookup.getNodeEnds(e);
    }
    getChildren(e) {
      return this.modelLookup.getChildren(e);
    }
    getChildrenNested(e) {
      return this.modelLookup.getAllDescendants(e);
    }
    isNestedChild(e, t) {
      return this.modelLookup.isNodeDescendantOfGroup(e, t);
    }
    getParentHierarchy(e) {
      return this.modelLookup.getParentChain(e);
    }
    getOverlappingNodes(e) {
      return _T(this, e);
    }
    isNodeCurrentlyRendered(e) {
      return this.renderStrategy.isNodeRendered(e);
    }
    getScale() {
      return this.model.getMetadata().viewport.scale;
    }
    getViewport() {
      return this.model.getMetadata().viewport;
    }
    get updater() {
      return this.initUpdater.isInitialized
        ? this.internalUpdater
        : this.initUpdater;
    }
    get isInitialized() {
      return this.initUpdater.isInitialized;
    }
    get isVirtualizationActive() {
      return this.config.virtualization.enabled;
    }
    setDebugMode(e) {
      e
        ? ((window.flowCore = this),
          this.middlewareManager.isRegistered(gs.name) ||
            this.registerMiddleware(gs))
        : (delete window.flowCore, this.unregisterMiddleware(gs.name));
    }
  },
  Q = class {
    flow;
    claimedTeardownState;
    constructor(e) {
      this.flow = e;
    }
    claimTeardown(e) {
      this.claimedTeardownState = e;
    }
    isTeardownClaimed(e) {
      return e !== void 0 && e === this.claimedTeardownState;
    }
    cancel() {
      return !1;
    }
  },
  gu = class extends Q {
    startPoint;
    isBoxSelecting = !1;
    handle(e) {
      switch (e.phase) {
        case 'start':
          ((this.startPoint = e.lastInputPoint), (this.isBoxSelecting = !0));
          break;
        case 'continue':
          if (!this.isBoxSelecting || !this.flow.config.boxSelection.realtime)
            break;
          this.boxSelect(e);
          break;
        case 'end':
          if (!this.isBoxSelecting) break;
          (this.boxSelect(e),
            this.flow.commandHandler.emit('selectEnd'),
            (this.startPoint = void 0),
            (this.isBoxSelecting = !1));
      }
    }
    boxSelect(e) {
      if (!this.startPoint) return;
      let t = e.lastInputPoint,
        { x: i, y: o } = this.flow.clientToFlowPosition(this.startPoint),
        { x: r, y: s } = this.flow.clientToFlowPosition(t),
        a = {
          x: Math.min(i, r),
          y: Math.min(o, s),
          width: Math.abs(r - i),
          height: Math.abs(s - o),
        },
        d = this.flow.model.getEdges(),
        c = new Set(
          TT(this.flow, a, this.flow.config.boxSelection.partialInclusion).map(
            (f) => f.id,
          ),
        ),
        l = (f, g) => {
          return f
            ? c.has(f)
            : !!(p = g) &&
                p.x >= a.x &&
                p.x <= a.x + a.width &&
                p.y >= a.y &&
                p.y <= a.y + a.height;
          var p;
        },
        u = d
          .filter(
            (f) =>
              !f.computedHidden &&
              l(f.source, f.sourcePosition) &&
              l(f.target, f.targetPosition),
          )
          .map((f) => f.id);
      this.flow.commandHandler.emit('select', {
        nodeIds: [...c],
        edgeIds: u,
        multiSelection: !1,
      });
    }
  },
  hu = class extends Q {
    async handle() {
      await this.flow.cancelActiveInteraction();
    }
  },
  pu = class extends Q {
    handle() {
      this.flow.commandHandler.emit('copy');
    }
  },
  mu = class extends Q {
    handle() {
      this.flow.commandHandler.emit('cut');
    }
  },
  yu = class extends Q {
    handle() {
      this.flow.commandHandler.emit('deleteSelection');
    }
  },
  $f = (n) => {
    let e = n.modelLookup.getSelectedNodesWithChildren({ directOnly: !1 }),
      t = e.filter(
        (o) => o.selected && !o.computedHidden && (o.draggable ?? !0),
      );
    if (!e.some((o) => o.computedHidden))
      return e.filter((o) => o.draggable ?? !0);
    let i = new Set();
    for (let o of t)
      for (let r of n.modelLookup.getAllDescendantIds(o.id)) i.add(r);
    return e.filter(
      (o) => !!(o.draggable ?? 1) && (!o.computedHidden || i.has(o.id)),
    );
  },
  Jy = (n) => n.config.nodeDraggingEnabled && $f(n).length > 0,
  kT = (n) => `[ngDiagram] Unknown keyboard move direction: "${n}"

Valid directions are: ${RT.map((e) => `'${e}'`).join(', ')}

This indicates a programming error. Check keyboard shortcut configuration.

Documentation: https://www.ngdiagram.dev/docs/guides/shortcut-manager/
`,
  yy = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  },
  vu = class extends Q {
    handle(e) {
      let t = $f(this.flow);
      if (t.length === 0) return;
      let i = this.getRootNodes(t),
        o = this.getDelta(e.direction, i);
      (this.flow.commandHandler.emit('moveNodesBy', { nodes: t, delta: o }),
        this.flow.config.viewportPanningEnabled &&
          this.panViewportIfNeeded(e.direction, t, o));
    }
    getRootNodes(e) {
      let t = new Set(e.map((i) => i.id));
      return e.filter((i) => i.groupId == null || !t.has(i.groupId));
    }
    getDelta(e, t) {
      let { computeSnapForNodeDrag: i, defaultDragSnap: o } =
          this.flow.config.snapping,
        r = t.reduce(
          (a, d) => {
            let { width: c, height: l } = i(d) ?? o;
            return {
              width: Math.max(a.width, c),
              height: Math.max(a.height, l),
            };
          },
          { width: 0, height: 0 },
        ),
        s = yy[e];
      if (!s) throw new Error(kT(e));
      return { x: s.x * r.width, y: s.y * r.height };
    }
    panViewportIfNeeded(e, t, i) {
      let o = this.calculatePanAmount(e, t, i);
      o > 0 && this.emitViewportPan(e, o);
    }
    calculatePanAmount(e, t, i) {
      let { viewport: o } = this.flow.model.getMetadata();
      if (!o.width || !o.height) return 0;
      let r = this.getViewportBounds(o.x, o.y, o.width, o.height, o.scale);
      return t.reduce((s, a) => {
        let d = this.calculateNodeOverflow(a, i, e, r);
        return Math.max(s, d);
      }, 0);
    }
    getViewportBounds(e, t, i, o, r) {
      let { edgePanningThreshold: s } = this.flow.config.selectionMoving,
        a = s / r;
      return {
        left: -e / r + a,
        top: -t / r + a,
        right: (-e + i) / r - a,
        bottom: (-t + o) / r - a,
      };
    }
    calculateNodeOverflow(e, t, i, o) {
      let r = this.getSnappedPosition(e, t),
        s = this.getNodeBounds(e, r);
      switch (i) {
        case 'left':
          return o.left - s.left;
        case 'right':
          return s.right - o.right;
        case 'top':
          return o.top - s.top;
        case 'bottom':
          return s.bottom - o.bottom;
      }
    }
    getNodeBounds(e, t) {
      let i = Bf(
        {
          x: t.x,
          y: t.y,
          width: e.size?.width ?? 100,
          height: e.size?.height ?? 50,
        },
        e.angle ?? 0,
      );
      return {
        left: i.x,
        top: i.y,
        right: i.x + i.width,
        bottom: i.y + i.height,
      };
    }
    getSnappedPosition(e, t) {
      return Ws(this.flow.config, e, {
        x: e.position.x + t.x,
        y: e.position.y + t.y,
      });
    }
    emitViewportPan(e, t) {
      let { viewport: i } = this.flow.model.getMetadata(),
        o = t * i.scale,
        r = yy[e];
      this.flow.commandHandler.emit('moveViewportBy', {
        x: r.x === 0 ? 0 : -r.x * o,
        y: r.y === 0 ? 0 : -r.y * o,
      });
    }
  },
  wu = class extends Q {
    handle(e) {
      let t = 0,
        i = 0;
      switch (e.direction) {
        case 'top':
          i = -10;
          break;
        case 'bottom':
          i = 10;
          break;
        case 'left':
          t = -10;
          break;
        case 'right':
          t = 10;
          break;
        default:
          return;
      }
      this.flow.commandHandler.emit('moveViewportBy', { x: t, y: i });
    }
  },
  AT = (n) => `[ngDiagram] Linking event missing target node.

Event details:
  \u2022 Phase: ${n.phase}
  \u2022 Port ID: ${n.portId}
  \u2022 Target type: ${n.targetType}
  \u2022 Pointer position: (${n.lastInputPoint.x}, ${n.lastInputPoint.y})

This indicates a programming error. Linking start events must have a target node.

Documentation: https://www.ngdiagram.dev/docs/guides/edges/edges/
`,
  Du = class extends Q {
    handle(e) {
      if (!this.flow.isCancellingInteraction())
        switch (e.phase) {
          case 'start': {
            let t = e.target?.id;
            if (!t) throw new Error(AT(e));
            if (this.flow.actionStateManager.isLinking()) {
              console.warn(
                '[ngDiagram] startLinking ignored: another linking or relinking gesture is in progress.',
              );
              break;
            }
            ((this.flow.actionStateManager.linking = qs({
              sourceNodeId: t,
              sourcePortId: e.portId,
              temporaryEdge: null,
            })),
              this.flow.commandHandler.emit('startLinking', {
                source: t,
                sourcePort: e.portId,
              }));
            break;
          }
          case 'continue': {
            if (!this.flow.actionStateManager.isLinking()) break;
            let t = this.flow.clientToFlowPosition(e.lastInputPoint);
            (this.flow.config.viewportPanningEnabled &&
              e.panningForce &&
              this.flow.commandHandler.emit('moveViewportBy', {
                x: e.panningForce.x,
                y: e.panningForce.y,
              }),
              this.flow.commandHandler.emit('moveTemporaryEdge', {
                position: t,
              }));
            break;
          }
          case 'end': {
            if (!this.flow.actionStateManager.isLinking()) break;
            if (e.takenOver) {
              this.flow.commandHandler.emit('cancelLinking');
              break;
            }
            let t = this.flow.clientToFlowPosition(e.lastInputPoint);
            this.flow.commandHandler.emit('finishLinking', { position: t });
            break;
          }
        }
    }
    async cancel() {
      let e = this.flow.actionStateManager.linking;
      return !(
        !e ||
        e._finishing ||
        (await this.flow.commandHandler.emit('cancelLinking'), 0)
      );
    }
  },
  OT = (n) => `[ngDiagram] Relinking event missing target edge.

Event details:
  \u2022 Phase: ${n.phase}
  \u2022 End: ${n.end}
  \u2022 Target type: ${n.targetType}
  \u2022 Pointer position: (${n.lastInputPoint.x}, ${n.lastInputPoint.y})

This indicates a programming error. Relinking start events must have a target edge.
`,
  Eu = class extends Q {
    handle(e) {
      if (this.flow.isCancellingInteraction()) return;
      let t = () => this.flow.actionStateManager.linking?.relink;
      switch (e.phase) {
        case 'start': {
          let i = e.target?.id;
          if (!i) throw new Error(OT(e));
          this.flow.commandHandler.emit('startRelinking', {
            edgeId: i,
            end: e.end,
          });
          break;
        }
        case 'continue': {
          if (!t()) break;
          let i = this.flow.clientToFlowPosition(e.lastInputPoint);
          (this.flow.config.viewportPanningEnabled &&
            e.panningForce &&
            this.flow.commandHandler.emit('moveViewportBy', {
              x: e.panningForce.x,
              y: e.panningForce.y,
            }),
            this.flow.commandHandler.emit('moveTemporaryEdge', {
              position: i,
            }));
          break;
        }
        case 'end': {
          if (!t()) break;
          if (e.takenOver) {
            this.flow.commandHandler.emit('cancelLinking');
            break;
          }
          let i = this.flow.clientToFlowPosition(e.lastInputPoint);
          this.flow.commandHandler.emit('finishRelinking', { position: i });
          break;
        }
      }
    }
  },
  Cu = class extends Q {
    handle(e) {
      let { data: t, lastInputPoint: i } = e;
      this.flow.commandHandler.emit('paletteDropNode', {
        node: y(h({}, t), {
          id: this.flow.config.computeNodeId(),
          position: this.flow.clientToFlowPosition({ x: i.x, y: i.y }),
        }),
      });
    }
  },
  Iu = class extends Q {
    lastPoint;
    handle(e) {
      if (!this.flow.isCancellingInteraction())
        switch (e.phase) {
          case 'start':
            ((this.lastPoint = e.lastInputPoint),
              (this.flow.actionStateManager.panning = { active: !0 }));
            break;
          case 'continue':
            if (!this.flow.actionStateManager.isPanning() || !this.lastPoint)
              break;
            (this.flow.commandHandler.emit('moveViewportBy', {
              x: e.lastInputPoint.x - this.lastPoint.x,
              y: e.lastInputPoint.y - this.lastPoint.y,
            }),
              (this.lastPoint = e.lastInputPoint));
            break;
          case 'end':
            ((this.lastPoint = void 0),
              this.flow.actionStateManager.clearPanning());
        }
    }
    cancel() {
      return (
        !!this.flow.actionStateManager.isPanning() &&
        ((this.lastPoint = void 0),
        this.flow.actionStateManager.clearPanning(),
        !0)
      );
    }
  },
  Mu = class extends Q {
    lastPoint;
    accumulatedDelta = { x: 0, y: 0 };
    rafScheduled = !1;
    handle(e) {
      if (!this.flow.isCancellingInteraction())
        switch (e.phase) {
          case 'start':
            ((this.lastPoint = e.lastInputPoint),
              (this.accumulatedDelta = { x: 0, y: 0 }),
              (this.flow.actionStateManager.panning = { active: !0 }));
            break;
          case 'continue': {
            if (!this.flow.actionStateManager.isPanning() || !this.lastPoint)
              break;
            let t = e.lastInputPoint.y - this.lastPoint.y;
            ((this.accumulatedDelta.x += e.lastInputPoint.x - this.lastPoint.x),
              (this.accumulatedDelta.y += t),
              (this.lastPoint = e.lastInputPoint),
              this.scheduleFlush());
            break;
          }
          case 'end':
            (this.flushDelta(),
              (this.lastPoint = void 0),
              (this.rafScheduled = !1),
              this.flow.actionStateManager.clearPanning());
        }
    }
    cancel() {
      return (
        !!this.flow.actionStateManager.isPanning() &&
        ((this.accumulatedDelta = { x: 0, y: 0 }),
        (this.lastPoint = void 0),
        (this.rafScheduled = !1),
        this.flow.actionStateManager.clearPanning(),
        !0)
      );
    }
    scheduleFlush() {
      this.rafScheduled ||
        ((this.rafScheduled = !0),
        requestAnimationFrame(() => {
          (this.flushDelta(), (this.rafScheduled = !1));
        }));
    }
    flushDelta() {
      let { x: e, y: t } = this.accumulatedDelta;
      (e === 0 && t === 0) ||
        (this.flow.commandHandler.emit('moveViewportBy', { x: e, y: t }),
        (this.accumulatedDelta = { x: 0, y: 0 }));
    }
  };
function FT(n) {
  return n.isVirtualizationActive ? new Mu(n) : new Iu(n);
}
var bu = class extends Q {
  handle(e) {
    this.flow.commandHandler.emit('paste', this.getPasteParameters(e));
  }
  getPasteParameters(e) {
    return e.lastInputPoint
      ? { position: this.flow.clientToFlowPosition(e.lastInputPoint) }
      : {};
  }
};
var Su = class extends Q {
    gesture = null;
    async handle(e) {
      if (!this.flow.isCancellingInteraction())
        switch (e.phase) {
          case 'start': {
            let t = this.flow.clientToFlowPosition(e.lastInputPoint);
            ((this.gesture = {
              startPoint: t,
              lastPointerPosition: t,
              hasMoved: !1,
              ended: !1,
            }),
              (this.flow.actionStateManager.dragging = {
                nodeIds: [],
                modifiers: h({}, e.modifiers),
                accumulatedDeltas: new Map(),
                movementStarted: !1,
              }));
            break;
          }
          case 'continue': {
            let t = this.draggableSelection(),
              i = this.visibleSelection(),
              o = this.gesture;
            if (t.length === 0 || !o || o.ended) return;
            let { startPoint: r, lastPointerPosition: s } = o,
              a = this.flow.clientToFlowPosition(e.lastInputPoint),
              d = !o.hasMoved && j.distanceBetweenPoints(r, a) >= 5,
              c = t.map((f) => f.id);
            d &&
              ((o.hasMoved = !0),
              (o.initialPositions = new Map(
                t.map((f) => [f.id, h({}, f.position)]),
              )),
              (this.flow.actionStateManager.dragging = {
                nodeIds: c,
                modifiers: h({}, e.modifiers),
                movementStarted: !0,
                accumulatedDeltas: new Map(),
              }));
            let l = j.subtractPoints(a, s),
              u = o.hasMoved;
            if (
              (this.flow.actionStateManager.dragging &&
                (this.flow.actionStateManager.dragging.modifiers = h(
                  {},
                  e.modifiers,
                )),
              (o.lastPointerPosition = a),
              d &&
                (await this.flow.commandHandler.emit('moveNodesStart', {
                  nodeIds: c,
                }),
                this.gesture !== o || o.ended))
            )
              break;
            u &&
              (this.flow.transaction('moveNodes', async (f) => {
                (await f.emit('moveNodesBy', { delta: l, nodes: t }),
                  this.updateGroupHighlightOnDrag(f, a, i));
              }),
              this.panDiagramOnScreenEdge(e.panningForce));
            break;
          }
          case 'end': {
            let t = this.gesture;
            t && (t.ended = !0);
            let i = this.flow.actionStateManager.dragging?.nodeIds ?? [],
              o = this.flow.clientToFlowPosition(e.lastInputPoint);
            try {
              if (t?.hasMoved)
                try {
                  (Ue(o, t.lastPointerPosition) ||
                    (await this.flow.commandHandler.emit('moveNodesBy', {
                      delta: j.subtractPoints(o, t.lastPointerPosition),
                      nodes: this.draggableSelection(),
                    })),
                    await this.handleDrop(o));
                } finally {
                  await this.flow.commandHandler.emit('moveNodesStop', {
                    nodeIds: i,
                  });
                }
            } finally {
              this.gesture === t &&
                (this.flow.actionStateManager.highlightGroup &&
                  this.flow.commandHandler.emit('highlightGroupClear'),
                this.flow.actionStateManager.clearDragging(),
                (this.gesture = null));
            }
          }
        }
    }
    async cancel() {
      let e = this.gesture,
        t = this.flow.actionStateManager.dragging;
      if ((!e && !t) || e?.ended) return !1;
      let i = !!t && (e?.hasMoved ?? !1),
        o = !!this.flow.actionStateManager.highlightGroup;
      return (
        e && (e.ended = !0),
        i && t && (t.cancelReason = 'cancelled'),
        (i || o) &&
          (await this.flow.transaction('cancelDrag', async (r) => {
            if (i) {
              let s = e?.initialPositions;
              (s?.size &&
                (await r.emit('updateNodes', {
                  nodes: [...s].map(([a, d]) => ({ id: a, position: d })),
                })),
                await r.emit('moveNodesStop', { nodeIds: t?.nodeIds ?? [] }));
            }
            o && (await r.emit('highlightGroupClear'));
          })),
        t &&
          this.flow.actionStateManager.dragging === t &&
          this.flow.actionStateManager.clearDragging(),
        this.gesture === e && (this.gesture = null),
        !0
      );
    }
    draggableSelection() {
      return $f(this.flow);
    }
    updateGroupHighlightOnDrag(e, t, i) {
      let o = this.getTopGroupAtPoint(t),
        r = this.flow.actionStateManager.highlightGroup?.highlightedGroupId;
      o && i.some((s) => s.groupId !== o.id)
        ? r !== o.id && e.emit('highlightGroup', { groupId: o.id, nodes: i })
        : r && e.emit('highlightGroupClear');
    }
    getTopGroupAtPoint(e) {
      return bM(
        this.flow.getNodesInRange(e, 1).filter((t) => ci(t) && !t.selected),
        this.flow.getState().nodes,
      )[0];
    }
    visibleSelection() {
      return this.flow.modelLookup
        .getSelectedNodes()
        .filter((e) => !e.computedHidden);
    }
    async handleDrop(e) {
      let t = this.getTopGroupAtPoint(e),
        i = this.visibleSelection();
      if (t)
        await this.flow.commandHandler.emit('addToGroup', {
          groupId: t.id,
          nodeIds: i.map((o) => o.id),
        });
      else
        for (let o of i)
          o.groupId === void 0 ||
            i.find((r) => r.id === o.groupId) ||
            (await this.flow.commandHandler.emit('removeFromGroup', {
              groupId: o.groupId,
              nodeIds: [o.id],
            }));
    }
    panDiagramOnScreenEdge(e) {
      e && this.flow.commandHandler.emit('moveViewportBy', { x: e.x, y: e.y });
    }
  },
  Tu = class extends Q {
    handle() {
      this.flow.model.redo();
    }
  },
  LT = (n) => `[ngDiagram] Resize event missing target node.

Event details:
  \u2022 Phase: ${n.phase}
  \u2022 Direction: ${n.direction}
  \u2022 Target type: ${n.targetType}
  \u2022 Pointer position: (${n.lastInputPoint.x}, ${n.lastInputPoint.y})

This indicates a programming error. Resize events must have a target node.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/resizing/`,
  _u = class extends Q {
    lastContinuePoint = null;
    async handle(e) {
      if (this.flow.isCancellingInteraction()) return;
      if (!e.target) throw new Error(LT(e));
      let { x: t, y: i } = this.flow.clientToFlowPosition(e.lastInputPoint);
      switch (e.phase) {
        case 'start': {
          let o = this.flow.getNodeById(e.target.id);
          o &&
            o.size &&
            ((this.lastContinuePoint = null),
            (this.flow.actionStateManager.resize = {
              startX: t,
              startY: i,
              startWidth: o.size.width,
              startHeight: o.size.height,
              startNodePositionX: o.position.x,
              startNodePositionY: o.position.y,
              resizingNode: o,
            }),
            await this.flow.commandHandler.emit('resizeNodeStart', {
              nodeId: o.id,
            }));
          break;
        }
        case 'continue': {
          let o = this.flow.actionStateManager.resize;
          if (!o) break;
          ((this.lastContinuePoint = { x: t, y: i }),
            this.flow.commandHandler.emit(
              'resizeNode',
              this.buildResizeCommand(o, e.target.id, e.direction, {
                x: t,
                y: i,
              }),
            ));
          break;
        }
        case 'end': {
          let o = this.flow.actionStateManager.resize;
          this.claimTeardown(o);
          try {
            o &&
              o.resizingNode.id === e.target.id &&
              (Ue(
                { x: t, y: i },
                this.lastContinuePoint ?? { x: o.startX, y: o.startY },
              ) ||
                (await this.flow.commandHandler.emit(
                  'resizeNode',
                  this.buildResizeCommand(o, e.target.id, e.direction, {
                    x: t,
                    y: i,
                  }),
                )));
          } finally {
            try {
              await this.flow.commandHandler.emit('resizeNodeStop', {
                nodeId: o?.resizingNode.id,
              });
            } finally {
              this.flow.actionStateManager.resize === o &&
                this.flow.actionStateManager.clearResize();
            }
          }
          break;
        }
      }
    }
    buildResizeCommand(e, t, i, o) {
      let {
          startHeight: r,
          startNodePositionX: s,
          startNodePositionY: a,
          startWidth: d,
          startX: c,
          startY: l,
        } = e,
        u = Math.round(o.x - c),
        f = Math.round(o.y - l),
        g = d,
        p = r,
        v = s,
        D = a;
      switch (i) {
        case 'top-left':
          ((g = d - u), (v = s + (d - g)), (p = r - f), (D = a + (r - p)));
          break;
        case 'top':
          ((p = r - f), (D = a + (r - p)));
          break;
        case 'top-right':
          ((g = d + u), (p = r - f), (D = a + (r - p)));
          break;
        case 'right':
          g = d + u;
          break;
        case 'bottom-right':
          ((g = d + u), (p = r + f));
          break;
        case 'bottom':
          p = r + f;
          break;
        case 'bottom-left':
          ((g = d - u), (v = s + (d - g)), (p = r + f));
          break;
        case 'left':
          ((g = d - u), (v = s + (d - g)));
      }
      let C = {
        id: t,
        disableAutoSize: !0,
        size: { width: Math.round(g), height: Math.round(p) },
      };
      return (
        (v === s && D === a) ||
          (C.position = { x: Math.round(v), y: Math.round(D) }),
        C
      );
    }
    async cancel() {
      let e = this.flow.actionStateManager.resize;
      if (!e || this.isTeardownClaimed(e)) return !1;
      (this.claimTeardown(e), (e.cancelReason = 'cancelled'));
      let {
        startWidth: t,
        startHeight: i,
        startNodePositionX: o,
        startNodePositionY: r,
        resizingNode: s,
      } = e;
      return (
        await this.flow.transaction('cancelResize', async (a) => {
          (await a.emit('updateNode', {
            id: s.id,
            nodeChanges: {
              size: { width: t, height: i },
              position: { x: o, y: r },
              autoSize: s.autoSize,
            },
          }),
            await a.emit('resizeNodeStop', { nodeId: s.id }));
        }),
        this.flow.actionStateManager.resize === e &&
          this.flow.actionStateManager.clearResize(),
        !0
      );
    }
  };
var BT = (n) => `[ngDiagram] Rotate event missing target node.

Event details:
  \u2022 Phase: ${n.phase}
  \u2022 Target type: ${n.targetType}
  \u2022 Pointer position: (${n.lastInputPoint.x}, ${n.lastInputPoint.y})
  \u2022 Center: (${n.center.x}, ${n.center.y})

This indicates a programming error. Rotation events must have a target node.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/rotation/`,
  Nu = class extends Q {
    async handle(e) {
      if (this.flow.isCancellingInteraction()) return;
      let { center: t, lastInputPoint: i, target: o, phase: r } = e;
      if (!o) throw new Error(BT(e));
      let s = o?.id,
        a = this.flow.clientToFlowPosition(i);
      switch (r) {
        case 'start': {
          let d = this.flow.getNodeById(s);
          if (!d) return;
          let c = j.angleBetweenPoints(t, a);
          ((this.flow.actionStateManager.rotation = {
            startAngle: c,
            initialNodeAngle: d.angle ?? 0,
            nodeId: s,
          }),
            await this.flow.commandHandler.emit('rotateNodeStart', {
              nodeId: s,
            }));
          break;
        }
        case 'continue': {
          let d = this.flow.actionStateManager.rotation;
          if (!d || d.nodeId !== s) return;
          let c = this.computeTargetAngle(d, a, t);
          if (c === null) return;
          this.flow.commandHandler.emit('rotateNodeTo', {
            nodeId: s,
            angle: c,
          });
          break;
        }
        case 'end': {
          let d = this.flow.actionStateManager.rotation;
          this.claimTeardown(d);
          try {
            if (d && d.nodeId === s) {
              let c = this.computeTargetAngle(d, a, t);
              c !== null &&
                (await this.flow.commandHandler.emit('rotateNodeTo', {
                  nodeId: s,
                  angle: c,
                }));
            }
          } finally {
            try {
              await this.flow.commandHandler.emit('rotateNodeStop', {
                nodeId: d?.nodeId,
              });
            } finally {
              this.flow.actionStateManager.rotation === d &&
                this.flow.actionStateManager.clearRotation();
            }
          }
          break;
        }
      }
    }
    computeTargetAngle(e, t, i) {
      if (j.distanceBetweenPoints(t, i) < 30) return null;
      let o = j.angleBetweenPoints(i, t);
      return e.initialNodeAngle + (o - e.startAngle);
    }
    async cancel() {
      let e = this.flow.actionStateManager.rotation;
      return !(
        !e ||
        this.isTeardownClaimed(e) ||
        (this.claimTeardown(e),
        (e.cancelReason = 'cancelled'),
        await this.flow.transaction('cancelRotate', async (t) => {
          (await t.emit('updateNode', {
            id: e.nodeId,
            nodeChanges: { angle: e.initialNodeAngle },
          }),
            await t.emit('rotateNodeStop', { nodeId: e.nodeId }));
        }),
        this.flow.actionStateManager.rotation === e &&
          this.flow.actionStateManager.clearRotation(),
        0)
      );
    }
  },
  xu = class extends Q {
    handle() {
      (this.flow.commandHandler.emit('selectAll'),
        this.flow.commandHandler.emit('selectEnd'));
    }
  },
  Pu = class extends Q {
    handle(e) {
      if (e.phase === 'end')
        return void this.flow.commandHandler.emit('selectEnd');
      let t = this.getTargetElements(e),
        i = this.flow.shortcutManager.matchesAction('multiSelection', {
          modifiers: e.modifiers,
        });
      if (!t && !i) return void this.flow.commandHandler.emit('deselectAll');
      if (!t) return;
      let { target: o } = e,
        r = o?.selected;
      r && i
        ? this.flow.commandHandler.emit('deselect', t)
        : this.flow.commandHandler.emit(
            'select',
            y(h({}, t), { multiSelection: r || i }),
          );
    }
    getTargetElements(e) {
      return e.targetType !== 'diagram' && e.target
        ? e.targetType === 'node'
          ? { nodeIds: [e.target.id], edgeIds: void 0 }
          : e.targetType === 'edge'
            ? { nodeIds: void 0, edgeIds: [e.target.id] }
            : void 0
        : null;
    }
  },
  Ru = class extends Q {
    handle() {
      this.flow.model.undo();
    }
  };
var ku = class extends Q {
    idleTimeout;
    handle(e) {
      let { deltaX: t, deltaY: i } = e;
      (t === 0 && i === 0) ||
        (this.activatePanning(),
        this.flow.commandHandler.emit('moveViewportBy', {
          x: -t || 0,
          y: -i || 0,
        }));
    }
    activatePanning() {
      ((this.flow.actionStateManager.panning = { active: !0 }),
        this.idleTimeout !== void 0 && clearTimeout(this.idleTimeout),
        (this.idleTimeout = setTimeout(() => {
          (this.flow.actionStateManager.clearPanning(),
            (this.idleTimeout = void 0));
        }, 100)));
    }
  },
  Au = class extends Q {
    handle(e) {
      let {
          centerPoint: { x: t, y: i },
          zoomFactor: o,
        } = e,
        { x: r, y: s, scale: a } = this.flow.getState().metadata.viewport,
        { x: d, y: c } = this.flow.getFlowOffset(),
        l = (t - r - d) / a,
        u = (i - s - c) / a;
      ((a *= o),
        (a = j.clamp({
          min: this.flow.config.zoom.min,
          value: a,
          max: this.flow.config.zoom.max,
        })),
        (r += ((t - r - d) / a - l) * a),
        (s += ((i - s - c) / a - u) * a),
        this.flow.commandHandler.emit('zoom', { x: r, y: s, scale: a }));
    }
  },
  Ou = class {
    handlers = {};
    emit(e) {
      let t = this.handlers[e.name];
      if (t) return t.handle(e);
      console.warn(`No handler registered for event: ${e.name}`);
    }
    register(e, t) {
      this.handlers[e] = t;
    }
    registerDefaultCallbacks(e) {
      (this.register('copy', new pu(e)),
        this.register('select', new Pu(e)),
        this.register('selectAll', new xu(e)),
        this.register('panning', FT(e)),
        this.register('keyboardPanning', new wu(e)),
        this.register('wheelPanning', new ku(e)),
        this.register('pointerMoveSelection', new Su(e)),
        this.register('keyboardMoveSelection', new vu(e)),
        this.register('resize', new _u(e)),
        this.register('paste', new bu(e)),
        this.register('deleteSelection', new yu(e)),
        this.register('zoom', new Au(e)),
        this.register('linking', new Du(e)),
        this.register('relinking', new Eu(e)),
        this.register('rotate', new Nu(e)),
        this.register('paletteDrop', new Cu(e)),
        this.register('cut', new mu(e)),
        this.register('boxSelection', new gu(e)),
        this.register('undo', new Ru(e)),
        this.register('redo', new Tu(e)),
        this.register('cancelInteraction', new hu(e)));
    }
    hasHandler(e) {
      return !!this.handlers[e];
    }
    async cancel(e) {
      return (await this.handlers[e]?.cancel()) ?? !1;
    }
  },
  fo = class n {
    get os() {
      return this.detectOS();
    }
    get browser() {
      return this.detectBrowser();
    }
    get runtime() {
      return this.isClient ? 'web' : 'node';
    }
    get isClient() {
      return this.checkIfClient();
    }
    detectOS() {
      if (!this.isClient) return null;
      let e = window.navigator.userAgent;
      return /iPhone|iPad|iPod/.test(e)
        ? 'iOS'
        : /Mac/.test(e)
          ? 'MacOS'
          : /Win/.test(e)
            ? 'Windows'
            : /Android/.test(e)
              ? 'Android'
              : /Linux/.test(e)
                ? 'Linux'
                : 'Other';
    }
    detectBrowser() {
      if (!this.isClient) return null;
      let e = window.navigator.userAgent;
      return /OPR/.test(e)
        ? 'Opera'
        : /Edge|Edg/.test(e)
          ? 'Edge'
          : /Chrome/.test(e)
            ? 'Chrome'
            : /Firefox/.test(e)
              ? 'Firefox'
              : /Safari/.test(e)
                ? 'Safari'
                : /Trident/.test(e)
                  ? 'IE'
                  : 'Unknown';
    }
    checkIfClient() {
      return typeof window < 'u' && typeof document < 'u';
    }
    now() {
      return this.isClient ? performance.now() : Date.now();
    }
    generateId() {
      return this.isClient &&
        typeof crypto < 'u' &&
        typeof crypto.randomUUID == 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
  },
  ue = class n extends Ou {
    environment = m(fo);
    getBaseEvent(e) {
      return {
        modifiers: this.getModifiers(e),
        id: this.environment.generateId(),
        timestamp: this.environment.now(),
      };
    }
    eventGuards = {
      isPointerEvent: this.isPointerEvent.bind(this),
      isKeyboardEvent: this.isKeyboardEvent.bind(this),
      isWheelEvent: this.isWheelEvent.bind(this),
      isDomEvent: this.isDomEvent.bind(this),
      withPrimaryModifier: this.withPrimaryModifier.bind(this),
      withSecondaryModifier: this.withSecondaryModifier.bind(this),
      withShiftModifier: this.withShiftModifier.bind(this),
      withMetaModifier: this.withMetaModifier.bind(this),
      withoutModifiers: this.withoutModifiers.bind(this),
      withPrimaryButton: this.withPrimaryButton.bind(this),
      isArrowKeyPressed: this.isArrowKeyPressed.bind(this),
      isKeyPressed: this.isKeyPressed.bind(this),
      isKeyComboPressed: this.isKeyComboPressed.bind(this),
    };
    keysMap = {
      arrows: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
      },
      keys: { delete: 'Delete', backspace: 'Backspace' },
    };
    getPrimaryModifierKey() {
      return this.environment.isClient && this.environment.os === 'MacOS'
        ? 'metaKey'
        : 'ctrlKey';
    }
    isPointerEvent(e) {
      return this.environment.isClient && e instanceof PointerEvent;
    }
    isKeyboardEvent(e) {
      return this.environment.isClient && e instanceof KeyboardEvent;
    }
    isWheelEvent(e) {
      return this.environment.isClient && e instanceof WheelEvent;
    }
    isDomEvent(e) {
      return (
        this.isPointerEvent(e) ||
        this.isKeyboardEvent(e) ||
        this.isWheelEvent(e)
      );
    }
    getModifiers(e) {
      return this.isDomEvent(e)
        ? {
            primary: e[this.getPrimaryModifierKey()],
            secondary: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey,
          }
        : { primary: !1, secondary: !1, shift: !1, meta: !1 };
    }
    withPrimaryModifier(e) {
      return this.getModifiers(e).primary;
    }
    withSecondaryModifier(e) {
      return this.getModifiers(e).secondary;
    }
    withShiftModifier(e) {
      return this.getModifiers(e).shift;
    }
    withMetaModifier(e) {
      return this.getModifiers(e).meta;
    }
    withoutModifiers(e) {
      let t = this.getModifiers(e);
      return Object.values(t).every((i) => i === !1);
    }
    withPrimaryButton(e) {
      return this.isPointerEvent(e) && (e.button === void 0 || e.button === 0);
    }
    isArrowKeyPressed(e) {
      return (
        this.isKeyboardEvent(e) &&
        Object.values(this.keysMap.arrows).includes(e.key)
      );
    }
    isKeyPressed(e) {
      return (t) => this.isKeyboardEvent(t) && t.key === e;
    }
    isKeyComboPressed(e, ...t) {
      return (i) => {
        if (!this.isKeyboardEvent(i)) return !1;
        let o = this.getModifiers(i);
        return !!t.every((r) => o[r]) && this.isKeyPressed(e)(i);
      };
    }
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  st = class n {
    clear() {
      throw new Error('Method not implemented.');
    }
    isInitialized = P(!1);
    viewportPannable = P(!0);
    nodes = P([]);
    edges = P([]);
    viewport = P({ x: 0, y: 0, scale: 1 });
    draw(e, t, i) {
      (this.nodes.set(e), this.edges.set(t), this.viewport.set(i));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  z = class n {
    renderer = m(st);
    inputEventsRouter = m(ue);
    environment = m(fo);
    flowCore = null;
    _isInitialized = P(!1);
    isInitialized = this._isInitialized.asReadonly();
    init(e, t, i, o, r) {
      ((this.flowCore = new fu(
        e,
        this.renderer,
        this.inputEventsRouter,
        this.environment,
        t,
        i,
        o,
        r,
      )),
        this._isInitialized.set(!0));
    }
    destroy() {
      this.flowCore &&
        (this.flowCore.destroy(),
        (this.flowCore = null),
        this._isInitialized.set(!1));
    }
    provide() {
      if (!this.flowCore)
        throw new Error(`[ngDiagram] Library engine not initialized yet.

To fix this, wait for initialization to complete using one of these methods:
  \u2022 Use "isInitialized" signal from NgDiagramService
  \u2022 Use "diagramInit" event handler passed to NgDiagramComponent

Documentation: https://www.ngdiagram.dev/docs/guides/model-initialization/#waiting-for-initialization
`);
      return this.flowCore;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Ms = class n {
    flowCoreProvider = m(z);
    element;
    cachedOffset = null;
    isInteractionActive = !1;
    getFlowOffset = () => {
      if (this.isInteractionActive && this.cachedOffset)
        return this.cachedOffset;
      let e = this.element.getBoundingClientRect(),
        t = { x: e.left, y: e.top };
      return (this.isInteractionActive && (this.cachedOffset = t), t);
    };
    initialize(e) {
      ((this.element = e),
        this.flowCoreProvider
          .provide()
          .eventManager.on('actionStateChanged', (t) => {
            let { actionState: i } = t,
              o = !!(
                i.dragging ||
                i.linking ||
                i.resize ||
                i.rotation ||
                i.panning ||
                i.selection
              );
            o && !this.isInteractionActive
              ? (this.isInteractionActive = !0)
              : !o &&
                this.isInteractionActive &&
                ((this.isInteractionActive = !1), (this.cachedOffset = null));
          }));
    }
    invalidateCache() {
      this.cachedOffset = null;
    }
    reset() {
      ((this.cachedOffset = null), (this.isInteractionActive = !1));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  zt = class n {
    ngZone = m(Te);
    observer = null;
    observedElements = new WeakMap();
    entityIndex = new Map();
    config = null;
    rafId = null;
    pendingEntries = new Map();
    constructor() {
      this.ngZone.runOutsideAngular(() => {
        this.observer = new ResizeObserver((e) => {
          let t = this.config?.activeResizeNodeId();
          for (let i of e)
            this.pendingEntries.set(i.target, { entry: i, resizingNodeId: t });
          if (this.config?.onObserverActivity) {
            let i = [];
            for (let o of e) {
              let r = this.observedElements.get(o.target);
              r && i.push(r);
            }
            i.length > 0 && this.config.onObserverActivity(i);
          }
          this.rafId ||
            (this.rafId = requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.processBatch();
              });
            }));
        });
      });
    }
    configure(e) {
      this.config = e;
    }
    observe(e, t) {
      (this.observedElements.set(e, t),
        this.addToEntityIndex(e, t),
        this.observer?.observe(e));
    }
    unobserve(e) {
      let t = this.observedElements.get(e);
      (t && (this.removeFromEntityIndex(e, t), this.observedElements.delete(e)),
        this.observer?.unobserve(e));
    }
    invalidate(e) {
      this.observedElements.get(e) &&
        (this.observer?.unobserve(e), this.observer?.observe(e));
    }
    getMetadata(e) {
      return this.observedElements.get(e);
    }
    invalidateNode(e) {
      return this.invalidateByKey(`node:${e}`);
    }
    invalidateEdgeLabels(e) {
      return this.invalidateByKey(`edge:${e}`);
    }
    invalidateAll() {
      let e = [];
      for (let [t, i] of this.entityIndex) {
        e.push(t);
        for (let o of i) this.invalidate(o);
      }
      return e;
    }
    invalidateByKey(e) {
      let t = this.entityIndex.get(e);
      if (!t) return [];
      for (let i of t) this.invalidate(i);
      return [e];
    }
    getEntityKeys(e) {
      switch (e.type) {
        case 'node':
        case 'port':
          return [`node:${e.nodeId}`];
        case 'edge-label':
          return [`edge:${e.edgeId}`];
      }
    }
    addToEntityIndex(e, t) {
      for (let i of this.getEntityKeys(t)) {
        let o = this.entityIndex.get(i);
        (o || ((o = new Set()), this.entityIndex.set(i, o)), o.add(e));
      }
    }
    removeFromEntityIndex(e, t) {
      for (let i of this.getEntityKeys(t)) {
        let o = this.entityIndex.get(i);
        o && (o.delete(e), o.size === 0 && this.entityIndex.delete(i));
      }
    }
    processBatch() {
      let e = [...this.pendingEntries.values()];
      (this.pendingEntries.clear(),
        (this.rafId = null),
        e.length !== 0 &&
          this.config &&
          this.ngZone.run(() => {
            this.config.processBatch(e);
          }));
    }
    ngOnDestroy() {
      (this.rafId && cancelAnimationFrame(this.rafId),
        this.observer?.disconnect(),
        this.entityIndex.clear());
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  HT = (n, e) => {
    let t = n.parentElement;
    for (; t;) {
      if (t.classList.contains(e)) return t;
      t = t.parentElement;
    }
    return null;
  },
  zT = (n) => `[ngDiagram] Port measurement failed: Parent node not found.

Port ID: ${n}

This may occur during DOM updates or node removal.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/ports/
`,
  VT = (
    n,
    e,
  ) => `[ngDiagram] Port measurement failed: Missing data-port-id attribute.

Port element ID: ${n}
Node ID: ${e}

To fix this:
  \u2022 Add [id]="port.id" to port components
  \u2022 Ensure all ports have unique IDs

Skipping this port.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/ports/
`,
  go = class n {
    flowCoreProvider = m(z);
    getPortData(e) {
      let t = HT(e, 'ng-diagram-node');
      return t
        ? this.measurePort(e, t.getBoundingClientRect(), this.getScale())
        : (console.error(zT(e.id)), null);
    }
    getNodePortsData(e, t) {
      let i = e.querySelectorAll('[data-port-id]'),
        o = [],
        r = e.getBoundingClientRect(),
        s = this.getScale();
      return (
        i.forEach((a) => {
          let d = a.getAttribute('data-port-id');
          if (!d) return void console.error(VT(a.id, t));
          let c = this.measurePort(a, r, s);
          o.push({ id: d, size: c.size, position: c.position });
        }),
        o
      );
    }
    measurePort(e, t, i) {
      let o = e.getBoundingClientRect();
      return {
        position: { x: (o.left - t.left) / i, y: (o.top - t.top) / i },
        size: { width: o.width / i, height: o.height / i },
      };
    }
    getScale() {
      return this.flowCoreProvider.provide().getState().metadata.viewport.scale;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  jT = (n) => `[ngDiagram] Unknown element type: "${n}"

Expected types: 'port', 'edge-label', 'node'

This indicates a programming error in the resize observer metadata configuration.
Check that elements are registered with the correct type.`,
  bs = class n {
    flowCoreProvider = m(z);
    updatePortsService = m(go);
    batchResizeObserver = m(zt);
    isInitialized = !1;
    initialize() {
      this.isInitialized ||
        (this.batchResizeObserver.configure({
          processBatch: (e) => this.processAllResizes(e),
          activeResizeNodeId: () =>
            this.flowCoreProvider.provide().actionStateManager.resize
              ?.resizingNode.id,
          onObserverActivity: (e) => {
            let t = this.flowCoreProvider.provide().measurementTracker;
            for (let i of e)
              i.type === 'port' || i.type === 'node'
                ? t.signalObserverActivity(`node:${i.nodeId}`)
                : i.type === 'edge-label' &&
                  t.signalObserverActivity(`edge:${i.edgeId}`);
          },
        }),
        (this.isInitialized = !0));
    }
    watchResizeGestureEnd() {
      let e;
      this.flowCoreProvider
        .provide()
        .eventManager.on('actionStateChanged', ({ actionState: t }) => {
          let i = t.resize?.resizingNode.id;
          (e !== void 0 &&
            i === void 0 &&
            this.batchResizeObserver.invalidateNode(e),
            (e = i));
        });
    }
    processAllResizes(e) {
      if (!this.isInitialized)
        return void console.warn(
          'FlowResizeBatchProcessorService not initialized yet, skipping resize processing',
        );
      let t = [],
        i = [],
        o = [];
      for (let { entry: r, resizingNodeId: s } of e) {
        let a = this.batchResizeObserver.getMetadata(r.target);
        if (a)
          switch (a.type) {
            case 'port':
              t.push({ metadata: a, entry: r });
              break;
            case 'edge-label':
              i.push({ metadata: a, entry: r });
              break;
            case 'node':
              o.push({ metadata: a, entry: r, resizingNodeId: s });
              break;
            default:
              throw new Error(jT(a.type));
          }
      }
      (t.length > 0 && this.processPortBatch(t),
        i.length > 0 && this.processEdgeLabelBatch(i),
        o.length > 0 && this.processNodeBatch(o));
    }
    processPortBatch(e) {
      let t = this.flowCoreProvider.provide(),
        i = new Map(),
        o = new Map();
      for (let { entry: r, metadata: s } of e) {
        if (s?.type !== 'port') continue;
        let a = this.getBorderBoxSize(r);
        if (!a) continue;
        let d = this.updatePortsService.getPortData(r.target);
        if (!d) continue;
        let c = t.getNodeById(s.nodeId);
        if (!c) continue;
        i.has(s.nodeId) ||
          i.set(
            s.nodeId,
            new Map((c.measuredPorts ?? []).map((u) => [u.id, u])),
          );
        let l = i.get(s.nodeId).get(s.portId);
        (l?.size &&
          !this.isSizeChanged(l.size, a) &&
          l?.position &&
          !this.isPositionChanged(l.position, d.position)) ||
          (o.has(s.nodeId) || o.set(s.nodeId, []),
          o
            .get(s.nodeId)
            .push({ id: s.portId, size: a, position: d.position }));
      }
      o.forEach((r, s) => {
        t.updater.applyPortChanges(s, Es(r));
      });
    }
    processNodeBatch(e) {
      let t = this.flowCoreProvider.provide(),
        i = t.actionStateManager.isResizing(),
        o = [];
      for (let { entry: r, metadata: s, resizingNodeId: a } of e) {
        if (s?.type !== 'node') continue;
        let d = this.getBorderBoxSize(r);
        if (!d) continue;
        let c = t.getNodeById(s.nodeId);
        if (
          c &&
          (!c.size || a !== s.nodeId) &&
          (!c.size || this.isSizeChanged(c.size, d)) &&
          (o.push({ id: s.nodeId, size: d }), !i)
        ) {
          let l = this.updatePortsService.getNodePortsData(r.target, s.nodeId);
          t.updater.applyPortChanges(s.nodeId, Es(l));
        }
      }
      o.length > 0 && t.updater.applyNodeSizes(o);
    }
    processEdgeLabelBatch(e) {
      let t = this.flowCoreProvider.provide(),
        i = new Map(),
        o = new Map();
      for (let { entry: r, metadata: s } of e) {
        if (s?.type !== 'edge-label') continue;
        let a = this.getBorderBoxSize(r);
        if (!a) continue;
        let d = t.getEdgeById(s.edgeId);
        if (!d) continue;
        i.has(s.edgeId) ||
          i.set(
            s.edgeId,
            new Map((d.measuredLabels ?? []).map((l) => [l.id, l.size])),
          );
        let c = i.get(s.edgeId).get(s.labelId);
        (c && !this.isSizeChanged(c, a)) ||
          (o.has(s.edgeId) || o.set(s.edgeId, []),
          o.get(s.edgeId).push({ labelId: s.labelId, size: a }));
      }
      o.forEach((r, s) => {
        t.updater.applyEdgeLabelChanges(
          s,
          r.map(({ labelId: a, size: d }) => ({
            labelId: a,
            labelChanges: { size: d },
          })),
        );
      });
    }
    getBorderBoxSize(e) {
      let [t] = e.borderBoxSize;
      return t ? { width: t.inlineSize, height: t.blockSize } : null;
    }
    isSizeChanged(e, t) {
      return (
        Math.abs(e.width - t.width) > 1 || Math.abs(e.height - t.height) > 1
      );
    }
    isPositionChanged(e, t) {
      return Math.abs(e.x - t.x) > 1 || Math.abs(e.y - t.y) > 1;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Ss = class n {
    draggedNode = P(null);
    previewId = P(null);
    onMouseDown(e, t) {
      (this.draggedNode.set(e), this.previewId.set(t));
    }
    onDragStartFromPalette(e, t) {
      e.dataTransfer &&
        e.dataTransfer?.setData('text/plain', JSON.stringify(t));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  St = class {
    flowCoreProvider = m(z);
    get flowCore() {
      return this.flowCoreProvider.provide();
    }
  },
  ho = class extends St {
    renderer = m(st);
    viewport = w(() => this.renderer.viewport() || { x: 0, y: 0, scale: 1 });
    scale = w(() => this.renderer.viewport().scale || 1);
    get minZoom() {
      return this.flowCore.config.zoom.min;
    }
    get maxZoom() {
      return this.flowCore.config.zoom.max;
    }
    canZoomIn = w(() => this.scale() < this.maxZoom);
    canZoomOut = w(() => this.scale() > this.minZoom);
    clientToFlowPosition(e) {
      return this.flowCore.clientToFlowPosition(e);
    }
    clientToFlowViewportPosition(e) {
      return this.flowCore.clientToFlowViewportPosition(e);
    }
    flowToClientPosition(e) {
      return this.flowCore.flowToClientPosition(e);
    }
    moveViewport(e, t) {
      return this.flowCore.commandHandler.emit('moveViewport', { x: e, y: t });
    }
    moveViewportBy(e, t) {
      return this.flowCore.commandHandler.emit('moveViewportBy', {
        x: e,
        y: t,
      });
    }
    setViewport(e, t, i) {
      let { min: o, max: r } = this.flowCore.config.zoom;
      (i < o || i > r) &&
        console.warn(
          `[ngDiagram] setViewport: scale ${i} is outside configured bounds [${o}, ${r}] and will be clamped.`,
        );
      let s = Math.max(o, Math.min(r, i));
      return this.flowCore.commandHandler.emit('zoom', {
        scale: s,
        x: e,
        y: t,
      });
    }
    zoom(e, t) {
      let i = this.scale() * e,
        o = t?.x ?? this.viewport().x,
        r = t?.y ?? this.viewport().y;
      return this.flowCore.commandHandler.emit('zoom', {
        scale: i,
        x: o,
        y: r,
      });
    }
    zoomToFit(e) {
      return this.flowCore.commandHandler.emit('zoomToFit', e ?? {});
    }
    centerOnNode(e) {
      return this.flowCore.commandHandler.emit('centerOnNode', { nodeOrId: e });
    }
    centerOnRect(e) {
      return this.flowCore.commandHandler.emit('centerOnRect', { rect: e });
    }
  };
var ri = class n {
    _lastPosition = { x: 0, y: 0, timestamp: 0 };
    updatePosition(e, t) {
      this._lastPosition = { x: e, y: t, timestamp: Date.now() };
    }
    getLastPosition() {
      return h({}, this._lastPosition);
    }
    hasRecentPosition() {
      return Date.now() - this._lastPosition.timestamp < 5e3;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Fu = class n {
    cursorPositionService = m(ri);
    onMouseMove(e) {
      this.cursorPositionService.updatePosition(e.clientX, e.clientY);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramCursorPositionTracker', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee(
            'mousemove',
            function (r) {
              return i.onMouseMove(r);
            },
            $i,
          );
      },
    });
  },
  Lu = class n {
    node = E.required();
    highlighted = w(() => this.node().highlighted ?? !1);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramGroupHighlighted', '']],
      hostVars: 4,
      hostBindings: function (t, i) {
        t & 2 &&
          Ne('ng-diagram-group-highlight', i.highlighted())(
            'ng-diagram-node-wrapper',
            !0,
          );
      },
      inputs: { node: [1, 'node'] },
    });
  };
function UT(n) {
  return (
    !Vm(n) ||
    typeof CSS > 'u' ||
    !CSS.supports ||
    CSS.supports('stroke', 'context-stroke')
  );
}
var si = class n {
    platformId = m(mn);
    markers = P(new Map());
    useInlineMarkers = !UT(this.platformId);
    registerMarker(e, t) {
      this.markers.update((i) => {
        let o = new Map(i);
        return (o.set(e, t), o);
      });
    }
    unregisterMarker(e) {
      this.markers.update((t) => {
        let i = new Map(t);
        return (i.delete(e), i);
      });
    }
    getMarkerUrl(e, t, i) {
      return `url(#${this.useInlineMarkers ? `${e}-${t}-${i}` : e})`;
    }
    cloneMarkerElement(e, t) {
      let i = this.markers().get(e);
      if (!i) return null;
      let o = i.cloneNode(!0);
      return ((o.id = t), this.replaceContextColors(o), o);
    }
    replaceContextColors(e) {
      e.getAttribute('stroke') === 'context-stroke' &&
        e.setAttribute('stroke', 'currentColor');
      let t = e.getAttribute('fill');
      (t !== 'context-fill' && t !== 'context-stroke') ||
        e.setAttribute('fill', 'currentColor');
      for (let i of Array.from(e.children)) this.replaceContextColors(i);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Bu = class n {
    el = m(ie);
    markerRegistry = m(si);
    destroyRef = m(It);
    sourceMarkerId = E();
    targetMarkerId = E();
    edgeId = E.required();
    sourceMarkerRef = null;
    targetMarkerRef = null;
    constructor() {
      (fe(() => {
        (this.cleanup(), this.appendMarkers());
      }),
        this.destroyRef.onDestroy(() => this.cleanup()));
    }
    appendMarkers() {
      let e = this.sourceMarkerId();
      if (e) {
        let i = `${e}-${this.edgeId()}-source`;
        ((this.sourceMarkerRef = this.markerRegistry.cloneMarkerElement(e, i)),
          this.sourceMarkerRef &&
            this.el.nativeElement.appendChild(this.sourceMarkerRef));
      }
      let t = this.targetMarkerId();
      if (t) {
        let i = `${t}-${this.edgeId()}-target`;
        ((this.targetMarkerRef = this.markerRegistry.cloneMarkerElement(t, i)),
          this.targetMarkerRef &&
            this.el.nativeElement.appendChild(this.targetMarkerRef));
      }
    }
    cleanup() {
      (this.sourceMarkerRef?.remove(),
        this.targetMarkerRef?.remove(),
        (this.sourceMarkerRef = null),
        (this.targetMarkerRef = null));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramInlineMarkers', '']],
      inputs: {
        sourceMarkerId: [1, 'sourceMarkerId'],
        targetMarkerId: [1, 'targetMarkerId'],
        edgeId: [1, 'edgeId'],
      },
    });
  },
  Ts = class n {
    canHandle(e, t) {
      return e.actionName.startsWith('keyboardMoveSelection') && Jy(t);
    }
    createEvent(e, t) {
      let i = this.extractDirection(e.actionName);
      return i
        ? y(h({}, t), { name: 'keyboardMoveSelection', direction: i })
        : null;
    }
    extractDirection(e) {
      return e.endsWith('Up')
        ? 'top'
        : e.endsWith('Down')
          ? 'bottom'
          : e.endsWith('Left')
            ? 'left'
            : e.endsWith('Right')
              ? 'right'
              : null;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  _s = class n {
    canHandle(e, t) {
      return (
        t.config.viewportPanningEnabled &&
        e.actionName.startsWith('keyboardPan') &&
        !Jy(t)
      );
    }
    createEvent(e, t) {
      let i = this.extractDirection(e.actionName);
      return i ? y(h({}, t), { name: 'keyboardPanning', direction: i }) : null;
    }
    extractDirection(e) {
      return e.endsWith('Up')
        ? 'bottom'
        : e.endsWith('Down')
          ? 'top'
          : e.endsWith('Left')
            ? 'right'
            : e.endsWith('Right')
              ? 'left'
              : null;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Ns = class n {
    cursorPositionTracker = m(ri);
    canHandle(e) {
      return e.actionName === 'paste';
    }
    createEvent(e, t) {
      let i = y(h({}, t), { name: e.actionName });
      return (
        this.cursorPositionTracker.hasRecentPosition() &&
          (i.lastInputPoint = this.cursorPositionTracker.getLastPosition()),
        i
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  xs = class n {
    canHandle(e) {
      return (
        e.actionName === 'keyboardZoomIn' || e.actionName === 'keyboardZoomOut'
      );
    }
    createEvent(e, t, i) {
      let o = i.config.zoom.step,
        r = this.getCenterPoint(i.getViewport()),
        s = this.extractDirection(e.actionName);
      return s && r
        ? y(h({}, t), {
            name: 'zoom',
            centerPoint: r,
            zoomFactor: s > 0 ? 1 + o : 1 - o,
          })
        : null;
    }
    extractDirection(e) {
      return e.endsWith('In') ? 1 : e.endsWith('Out') ? -1 : null;
    }
    getCenterPoint(e) {
      if (e.width && e.height) return { x: e.width / 2, y: e.height / 2 };
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Hu = class n {
    flowCoreProvider = m(z);
    inputEventsRouter = m(ue);
    keyboardActions = [m(_s), m(Ts), m(Ns), m(xs)];
    elementRef = m(ie);
    grabFocus = () => this.onPointerDown();
    constructor() {
      this.elementRef.nativeElement.addEventListener(
        'pointerdown',
        this.grabFocus,
        !0,
      );
    }
    ngOnDestroy() {
      this.elementRef.nativeElement.removeEventListener(
        'pointerdown',
        this.grabFocus,
        !0,
      );
    }
    onPointerDown() {
      this.elementRef.nativeElement.contains(document.activeElement) ||
        this.elementRef.nativeElement.focus();
    }
    onKeyDown(e) {
      if (!this.elementRef.nativeElement.contains(document.activeElement))
        return;
      let t = this.flowCoreProvider.provide(),
        i = this.inputEventsRouter.getBaseEvent(e),
        o = t.shortcutManager
          .match({ key: e.key, modifiers: i.modifiers })
          .filter(
            (r) =>
              r.actionName !== 'cancelInteraction' || t.hasActiveInteraction(),
          );
      if (o.length !== 0 && !this.isInputFieldFocused(e)) {
        e.preventDefault();
        for (let r of o) {
          let s = this.keyboardActions.find((d) => d.canHandle(r, t)),
            a = s && s.createEvent(r, i, t);
          a
            ? this.inputEventsRouter.emit(a)
            : this.inputEventsRouter.hasHandler(r.actionName) &&
              this.inputEventsRouter.emit(y(h({}, i), { name: r.actionName }));
        }
      }
    }
    isInputFieldFocused(e) {
      let t = e.composedPath()[0] || e.target;
      return (
        t.hasAttribute('contenteditable') ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramKeyboardInputs', '']],
      hostAttrs: ['tabindex', '0'],
      hostBindings: function (t, i) {
        t & 1 &&
          ee(
            'keydown',
            function (r) {
              return i.onKeyDown(r);
            },
            $i,
          );
      },
      features: [wn([_s, Ts, Ns, xs])],
    });
  },
  ai = class n {
    inputEventsRouter = m(ue);
    emitStart(e, t, i) {
      let o = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'linking',
          phase: 'start',
          target: t,
          targetType: 'node',
          portId: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    }
    emitContinue(e, t, i, o = null) {
      let r = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, r), {
          name: 'linking',
          phase: 'continue',
          target: t,
          targetType: 'node',
          portId: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          panningForce: o,
        }),
      );
    }
    emitEnd(e, t, i, o = !1) {
      let r = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, r), {
          name: 'linking',
          phase: 'end',
          target: t,
          targetType: 'node',
          portId: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          takenOver: o,
        }),
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Ps = class extends Map {},
  di = class extends Map {},
  ve;
(function (n) {
  ((n.Rotate = 'rotate'),
    (n.Resize = 'resize'),
    (n.Move = 'move'),
    (n.BoxSelection = 'box-selection'),
    (n.Linking = 'linking'),
    (n.Panning = 'panning'),
    (n.Zooming = 'zooming'));
})(ve || (ve = {}));
var mt = class n {
    currentEvent = P(null);
    clearCurrentEvent() {
      this.currentEvent.set(null);
    }
    rotateHandled() {
      return this.currentEvent() === ve.Rotate;
    }
    resizeHandled() {
      return this.currentEvent() === ve.Resize;
    }
    moveHandled() {
      return this.currentEvent() === ve.Move;
    }
    boxSelectionHandled() {
      return this.currentEvent() === ve.BoxSelection;
    }
    linkingHandled() {
      return this.currentEvent() === ve.Linking;
    }
    panningHandled() {
      return this.currentEvent() === ve.Panning;
    }
    zoomingHandled() {
      return this.currentEvent() === ve.Zooming;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac, providedIn: 'root' });
  },
  Rs = class n {
    linkingEventService = m(ai);
    flowCoreProviderService = m(z);
    touchEventsStateService = m(mt);
    target = P(void 0);
    edgePanningInterval = null;
    unregisterInteractionCleanup = null;
    gestureActive = !1;
    portId = E.required();
    ngOnDestroy() {
      let e = this.gestureActive;
      if (
        (this.removeListeners(),
        e && this.flowCoreProviderService.isInitialized())
      ) {
        let t = this.flowCoreProviderService.provide();
        t.cancelActiveInteraction().then((i) => {
          i ||
            t.isCancellingInteraction() ||
            t.actionStateManager.clearLinking();
        });
      }
    }
    setTargetNode(e) {
      this.target.set(e);
    }
    onPointerDown(e) {
      !this.gestureActive &&
        this.shouldHandle(e) &&
        ((e.linkingHandled = !0),
        (this.gestureActive = !0),
        this.touchEventsStateService.currentEvent.set(ve.Linking),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        document.addEventListener('pointercancel', this.onPointerCancel),
        (this.unregisterInteractionCleanup = this.flowCoreProviderService
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())),
        this.linkingEventService.emitStart(e, this.target(), this.portId()));
    }
    onPointerMove = (e) => {
      if (
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      )
        return (
          this.linkingEventService.emitEnd(e, this.target(), this.portId(), !0),
          void this.removeListeners()
        );
      let {
          edgePanningThreshold: t,
          edgePanningEnabled: i,
          edgePanningForce: o,
        } = this.flowCoreProviderService.provide().config.linking,
        r = this.flowCoreProviderService.provide(),
        s = null;
      if (i) {
        let { width: a, height: d } = r.getViewport(),
          { x: c, y: l } = r.getFlowOffset();
        ((s = j.calculateEdgePanningForce(
          { x: c, y: l, width: a ?? 0, height: d ?? 0 },
          { x: e.clientX, y: e.clientY },
          t,
          o,
        )),
          s ? this.startEdgePanning(e, s) : this.stopEdgePanning());
      }
      this.linkingEventService.emitContinue(e, this.target(), this.portId(), s);
    };
    onPointerUp = (e) => {
      (this.linkingEventService.emitEnd(e, this.target(), this.portId()),
        this.removeListeners());
    };
    onPointerCancel = (e) => {
      (this.linkingEventService.emitEnd(e, this.target(), this.portId(), !0),
        this.removeListeners());
    };
    shouldHandle(e) {
      let t = this.flowCoreProviderService.provide();
      return t.actionStateManager.isLinking()
        ? (this.target.set(void 0), !1)
        : !t.isCancellingInteraction() &&
            !(
              e.boxSelectionHandled ||
              this.touchEventsStateService.panningHandled() ||
              this.touchEventsStateService.zoomingHandled()
            );
    }
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        this.gestureActive &&
          ((this.gestureActive = !1),
          this.touchEventsStateService.clearCurrentEvent()),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        document.removeEventListener('pointercancel', this.onPointerCancel),
        this.stopEdgePanning());
    }
    startEdgePanning(e, t) {
      (this.stopEdgePanning(),
        (this.edgePanningInterval = window.setInterval(() => {
          this.linkingEventService.emitContinue(
            e,
            this.target(),
            this.portId(),
            t,
          );
        }, Of)));
    }
    stopEdgePanning() {
      this.edgePanningInterval != null &&
        (window.clearInterval(this.edgePanningInterval),
        (this.edgePanningInterval = null));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramLinkingInput', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { portId: [1, 'portId'] },
      features: [wn([ai])],
    });
  },
  po = class n {
    inputEventsRouter = m(ue);
    flowCoreProvider = m(z);
    targetData = E.required();
    ngOnDestroy() {
      document.removeEventListener('pointerup', this.onPointerUp);
    }
    onPointerDown(e) {
      if (!this.shouldHandle(e)) return;
      e.selectHandled = !0;
      let t = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'select',
          phase: 'start',
          target: this.targetData(),
          targetType: this.targetType,
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      ),
        document.addEventListener('pointerup', this.onPointerUp));
    }
    onPointerUp = (e) => {
      document.removeEventListener('pointerup', this.onPointerUp);
      let t = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'select',
          phase: 'end',
          target: this.targetData(),
          targetType: this.targetType,
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    };
    shouldHandle(e) {
      return !(
        !this.inputEventsRouter.eventGuards.withPrimaryButton(e) ||
        e.boxSelectionHandled ||
        e.selectHandled ||
        e.relinkHandled ||
        (e.linkingHandled &&
          !this.flowCoreProvider.provide().config.linking.selectNodeOnPortPress)
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { targetData: [1, 'targetData'] },
    });
  },
  zu = class n extends po {
    targetType = 'diagram';
    targetData = E();
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵdir = B({
      type: n,
      inputs: { targetData: [1, 'targetData'] },
      features: [Mt],
    });
  },
  Vu = class n extends po {
    targetType = 'edge';
    targetData = E.required();
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵdir = B({
      type: n,
      inputs: { targetData: [1, 'targetData'] },
      features: [Mt],
    });
  },
  ju = class n extends po {
    targetType = 'node';
    targetData = E.required();
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵdir = B({
      type: n,
      inputs: { targetData: [1, 'targetData'] },
      features: [Mt],
    });
  },
  $T = (n, e) => `[ngDiagram] Failed to parse palette drop data as JSON.

Received data: "${n}"
Error: ${e instanceof Error ? e.message : String(e)}

Note: This error typically occurs when implementing custom drag-and-drop functionality.
The built-in palette component handles data serialization correctly.

To fix custom implementations:
  \u2022 Ensure the dragged data is valid JSON format
  \u2022 Use JSON.stringify() when setting the drag data
  \u2022 Example: event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'node', data: {...} }))

The palette drop event will continue with empty data object.

Documentation: https://www.ngdiagram.dev/docs/guides/palette/
`,
  GT =
    () => `[ngDiagram] Invalid drop data: expected type "NgDiagramPaletteItem".

Received data: "UNKNOWN"

To fix this error:
  \u2022 Ensure the dragged data is of type "NgDiagramPaletteItem" and is dragged from a valid palette item.

The palette drop event will continue with empty data object.

Documentation: https://www.ngdiagram.dev/docs/guides/palette/
`,
  Uu = class n {
    inputEventsRouterService = m(ue);
    paletteService = m(Ss);
    el = m(ie);
    touchMoveListener = (e) => this.onGlobalTouchMove(e);
    touchEndListener = (e) => this.onGlobalTouchEnd(e);
    ngOnInit() {
      (document.addEventListener('touchmove', this.touchMoveListener, {
        passive: !1,
      }),
        document.addEventListener('touchend', this.touchEndListener, {
          passive: !1,
        }));
    }
    ngOnDestroy() {
      (document.removeEventListener('touchmove', this.touchMoveListener),
        document.removeEventListener('touchend', this.touchEndListener));
    }
    onDrop(e) {
      e.preventDefault();
      let t = e.dataTransfer?.getData('text/plain'),
        i = this.inputEventsRouterService.getBaseEvent(e),
        o = {};
      if (t)
        try {
          o = JSON.parse(t);
        } catch (r) {
          return this.paletteService.draggedNode()
            ? console.error($T(t, r))
            : console.warn(GT());
        }
      (this.inputEventsRouterService.emit(
        y(h({}, i), {
          name: 'paletteDrop',
          data: o,
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      ),
        this.paletteService.draggedNode.set(null),
        this.paletteService.previewId.set(null));
    }
    onDragOver(e) {
      e.preventDefault();
    }
    onGlobalTouchMove(e) {
      this.paletteService.draggedNode() && e.preventDefault();
    }
    onGlobalTouchEnd(e) {
      let t = this.paletteService.draggedNode();
      if (!t) return;
      let i = e.changedTouches[0];
      if (!i) return;
      let o = this.el.nativeElement,
        r = document.elementFromPoint(i.clientX, i.clientY);
      if (!r || !o.contains(r))
        return (
          this.paletteService.draggedNode.set(null),
          void this.paletteService.previewId.set(null)
        );
      let s = this.inputEventsRouterService.getBaseEvent(e);
      (this.inputEventsRouterService.emit(
        y(h({}, s), {
          name: 'paletteDrop',
          data: t,
          lastInputPoint: { x: i.clientX, y: i.clientY },
        }),
      ),
        this.paletteService.draggedNode.set(null),
        this.paletteService.previewId.set(null),
        e.preventDefault(),
        e.stopPropagation());
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramPaletteDrop', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('drop', function (r) {
            return i.onDrop(r);
          })('dragover', function (r) {
            return i.onDragOver(r);
          });
      },
    });
  },
  ks = class n {
    linkingEventService = m(ai);
    cursorPositionTrackerService = m(ri);
    flowCoreProvider = m(z);
    node;
    portId;
    unregisterInteractionCleanup = null;
    ngOnDestroy() {
      this.removeListeners();
    }
    startLinking(e, t) {
      let i = this.flowCoreProvider.provide();
      if (i.actionStateManager.isLinking())
        return void console.warn(
          '[ngDiagram] startLinking ignored: another linking or relinking gesture is in progress.',
        );
      let o = i.getNodeById(e.id);
      if (!o || o.computedHidden)
        return void console.warn(
          `[ngDiagram] startLinking ignored: source node "${e.id}" is missing or effectively hidden.`,
        );
      (this.removeListeners(), (this.node = e), (this.portId = t));
      let r = this.cursorPositionTrackerService.getLastPosition();
      (this.linkingEventService.emitStart({ clientX: r.x, clientY: r.y }, e, t),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('click', this.onDocumentClick, !0),
        document.addEventListener('touchmove', this.onTouchMove, {
          passive: !1,
        }),
        document.addEventListener('touchend', this.onTouchEnd, { passive: !1 }),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
    }
    startLinkingFromPosition(e) {
      let t = this.flowCoreProvider.provide();
      t.config.danglingEdges.enabled
        ? t.actionStateManager.isLinking()
          ? console.warn(
              '[ngDiagram] startLinkingFromPosition ignored: another linking or relinking gesture is in progress.',
            )
          : (this.removeListeners(),
            (this.node = void 0),
            (this.portId = void 0),
            t.commandHandler.emit('startLinkingFromPosition', { position: e }),
            document.addEventListener('pointermove', this.onPointerMove),
            document.addEventListener('click', this.onDocumentClick, !0),
            document.addEventListener('touchmove', this.onTouchMove, {
              passive: !1,
            }),
            document.addEventListener('touchend', this.onTouchEnd, {
              passive: !1,
            }),
            (this.unregisterInteractionCleanup = this.flowCoreProvider
              .provide()
              .registerInteractionCleanup(() => this.removeListeners())))
        : console.warn(
            '[ngDiagram] startLinkingFromPosition ignored: dangling edges are disabled. Set config.danglingEdges.enabled = true to draw edges from a position.',
          );
    }
    onPointerMove = (e) => {
      e.pointerType !== 'touch' && this.linkingEventService.emitContinue(e);
    };
    onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      let t = e.touches[0];
      this.linkingEventService.emitContinue({
        clientX: t.clientX,
        clientY: t.clientY,
      });
    };
    onTouchEnd = (e) => {
      e.preventDefault();
      let t = e.changedTouches[0],
        i = { clientX: t.clientX, clientY: t.clientY };
      (this.removeListeners(),
        this.linkingEventService.emitEnd(i, this.node, this.portId));
    };
    onDocumentClick = (e) => {
      (this.removeListeners(),
        this.linkingEventService.emitEnd(e, this.node, this.portId));
    };
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('click', this.onDocumentClick, !0),
        document.removeEventListener('touchmove', this.onTouchMove),
        document.removeEventListener('touchend', this.onTouchEnd));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  $e = class n extends St {
    manualLinkingService = m(ks);
    batchResizeObserver = m(zt);
    renderer = m(st);
    isInitialized = this.renderer.isInitialized.asReadonly();
    config$ = P({});
    config = this.config$.asReadonly();
    actionState$ = P({});
    actionState = this.actionState$.asReadonly();
    constructor() {
      (super(),
        fe(() => {
          this.isInitialized() &&
            ke(() => {
              this.config$.set(this.flowCore.config);
            });
        }),
        fe((e) => {
          if (!this.isInitialized()) return;
          let t = this.flowCore.eventManager.on('actionStateChanged', (i) => {
            ke(() => {
              this.actionState$.set(i.actionState);
            });
          });
          e(() => t());
        }));
    }
    updateConfig(e) {
      (this.flowCore.updateConfig(e), this.config$.set(this.flowCore.config));
    }
    getEnvironment() {
      return this.flowCore.getEnvironment();
    }
    registerMiddleware(e) {
      return this.flowCore.registerMiddleware(e);
    }
    unregisterMiddleware(e) {
      this.flowCore.unregisterMiddleware(e);
    }
    registerRouting(e) {
      this.flowCore.edgeRoutingManager.registerRouting(e);
    }
    unregisterRouting(e) {
      this.flowCore.edgeRoutingManager.unregisterRouting(e);
    }
    getRegisteredRoutings() {
      return this.flowCore.edgeRoutingManager.getRegisteredRoutings();
    }
    setDefaultRouting(e) {
      this.flowCore.edgeRoutingManager.setDefaultRouting(e);
    }
    getDefaultRouting() {
      return this.flowCore.edgeRoutingManager.getDefaultRouting();
    }
    startLinking(e, t) {
      this.manualLinkingService.startLinking(e, t);
    }
    startLinkingFromPosition(e) {
      this.manualLinkingService.startLinkingFromPosition(e);
    }
    cancelActiveInteraction() {
      return this.flowCore.cancelActiveInteraction();
    }
    addEventListener(e, t) {
      return this.flowCore.eventManager.on(e, t);
    }
    addEventListenerOnce(e, t) {
      return this.flowCore.eventManager.once(e, t);
    }
    removeEventListener(e, t) {
      this.flowCore.eventManager.off(e, t);
    }
    removeAllEventListeners() {
      this.flowCore.eventManager.offAll();
    }
    setEventsEnabled(e) {
      this.flowCore.eventManager.setEnabled(e);
    }
    areEventsEnabled() {
      return this.flowCore.eventManager.isEnabled();
    }
    hasEventListeners(e) {
      return this.flowCore.eventManager.hasListeners(e);
    }
    transaction(e, t) {
      return this.flowCore.transaction(() => e(), t ?? {});
    }
    invalidateMeasurements(e) {
      let t = this.invalidateObservedElements(e);
      return t.length === 0
        ? Promise.resolve()
        : this.flowCore.trackMeasurements(t);
    }
    invalidateObservedElements(e) {
      if (!e) return this.batchResizeObserver.invalidateAll();
      let t = [];
      for (let { nodeId: i } of e.nodes ?? [])
        t.push(...this.batchResizeObserver.invalidateNode(i));
      for (let { edgeId: i } of e.edges ?? [])
        t.push(...this.batchResizeObserver.invalidateEdgeLabels(i));
      return t;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  };
function As(n, e) {
  let t = WT(e);
  return !!(n.target && n.target instanceof HTMLElement) && n.target.closest(t);
}
function WT(n) {
  return `[data-no-${n}="true"]`;
}
var $u = class n {
    inputEventsRouter = m(ue);
    elementRef = m(ie);
    diagramService = m($e);
    flowCoreProvider = m(z);
    unregisterInteractionCleanup = null;
    gestureActive = !1;
    ngOnDestroy() {
      let e = this.gestureActive;
      (this.removeListeners(),
        e &&
          this.flowCoreProvider.isInitialized() &&
          this.flowCoreProvider.provide().actionStateManager.clearPanning());
    }
    onPointerDown(e) {
      if (
        e.pointerType === 'touch' ||
        this.gestureActive ||
        !this.inputEventsRouter.eventGuards.withPrimaryButton(e) ||
        !this.shouldHandle(e)
      )
        return;
      (this.toggleGrabbingCursor(!0), e.preventDefault(), e.stopPropagation());
      let t = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'panning',
          phase: 'start',
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      ),
        (this.gestureActive = !0),
        document.addEventListener('pointermove', this.onMouseMove),
        document.addEventListener('pointerup', this.onPointerUp),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
    }
    onPointerUp = (e) => {
      this.inputEventsRouter.eventGuards.withPrimaryButton(e) &&
        (e.preventDefault(), e.stopPropagation(), this.finishPanning(e));
    };
    onWheel(e) {
      if (!this.shouldHandleWheel(e)) return;
      (e.preventDefault(), e.stopPropagation());
      let { deltaX: t, deltaY: i } = e;
      e.shiftKey && t === 0 && i !== 0 && ((t = i), (i = 0));
      let o = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, o), { name: 'wheelPanning', deltaX: t, deltaY: i }),
      );
    }
    onMouseMove = (e) => {
      if (e.zoomingHandled) return void this.finishPanning(e);
      (e.preventDefault(), e.stopPropagation());
      let t = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'panning',
          phase: 'continue',
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    };
    removeListeners() {
      ((this.gestureActive = !1),
        this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        document.removeEventListener('pointermove', this.onMouseMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        this.toggleGrabbingCursor(!1));
    }
    finishPanning(e) {
      this.removeListeners();
      let t = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'panning',
          phase: 'end',
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    }
    shouldHandle(e) {
      let { viewportPanningEnabled: t } = this.diagramService.config();
      return !(
        !t ||
        As(e, 'pan') ||
        e.moveSelectionHandled ||
        e.zoomingHandled ||
        e.linkingHandled ||
        e.relinkHandled ||
        e.rotateHandled ||
        e.boxSelectionHandled
      );
    }
    shouldHandleWheel(e) {
      let { viewportPanningEnabled: t } = this.diagramService.config();
      return !(
        !t ||
        e.zoomingHandled ||
        As(e, 'pan') ||
        (!this.flowCoreProvider.provide().actionStateManager.isPanning() &&
          (this.inputEventsRouter.eventGuards.withPrimaryModifier(e) ||
            e.ctrlKey))
      );
    }
    toggleGrabbingCursor(e) {
      this.elementRef.nativeElement.classList.toggle('panning', e);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramPanning', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          })('wheel', function (r) {
            return i.onWheel(r);
          });
      },
    });
  },
  Gu = class n {
    elementRef = m(ie);
    flowCoreProvider = m(z);
    inputEventsRouterService = m(ue);
    touchEventsStateService = m(mt);
    touchCache = [];
    lastDistance;
    initialDistance;
    isZoomingActive = !1;
    ZOOM_TRIGGER_DELTA = 40;
    onTouchStart(e) {
      for (let t of e.changedTouches) this.touchCache.push(t);
      this.touchCache.length === 2 &&
        ((this.lastDistance = this.computeDistance()),
        (this.initialDistance = this.lastDistance),
        (this.isZoomingActive = !1));
    }
    onTouchEnd(e) {
      for (let t of e.changedTouches) this.removeTouchFromCache(t);
      this.touchCache.length < 2 &&
        ((this.lastDistance = void 0),
        (this.initialDistance = void 0),
        (this.isZoomingActive = !1),
        (this.touchCache = []),
        this.touchEventsStateService.clearCurrentEvent());
    }
    onTouchMove(e) {
      for (let c of e.changedTouches) this.updateTouchInCache(c);
      if (
        this.touchCache.length !== 2 ||
        this.lastDistance === void 0 ||
        this.initialDistance === void 0
      )
        return;
      let t = this.computeDistance(),
        i = Math.abs(t - this.initialDistance);
      if (!this.isZoomingActive) {
        if (!(i > this.ZOOM_TRIGGER_DELTA)) return;
        ((this.isZoomingActive = !0),
          this.touchEventsStateService.currentEvent.set(ve.Zooming));
      }
      let o = this.flowCoreProvider.provide(),
        r = (this.touchCache[0].clientX + this.touchCache[1].clientX) / 2,
        s = (this.touchCache[0].clientY + this.touchCache[1].clientY) / 2,
        a = Math.min(
          Math.max(1 - o.config.zoom.step, t / this.lastDistance),
          1 + o.config.zoom.step,
        );
      this.lastDistance = t;
      let d = this.inputEventsRouterService.getBaseEvent(e);
      this.inputEventsRouterService.emit(
        y(h({}, d), {
          name: 'zoom',
          centerPoint: { x: r, y: s },
          zoomFactor: a,
        }),
      );
    }
    removeTouchFromCache(e) {
      let t = this.touchCache.findIndex((i) => i.identifier === e.identifier);
      t !== -1 && this.touchCache.splice(t, 1);
    }
    computeDistance() {
      return Math.hypot(
        this.touchCache[0].clientX - this.touchCache[1].clientX,
        this.touchCache[0].clientY - this.touchCache[1].clientY,
      );
    }
    updateTouchInCache(e) {
      let t = this.touchCache.findIndex((i) => i.identifier === e.identifier);
      t !== -1 && (this.touchCache[t] = e);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramZoomingPointer', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('touchstart', function (r) {
            return i.onTouchStart(r);
          })('touchend', function (r) {
            return i.onTouchEnd(r);
          })('touchmove', function (r) {
            return i.onTouchMove(r);
          })('touchcancel', function (r) {
            return i.onTouchEnd(r);
          });
      },
    });
  };
var Wu = class n {
    flowCoreProvider = m(z);
    inputEventsRouterService = m(ue);
    onWheel(e) {
      if (!this.shouldHandle(e)) return;
      (e.stopPropagation(), e.preventDefault(), (e.zoomingHandled = !0));
      let t = this.flowCoreProvider.provide(),
        i = this.getZoomFactor(e, t.config.zoom.step),
        o = this.inputEventsRouterService.getBaseEvent(e);
      this.inputEventsRouterService.emit(
        y(h({}, o), {
          name: 'zoom',
          centerPoint: { x: e.clientX, y: e.clientY },
          zoomFactor: i,
        }),
      );
    }
    shouldHandle(e) {
      if (e.zoomingHandled) return !1;
      let t = this.flowCoreProvider.provide();
      if (t.actionStateManager.isPanning()) return !1;
      if (e.ctrlKey) return !0;
      let i = this.inputEventsRouterService.getBaseEvent(e).modifiers;
      return t.shortcutManager.matchesAction('zoom', { modifiers: i });
    }
    isPinchGesture(e) {
      return e.ctrlKey && Math.abs(e.deltaY) < 50;
    }
    getZoomFactor(e, t) {
      return this.isPinchGesture(e)
        ? Math.exp(0.01 * -e.deltaY)
        : e.deltaY > 0
          ? 1 - t
          : 1 + t;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramZoomingWheel', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('wheel', function (r) {
            return i.onWheel(r);
          });
      },
    });
  },
  qu = class n {
    node = E.required();
    position = w(() => this.node().position);
    get transform() {
      let e = this.position();
      return `translate(${e.x}px, ${e.y}px)`;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramNodePosition', '']],
      hostVars: 4,
      hostBindings: function (t, i) {
        t & 2 && ye('transform', i.transform)('transform-origin', '0 0');
      },
      inputs: { node: [1, 'node'] },
    });
  },
  Os = class n {
    node = E.required();
    selected = w(() => this.node().selected ?? !1);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramNodeSelected', '']],
      hostVars: 4,
      hostBindings: function (t, i) {
        t & 2 &&
          Ne('ng-diagram-node-selected', i.selected())(
            'ng-diagram-node-wrapper',
            !0,
          );
      },
      inputs: { node: [1, 'node'] },
    });
  },
  vy = { width: '11.25rem', height: '2rem' },
  us = { width: '9.0625rem', height: '9.0625rem' },
  Zu = class n {
    hostElement = m(ie);
    renderer = m(Wr);
    batchResizeObserver = m(zt);
    flowCoreProvider = m(z);
    node = E.required();
    size = w(() => this.node().size);
    autoSize = w(() => this.node().autoSize ?? !0);
    id = w(() => this.node().id);
    sizeState = w(() => ({ size: this.size(), autoSize: this.autoSize() }));
    constructor() {
      fe(() => {
        let { size: e, autoSize: t } = this.sizeState();
        if (!t && e) {
          let { width: i, height: o } = this.size();
          this.setSize(i, o);
        } else this.setSize();
      });
    }
    ngOnInit() {
      this.connectResizeObserver();
    }
    ngOnDestroy() {
      this.disconnectResizeObserver();
    }
    setSize(e, t) {
      let i = this.node();
      e !== void 0 && t !== void 0
        ? this.applyExplicitSize(e, t, i)
        : this.applyAutoSize(i);
    }
    applyExplicitSize(e, t, i) {
      let o = this.hostElement.nativeElement,
        r = this.flowCoreProvider.provide().config.resize.getMinNodeSize(i),
        s = !i.type;
      if (
        (this.renderer.setStyle(o, 'width', `${e}px`),
        this.renderer.setStyle(o, 'height', `${t}px`),
        r || s)
      ) {
        let a = r?.width ?? Dl.width,
          d = r?.height ?? Dl.height;
        (this.renderer.setStyle(o, 'min-width', `${a}px`),
          this.renderer.setStyle(o, 'min-height', `${d}px`));
      }
    }
    applyAutoSize(e) {
      e.type
        ? this.resetExplicitSizes()
        : ci(e)
          ? this.applyDefaultGroupSize()
          : this.applyDefaultNodeSize();
    }
    applyDefaultGroupSize() {
      let e = this.hostElement.nativeElement;
      (this.renderer.setStyle(e, 'width', us.width),
        this.renderer.setStyle(e, 'height', us.height),
        this.renderer.setStyle(e, 'min-width', us.width),
        this.renderer.setStyle(e, 'min-height', us.height));
    }
    applyDefaultNodeSize() {
      let e = this.hostElement.nativeElement;
      (this.renderer.setStyle(e, 'width', 'unset'),
        this.renderer.setStyle(e, 'height', 'unset'),
        this.renderer.setStyle(e, 'min-width', vy.width),
        this.renderer.setStyle(e, 'min-height', vy.height));
    }
    resetExplicitSizes() {
      let e = this.hostElement.nativeElement;
      (this.renderer.setStyle(e, 'width', 'unset'),
        this.renderer.setStyle(e, 'height', 'unset'),
        this.renderer.setStyle(e, 'min-width', 'unset'),
        this.renderer.setStyle(e, 'min-height', 'unset'));
    }
    connectResizeObserver() {
      this.batchResizeObserver.observe(this.hostElement.nativeElement, {
        type: 'node',
        nodeId: this.id(),
      });
    }
    disconnectResizeObserver() {
      this.batchResizeObserver.unobserve(this.hostElement.nativeElement);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramNodeSize', '']],
      inputs: { node: [1, 'node'] },
    });
  },
  Yu = class n {
    viewport = E({ x: 0, y: 0, scale: 1 });
    get transform() {
      let e = this.viewport();
      return `translate(${e.x}px, ${e.y}px) scale(${e.scale})`;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramViewport', '']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && ye('transform', i.transform);
      },
      inputs: { viewport: [1, 'viewport'] },
    });
  },
  Fs = class n {
    data = E.required();
    zIndex = w(() => this.data().computedZIndex ?? 0);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramZIndex', '']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && ye('z-index', i.zIndex());
      },
      inputs: { data: [1, 'data'] },
    });
  },
  Ls = class n {
    inputEventsRouter = m(ue);
    emitStart(e, t, i) {
      let o = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'relinking',
          phase: 'start',
          target: t,
          targetType: 'edge',
          end: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          panningForce: null,
        }),
      );
    }
    emitContinue(e, t, i, o = null) {
      let r = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, r), {
          name: 'relinking',
          phase: 'continue',
          target: t,
          targetType: 'edge',
          end: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          panningForce: o,
        }),
      );
    }
    emitEnd(e, t, i, o = !1) {
      let r = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, r), {
          name: 'relinking',
          phase: 'end',
          target: t,
          targetType: 'edge',
          end: i,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          panningForce: null,
          takenOver: o,
        }),
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  mo = class n {
    relinkingEventService = m(Ls);
    flowCoreProvider = m(z);
    touchEventsStateService = m(mt);
    edge;
    end = 'target';
    pointerId = null;
    startClientPoint = null;
    started = !1;
    gestureActive = !1;
    edgePanningInterval = null;
    lastPanningEvent = null;
    lastPanningForce = null;
    unregisterInteractionCleanup = null;
    active = P(!1);
    ngOnDestroy() {
      let e = this.started;
      (this.removeListeners(),
        e &&
          this.flowCoreProvider.isInitialized() &&
          this.flowCoreProvider.provide().cancelActiveInteraction());
    }
    beginRelink(e, t, i) {
      let o = this.flowCoreProvider.provide();
      return !(
        this.gestureActive ||
        o.actionStateManager.isLinking() ||
        !ps(t, i, o.config.linking.defaultRelinkable) ||
        o.isCancellingInteraction() ||
        e.boxSelectionHandled ||
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled() ||
        ((this.edge = t),
        (this.end = i),
        (this.pointerId = e.pointerId),
        (this.startClientPoint = { x: e.clientX, y: e.clientY }),
        (this.started = !1),
        (this.gestureActive = !0),
        this.touchEventsStateService.currentEvent.set(ve.Linking),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        document.addEventListener('pointercancel', this.onPointerCancel),
        (this.unregisterInteractionCleanup = o.registerInteractionCleanup(() =>
          this.removeListeners(),
        )),
        0)
      );
    }
    onPointerMove = (e) => {
      if (e.pointerId !== this.pointerId) return;
      if (
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      )
        return (
          this.started &&
            this.relinkingEventService.emitEnd(e, this.edge, this.end, !0),
          void this.removeListeners()
        );
      if (!this.started) {
        let a = this.startClientPoint;
        if (
          (a ? j.distanceBetweenPoints(a, { x: e.clientX, y: e.clientY }) : 0) <
          5
        )
          return;
        ((this.started = !0),
          this.active.set(!0),
          this.relinkingEventService.emitStart(e, this.edge, this.end));
      }
      let t = this.flowCoreProvider.provide(),
        {
          edgePanningThreshold: i,
          edgePanningEnabled: o,
          edgePanningForce: r,
        } = t.config.linking,
        s = null;
      if (o) {
        let { width: a, height: d } = t.getViewport(),
          { x: c, y: l } = t.getFlowOffset();
        ((s = j.calculateEdgePanningForce(
          { x: c, y: l, width: a ?? 0, height: d ?? 0 },
          { x: e.clientX, y: e.clientY },
          i,
          r,
        )),
          (this.lastPanningEvent = e),
          (this.lastPanningForce = s),
          s ? this.startEdgePanning() : this.stopEdgePanning());
      }
      this.relinkingEventService.emitContinue(e, this.edge, this.end, s);
    };
    onPointerUp = (e) => {
      if (e.pointerId !== this.pointerId || e.button !== 0) return;
      let t =
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled();
      (this.started &&
        this.relinkingEventService.emitEnd(e, this.edge, this.end, t),
        this.removeListeners());
    };
    onPointerCancel = (e) => {
      e.pointerId === this.pointerId &&
        (this.started &&
          this.relinkingEventService.emitEnd(e, this.edge, this.end, !0),
        this.removeListeners());
    };
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        this.gestureActive &&
          ((this.gestureActive = !1),
          this.touchEventsStateService.clearCurrentEvent()),
        (this.started = !1),
        this.active.set(!1),
        (this.edge = void 0),
        (this.pointerId = null),
        (this.startClientPoint = null),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        document.removeEventListener('pointercancel', this.onPointerCancel),
        this.stopEdgePanning());
    }
    startEdgePanning() {
      this.edgePanningInterval === null &&
        (this.edgePanningInterval = window.setInterval(() => {
          this.lastPanningEvent &&
            this.lastPanningForce &&
            this.relinkingEventService.emitContinue(
              this.lastPanningEvent,
              this.edge,
              this.end,
              this.lastPanningForce,
            );
        }, Of));
    }
    stopEdgePanning() {
      (this.edgePanningInterval !== null &&
        (clearInterval(this.edgePanningInterval),
        (this.edgePanningInterval = null)),
        (this.lastPanningEvent = null),
        (this.lastPanningForce = null));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Qu = class n {
    inputEventsRouter = m(ue);
    boxSelectionProvider = m(uo);
    flowCoreProvider = m(z);
    elementRef = m(ie);
    startPoint = null;
    ngOnInit() {
      this.elementRef.nativeElement.addEventListener(
        'pointerdown',
        this.onPointerDownCapture,
        { capture: !0 },
      );
    }
    ngOnDestroy() {
      (this.elementRef.nativeElement.removeEventListener(
        'pointerdown',
        this.onPointerDownCapture,
        { capture: !0 },
      ),
        document.removeEventListener('pointermove', this.onMouseMove),
        document.removeEventListener('pointerup', this.onPointerUp));
    }
    onPointerDownCapture = (e) => {
      this.shouldHandle(e) && (e.boxSelectionHandled = !0);
    };
    onPointerDown(e) {
      if (!e.boxSelectionHandled) return;
      (e.preventDefault(), e.stopPropagation());
      let t = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'boxSelection',
          phase: 'start',
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      ),
        (this.startPoint = { x: e.clientX, y: e.clientY }),
        document.addEventListener('pointermove', this.onMouseMove),
        document.addEventListener('pointerup', this.onPointerUp));
    }
    onPointerUp = (e) => {
      if (!this.inputEventsRouter.eventGuards.withPrimaryButton(e)) return;
      (e.preventDefault(),
        e.stopPropagation(),
        document.removeEventListener('pointermove', this.onMouseMove),
        document.removeEventListener('pointerup', this.onPointerUp));
      let t = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'boxSelection',
          phase: 'end',
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      ),
        (this.startPoint = null),
        this.boxSelectionProvider.boundingBox.set(null));
    };
    onMouseMove = (e) => {
      (e.preventDefault(), e.stopPropagation());
      let t = this.inputEventsRouter.getBaseEvent(e);
      if (
        (this.inputEventsRouter.emit(
          y(h({}, t), {
            name: 'boxSelection',
            phase: 'continue',
            target: void 0,
            targetType: 'diagram',
            lastInputPoint: { x: e.clientX, y: e.clientY },
          }),
        ),
        this.startPoint)
      ) {
        let i = this.flowCoreProvider.provide(),
          { x: o, y: r } = i.clientToFlowViewportPosition(this.startPoint),
          { x: s, y: a } = i.clientToFlowViewportPosition({
            x: e.clientX,
            y: e.clientY,
          }),
          d = Math.min(o, s),
          c = Math.min(r, a),
          l = Math.abs(s - o),
          u = Math.abs(a - r);
        this.boxSelectionProvider.boundingBox.set({
          x: d,
          y: c,
          width: l,
          height: u,
        });
      }
    };
    shouldHandle(e) {
      let t = this.flowCoreProvider.provide(),
        i = this.inputEventsRouter.getBaseEvent(e).modifiers;
      return t.shortcutManager.matchesAction('boxSelection', { modifiers: i });
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramBoxSelection', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
    });
  },
  Ku = class n {
    inputEventsRouter = m(ue);
    diagramService = m($e);
    touchEventsStateService = m(mt);
    isPanning = !1;
    lastTouch = null;
    onTouchStart(e) {
      if (
        !this.isTwoFingerTouch(e) ||
        !this.shouldHandle(e) ||
        this.touchEventsStateService.zoomingHandled()
      )
        return void (this.isPanning = !1);
      ((this.isPanning = !0),
        this.touchEventsStateService.currentEvent.set(ve.Panning));
      let t = this.getMidpoint(e.touches);
      ((this.lastTouch = t),
        this.emitPanningEvent('start', e, t),
        this.preventDefaultAndStop(e));
    }
    onTouchMove(e) {
      if (this.touchEventsStateService.zoomingHandled() && this.isPanning)
        return (
          (this.isPanning = !1),
          (this.lastTouch = null),
          void this.touchEventsStateService.clearCurrentEvent()
        );
      if (!this.shouldContinuePanning(e)) return;
      let t = this.getMidpoint(e.touches);
      ((this.lastTouch = t),
        this.emitPanningEvent('continue', e, t),
        this.preventDefaultAndStop(e));
    }
    onTouchEnd(e) {
      if (!this.isPanning) return;
      this.isPanning = !1;
      let t = this.lastTouch || this.getMidpoint(e.touches);
      (this.emitPanningEvent('end', e, t),
        (this.lastTouch = null),
        this.touchEventsStateService.clearCurrentEvent(),
        this.preventDefaultAndStop(e));
    }
    getMidpoint(e) {
      return e.length < 2
        ? { x: 0, y: 0 }
        : {
            x: (e[0].clientX + e[1].clientX) / 2,
            y: (e[0].clientY + e[1].clientY) / 2,
          };
    }
    shouldHandle(e) {
      let { viewportPanningEnabled: t } = this.diagramService.config();
      return !(
        !t ||
        As(e, 'pan') ||
        this.touchEventsStateService.zoomingHandled()
      );
    }
    isTwoFingerTouch(e) {
      return e.touches.length === 2;
    }
    shouldContinuePanning(e) {
      return (
        this.isPanning &&
        this.isTwoFingerTouch(e) &&
        !this.touchEventsStateService.zoomingHandled()
      );
    }
    emitPanningEvent(e, t, i) {
      let o = this.inputEventsRouter.getBaseEvent(t);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'panning',
          phase: e,
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: i,
        }),
      );
    }
    preventDefaultAndStop(e) {
      (e.preventDefault(), e.stopPropagation());
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramPanning', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('touchstart', function (r) {
            return i.onTouchStart(r);
          })('touchmove', function (r) {
            return i.onTouchMove(r);
          })('touchend', function (r) {
            return i.onTouchEnd(r);
          })('touchcancel', function (r) {
            return i.onTouchEnd(r);
          });
      },
    });
  },
  Xu = class n {
    service = m(z, { optional: !0, skipSelf: !0 });
    constructor() {
      if (!this.service)
        throw new Error(`NgDiagram services are not available. Please register all required services using \`provideNgDiagram()\` in your component's providers array.

Example usage:

import { provideNgDiagram } from 'ng-diagram';

@Component({
  selector: 'app-root',
  providers: [provideNgDiagram()], // Add this to register all ng-diagram services
  template: \`<ng-diagram ...></ng-diagram>\`
})
export class AppComponent {...}`);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramServicesAvailabilityChecker', '']],
    });
  },
  qT = (
    n,
  ) => `[ngDiagram] Node template '${n}' is not registered. Falling back to default node template.

Documentation: https://www.ngdiagram.dev/docs/guides/nodes/custom-nodes/
`,
  ZT = (
    n,
  ) => `[ngDiagram] Edge template '${n}' is not registered. Falling back to default edge template.

Documentation: https://www.ngdiagram.dev/docs/guides/edges/custom-edges/
`,
  Bs = class n {
    flowConfig = m(z);
    nodeTemplateMap = new di();
    edgeTemplateMap = new Ps();
    accessedNodeTypes = new Set();
    accessedEdgeTypes = new Set();
    setNodeTemplateMap(e) {
      (this.accessedNodeTypes.clear(), (this.nodeTemplateMap = e));
    }
    setEdgeTemplateMap(e) {
      (this.accessedEdgeTypes.clear(), (this.edgeTemplateMap = e));
    }
    getNodeTemplate(e) {
      if (e === void 0) return null;
      let t = this.nodeTemplateMap.get(e || '');
      return (
        t ||
          this.accessedNodeTypes.has(e) ||
          (console.warn(qT(e)), this.accessedNodeTypes.add(e)),
        t ?? null
      );
    }
    getEdgeTemplate(e) {
      if (e === void 0) return null;
      let t = this.edgeTemplateMap.get(e || '');
      return (
        t ||
          this.accessedEdgeTypes.has(e) ||
          (console.warn(ZT(e)), this.accessedEdgeTypes.add(e)),
        t ?? null
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  YT = [iT, mT, XS];
var Ju = class n {
    boxSelectionProvider = m(uo);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-box-selection']],
      decls: 2,
      vars: 2,
      consts: [[3, 'left', 'top', 'width', 'height']],
      template: function (t, i) {
        if ((t & 1 && (eo(0), oe(1, Y0, 1, 8, 'div', 0)), t & 2)) {
          let o = Kr(i.boxSelectionProvider.boundingBox());
          (_(), re(o ? 1 : -1));
        }
      },
      styles: [
        'div[_ngcontent-%COMP%]{position:absolute;pointer-events:none;background-color:var(--ngd-box-selection-background);border:var(--ngd-box-selection-border-size) solid var(--ngd-box-selection-border-color)}',
      ],
      changeDetection: 0,
    });
  },
  ef = class n {
    renderer = m(st);
    isVisible = this.renderer.isInitialized;
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-canvas']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && ye('visibility', i.isVisible() ? null : 'hidden');
      },
      features: [ht([{ directive: Yu, inputs: ['viewport', 'viewport'] }])],
      ngContentSelectors: K0,
      decls: 5,
      vars: 0,
      consts: [
        [1, 'edges-container'],
        [1, 'nodes-container'],
      ],
      template: function (t, i) {
        t & 1 &&
          (me(Q0),
          ge(0, 'div', 0),
          ce(1),
          ce(2, 1),
          he(),
          ge(3, 'div', 1),
          ce(4, 2),
          he());
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;width:100%;height:100%;display:flex;overflow:visible;transform-origin:0 0}.nodes-container[_ngcontent-%COMP%], .edges-container[_ngcontent-%COMP%]{position:absolute;width:100%;height:100%;top:0;left:0;pointer-events:none}',
      ],
      changeDetection: 0,
    });
  },
  tf = class n {
    relinkingGesture = m(mo);
    inputEventsRouter = m(ue);
    edge = E.required();
    end = E.required();
    onPointerDown(e) {
      this.inputEventsRouter.eventGuards.withPrimaryButton(e) &&
        this.relinkingGesture.beginRelink(e, this.edge(), this.end()) &&
        (e.relinkHandled = !0);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramRelinkHandle', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { edge: [1, 'edge'], end: [1, 'end'] },
    });
  },
  QT = (
    n,
    e,
    t,
    i,
    o,
  ) => `[ngDiagram] Invalid edge coordinates detected for edge '${n}'.

Edge details:
  \u2022 source: ${e} (port: ${t || 'not specified'})
  \u2022 target: ${i} (port: ${o || 'not specified'})

Documentation: https://www.ngdiagram.dev/docs/guides/edges/edges/
`;
var wy = { x: 0, y: 0 },
  yo = class n {
    flowCoreProvider = m(z);
    markerRegistry = m(si);
    diagramService = m($e, { optional: !0 });
    renderer = m(st, { optional: !0 });
    useInlineMarkers = this.markerRegistry.useInlineMarkers;
    edge = E.required();
    routing = E();
    stroke = E();
    sourceArrowhead = E();
    targetArrowhead = E();
    strokeOpacity = E();
    strokeWidth = E();
    strokeDasharray = E();
    points = w(() => this.edge().points ?? []);
    path = w(() => {
      let e = this.edge(),
        t = this.routing() ?? e.routing,
        i = this.flowCoreProvider.provide(),
        o = this.points();
      if (o.length === 0) return '';
      if (o.some((s) => !xe(s)))
        return (
          console.error(
            QT(e.id, e.source, e.sourcePort, e.target, e.targetPort),
          ),
          ''
        );
      if (t && i.edgeRoutingManager.hasRouting(t))
        return i.edgeRoutingManager.computePath(t, o);
      let r = i.edgeRoutingManager.getDefaultRouting();
      return i.edgeRoutingManager.hasRouting(r)
        ? i.edgeRoutingManager.computePath(r, o)
        : `M ${o[0].x},${o[0].y}`;
    });
    sourceMarkerId = w(
      () => this.edge()?.sourceArrowhead ?? this.sourceArrowhead(),
    );
    targetMarkerId = w(
      () => this.edge()?.targetArrowhead ?? this.targetArrowhead(),
    );
    markerStart = w(() => {
      let e = this.sourceMarkerId();
      return e
        ? this.markerRegistry.getMarkerUrl(e, this.edge().id, 'source')
        : null;
    });
    markerEnd = w(() => {
      let e = this.targetMarkerId();
      return e
        ? this.markerRegistry.getMarkerUrl(e, this.edge().id, 'target')
        : null;
    });
    selected = w(() => this.edge().selected);
    temporary = w(() => this.edge().temporary);
    dangling = w(() => {
      let e = this.edge();
      return Py(e) && !e.temporary;
    });
    labels = w(() => this.edge().measuredLabels ?? []);
    relinkPreview = w(() =>
      this.temporary()
        ? this.diagramService?.actionState().linking?.relink
        : void 0,
    );
    relinkSourceHandleVisible = w(() => this.relinkHandleVisible('source'));
    relinkTargetHandleVisible = w(() => this.relinkHandleVisible('target'));
    relinkSourceHandle = w(() => this.points()[0]);
    relinkTargetHandle = w(() => this.points()[this.points().length - 1]);
    relinkHandles = w(() => {
      let e = [];
      return (
        this.relinkSourceHandleVisible() &&
          e.push(this.relinkHandleView('source', this.relinkSourceHandle())),
        this.relinkTargetHandleVisible() &&
          e.push(this.relinkHandleView('target', this.relinkTargetHandle())),
        e
      );
    });
    relinkHandleHitRadius = w(
      () => 12 / (this.renderer?.viewport().scale || 1),
    );
    class = w(() => {
      let e = ['ng-diagram-edge__path'];
      return (
        this.selected() && e.push('selected'),
        this.temporary() && e.push('temporary'),
        this.dangling() && e.push('dangling'),
        e.join(' ')
      );
    });
    prevRouting;
    prevRoutingMode;
    prevPoints;
    relinkHandleVisible(e) {
      if (this.points().length === 0) return !1;
      let t = this.relinkPreview();
      if (!t && (!this.selected() || this.temporary())) return !1;
      let i = this.diagramService?.config().linking?.defaultRelinkable ?? !1;
      return t
        ? t.end === e || ps(t.originalEdge, e, i)
        : ps(this.edge(), e, i);
    }
    relinkHandleView(e, t) {
      return {
        end: e,
        point: t,
        inset: this.relinkHandleInset(e, t),
        dragging: this.relinkPreview()?.end === e,
      };
    }
    relinkHandleInset(e, t) {
      let i = this.points(),
        o = e === 'source' ? i[1] : i.at(-2);
      if (!o) return wy;
      let r = t.x - o.x,
        s = t.y - o.y,
        a = Math.hypot(r, s);
      return a === 0 ? wy : { x: r / a, y: s / a };
    }
    constructor() {
      fe(() => this.syncEdgePropertiesToModel());
    }
    syncEdgePropertiesToModel() {
      let e = this.edge(),
        t = {};
      (this.checkRoutingChanges(e, t) ||
        this.checkRoutingModeChanges(e, t) ||
        this.checkPointsChanges(e, t)) &&
        this.flowCoreProvider
          .provide()
          .commandHandler.emit('updateEdge', { id: e.id, edgeChanges: t });
    }
    checkRoutingChanges(e, t) {
      let i = this.routing() ?? e.routing;
      return !(
        !i ||
        this.prevRouting === i ||
        ((t.routing = i), (this.prevRouting = i), 0)
      );
    }
    checkRoutingModeChanges(e, t) {
      return !(
        !e.routingMode ||
        this.prevRoutingMode === e.routingMode ||
        ((t.routingMode = e.routingMode),
        (this.prevRoutingMode = e.routingMode),
        0)
      );
    }
    checkPointsChanges(e, t) {
      return !(
        !(e.routingMode === 'manual' && e.points && e.points.length > 0) ||
        (this.prevPoints && gM(this.prevPoints, e.points)) ||
        ((t.points = e.points), (this.prevPoints = e.points), 0)
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-base-edge']],
      hostVars: 6,
      hostBindings: function (t, i) {
        t & 2 &&
          Ne('selected', i.selected())('temporary', i.temporary())(
            'dangling',
            i.dangling(),
          );
      },
      inputs: {
        edge: [1, 'edge'],
        routing: [1, 'routing'],
        stroke: [1, 'stroke'],
        sourceArrowhead: [1, 'sourceArrowhead'],
        targetArrowhead: [1, 'targetArrowhead'],
        strokeOpacity: [1, 'strokeOpacity'],
        strokeWidth: [1, 'strokeWidth'],
        strokeDasharray: [1, 'strokeDasharray'],
      },
      features: [
        ht([
          { directive: Fs, inputs: ['data', 'edge'] },
          { directive: Vu, inputs: ['targetData', 'edge'] },
        ]),
      ],
      ngContentSelectors: Oe,
      decls: 8,
      vars: 15,
      consts: [
        [
          'ngDiagramInlineMarkers',
          '',
          3,
          'sourceMarkerId',
          'targetMarkerId',
          'edgeId',
        ],
        [
          'fill',
          'none',
          'stroke',
          'none',
          'stroke-width',
          '20',
          'stroke-opacity',
          '0',
        ],
        [
          'ngDiagramRelinkHandle',
          '',
          1,
          'ng-diagram-edge__relink-handle',
          3,
          'ng-diagram-edge__relink-handle--dragging',
          'edge',
          'end',
          '--ngd-relink-handle-inset-x',
          '--ngd-relink-handle-inset-y',
        ],
        [
          'ngDiagramRelinkHandle',
          '',
          1,
          'ng-diagram-edge__relink-handle-hit',
          3,
          'edge',
          'end',
          '--ngd-relink-handle-inset-x',
          '--ngd-relink-handle-inset-y',
        ],
        [
          'ngDiagramRelinkHandle',
          '',
          1,
          'ng-diagram-edge__relink-handle-hit',
          3,
          'edge',
          'end',
        ],
        [
          'ngDiagramRelinkHandle',
          '',
          1,
          'ng-diagram-edge__relink-handle',
          3,
          'edge',
          'end',
        ],
        [1, 'ng-diagram-edge__relink-handle-halo'],
        [1, 'ng-diagram-edge__relink-handle-circle'],
      ],
      template: function (t, i) {
        (t & 1 &&
          (me(),
          de(),
          W(0, 'svg'),
          oe(1, X0, 1, 3, ':svg:defs', 0),
          $(2, 'path')(3, 'path', 1),
          oe(4, eI, 2, 0),
          ot(5, tI, 3, 13, ':svg:g', 2, Iy),
          Y(),
          ce(7)),
          t & 2 &&
            (ye(
              'color',
              i.stroke() ||
                'var(--edge-stroke, var(--ngd-default-edge-stroke))',
            ),
            _(),
            re(i.useInlineMarkers ? 1 : -1),
            _(),
            je(i.class()),
            q('d', i.path())(
              'stroke',
              i.stroke() ||
                'var(--edge-stroke, var(--ngd-default-edge-stroke))',
            )('fill', 'none')(
              'stroke-width',
              i.strokeWidth() || 'var(--edge-stroke-width, 2)',
            )(
              'stroke-dasharray',
              i.strokeDasharray() || 'var(--edge-stroke-dasharray, none)',
            )('marker-start', i.markerStart())('marker-end', i.markerEnd())(
              'stroke-opacity',
              i.strokeOpacity() || 'var(--edge-stroke-opacity, 1)',
            ),
            _(),
            q('d', i.path()),
            _(),
            re(i.temporary() ? -1 : 4),
            _(),
            rt(i.relinkHandles())));
      },
      dependencies: [Bu, tf],
      styles: [
        '[_nghost-%COMP%]{position:relative}svg[_ngcontent-%COMP%]{overflow:visible;position:absolute;cursor:pointer}svg[_ngcontent-%COMP%]   path[_ngcontent-%COMP%]{pointer-events:visibleStroke;cursor:pointer;transition:var(--edge-stroke-transition, none)}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]{pointer-events:all;cursor:grab;touch-action:none}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]:active{cursor:grabbing}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%]{r:calc((var(--edge-relink-handle-size, var(--ngd-relink-handle-size, .75rem)) - var(--edge-relink-handle-stroke-width, var(--ngd-relink-handle-stroke-width, .1875rem))) / 2);fill:var(--edge-relink-handle-fill, var(--ngd-relink-handle-fill, #fff));stroke:var(--edge-relink-handle-stroke, var(--ngd-relink-handle-stroke, currentColor));stroke-width:var(--edge-relink-handle-stroke-width, var(--ngd-relink-handle-stroke-width, .1875rem))}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%]{pointer-events:none;r:calc((var(--edge-relink-handle-size, var(--ngd-relink-handle-size, .75rem)) + var(--edge-relink-handle-halo-size, var(--ngd-relink-handle-halo-size, .25rem))) / 2);fill:none;stroke:var(--edge-relink-handle-halo-color-hover, var(--ngd-relink-handle-halo-color-hover, color-mix(in srgb, currentColor 40%, transparent)));stroke-width:var(--edge-relink-handle-halo-size, var(--ngd-relink-handle-halo-size, .25rem));opacity:0;transition:opacity .1s ease-in-out}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[_ngcontent-%COMP%]{pointer-events:all;cursor:grab;touch-action:none;fill:transparent;stroke:none}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[_ngcontent-%COMP%]:active{cursor:grabbing}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[_ngcontent-%COMP%]{transform:translate(calc(var(--ngd-relink-handle-inset-x, 0) * calc(var(--edge-relink-handle-size, var(--ngd-relink-handle-size, .75rem)) / 2 - .125rem)),calc(var(--ngd-relink-handle-inset-y, 0) * calc(var(--edge-relink-handle-size, var(--ngd-relink-handle-size, .75rem)) / 2 - .125rem)))}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]:hover   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=source][_ngcontent-%COMP%]:hover ~ .ng-diagram-edge__relink-handle[data-relink-handle=source][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=target][_ngcontent-%COMP%]:hover ~ .ng-diagram-edge__relink-handle[data-relink-handle=target][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%]{fill:var(--edge-relink-handle-fill-hover, var(--ngd-relink-handle-fill-hover, #fff));stroke:var(--edge-relink-handle-stroke-hover, var(--ngd-relink-handle-stroke-hover, currentColor))}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]:hover   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=source][_ngcontent-%COMP%]:hover ~ .ng-diagram-edge__relink-handle[data-relink-handle=source][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=target][_ngcontent-%COMP%]:hover ~ .ng-diagram-edge__relink-handle[data-relink-handle=target][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%]{opacity:1}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]:active   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle--dragging[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=source][_ngcontent-%COMP%]:active ~ .ng-diagram-edge__relink-handle[data-relink-handle=source][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=target][_ngcontent-%COMP%]:active ~ .ng-diagram-edge__relink-handle[data-relink-handle=target][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-circle[_ngcontent-%COMP%]{fill:var(--edge-relink-handle-fill-drag, var(--ngd-relink-handle-fill-drag, currentColor));stroke:var(--edge-relink-handle-stroke-drag, var(--ngd-relink-handle-stroke-drag, currentColor))}svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]:active   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle--dragging[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=source][_ngcontent-%COMP%]:active ~ .ng-diagram-edge__relink-handle[data-relink-handle=source][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%], svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-hit[data-relink-handle-hit=target][_ngcontent-%COMP%]:active ~ .ng-diagram-edge__relink-handle[data-relink-handle=target][_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle-halo[_ngcontent-%COMP%]{stroke:var(--edge-relink-handle-halo-color-drag, var(--ngd-relink-handle-halo-color-drag, color-mix(in srgb, currentColor 40%, transparent)));opacity:1}.temporary[_nghost-%COMP%]   svg[_ngcontent-%COMP%]   path[_ngcontent-%COMP%], .temporary[_nghost-%COMP%]   svg[_ngcontent-%COMP%]   .ng-diagram-edge__relink-handle[_ngcontent-%COMP%]{pointer-events:none}',
      ],
      changeDetection: 0,
    });
  },
  nf = class n {
    flowCoreProvider = m(z);
    hostElement = m(ie);
    edgeComponent = m(yo);
    batchResizeObserver = m(zt);
    id = E.required();
    positionOnEdge = E.required();
    hidden = E(!1, { transform: ns });
    edgeData = w(() => this.edgeComponent.edge());
    points = w(() => this.edgeData()?.points);
    edgeId = w(() => this.edgeData()?.id);
    ownerInternalId;
    position = w(
      () =>
        this.edgeData()?.measuredLabels?.find((i) => i.id === this.id())
          ?.position || { x: 0, y: 0 },
    );
    isVisible = w(() => {
      let e = this.edgeData();
      if (!e) return !1;
      let t = e.measuredLabels?.find((i) => i.id === this.id());
      return !(
        !t?.position ||
        t?.position.x == null ||
        t?.position.y == null ||
        !(e.points && e.points.length >= 2)
      );
    });
    lastPositionOnEdge = P(void 0);
    get transform() {
      let e = this.position();
      return `translate(${e.x}px, ${e.y}px) translate(-50%, -50%)`;
    }
    isRegistered = !1;
    constructor() {
      (fe(() => {
        let e = this.positionOnEdge(),
          t = this.lastPositionOnEdge();
        e !== t &&
          (ke(() => {
            this.lastPositionOnEdge.set(e);
          }),
          this.flowCoreProvider
            .provide()
            .updater.applyEdgeLabelChanges(this.edgeId(), [
              { labelId: this.id(), labelChanges: { positionOnEdge: e } },
            ]));
      }),
        fe(() => {
          let e = this.hidden(),
            t = ke(() => this.edgeId());
          this.isRegistered &&
            t &&
            this.flowCoreProvider
              .provide()
              .templateVisibilityRegistry?.setLabelHidden(t, this.id(), e);
        }));
    }
    ngOnInit() {
      (this.lastPositionOnEdge.set(this.positionOnEdge()),
        (this.ownerInternalId = this.edgeData()?._internalId),
        this.hidden() &&
          this.flowCoreProvider
            .provide()
            .templateVisibilityRegistry?.setLabelHidden(
              this.edgeId(),
              this.id(),
              !0,
            ),
        (this.isRegistered = !0),
        this.flowCoreProvider.provide().updater.addEdgeLabel(this.edgeId(), {
          id: this.id(),
          positionOnEdge: this.positionOnEdge(),
        }),
        this.batchResizeObserver.observe(this.hostElement.nativeElement, {
          type: 'edge-label',
          edgeId: this.edgeId(),
          labelId: this.id(),
        }));
    }
    ngOnDestroy() {
      this.batchResizeObserver.unobserve(this.hostElement.nativeElement);
      let e = this.flowCoreProvider.provide();
      if (!e.isInitialized) return;
      let t = this.edgeId(),
        i = t ? e.getEdgeById(t) : null;
      i &&
        ((this.ownerInternalId && i._internalId !== this.ownerInternalId) ||
          (e.templateVisibilityRegistry?.setLabelHidden(t, this.id(), !1),
          e.updater.deleteEdgeLabel(t, this.id())));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-base-edge-label']],
      hostVars: 6,
      hostBindings: function (t, i) {
        t & 2 &&
          ye('transform', i.transform)(
            'visibility',
            i.isVisible() ? null : 'hidden',
          )('display', i.hidden() ? 'none' : null);
      },
      inputs: {
        id: [1, 'id'],
        positionOnEdge: [1, 'positionOnEdge'],
        hidden: [1, 'hidden'],
      },
      ngContentSelectors: Oe,
      decls: 1,
      vars: 0,
      template: function (t, i) {
        t & 1 && (me(), ce(0));
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;pointer-events:all}.ng-diagram-edge--temporary[_nghost-%COMP%], .ng-diagram-edge--temporary   [_nghost-%COMP%]{pointer-events:none}',
      ],
      changeDetection: 0,
    });
  };
var of = class n {
    edgeComponent = m(yo);
    selected = w(() => this.edgeComponent.selected());
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-default-edge-label']],
      ngContentSelectors: Oe,
      decls: 2,
      vars: 3,
      consts: [[3, 'className']],
      template: function (t, i) {
        (t & 1 && (me(), ge(0, 'div', 0), ce(1), he()),
          t & 2 &&
            (Ne('selected', i.selected()),
            Lt('className', 'ng-diagram-default-edge-label')));
      },
      styles: [
        '.ng-diagram-default-edge-label[_ngcontent-%COMP%]{display:flex;padding:var(--edge-label-padding, 4px 8px);border-radius:var(--edge-label-border-radius, 4px);font-size:var(--edge-label-font-size, 12px);background:var(--edge-label-background-color, var(--ngd-default-edge-label-background-color));color:var(--edge-label-text-color, var(--ngd-default-edge-label-color));border:var(--edge-label-border-width, 1px) solid var(--edge-label-border-color, var(--ngd-default-edge-label-border-color));transition:var(--edge-label-border-transition, border-color .1s ease-in-out)}ng-diagram-base-edge:hover:not(.selected):not(.temporary)[_nghost-%COMP%]   .ng-diagram-default-edge-label[_ngcontent-%COMP%], ng-diagram-base-edge:hover:not(.selected):not(.temporary)   [_nghost-%COMP%]   .ng-diagram-default-edge-label[_ngcontent-%COMP%]{border-color:var(--edge-label-border-color-hover, var(--edge-label-border-color, var(--ngd-default-edge-stroke-hover)))}.ng-diagram-default-edge-label.selected[_ngcontent-%COMP%]{border-color:var(--edge-label-border-color-selected, var(--edge-label-border-color, var(--ngd-default-edge-stroke-selected)))}',
      ],
      changeDetection: 0,
    });
  },
  rf = class n {
    edge = E.required();
    label = w(() => this.edge().data?.label);
    positionOnEdge = w(() => this.edge().data?.positionOnEdge ?? 0.5);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-default-edge']],
      inputs: { edge: [1, 'edge'] },
      decls: 3,
      vars: 3,
      consts: [
        [1, 'default-edge', 3, 'edge'],
        [1, 'ng-diagram-default-label', 3, 'id', 'positionOnEdge'],
      ],
      template: function (t, i) {
        if (
          (t & 1 &&
            (W(0, 'ng-diagram-base-edge', 0),
            eo(1),
            oe(2, nI, 3, 3, 'ng-diagram-base-edge-label', 1),
            Y()),
          t & 2)
        ) {
          (O('edge', i.edge()), _());
          let o = Kr(i.label());
          (_(), re(o ? 2 : -1));
        }
      },
      dependencies: [yo, nf, of],
      styles: [
        'ng-diagram-base-edge.default-edge[_ngcontent-%COMP%]{--edge-stroke: var(--ngd-default-edge-stroke);--edge-stroke-transition: stroke .1s ease-in-out}ng-diagram-base-edge.default-edge[_ngcontent-%COMP%]:hover:not(.selected):not(.temporary){--edge-stroke: var(--ngd-default-edge-stroke-hover);--edge-label-border-color: var(--ngd-default-edge-stroke-hover)}ng-diagram-base-edge.default-edge.selected[_ngcontent-%COMP%]{--edge-stroke: var(--ngd-default-edge-stroke-selected);--edge-label-border-color: var(--ngd-default-edge-stroke-selected)}ng-diagram-base-edge.default-edge.temporary[_ngcontent-%COMP%]{--edge-stroke-opacity: .5}',
      ],
      changeDetection: 0,
    });
  },
  sf = class n {
    elementRef = m(ie);
    markerRegistry = m(si);
    destroyRef = m(It);
    markerId = null;
    ngAfterViewInit() {
      let e = this.elementRef.nativeElement.querySelector('marker');
      if (!e)
        return void console.warn(
          '[ngDiagram] Marker element not found in projected content',
        );
      let t = e.getAttribute('id');
      t
        ? ((this.markerId = t),
          this.markerRegistry.registerMarker(t, e),
          this.destroyRef.onDestroy(() => {
            this.markerId &&
              this.markerRegistry.unregisterMarker(this.markerId);
          }))
        : console.warn('[ngDiagram] Marker element must have an id attribute');
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-marker']],
      ngContentSelectors: Oe,
      decls: 1,
      vars: 0,
      template: function (t, i) {
        t & 1 && (me(), ce(0));
      },
      styles: [
        '[_nghost-%COMP%]{display:contents}[_nghost-%COMP%]     svg{position:absolute;pointer-events:none;fill:currentColor}',
      ],
      changeDetection: 0,
    });
  },
  af = class n {
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-marker-arrow']],
      decls: 5,
      vars: 0,
      consts: [
        [
          'id',
          'ng-diagram-arrow',
          'viewBox',
          '0 9 8 14',
          'refX',
          '6',
          'refY',
          '16',
          'markerWidth',
          '4',
          'markerHeight',
          '7',
          'orient',
          'auto-start-reverse',
        ],
        [
          'd',
          'M1 21L6 16L1 11',
          'stroke',
          'context-stroke',
          'fill',
          'none',
          'stroke-width',
          '2',
          'stroke-linecap',
          'round',
          'stroke-linejoin',
          'round',
        ],
      ],
      template: function (t, i) {
        t & 1 &&
          (W(0, 'ng-diagram-marker'),
          de(),
          W(1, 'svg')(2, 'defs')(3, 'marker', 0),
          $(4, 'path', 1),
          Y()()()());
      },
      dependencies: [sf],
      encapsulation: 2,
    });
  },
  df = class n {
    edge = E.required();
    dangling = w(() => {
      let e = this.edge();
      return Py(e) && !e.temporary;
    });
    temporary = w(() => !!this.edge().temporary);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-edge']],
      hostVars: 6,
      hostBindings: function (t, i) {
        t & 2 &&
          (ye('display', i.edge().computedHidden ? 'none' : null),
          Ne('ng-diagram-edge--dangling', i.dangling())(
            'ng-diagram-edge--temporary',
            i.temporary(),
          ));
      },
      inputs: { edge: [1, 'edge'] },
      ngContentSelectors: Oe,
      decls: 1,
      vars: 0,
      template: function (t, i) {
        t & 1 && (me(), ce(0));
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;-webkit-user-select:none;user-select:none}',
      ],
      changeDetection: 0,
    });
  },
  cf = class n {
    inputEventsRouter = m(ue);
    diagramComponent = m(Eo);
    flowCoreProvider = m(z);
    touchEventsStateService = m(mt);
    targetData = E();
    edgePanningInterval = null;
    cachedDiagramRect = null;
    unregisterInteractionCleanup = null;
    gestureActive = !1;
    lastGesturePoint = null;
    ngOnDestroy() {
      let e = this.gestureActive;
      if (
        (this.removeListeners(), e && this.flowCoreProvider.isInitialized())
      ) {
        let t = this.flowCoreProvider.provide();
        t.cancelActiveInteraction().then((i) => {
          i ||
            t.isCancellingInteraction() ||
            t.actionStateManager.clearDragging();
        });
      }
    }
    onPointerDown(e) {
      if (
        this.gestureActive ||
        !this.shouldHandle(e) ||
        !this.inputEventsRouter.eventGuards.withPrimaryButton(e)
      )
        return;
      let t = this.targetData();
      if (!t) return;
      ((this.gestureActive = !0),
        (this.lastGesturePoint = { x: e.clientX, y: e.clientY }),
        this.touchEventsStateService.currentEvent.set(ve.Move),
        (this.cachedDiagramRect =
          this.diagramComponent.getBoundingClientRect()),
        (e.moveSelectionHandled = !0));
      let i = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, i), {
          name: 'pointerMoveSelection',
          phase: 'start',
          target: t,
          targetType: 'node',
          lastInputPoint: { x: e.clientX, y: e.clientY },
          currentDiagramEdge: null,
        }),
      ),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
    }
    onPointerUp = (e) => {
      this.inputEventsRouter.eventGuards.withPrimaryButton(e) &&
        this.finishDragging(e);
    };
    onPointerMove = (e) => {
      if (
        e.zoomingHandled ||
        this.touchEventsStateService.boxSelectionHandled() ||
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      )
        return void this.finishDragging(e, this.lastGesturePoint);
      let t = this.targetData();
      if (!t) return;
      this.lastGesturePoint = { x: e.clientX, y: e.clientY };
      let i = this.inputEventsRouter.getBaseEvent(e),
        {
          selectionMoving: {
            edgePanningThreshold: o,
            edgePanningEnabled: r,
            edgePanningForce: s,
          },
          viewportPanningEnabled: a,
        } = this.flowCoreProvider.provide().config,
        d = null;
      (a &&
        r &&
        ((d = j.calculateEdgePanningForce(
          this.cachedDiagramRect ||
            this.diagramComponent.getBoundingClientRect(),
          { x: e.clientX, y: e.clientY },
          o,
          s,
        )),
        d
          ? this.startEdgePanning(e.clientX, e.clientY, d)
          : this.stopEdgePanning()),
        this.inputEventsRouter.emit(
          y(h({}, i), {
            name: 'pointerMoveSelection',
            phase: 'continue',
            target: t,
            targetType: 'node',
            lastInputPoint: { x: e.clientX, y: e.clientY },
            panningForce: d,
          }),
        ));
    };
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        this.stopEdgePanning(),
        (this.cachedDiagramRect = null),
        this.gestureActive &&
          ((this.gestureActive = !1),
          this.touchEventsStateService.clearCurrentEvent()));
    }
    finishDragging(e, t = null) {
      let i = this.targetData();
      if (!i) return;
      this.removeListeners();
      let o = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'pointerMoveSelection',
          phase: 'end',
          target: i,
          targetType: 'node',
          lastInputPoint: t ?? { x: e.clientX, y: e.clientY },
          currentDiagramEdge: null,
        }),
      );
    }
    shouldHandle(e) {
      return !(
        !this.flowCoreProvider.provide().config.nodeDraggingEnabled ||
        !(this.targetData()?.draggable ?? 1) ||
        As(e, 'drag') ||
        e.zoomingHandled ||
        e.linkingHandled ||
        e.rotateHandled ||
        e.boxSelectionHandled ||
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      );
    }
    startEdgePanning(e, t, i) {
      (this.stopEdgePanning(),
        (this.edgePanningInterval = window.setInterval(() => {
          let o = this.targetData();
          if (!o) return;
          let r = this.inputEventsRouter.getBaseEvent({});
          this.inputEventsRouter.emit(
            y(h({}, r), {
              name: 'pointerMoveSelection',
              phase: 'continue',
              target: o,
              targetType: 'node',
              lastInputPoint: { x: e, y: t },
              panningForce: i,
            }),
          );
        }, Of)));
    }
    stopEdgePanning() {
      this.edgePanningInterval != null &&
        (window.clearInterval(this.edgePanningInterval),
        (this.edgePanningInterval = null));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramPointerMoveSelection', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { targetData: [1, 'targetData'] },
    });
  },
  Hs = class n {
    portsService = m(go);
    flowCore = m(z);
    hostElement = m(ie);
    destroyed = !1;
    node = E.required();
    rotate = w(() =>
      this.node().angle ? `rotate(${this.node().angle}deg)` : '',
    );
    id = w(() => this.node().id);
    size = w(() => this.node().size);
    constructor() {
      (m(It).onDestroy(() => (this.destroyed = !0)),
        this.setupPortSyncEffect());
    }
    syncPorts() {
      let e = this.id(),
        t = this.flowCore.provide();
      if (t.actionStateManager.isResizing()) {
        let i = this.portsService.getNodePortsData(
          this.hostElement.nativeElement,
          e,
        );
        t.updater.applyPortChanges(e, Es(i));
      } else
        queueMicrotask(() => {
          if (this.destroyed) return;
          let i = this.portsService.getNodePortsData(
            this.hostElement.nativeElement,
            e,
          );
          t.updater.applyPortChanges(e, Es(i));
        });
    }
    setupPortSyncEffect() {
      let e,
        t,
        i = !0;
      fe(() => {
        let o = this.size(),
          r = this.rotate();
        if (i) return ((i = !1), (e = o), void (t = r));
        (o?.width !== e?.width || o?.height !== e?.height || r !== t) &&
          ((e = o), (t = r), this.syncPorts());
      });
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-node']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && ye('display', i.node().computedHidden ? 'none' : null);
      },
      inputs: { node: [1, 'node'] },
      features: [
        ht([
          { directive: Zu, inputs: ['node', 'node'] },
          { directive: qu, inputs: ['node', 'node'] },
          { directive: ju, inputs: ['targetData', 'node'] },
          { directive: cf, inputs: ['targetData', 'node'] },
          { directive: Fs, inputs: ['data', 'node'] },
        ]),
      ],
      ngContentSelectors: Oe,
      decls: 2,
      vars: 2,
      consts: [[1, 'node-content']],
      template: function (t, i) {
        (t & 1 && (me(), ge(0, 'div', 0), ce(1), he()),
          t & 2 && ye('transform', i.rotate()));
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;top:0;left:0;transform-origin:0 0;pointer-events:none;-webkit-user-select:none;user-select:none;cursor:pointer}.node-content[_ngcontent-%COMP%]{position:relative;width:100%;height:100%;transform-origin:center center;pointer-events:all}',
      ],
      changeDetection: 0,
    });
  },
  vo = class {
    nodeComponent = m(Hs, { optional: !0 });
    isRenderedOnCanvas = w(() => !!this.nodeComponent);
  },
  zs = class n {
    inputEventsRouter = m(ue);
    touchEventsStateService = m(mt);
    flowCoreProvider = m(z);
    gestureActive = !1;
    lastGesturePoint = null;
    direction = E.required();
    targetData = E.required();
    unregisterInteractionCleanup = null;
    ngOnDestroy() {
      let e = this.gestureActive;
      if (
        (this.removeListeners(), e && this.flowCoreProvider.isInitialized())
      ) {
        let t = this.flowCoreProvider.provide();
        t.cancelActiveInteraction().then((i) => {
          i ||
            t.isCancellingInteraction() ||
            t.actionStateManager.clearResize();
        });
      }
    }
    onPointerDown(e) {
      if (this.gestureActive || !this.shouldHandle(e)) return;
      ((this.gestureActive = !0),
        (this.lastGesturePoint = { x: e.clientX, y: e.clientY }),
        this.touchEventsStateService.currentEvent.set(ve.Resize),
        e.preventDefault(),
        e.stopPropagation(),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
      let t = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'resize',
          phase: 'start',
          target: this.targetData(),
          direction: this.direction(),
          targetType: 'node',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    }
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        this.gestureActive &&
          ((this.gestureActive = !1),
          this.touchEventsStateService.clearCurrentEvent()));
    }
    onPointerUp = (e) => {
      this.endGesture(e);
    };
    endGesture(e, t = null) {
      this.removeListeners();
      let i = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, i), {
          name: 'resize',
          phase: 'end',
          target: this.targetData(),
          direction: this.direction(),
          targetType: 'node',
          lastInputPoint: t ?? { x: e.clientX, y: e.clientY },
        }),
      );
    }
    onPointerMove = (e) => {
      if (
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      )
        return void this.endGesture(e, this.lastGesturePoint);
      this.lastGesturePoint = { x: e.clientX, y: e.clientY };
      let t = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, t), {
          name: 'resize',
          phase: 'continue',
          target: this.targetData(),
          direction: this.direction(),
          targetType: 'node',
          lastInputPoint: { x: e.clientX, y: e.clientY },
        }),
      );
    };
    shouldHandle(e) {
      return !(
        e.boxSelectionHandled ||
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      );
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramResize', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { direction: [1, 'direction'], targetData: [1, 'targetData'] },
    });
  },
  lf = class n {
    position = E.required();
    classes = w(() => `resize-handle resize-handle--${this.position()}`);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-resize-handle']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && je(i.classes());
      },
      inputs: { position: [1, 'position'] },
      features: [
        ht([
          {
            directive: zs,
            inputs: ['direction', 'position', 'targetData', 'targetData'],
          },
        ]),
      ],
      decls: 0,
      vars: 0,
      template: function (t, i) {},
      styles: [
        '[_nghost-%COMP%]:before{content:"";position:absolute;width:16px;height:16px;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%}.resize-handle[_nghost-%COMP%]{position:absolute;width:var(--ngd-resize-handle-size);height:var(--ngd-resize-handle-size);background-color:var(--ngd-resize-handle-background-color);border:var(--ngd-resize-handle-border-size) var(--ngd-resize-handle-border-style) var(--ngd-resize-handle-border-color);border-radius:var(--ngd-resize-handle-border-radius)}.resize-handle--top-left[_nghost-%COMP%]{top:0;left:0;transform:translate(-50%,-50%);cursor:nwse-resize}.resize-handle--top-right[_nghost-%COMP%]{top:0;right:0;transform:translate(50%,-50%);cursor:nesw-resize}.resize-handle--bottom-left[_nghost-%COMP%]{bottom:0;left:0;transform:translate(-50%,50%);cursor:nesw-resize}.resize-handle--bottom-right[_nghost-%COMP%]{bottom:0;right:0;transform:translate(50%,50%);cursor:nwse-resize}',
      ],
      changeDetection: 0,
    });
  },
  uf = class n {
    position = E.required();
    active = E(!0);
    classes = w(
      () =>
        `resize-line resize-line--${this.position()}${this.active() ? '' : ' resize-line--inactive'}`,
    );
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-resize-line']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && je(i.classes());
      },
      inputs: { position: [1, 'position'], active: [1, 'active'] },
      features: [
        ht([
          {
            directive: zs,
            inputs: ['direction', 'position', 'targetData', 'targetData'],
          },
        ]),
      ],
      decls: 0,
      vars: 0,
      template: function (t, i) {},
      styles: [
        '[_nghost-%COMP%]:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.resize-line[_nghost-%COMP%]{position:absolute}.resize-line--inactive[_nghost-%COMP%]{pointer-events:none}.resize-line--top[_nghost-%COMP%]:before, .resize-line--bottom[_nghost-%COMP%]:before{width:100%;height:8px}.resize-line--right[_nghost-%COMP%]:before, .resize-line--left[_nghost-%COMP%]:before{width:8px;height:100%}.resize-line--top[_nghost-%COMP%]{top:0;left:0;width:100%;border-top:var(--ngd-resize-line-border-width) var(--ngd-resize-line-border-style) var(--ngd-resize-line-border-color);cursor:ns-resize;transform:translateY(-50%)}.resize-line--right[_nghost-%COMP%]{top:0;right:0;height:100%;border-right:var(--ngd-resize-line-border-width) var(--ngd-resize-line-border-style) var(--ngd-resize-line-border-color);cursor:ew-resize;transform:translate(50%)}.resize-line--bottom[_nghost-%COMP%]{bottom:0;left:0;width:100%;border-bottom:var(--ngd-resize-line-border-width) var(--ngd-resize-line-border-style) var(--ngd-resize-line-border-color);cursor:ns-resize;transform:translateY(50%)}.resize-line--left[_nghost-%COMP%]{top:0;left:0;height:100%;border-left:var(--ngd-resize-line-border-width) var(--ngd-resize-line-border-style) var(--ngd-resize-line-border-color);cursor:ew-resize;transform:translate(-50%)}',
      ],
      changeDetection: 0,
    });
  },
  Dy = ['top', 'right', 'bottom', 'left'],
  KT = [
    { position: 'top-left', sides: ['top', 'left'] },
    { position: 'top-right', sides: ['top', 'right'] },
    { position: 'bottom-left', sides: ['bottom', 'left'] },
    { position: 'bottom-right', sides: ['bottom', 'right'] },
  ],
  Vs = class n extends vo {
    diagramService = m($e);
    defaultResizable = E(void 0);
    activeSides = E(Dy);
    nodeData = w(() => this.nodeComponent?.node());
    dataResizable = w(() => this.nodeData()?.resizable);
    isResizable = w(
      () =>
        this.dataResizable() ??
        this.defaultResizable() ??
        this.diagramService.config().resize?.defaultResizable,
    );
    showAdornment = w(
      () =>
        !!this.isResizable() &&
        this.nodeData()?.selected &&
        this.isRenderedOnCanvas() &&
        !this.nodeData()?.angle,
    );
    linePositions = Dy;
    activeSideSet = w(() => new Set(this.activeSides()));
    handles = w(() => {
      let e = this.activeSideSet();
      return KT.map(({ position: t, sides: i }) => ({
        position: t,
        active: i.every((o) => e.has(o)),
      }));
    });
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-node-resize-adornment']],
      inputs: {
        defaultResizable: [1, 'defaultResizable'],
        activeSides: [1, 'activeSides'],
      },
      features: [Mt],
      ngContentSelectors: Oe,
      decls: 2,
      vars: 1,
      consts: [
        [3, 'position', 'targetData', 'active'],
        [3, 'position', 'targetData'],
      ],
      template: function (t, i) {
        (t & 1 && (me(), ce(0), oe(1, aI, 4, 0)),
          t & 2 && (_(), re(i.showAdornment() ? 1 : -1)));
      },
      dependencies: [uf, lf],
      styles: [
        '[_nghost-%COMP%]{display:flex;position:relative;width:100%;height:100%}',
      ],
      changeDetection: 0,
    });
  },
  ff = class n {
    node = E.required();
    isSelected = w(() => this.node().selected ?? !1);
    highlighted = w(() => this.node().highlighted ?? !1);
    classes = w(
      () => 'ng-diagram-group ' + (this.highlighted() ? 'highlight' : ''),
    );
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-default-group-template']],
      inputs: { node: [1, 'node'] },
      ngContentSelectors: Oe,
      decls: 3,
      vars: 3,
      consts: [
        [
          'ngDiagramNodeSelected',
          '',
          'ngDiagramGroupHighlighted',
          '',
          3,
          'node',
        ],
      ],
      template: function (t, i) {
        (t & 1 &&
          (me(),
          W(0, 'ng-diagram-node-resize-adornment')(1, 'div', 0),
          ce(2),
          Y()()),
          t & 2 && (_(), je(i.classes()), O('node', i.node())));
      },
      dependencies: [Vs, Os, Lu],
      styles: [
        '[_nghost-%COMP%]:hover   .ng-diagram-group[_ngcontent-%COMP%]{border-color:var(--ngd-group-border-color-hover)}.ng-diagram-group[_ngcontent-%COMP%]{display:flex;border-radius:var(--ngd-group-border-radius);padding:.625rem;background-color:var(--ngd-node-bg-primary-default);border:.0625rem solid var(--ngd-group-border-color);width:100%;height:100%;box-sizing:border-box}',
      ],
      changeDetection: 0,
    });
  },
  XT = {
    topLeft: 'top-left',
    topCenter: 'top-center',
    topRight: 'top-right',
    centerLeft: 'center-left',
    center: 'center',
    centerRight: 'center-right',
    bottomLeft: 'bottom-left',
    bottomCenter: 'bottom-center',
    bottomRight: 'bottom-right',
  },
  wo = class n extends vo {
    hostElement = m(ie);
    flowCoreProvider = m(z);
    batchResizeObserver = m(zt);
    linkingInputDirective = m(Rs);
    isInitialized = P(!1);
    lastSide = P(void 0);
    lastType = P(void 0);
    lastOriginPoint;
    ownerInternalId;
    nodeData = w(() => this.nodeComponent?.node());
    id = E.required();
    type = E.required();
    side = E.required();
    originPoint = E('center');
    hidden = E(!1, { transform: ns });
    get portClass() {
      let e = XT[this.originPoint()] || 'center';
      return `ng-diagram-port ${this.hasContent ? 'custom-content' : ''} ${this.side()} origin-${e}`;
    }
    constructor() {
      (super(),
        fe(() => {
          let e = this.nodeData(),
            t = this.isInitialized(),
            i = this.side(),
            o = this.type(),
            r = this.originPoint();
          if (!t || !e) return;
          let s = {};
          (this.lastSide() !== i && (this.lastSide.set(i), (s.side = i)),
            this.lastType() !== o && (this.lastType.set(o), (s.type = o)));
          let a = this.lastOriginPoint !== r;
          (a && (this.lastOriginPoint = r),
            Object.keys(s).length > 0 &&
              this.flowCoreProvider
                .provide()
                .updater.applyPortChanges(e.id, [
                  { portId: this.id(), portChanges: s },
                ]),
            (s.side || a) &&
              this.batchResizeObserver.invalidate(
                this.hostElement.nativeElement,
              ));
        }),
        fe(() => {
          let e = this.nodeData();
          this.isInitialized() &&
            e &&
            ke(() => {
              this.linkingInputDirective.setTargetNode(e);
            });
        }),
        fe(() => {
          let e = this.hidden(),
            t = ke(() => this.nodeData());
          this.isInitialized() &&
            t &&
            this.flowCoreProvider
              .provide()
              .templateVisibilityRegistry?.setPortHidden(t.id, this.id(), e);
        }));
    }
    ngOnInit() {
      (this.lastSide.set(this.side()),
        this.lastType.set(this.type()),
        (this.lastOriginPoint = this.originPoint()));
      let e = this.nodeData();
      e &&
        ((this.ownerInternalId = e._internalId),
        this.hidden() &&
          this.flowCoreProvider
            .provide()
            .templateVisibilityRegistry?.setPortHidden(e.id, this.id(), !0),
        this.flowCoreProvider.provide().updater.addPort(e.id, {
          id: this.id(),
          type: this.type(),
          nodeId: e.id,
          side: this.side(),
        }),
        this.batchResizeObserver.observe(this.hostElement.nativeElement, {
          type: 'port',
          nodeId: e.id,
          portId: this.id(),
        }),
        this.isInitialized.set(!0));
    }
    ngOnDestroy() {
      this.batchResizeObserver.unobserve(this.hostElement.nativeElement);
      let e = this.id(),
        t = this.nodeData();
      if (!t) return;
      let i = this.flowCoreProvider.provide();
      if (!i.isInitialized) return;
      let o = i.getNodeById(t.id);
      o &&
        ((this.ownerInternalId && o._internalId !== this.ownerInternalId) ||
          (i.isVirtualizationActive && !i.isNodeCurrentlyRendered(t.id)) ||
          (i.templateVisibilityRegistry?.setPortHidden(t.id, e, !1),
          i.internalUpdater.deletePort(t.id, e)));
    }
    custom = Gc('contentProjection');
    hasContent = !1;
    ngAfterContentInit() {
      this.hasContent =
        (this.custom()?.nativeElement?.childNodes?.length ?? 0) > 0;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-port']],
      viewQuery: function (t, i) {
        (t & 1 && Xi(i.custom, Cy, 5), t & 2 && Qr());
      },
      hostVars: 5,
      hostBindings: function (t, i) {
        t & 2 &&
          (q('data-port-id', i.id()),
          je(i.portClass),
          ye(
            'display',
            i.isRenderedOnCanvas() && !i.hidden() ? 'block' : 'none',
          ));
      },
      inputs: {
        id: [1, 'id'],
        type: [1, 'type'],
        side: [1, 'side'],
        originPoint: [1, 'originPoint'],
        hidden: [1, 'hidden'],
      },
      features: [ht([{ directive: Rs, inputs: ['portId', 'id'] }]), Mt],
      ngContentSelectors: Oe,
      decls: 3,
      vars: 0,
      consts: [
        ['contentProjection', ''],
        [1, 'content-projection'],
      ],
      template: function (t, i) {
        t & 1 && (me(), ge(0, 'div', 1, 0), ce(2), he());
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;width:fit-content;height:fit-content;inset:0;box-sizing:content-box;z-index:2;border-radius:var(--ngd-port-border-radius);cursor:crosshair}[_nghost-%COMP%]:has(.content-projection:not(:empty)){--ngd-port-border-radius: 0%}[_nghost-%COMP%]:has(.content-projection:empty), [_nghost-%COMP%]   .content-projection[_ngcontent-%COMP%]:not(:empty){display:flex;background:var(--ngd-port-background-color);border:var(--ngd-port-border-size) solid var(--ngd-port-border-color);border-radius:var(--ngd-port-border-radius);transition-property:background-color,border-color,outline,box-shadow;transition-timing-function:ease-in-out;transition-duration:.1s;transform-origin:center}[_nghost-%COMP%]:has(.content-projection:empty){width:var(--ngd-port-size);height:var(--ngd-port-size)}[_nghost-%COMP%]:has(.content-projection:empty):before{content:"";position:absolute;width:18px;height:18px;top:50%;left:50%;translate:-50% -50%;border-radius:var(--ngd-port-border-radius)}.left[_nghost-%COMP%]{top:50%;left:0}.right[_nghost-%COMP%]{top:50%;left:100%}.top[_nghost-%COMP%]{top:0;left:50%}.bottom[_nghost-%COMP%]{top:100%;left:50%}.origin-top-left[_nghost-%COMP%]{transform:translate(0)}.origin-top-center[_nghost-%COMP%]{transform:translate(-50%)}.origin-top-right[_nghost-%COMP%]{transform:translate(-100%)}.origin-center-left[_nghost-%COMP%]{transform:translateY(-50%)}.origin-center[_nghost-%COMP%]{transform:translate(-50%,-50%)}.origin-center-right[_nghost-%COMP%]{transform:translate(-100%,-50%)}.origin-bottom-left[_nghost-%COMP%]{transform:translateY(-100%)}.origin-bottom-center[_nghost-%COMP%]{transform:translate(-50%,-100%)}.origin-bottom-right[_nghost-%COMP%]{transform:translate(-100%,-100%)}',
      ],
      changeDetection: 0,
    });
  },
  gf = class n {
    inputEventsRouter = m(ue);
    touchEventsStateService = m(mt);
    flowCoreProvider = m(z);
    gestureActive = !1;
    lastGesturePoint = null;
    targetData = E();
    unregisterInteractionCleanup = null;
    ngOnDestroy() {
      let e = this.gestureActive;
      if (
        (this.removeListeners(), e && this.flowCoreProvider.isInitialized())
      ) {
        let t = this.flowCoreProvider.provide();
        t.cancelActiveInteraction().then((i) => {
          i ||
            t.isCancellingInteraction() ||
            t.actionStateManager.clearRotation();
        });
      }
    }
    onPointerDown(e) {
      if (this.gestureActive || !this.shouldHandle(e)) return;
      let t = this.targetData();
      if (!t) return;
      ((e.rotateHandled = !0),
        (this.gestureActive = !0),
        (this.lastGesturePoint = { x: e.clientX, y: e.clientY }),
        this.touchEventsStateService.currentEvent.set(ve.Rotate));
      let i = this.inputEventsRouter.getBaseEvent(e);
      (this.inputEventsRouter.emit(
        y(h({}, i), {
          name: 'rotate',
          phase: 'start',
          target: t,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          center: this.getNodeCenter(t),
        }),
      ),
        document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        document.addEventListener('pointercancel', this.onPointerCancel),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
    }
    onPointerMove = (e) => {
      if (
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      )
        return void this.endGesture(e, this.lastGesturePoint);
      e.rotateHandled = !0;
      let t = this.targetData();
      if (!t) return;
      this.lastGesturePoint = { x: e.clientX, y: e.clientY };
      let i = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, i), {
          name: 'rotate',
          phase: 'continue',
          target: t,
          lastInputPoint: { x: e.clientX, y: e.clientY },
          center: this.getNodeCenter(t),
        }),
      );
    };
    onPointerUp = (e) => {
      this.endGesture(e);
    };
    endGesture(e, t = null) {
      this.removeListeners();
      let i = this.targetData();
      if (!i) return;
      let o = this.inputEventsRouter.getBaseEvent(e);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'rotate',
          phase: 'end',
          target: i,
          lastInputPoint: t ?? { x: e.clientX, y: e.clientY },
          center: this.getNodeCenter(i),
        }),
      );
    }
    onPointerCancel = (e) => {
      this.endGesture(e, this.lastGesturePoint);
    };
    shouldHandle(e) {
      return !(
        e.boxSelectionHandled ||
        this.touchEventsStateService.panningHandled() ||
        this.touchEventsStateService.zoomingHandled()
      );
    }
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        this.gestureActive &&
          ((this.gestureActive = !1),
          this.touchEventsStateService.clearCurrentEvent()),
        document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        document.removeEventListener('pointercancel', this.onPointerCancel));
    }
    getNodeCenter(e) {
      let { x: t, y: i } = e.position,
        { width: o, height: r } = e.size || { width: 0, height: 0 };
      return { x: t + o / 2, y: i + r / 2 };
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramRotateHandle', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { targetData: [1, 'targetData'] },
    });
  },
  hf = class n {
    custom = Gc('contentProjection');
    data = E.required();
    isRotating = P(!1);
    hasCustomHandle = !1;
    ngAfterContentInit() {
      this.hasCustomHandle =
        (this.custom()?.nativeElement?.childNodes?.length ?? 0) > 0;
    }
    get pointerDownAttr() {
      return this.isRotating() ? 'true' : null;
    }
    pointerDown() {
      this.isRotating.set(!0);
    }
    pointerUp() {
      this.isRotating.set(!1);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-rotate-handle']],
      viewQuery: function (t, i) {
        (t & 1 && Xi(i.custom, Cy, 5), t & 2 && Qr());
      },
      hostVars: 5,
      hostBindings: function (t, i) {
        (t & 1 &&
          ee('pointerdown', function () {
            return i.pointerDown();
          })(
            'pointerup',
            function () {
              return i.pointerUp();
            },
            $i,
          ),
          t & 2 &&
            (q('data-rotating', i.pointerDownAttr),
            Ne('rotate-handle', !i.hasCustomHandle)(
              'ng-diagram-rotate-handle',
              !0,
            )));
      },
      inputs: { data: [1, 'data'] },
      features: [ht([{ directive: gf, inputs: ['targetData', 'data'] }])],
      ngContentSelectors: Oe,
      decls: 4,
      vars: 1,
      consts: [
        ['contentProjection', ''],
        [1, 'content-projection'],
        [
          'xmlns',
          'http://www.w3.org/2000/svg',
          'width',
          '18',
          'height',
          '19',
          'viewBox',
          '0 0 18 19',
          'fill',
          'none',
        ],
        [
          'd',
          'M15.75 9.5637C15.7502 11.3383 15.0515 13.0416 13.8051 14.3049C12.5588 15.5682 10.8651 16.2899 9.0907 16.3137H9C7.27611 16.318 5.61676 15.6583 4.36641 14.4715C4.31271 14.4207 4.26955 14.3599 4.23938 14.2924C4.20921 14.2249 4.19262 14.1522 4.19056 14.0783C4.1885 14.0044 4.20102 13.9309 4.22739 13.8618C4.25376 13.7928 4.29347 13.7296 4.34426 13.6759C4.39504 13.6222 4.45591 13.5791 4.52337 13.5489C4.59084 13.5187 4.66359 13.5021 4.73746 13.5001C4.81134 13.498 4.8849 13.5105 4.95394 13.5369C5.02298 13.5633 5.08615 13.603 5.13984 13.6538C5.94408 14.4122 6.95396 14.9169 8.04335 15.1047C9.13273 15.2926 10.2533 15.1553 11.2651 14.7099C12.2769 14.2646 13.1351 13.531 13.7324 12.6008C14.3297 11.6706 14.6396 10.585 14.6235 9.4797C14.6075 8.37436 14.266 7.29826 13.6419 6.38583C13.0178 5.4734 12.1387 4.76509 11.1144 4.34939C10.09 3.9337 8.96594 3.82904 7.88249 4.04849C6.79903 4.26794 5.80425 4.80178 5.02242 5.58331C5.01668 5.58952 5.01057 5.59539 5.00414 5.60089L3.13523 7.3137H5.0625C5.21168 7.3137 5.35476 7.37296 5.46025 7.47845C5.56574 7.58394 5.625 7.72701 5.625 7.8762C5.625 8.02538 5.56574 8.16846 5.46025 8.27395C5.35476 8.37944 5.21168 8.4387 5.0625 8.4387H1.6875C1.53832 8.4387 1.39524 8.37944 1.28975 8.27395C1.18426 8.16846 1.125 8.02538 1.125 7.8762V4.5012C1.125 4.35201 1.18426 4.20894 1.28975 4.10345C1.39524 3.99796 1.53832 3.9387 1.6875 3.9387C1.83668 3.9387 1.97976 3.99796 2.08525 4.10345C2.19074 4.20894 2.25 4.35201 2.25 4.5012V6.59651L4.23633 4.78245C5.18131 3.84113 6.384 3.20089 7.69256 2.94253C9.00112 2.68418 10.3569 2.8193 11.5887 3.33084C12.8205 3.84238 13.8732 4.7074 14.6138 5.81671C15.3544 6.92602 15.7498 8.22988 15.75 9.5637Z',
          'fill',
          'white',
        ],
      ],
      template: function (t, i) {
        (t & 1 &&
          (me(),
          ge(0, 'div', 1, 0),
          ce(2),
          he(),
          oe(3, dI, 2, 0, ':svg:svg', 2)),
          t & 2 && (_(3), re(i.hasCustomHandle ? -1 : 3)));
      },
      styles: [
        '.content-projection[_ngcontent-%COMP%]:not(:empty){width:100%;height:100%}.rotate-handle[_nghost-%COMP%]{background-color:var(--ngd-rotate-handle-background-color);border-radius:50%;transition:background-color .1s ease-in-out}.rotate-handle[_nghost-%COMP%]:hover, .rotate-handle[_nghost-%COMP%]:focus-visible{background-color:var(--ngd-rotate-handle-background-color-hover)}.rotate-handle[data-rotating][_nghost-%COMP%], .rotate-handle.active[_nghost-%COMP%]{background-color:var(--ngd-rotate-handle-background-color-active)}[_nghost-%COMP%]{display:flex;justify-content:center;align-items:center;width:var(--ngd-rotate-handle-size);height:var(--ngd-rotate-handle-size);position:absolute;transform:translate(50%,-50%);z-index:10;box-sizing:border-box;pointer-events:auto;cursor:grab;top:var(--ngd-rotate-handle-top);right:var(--ngd-rotate-handle-right);bottom:var(--ngd-rotate-handle-bottom);left:var(--ngd-rotate-handle-left)}[data-rotating][_nghost-%COMP%], .active[_nghost-%COMP%], .active[_nghost-%COMP%], .active   [_nghost-%COMP%]{cursor:grabbing}',
      ],
      changeDetection: 0,
    });
  },
  pf = class n extends vo {
    diagramService = m($e);
    defaultRotatable = E(void 0);
    dataRotatable = w(() => this.nodeData()?.rotatable);
    isRotating = P(!1);
    nodeData = w(() => this.nodeComponent?.node());
    isRotatable = w(
      () =>
        this.dataRotatable() ??
        this.defaultRotatable() ??
        this.diagramService.config().nodeRotation?.defaultRotatable,
    );
    eventTarget = w(() => ({
      type: 'rotate-handle',
      element: this.nodeData(),
    }));
    showAdornment = w(
      () =>
        !!this.nodeData()?.selected &&
        this.isRenderedOnCanvas() &&
        !!this.isRotatable(),
    );
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-node-rotate-adornment']],
      hostAttrs: [1, 'node-rotate-adornment'],
      inputs: { defaultRotatable: [1, 'defaultRotatable'] },
      features: [Mt],
      ngContentSelectors: Oe,
      decls: 1,
      vars: 1,
      consts: [[3, 'data']],
      template: function (t, i) {
        (t & 1 && (me(), oe(0, cI, 2, 1, 'ng-diagram-rotate-handle', 0)),
          t & 2 && re(i.showAdornment() ? 0 : -1));
      },
      dependencies: [hf],
      styles: [
        '[_nghost-%COMP%]{position:absolute;inset:0;pointer-events:none}',
      ],
      changeDetection: 0,
    });
  },
  mf = class n {
    diagramService = m($e);
    node = E.required();
    removeDefaultPorts = E(void 0);
    isSelected = w(() => this.node().selected ?? !1);
    classes = w(() => 'node ' + (this.isSelected() ? 'isSelected' : ''));
    enablePortHover = w(() => !this.diagramService.actionState().resize);
    effectiveRemoveDefaultPorts = w(() => {
      if (this.removeDefaultPorts() !== void 0)
        return this.removeDefaultPorts();
      let e = this.diagramService.config().defaultNode?.removePorts;
      return e !== void 0 && e;
    });
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-base-node-template']],
      hostVars: 4,
      hostBindings: function (t, i) {
        t & 2 &&
          Ne('isSelected', i.isSelected())(
            'ng-diagram-port-hoverable-over-node',
            i.enablePortHover(),
          );
      },
      inputs: {
        node: [1, 'node'],
        removeDefaultPorts: [1, 'removeDefaultPorts'],
      },
      ngContentSelectors: Oe,
      decls: 5,
      vars: 4,
      consts: [
        ['ngDiagramNodeSelected', '', 3, 'node'],
        ['id', 'port-left', 'type', 'both', 'side', 'left'],
        ['id', 'port-right', 'type', 'both', 'side', 'right'],
      ],
      template: function (t, i) {
        (t & 1 &&
          (me(),
          $(0, 'ng-diagram-node-rotate-adornment'),
          W(1, 'ng-diagram-node-resize-adornment')(2, 'div', 0),
          ce(3),
          Y(),
          oe(4, lI, 2, 0),
          Y()),
          t & 2 &&
            (_(2),
            je(i.classes()),
            O('node', i.node()),
            _(2),
            re(i.effectiveRemoveDefaultPorts() ? -1 : 4)));
      },
      dependencies: [wo, Os, Vs, pf],
      styles: [
        '[_nghost-%COMP%]:hover   .node[_ngcontent-%COMP%]{border-color:var(--ngd-node-border-color-hover)}.node[_ngcontent-%COMP%]{display:flex;justify-content:center;align-items:center;padding:.5rem;width:100%;background-color:var(--ngd-node-bg-primary-default);border:var(--ngd-node-border-size) solid var(--ngd-node-border-color);color:var(--ngd-txt-primary-default);border-radius:var(--ngd-node-border-radius)}.node.isSelected[_ngcontent-%COMP%]{border-color:var(--ngd-node-border-color-hover)}',
      ],
      changeDetection: 0,
    });
  },
  yf = class n {
    node = E.required();
    label = w(() => {
      let e = this.node().data;
      return 'label' in e ? e.label : this.node().id;
    });
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-default-node-template']],
      inputs: { node: [1, 'node'] },
      decls: 3,
      vars: 2,
      consts: [[3, 'node']],
      template: function (t, i) {
        (t & 1 &&
          (W(0, 'ng-diagram-base-node-template', 0)(1, 'span'), pt(2), Y()()),
          t & 2 && (O('node', i.node()), _(2), vn(i.label())));
      },
      dependencies: [mf],
      encapsulation: 2,
      changeDetection: 0,
    });
  },
  Do = class n {
    panel = P(null);
    position = w(() => this.panel()?.position());
    register(e) {
      this.panel.set(e);
    }
    unregister() {
      this.panel.set(null);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  JT = {
    'bottom-right': ['top-right', 'bottom-left', 'top-left'],
    'top-right': ['bottom-right', 'top-left', 'bottom-left'],
    'bottom-left': ['top-left', 'bottom-right', 'top-right'],
    'top-left': ['bottom-left', 'top-right', 'bottom-right'],
  },
  vf = class n {
    preferredPosition = E(void 0);
    tabbable = E(!0);
    panelRegistry = m(Do);
    position = w(() => {
      let e = this.preferredPosition() ?? 'bottom-right',
        t = this.panelRegistry.position();
      return t !== e ? e : (JT[e].find((i) => i !== t) ?? e);
    });
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-watermark']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && je(i.position());
      },
      inputs: {
        preferredPosition: [1, 'preferredPosition'],
        tabbable: [1, 'tabbable'],
      },
      decls: 5,
      vars: 1,
      consts: [
        ['href', 'https://www.ngdiagram.dev/', 'target', '_blank'],
        [1, 'sr-only'],
        [
          'width',
          '479',
          'height',
          '90',
          'viewBox',
          '0 0 479 90',
          'fill',
          'none',
          'xmlns',
          'http://www.w3.org/2000/svg',
        ],
        [
          'd',
          'M78.1895 20.5088C82.5953 20.5088 85.9324 21.2858 88.2002 22.8408C90.468 24.3959 92.1205 26.0165 93.1572 27.7012H94.9062V21.8691H106.958V78.6289C106.958 81.9333 105.986 84.5572 104.042 86.501C102.098 88.5096 99.5063 89.5146 96.2666 89.5146H64V78.8232H91.9902C93.8044 78.8232 94.7119 77.8511 94.7119 75.9072V63.3701H92.9629C92.315 64.4068 91.4075 65.4757 90.2412 66.5771C89.075 67.6138 87.5199 68.4884 85.5762 69.2012C83.6324 69.9139 81.1699 70.2705 78.1895 70.2705C74.2371 70.2705 70.5762 69.3312 67.207 67.4521C63.9026 65.5083 61.2459 62.7541 59.2373 59.1904C57.2288 55.562 56.2246 51.2208 56.2246 46.167V44.6123C56.2246 39.5584 57.2287 35.2492 59.2373 31.6855C61.2458 28.0572 63.9027 25.3038 67.207 23.4248C70.5763 21.481 74.2371 20.5088 78.1895 20.5088ZM278.176 20.5088C282.582 20.5088 285.919 21.2858 288.187 22.8408C290.454 24.3959 292.107 26.0165 293.144 27.7012H294.893V21.8691H306.944V78.6289C306.944 81.9333 305.972 84.5572 304.028 86.501C302.085 88.5096 299.493 89.5146 296.253 89.5146H263.986V78.8232H291.977C293.791 78.8232 294.698 77.8511 294.698 75.9072V63.3701H292.949C292.301 64.4068 291.394 65.4757 290.228 66.5771C289.061 67.6138 287.506 68.4885 285.562 69.2012C283.619 69.9139 281.156 70.2705 278.176 70.2705C274.223 70.2705 270.563 69.3311 267.193 67.4521C263.889 65.5083 261.232 62.7541 259.224 59.1904C257.215 55.562 256.211 51.2208 256.211 46.167V44.6123C256.211 39.5584 257.215 35.2492 259.224 31.6855C261.232 28.0572 263.889 25.3038 267.193 23.4248C270.563 21.481 274.223 20.5088 278.176 20.5088ZM225.268 20.5088C231.617 20.5088 236.639 22.0958 240.332 25.2705C244.025 28.4454 245.872 33.0464 245.872 39.0723V57.0527C245.872 58.9964 246.78 59.9678 248.594 59.9678H252.481V70.0762H244.317C241.92 70.0762 239.944 69.4933 238.389 68.3271C236.834 67.1609 236.056 65.605 236.056 63.6611V63.5645H234.209C233.95 64.342 233.367 65.3791 232.46 66.6748C231.553 67.9058 230.127 69.0067 228.184 69.9785C226.24 70.9504 223.583 71.4365 220.214 71.4365C216.78 71.4365 213.703 70.8537 210.981 69.6875C208.26 68.4565 206.09 66.707 204.47 64.4395C202.915 62.1069 202.137 59.2879 202.137 55.9834C202.137 52.6789 202.915 49.9247 204.47 47.7217C206.09 45.4541 208.292 43.7694 211.078 42.668C213.929 41.5017 217.169 40.919 220.797 40.9189H234.015V38.1973C234.015 35.9295 233.302 34.0827 231.877 32.6572C230.451 31.167 228.183 30.4219 225.073 30.4219C222.028 30.4219 219.761 31.1351 218.271 32.5605C216.78 33.9212 215.808 35.7032 215.354 37.9062L204.08 34.1152C204.858 31.6531 206.089 29.4178 207.773 27.4092C209.523 25.3358 211.823 23.6832 214.674 22.4521C217.589 21.1563 221.121 20.5088 225.268 20.5088ZM374.047 20.5088C380.396 20.5088 385.418 22.0959 389.111 25.2705C392.805 28.4454 394.651 33.0464 394.651 39.0723V57.0527C394.651 58.9964 395.559 59.9678 397.373 59.9678H401.261V70.0762H393.097C390.699 70.0762 388.723 69.4933 387.168 68.3271C385.613 67.1609 384.835 65.605 384.835 63.6611V63.5645H382.988C382.729 64.342 382.146 65.3791 381.239 66.6748C380.332 67.9058 378.906 69.0067 376.963 69.9785C375.019 70.9504 372.362 71.4365 368.993 71.4365C365.559 71.4365 362.482 70.8537 359.761 69.6875C357.04 68.4565 354.869 66.707 353.249 64.4395C351.694 62.1069 350.916 59.2879 350.916 55.9834C350.916 52.6789 351.694 49.9247 353.249 47.7217C354.869 45.4541 357.072 43.7694 359.857 42.668C362.708 41.5017 365.948 40.919 369.576 40.9189H382.794V38.1973C382.794 35.9295 382.082 34.0827 380.656 32.6572C379.231 31.167 376.963 30.4219 373.853 30.4219C370.807 30.4219 368.54 31.1351 367.05 32.5605C365.56 33.9212 364.587 35.7032 364.134 37.9062L352.859 34.1152C353.637 31.6531 354.868 29.4178 356.553 27.4092C358.302 25.3358 360.602 23.6832 363.453 22.4521C366.369 21.1563 369.9 20.5088 374.047 20.5088ZM28.5029 21.0918C32.2609 21.0918 35.5332 21.9664 38.3193 23.7158C41.1701 25.4004 43.3727 27.7654 44.9277 30.8105C46.4828 33.7911 47.2607 37.2904 47.2607 41.3076V70.0762H35.0146V42.2793C35.0146 38.6509 34.1072 35.9294 32.293 34.1152C30.5436 32.3012 28.017 31.3936 24.7129 31.3936C20.9549 31.3936 18.0392 32.6577 15.9658 35.1846C13.8924 37.6468 12.8555 41.1132 12.8555 45.584V70.0762H0.609375V21.8691H12.6611V28.1865H14.4102C15.1877 26.5019 16.6461 24.915 18.7842 23.4248C20.9224 21.8697 24.1618 21.0918 28.5029 21.0918ZM144.251 2.04199C153.387 2.04207 160.319 4.37504 165.049 9.04004C169.844 13.6404 172.241 20.5086 172.241 29.6445V42.4736C172.241 51.6096 169.844 58.5106 165.049 63.1758C160.319 67.7759 153.386 70.0761 144.251 70.0762H116.26V58.8018H125.201V13.3164H116.26V2.04199H144.251ZM193.622 70.0762H181.376V21.8691H193.622V70.0762ZM347.539 32.5605H341.513C338.403 32.5606 335.843 33.4024 333.835 35.0869C331.826 36.7067 330.822 39.234 330.822 42.668V70.0762H318.576V21.8691H330.628V27.3115H332.377C333.09 25.3679 334.256 23.9422 335.876 23.0352C337.56 22.1281 339.504 21.6749 341.707 21.6748H347.539V32.5605ZM461.921 21.0918C464.901 21.0919 467.59 21.7394 469.987 23.0352C472.449 24.2662 474.393 26.1779 475.818 28.7695C477.309 31.2965 478.054 34.504 478.054 38.3916V70.0762H465.808V39.2666C465.808 36.61 465.127 34.6338 463.767 33.3379C462.406 31.9774 460.495 31.2969 458.033 31.2969C455.247 31.2969 453.077 32.2043 451.521 34.0186C450.031 35.7679 449.286 38.2944 449.286 41.5986V70.0762H437.04V39.2666C437.04 36.6101 436.36 34.6338 434.999 33.3379C433.638 31.9772 431.727 31.2969 429.265 31.2969C426.479 31.2969 424.308 32.2043 422.753 34.0186C421.263 35.7679 420.518 38.2945 420.518 41.5986V70.0762H408.271V21.8691H420.323V27.1172H422.072C422.915 25.4974 424.308 24.1047 426.252 22.9385C428.196 21.7075 430.755 21.0918 433.93 21.0918C437.364 21.0918 440.117 21.7723 442.19 23.1328C444.264 24.4287 445.852 26.146 446.953 28.2842H448.702C449.804 26.2108 451.36 24.4935 453.368 23.1328C455.377 21.7723 458.228 21.0918 461.921 21.0918ZM221.672 50.0547C219.404 50.0547 217.622 50.5408 216.326 51.5127C215.03 52.4846 214.383 53.8454 214.383 55.5947C214.383 57.3441 215.063 58.7696 216.424 59.8711C217.784 60.9725 219.761 61.5234 222.353 61.5234C225.786 61.5234 228.573 60.5841 230.711 58.7051C232.914 56.7613 234.015 54.2013 234.015 51.0264V50.0547H221.672ZM370.451 50.0547C368.183 50.0547 366.401 50.5408 365.105 51.5127C363.81 52.4846 363.162 53.8454 363.162 55.5947C363.162 57.3441 363.842 58.7696 365.203 59.8711C366.564 60.9725 368.54 61.5234 371.132 61.5234C374.566 61.5234 377.352 60.5841 379.49 58.7051C381.693 56.7613 382.794 54.2013 382.794 51.0264V50.0547H370.451ZM81.6885 31.1992C77.9305 31.1992 74.7877 32.3985 72.2607 34.7959C69.734 37.1284 68.4708 40.4976 68.4707 44.9033V45.876C68.4708 50.2169 69.734 53.5861 72.2607 55.9834C74.7877 58.3808 77.9305 59.5791 81.6885 59.5791C85.4465 59.5791 88.5893 58.3808 91.1162 55.9834C93.6429 53.5861 94.9062 50.2169 94.9062 45.876V44.9033C94.9062 40.4976 93.6429 37.1284 91.1162 34.7959C88.6541 32.3985 85.5113 31.1992 81.6885 31.1992ZM281.675 31.1992C277.917 31.1992 274.774 32.3985 272.247 34.7959C269.72 37.1284 268.457 40.4976 268.457 44.9033V45.876C268.457 50.2169 269.72 53.5861 272.247 55.9834C274.774 58.3808 277.917 59.5791 281.675 59.5791C285.433 59.5791 288.576 58.3808 291.103 55.9834C293.629 53.5861 294.892 50.2169 294.893 45.876V44.9033C294.893 40.4976 293.629 37.1284 291.103 34.7959C288.64 32.3985 285.498 31.1992 281.675 31.1992ZM138.03 58.4131H144.445C149.629 58.413 153.419 57.0523 155.816 54.3311C158.214 51.6097 159.412 47.7866 159.412 42.8623V29.2559C159.412 24.2668 158.214 20.4437 155.816 17.7871C153.419 15.0658 149.629 13.7052 144.445 13.7051H138.03V58.4131ZM187.499 0.681641C189.767 0.681641 191.646 1.3939 193.137 2.81934C194.627 4.24481 195.372 6.12444 195.372 8.45703C195.372 10.7894 194.627 12.6683 193.137 14.0938C191.646 15.5192 189.767 16.2324 187.499 16.2324C185.296 16.2324 183.417 15.5192 181.862 14.0938C180.372 12.6683 179.627 10.7895 179.627 8.45703C179.627 6.12444 180.372 4.24481 181.862 2.81934C183.417 1.39408 185.296 0.681711 187.499 0.681641Z',
        ],
      ],
      template: function (t, i) {
        (t & 1 &&
          (ge(0, 'a', 0)(1, 'span', 1),
          pt(2, 'ngDiagram'),
          he(),
          de(),
          ge(3, 'svg', 2),
          bt(4, 'path', 3),
          he()()),
          t & 2 && q('tabindex', i.tabbable() ? null : -1));
      },
      styles: [
        '[_nghost-%COMP%]{position:absolute;width:var(--watermark-size)}.bottom-right[_nghost-%COMP%]{bottom:1rem;right:1rem}.top-right[_nghost-%COMP%]{top:1rem;right:1rem}.bottom-left[_nghost-%COMP%]{bottom:1rem;left:1rem}.top-left[_nghost-%COMP%]{top:1rem;left:1rem}[_nghost-%COMP%]   svg[_ngcontent-%COMP%]{opacity:.7;height:100%;width:100%;display:block}[_nghost-%COMP%]   svg[_ngcontent-%COMP%]   path[_ngcontent-%COMP%]{fill:var(--watermark-fill)}[_nghost-%COMP%]   [_ngcontent-%COMP%]:hover   svg[_ngcontent-%COMP%]{opacity:1}[_nghost-%COMP%]{--watermark-size: min(4rem, 10%);--watermark-fill: #b3b3b3}[_nghost-%COMP%]   .sr-only[_ngcontent-%COMP%]{clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;overflow:hidden;position:absolute;white-space:nowrap;width:1px}',
      ],
    });
  },
  wf = class n {
    inputEventsRouter = m(ue);
    boxSelectionProvider = m(uo);
    flowCoreProvider = m(z);
    touchEventsStateService = m(mt);
    touchStartPoint = null;
    isBoxSelectionActive = !1;
    longPressTimer = null;
    LONG_PRESS_DELAY = 400;
    MOVE_THRESHOLD = 10;
    onTouchStart(e) {
      !this.isSingleTouch(e) ||
      this.touchEventsStateService.rotateHandled() ||
      this.touchEventsStateService.resizeHandled() ||
      this.touchEventsStateService.linkingHandled()
        ? this.cancelBoxSelection()
        : ((this.touchStartPoint = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          }),
          (this.longPressTimer = setTimeout(() => {
            ((this.isBoxSelectionActive = !0),
              this.touchEventsStateService.currentEvent.set(ve.BoxSelection));
            let t = e.touches[0] || this.touchStartPoint;
            t && this.emitBoxSelectionEvent('start', e, t);
          }, this.LONG_PRESS_DELAY)));
    }
    onTouchMove(e) {
      if (!this.isSingleTouch(e) || this.shouldCancelDuringLongPress(e))
        return void this.cancelBoxSelection();
      if (!this.isBoxSelectionActive || !this.touchStartPoint) return;
      let t = e.touches[0];
      (this.emitBoxSelectionEvent('continue', e, t),
        this.updateBoundingBox(t),
        e.preventDefault(),
        e.stopPropagation());
    }
    onTouchEnd(e) {
      if ((this.clearLongPressTimer(), !this.isBoxSelectionActive))
        return void (this.touchStartPoint = null);
      let t = e.changedTouches[0] || e.touches[0] || this.touchStartPoint;
      (t && this.emitBoxSelectionEvent('end', e, t),
        this.touchEventsStateService.clearCurrentEvent(),
        this.cancelBoxSelection(),
        e.preventDefault(),
        e.stopPropagation());
    }
    cancelBoxSelection() {
      ((this.isBoxSelectionActive = !1),
        (this.touchStartPoint = null),
        this.boxSelectionProvider.boundingBox.set(null),
        this.clearLongPressTimer());
    }
    clearLongPressTimer() {
      this.longPressTimer &&
        (clearTimeout(this.longPressTimer), (this.longPressTimer = null));
    }
    isSingleTouch(e) {
      return e.touches.length === 1;
    }
    shouldCancelDuringLongPress(e) {
      if (
        !this.longPressTimer ||
        !this.touchStartPoint ||
        this.isBoxSelectionActive
      )
        return !1;
      let t = e.touches[0];
      return (
        Math.max(
          Math.abs(t.clientX - this.touchStartPoint.x),
          Math.abs(t.clientY - this.touchStartPoint.y),
        ) > this.MOVE_THRESHOLD
      );
    }
    emitBoxSelectionEvent(e, t, i) {
      if (!i) return;
      let o = this.inputEventsRouter.getBaseEvent(t);
      this.inputEventsRouter.emit(
        y(h({}, o), {
          name: 'boxSelection',
          phase: e,
          target: void 0,
          targetType: 'diagram',
          lastInputPoint: {
            x: 'clientX' in i ? i.clientX : i.x,
            y: 'clientY' in i ? i.clientY : i.y,
          },
        }),
      );
    }
    updateBoundingBox(e) {
      let t = this.flowCoreProvider.provide(),
        { x: i, y: o } = t.clientToFlowViewportPosition(this.touchStartPoint),
        { x: r, y: s } = t.clientToFlowViewportPosition({
          x: e.clientX,
          y: e.clientY,
        }),
        a = Math.min(i, r),
        d = Math.min(o, s),
        c = Math.abs(r - i),
        l = Math.abs(s - o);
      this.boxSelectionProvider.boundingBox.set({
        x: a,
        y: d,
        width: c,
        height: l,
      });
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramMobileBoxSelection', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('touchstart', function (r) {
            return i.onTouchStart(r);
          })('touchmove', function (r) {
            return i.onTouchMove(r);
          })('touchend', function (r) {
            return i.onTouchEnd(r);
          })('touchcancel', function (r) {
            return i.onTouchEnd(r);
          });
      },
    });
  },
  Eo = class n {
    elementRef = m(ie);
    flowCoreProvider = m(z);
    renderer = m(st);
    flowResizeBatchProcessor = m(bs);
    flowOffsetService = m(Ms);
    templateProviderService = m(Bs);
    diagramService = m($e);
    initializedModel = null;
    resizeObserver = null;
    config = E();
    model = E.required();
    middlewares = E(YT);
    nodeTemplateMap = E(new di());
    edgeTemplateMap = E(new Ps());
    nodes = this.renderer.nodes;
    edges = this.renderer.edges;
    viewport = this.renderer.viewport;
    viewportPannable = this.renderer.viewportPannable;
    linkingActive = w(() => !!this.diagramService.actionState().linking);
    relinkingActive = m(mo, { optional: !0 })?.active ?? P(!1).asReadonly();
    tabbable = E(!0, { transform: (e) => e == null || ns(e) });
    diagramInit = new F();
    edgeDrawn = new F();
    edgeDrawEnded = new F();
    edgeRelinkStarted = new F();
    edgeRelinkEnded = new F();
    selectionMoved = new F();
    selectionChanged = new F();
    selectionGestureEnded = new F();
    selectionRemoved = new F();
    groupMembershipChanged = new F();
    selectionRotated = new F();
    nodeRotateStarted = new F();
    nodeRotateEnded = new F();
    viewportChanged = new F();
    clipboardPasted = new F();
    nodeResized = new F();
    nodeResizeStarted = new F();
    nodeResizeEnded = new F();
    paletteItemDropped = new F();
    nodeDragStarted = new F();
    nodeDragEnded = new F();
    constructor() {
      (fe(() => {
        let e = this.model();
        this.initializedModel != e &&
          (ke(() => {
            (this.renderer.isInitialized.set(!1),
              this.renderer.viewportPannable.set(
                this.config()?.viewportPanningEnabled ?? !0,
              ),
              this.flowCoreProvider.destroy(),
              this.flowOffsetService.reset(),
              this.flowCoreProvider.init(
                e,
                this.middlewares(),
                this.flowOffsetService.getFlowOffset,
                this.getViewportSize,
                this.config(),
              ));
          }),
          (this.initializedModel = e),
          this.flowOffsetService.initialize(this.elementRef.nativeElement),
          this.flowResizeBatchProcessor.watchResizeGestureEnd(),
          this.setupEventBridge());
      }),
        fe(() => {
          let e = this.nodeTemplateMap();
          this.templateProviderService.setNodeTemplateMap(e);
        }),
        fe(() => {
          let e = this.edgeTemplateMap();
          this.templateProviderService.setEdgeTemplateMap(e);
        }));
    }
    ngOnInit() {
      (this.flowResizeBatchProcessor.initialize(),
        this.setupViewportSizeTracking());
    }
    ngOnDestroy() {
      (this.flowCoreProvider.destroy(), this.cleanupViewportSizeTracking());
    }
    getNodeTemplate(e) {
      return this.templateProviderService.getNodeTemplate(e);
    }
    getEdgeTemplate(e) {
      return this.templateProviderService.getEdgeTemplate(e);
    }
    trackNode = (e, t) => t._internalId || t.id;
    trackEdge = (e, t) => t._internalId || t.id;
    isGroup(e) {
      return 'isGroup' in e;
    }
    castToGroupNode(e) {
      return e;
    }
    getBoundingClientRect() {
      return this.elementRef.nativeElement.getBoundingClientRect();
    }
    getViewportSize = () => {
      let { width: e, height: t } =
        this.elementRef.nativeElement.getBoundingClientRect();
      return { width: e, height: t };
    };
    setupViewportSizeTracking() {
      if (typeof ResizeObserver > 'u') return;
      ((this.resizeObserver = new ResizeObserver((t) => {
        let i = t[0];
        if (i) {
          this.flowOffsetService.invalidateCache();
          let { width: o, height: r } = i.contentRect;
          this.updateViewportSize(o, r);
        }
      })),
        this.resizeObserver.observe(this.elementRef.nativeElement));
      let e = this.elementRef.nativeElement.getBoundingClientRect();
      this.updateViewportSize(e.width, e.height);
    }
    cleanupViewportSizeTracking() {
      this.resizeObserver &&
        (this.resizeObserver.disconnect(), (this.resizeObserver = null));
    }
    updateViewportSize(e, t) {
      if (!this.flowCoreProvider.isInitialized()) return;
      let i = this.flowCoreProvider.provide(),
        o = i.getState().metadata.viewport;
      (o.width === e && o.height === t) ||
        i.applyUpdate(
          {
            metadataUpdate: { viewport: y(h({}, o), { width: e, height: t }) },
          },
          'updateViewportSize',
        );
    }
    setupEventBridge() {
      let e = this.flowCoreProvider.provide(),
        t = e.eventManager;
      (t.on('diagramInit', (i) => {
        setTimeout(() => {
          (this.renderer.isInitialized.set(!0),
            this.diagramInit.emit(i),
            e.config.zoom.zoomToFit.onInit &&
              e.commandHandler.emit('zoomToFit', {}));
        });
      }),
        t.on('edgeDrawn', (i) => this.edgeDrawn.emit(i)),
        t.on('edgeDrawEnded', (i) => this.edgeDrawEnded.emit(i)),
        t.on('edgeRelinkStarted', (i) => this.edgeRelinkStarted.emit(i)),
        t.on('edgeRelinkEnded', (i) => this.edgeRelinkEnded.emit(i)),
        t.on('selectionMoved', (i) => this.selectionMoved.emit(i)),
        t.on('selectionChanged', (i) => this.selectionChanged.emit(i)),
        t.on('selectionGestureEnded', (i) =>
          this.selectionGestureEnded.emit(i),
        ),
        t.on('selectionRemoved', (i) => this.selectionRemoved.emit(i)),
        t.on('groupMembershipChanged', (i) =>
          this.groupMembershipChanged.emit(i),
        ),
        t.on('selectionRotated', (i) => this.selectionRotated.emit(i)),
        t.on('nodeRotateStarted', (i) => this.nodeRotateStarted.emit(i)),
        t.on('nodeRotateEnded', (i) => this.nodeRotateEnded.emit(i)),
        t.on('viewportChanged', (i) => this.viewportChanged.emit(i)),
        t.on('clipboardPasted', (i) => this.clipboardPasted.emit(i)),
        t.on('nodeResized', (i) => this.nodeResized.emit(i)),
        t.on('nodeResizeStarted', (i) => this.nodeResizeStarted.emit(i)),
        t.on('nodeResizeEnded', (i) => this.nodeResizeEnded.emit(i)),
        t.on('paletteItemDropped', (i) => this.paletteItemDropped.emit(i)),
        t.on('nodeDragStarted', (i) => this.nodeDragStarted.emit(i)),
        t.on('nodeDragEnded', (i) => this.nodeDragEnded.emit(i)));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram']],
      hostVars: 7,
      hostBindings: function (t, i) {
        t & 2 &&
          (q('tabindex', i.tabbable() ? '0' : '-1'),
          Ne('pannable', i.viewportPannable())('linking', i.linkingActive())(
            'relinking',
            i.relinkingActive(),
          ));
      },
      inputs: {
        config: [1, 'config'],
        model: [1, 'model'],
        middlewares: [1, 'middlewares'],
        nodeTemplateMap: [1, 'nodeTemplateMap'],
        edgeTemplateMap: [1, 'edgeTemplateMap'],
        tabbable: [1, 'tabbable'],
      },
      outputs: {
        diagramInit: 'diagramInit',
        edgeDrawn: 'edgeDrawn',
        edgeDrawEnded: 'edgeDrawEnded',
        edgeRelinkStarted: 'edgeRelinkStarted',
        edgeRelinkEnded: 'edgeRelinkEnded',
        selectionMoved: 'selectionMoved',
        selectionChanged: 'selectionChanged',
        selectionGestureEnded: 'selectionGestureEnded',
        selectionRemoved: 'selectionRemoved',
        groupMembershipChanged: 'groupMembershipChanged',
        selectionRotated: 'selectionRotated',
        nodeRotateStarted: 'nodeRotateStarted',
        nodeRotateEnded: 'nodeRotateEnded',
        viewportChanged: 'viewportChanged',
        clipboardPasted: 'clipboardPasted',
        nodeResized: 'nodeResized',
        nodeResizeStarted: 'nodeResizeStarted',
        nodeResizeEnded: 'nodeResizeEnded',
        paletteItemDropped: 'paletteItemDropped',
        nodeDragStarted: 'nodeDragStarted',
        nodeDragEnded: 'nodeDragEnded',
      },
      features: [ht([Xu, Qu, wf, Fu, Wu, $u, Ku, Gu, Hu, Uu, zu])],
      ngContentSelectors: fI,
      decls: 10,
      vars: 2,
      consts: [
        [1, 'diagram-background-container'],
        [3, 'viewport'],
        [3, 'edge'],
        [1, 'ng-diagram-node', 3, 'node'],
        [3, 'preferredPosition', 'tabbable'],
        [4, 'ngComponentOutlet', 'ngComponentOutletInputs'],
        [3, 'node'],
      ],
      template: function (t, i) {
        if (
          (t & 1 &&
            (me(uI),
            W(0, 'div', 0),
            ce(1),
            Y(),
            W(2, 'ng-diagram-canvas', 1),
            ot(3, vI, 3, 3, 'ng-diagram-edge', 2, i.trackEdge, !0),
            $(5, 'ng-diagram-marker-arrow'),
            ot(6, II, 4, 3, 'ng-diagram-node', 3, i.trackNode, !0),
            Y(),
            oe(8, MI, 1, 2, 'ng-diagram-watermark', 4),
            $(9, 'ng-diagram-box-selection')),
          t & 2)
        ) {
          let o;
          (_(2),
            O('viewport', i.viewport()),
            _(),
            rt(i.edges()),
            _(3),
            rt(i.nodes()),
            _(2),
            re((o = i.config()) != null && o.hideWatermark ? -1 : 8));
        }
      },
      dependencies: [oo, is, ef, Hs, af, rf, yf, ff, df, vf, Ju],
      styles: [
        '[_nghost-%COMP%]{width:100%;height:100%;display:flex;position:relative;overflow:hidden;background-color:var(--ngd-diagram-background-color);touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;transform:translateZ(0);-webkit-font-smoothing:antialiased;outline:none}.pannable[_nghost-%COMP%]{cursor:grab}.pannable.panning[_nghost-%COMP%]{cursor:grabbing}.linking[_nghost-%COMP%], .relinking[_nghost-%COMP%]{cursor:grabbing}[_nghost-%COMP%]   .diagram-background-container[_ngcontent-%COMP%]{width:100%;height:100%}',
      ],
      changeDetection: 0,
    });
  },
  Df = class n {
    panelRegistry = m(Do);
    position = E('bottom-right');
    ngAfterViewInit() {
      this.panelRegistry?.register(this);
    }
    ngOnDestroy() {
      this.panelRegistry?.unregister();
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-panel']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && je(i.position());
      },
      inputs: { position: [1, 'position'] },
      ngContentSelectors: Oe,
      decls: 1,
      vars: 0,
      template: function (t, i) {
        t & 1 && (me(), ce(0));
      },
      styles: [
        '[_nghost-%COMP%]{overflow:hidden;border-radius:var(--ngd-minimap-border-radius);padding:var(--ngd-minimap-padding);background-color:var(--ngd-minimap-background);box-shadow:0 8px 16px -4px var(--ngd-minimap-shadow-color);border:1px solid var(--ngd-minimap-border-color);display:flex;flex-direction:column;gap:var(--ngd-minimap-padding)}',
      ],
      changeDetection: 0,
    });
  },
  Ef = class n {
    viewportService = m(ho);
    step = E(0.1);
    zoomPercentage = w(() => Math.round(100 * this.viewportService.scale()));
    canZoomIn = w(
      () =>
        this.viewportService.scale() + this.step() <=
        this.viewportService.maxZoom,
    );
    canZoomOut = w(
      () =>
        this.viewportService.scale() - this.step() >=
        this.viewportService.minZoom,
    );
    zoomIn() {
      let e = this.viewportService.scale(),
        t = (e + this.step()) / e;
      this.viewportService.zoom(t);
    }
    zoomOut() {
      let e = this.viewportService.scale(),
        t = (e - this.step()) / e;
      this.viewportService.zoom(t);
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-zoom-controls']],
      inputs: { step: [1, 'step'] },
      decls: 7,
      vars: 3,
      consts: [
        [1, 'zoom-controls-container'],
        ['aria-label', 'Zoom out', 1, 'nav-button', 3, 'click', 'disabled'],
        [1, 'label'],
        ['aria-label', 'Zoom in', 1, 'nav-button', 3, 'click', 'disabled'],
      ],
      template: function (t, i) {
        (t & 1 &&
          (ge(0, 'div', 0)(1, 'button', 1),
          Ki('click', function () {
            return i.zoomOut();
          }),
          pt(2, '\u2212'),
          he(),
          ge(3, 'span', 2),
          pt(4),
          he(),
          ge(5, 'button', 3),
          Ki('click', function () {
            return i.zoomIn();
          }),
          pt(6, '+'),
          he()()),
          t & 2 &&
            (_(),
            Lt('disabled', !i.canZoomOut()),
            _(3),
            Ji('', i.zoomPercentage(), '%'),
            _(),
            Lt('disabled', !i.canZoomIn())));
      },
      styles: [
        '.zoom-controls-container[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between}.zoom-controls-container[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%]{text-align:center;font-size:var(--ngd-zoom-controls-font-size);font-weight:var(--ngd-zoom-controls-font-weight);color:var(--ngd-zoom-controls-color);-webkit-user-select:none;user-select:none}.nav-button[_ngcontent-%COMP%]{width:var(--ngd-nav-button-size);height:var(--ngd-nav-button-size);color:var(--ngd-nav-button-color);border-radius:var(--ngd-nav-button-border-radius);padding:var(--ngd-nav-button-padding);border:none;background:none;box-sizing:content-box;cursor:pointer;font-size:var(--ngd-nav-button-size);line-height:var(--ngd-nav-button-size)}.nav-button[_ngcontent-%COMP%]:hover:not(:disabled){background-color:var(--ngd-nav-button-background-color-hover)}.nav-button[_ngcontent-%COMP%]:active{color:var(--ngd-nav-button-color-active)}.nav-button[_ngcontent-%COMP%]:disabled{color:var(--ngd-nav-button-color-disabled);cursor:default}',
      ],
      changeDetection: 0,
    });
  },
  Cf = class n {
    bounds = E.required();
    nodeStyle = E();
    computedStyle = w(() => this.nodeStyle() ?? {});
    shape = w(() => this.computedStyle().shape ?? 'rect');
    hostClass = w(() => {
      let e = this.computedStyle().cssClass;
      return e ? `minimap-node ${e}` : 'minimap-node';
    });
    cx = w(() => this.bounds().x + this.bounds().width / 2);
    cy = w(() => this.bounds().y + this.bounds().height / 2);
    radius = w(() => Math.min(this.bounds().width, this.bounds().height) / 2);
    rx = w(() => this.bounds().width / 2);
    ry = w(() => this.bounds().height / 2);
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['g', 'ng-diagram-default-minimap-node', '']],
      hostVars: 11,
      hostBindings: function (t, i) {
        t & 2 &&
          (q('transform', i.bounds().transform),
          je(i.hostClass()),
          ye('fill', i.computedStyle().fill)(
            'stroke',
            i.computedStyle().stroke,
          )(
            'stroke-width',
            i.computedStyle().strokeWidth,
            'px',
          )('opacity', i.computedStyle().opacity));
      },
      inputs: { bounds: [1, 'bounds'], nodeStyle: [1, 'nodeStyle'] },
      attrs: bI,
      decls: 3,
      vars: 1,
      template: function (t, i) {
        if (
          (t & 1 &&
            oe(0, SI, 1, 3, ':svg:circle')(1, TI, 1, 4, ':svg:ellipse')(
              2,
              _I,
              1,
              4,
              ':svg:rect',
            ),
          t & 2)
        ) {
          let o;
          re((o = i.shape()) === 'circle' ? 0 : o === 'ellipse' ? 1 : 2);
        }
      },
      styles: [
        '[_nghost-%COMP%]{fill:var(--ngd-minimap-node-color);opacity:var(--ngd-minimap-node-opacity)}',
      ],
      changeDetection: 0,
    });
  },
  If = class n {
    diagramBounds = E.required();
    minimapTransform = E.required();
    rect = w(() => {
      let e = this.diagramBounds(),
        t = this.minimapTransform();
      return {
        x: e.x * t.scale + t.offsetX,
        y: e.y * t.scale + t.offsetY,
        width: e.width * t.scale,
        height: e.height * t.scale,
      };
    });
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['rect', 'ng-diagram-minimap-diagram-bounds', '']],
      hostVars: 4,
      hostBindings: function (t, i) {
        t & 2 &&
          q('x', i.rect().x)('y', i.rect().y)('width', i.rect().width)(
            'height',
            i.rect().height,
          );
      },
      inputs: {
        diagramBounds: [1, 'diagramBounds'],
        minimapTransform: [1, 'minimapTransform'],
      },
      attrs: NI,
      decls: 0,
      vars: 0,
      template: function (t, i) {},
      styles: [
        '[_nghost-%COMP%]{fill:var(--ngd-minimap-diagram-bounds-color);opacity:var(--ngd-minimap-diagram-bounds-opacity);stroke:none;pointer-events:none}',
      ],
      changeDetection: 0,
    });
  },
  js = class n {
    diagramService = m($e);
    isInteracting = w(() => {
      let e = this.diagramService.actionState();
      return !!e.dragging?.movementStarted || !!e.resize || !!e.rotation;
    });
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Mf = class n {
    viewportService = m(ho);
    flowCoreProvider = m(z);
    transform = E.required();
    viewport = E.required();
    dragState = {
      isDragging: !1,
      lastPosition: { x: 0, y: 0 },
      pointerId: null,
      captureElement: null,
    };
    unregisterInteractionCleanup = null;
    ngOnDestroy() {
      (this.dragState.isDragging &&
        this.flowCoreProvider.isInitialized() &&
        this.setPanningState(!1),
        this.removeListeners());
    }
    onPointerDown(e) {
      e.button !== 0 ||
        this.dragState.isDragging ||
        (e.preventDefault(),
        this.capturePointer(e),
        (this.dragState.isDragging = !0),
        (this.dragState.lastPosition = { x: e.clientX, y: e.clientY }),
        this.setPanningState(!0),
        this.attachDocumentListeners(),
        (this.unregisterInteractionCleanup = this.flowCoreProvider
          .provide()
          .registerInteractionCleanup(() => this.removeListeners())));
    }
    onPointerMove = (e) => {
      if (!this.dragState.isDragging) return;
      let t = this.calculateClientDelta(e);
      this.dragState.lastPosition = { x: e.clientX, y: e.clientY };
      let i = this.calculateViewportDelta(t);
      this.viewportService.moveViewportBy(i.x, i.y);
    };
    onPointerUp = () => {
      (this.setPanningState(!1), this.removeListeners());
    };
    removeListeners() {
      (this.unregisterInteractionCleanup?.(),
        (this.unregisterInteractionCleanup = null),
        (this.dragState.isDragging = !1),
        this.releasePointer(),
        this.removeDocumentListeners());
    }
    capturePointer(e) {
      let t = e.target;
      (t.setPointerCapture(e.pointerId),
        (this.dragState.pointerId = e.pointerId),
        (this.dragState.captureElement = t));
    }
    releasePointer() {
      let { captureElement: e, pointerId: t } = this.dragState;
      (e && t !== null && e.hasPointerCapture(t) && e.releasePointerCapture(t),
        (this.dragState.pointerId = null),
        (this.dragState.captureElement = null));
    }
    attachDocumentListeners() {
      (document.addEventListener('pointermove', this.onPointerMove),
        document.addEventListener('pointerup', this.onPointerUp),
        document.addEventListener('pointercancel', this.onPointerUp));
    }
    removeDocumentListeners() {
      (document.removeEventListener('pointermove', this.onPointerMove),
        document.removeEventListener('pointerup', this.onPointerUp),
        document.removeEventListener('pointercancel', this.onPointerUp));
    }
    setPanningState(e) {
      let t = this.flowCoreProvider.provide().actionStateManager;
      e ? (t.panning = { active: !0 }) : t.clearPanning();
    }
    calculateClientDelta(e) {
      return {
        x: e.clientX - this.dragState.lastPosition.x,
        y: e.clientY - this.dragState.lastPosition.y,
      };
    }
    calculateViewportDelta(e) {
      let { scale: t } = this.transform(),
        { scale: i } = this.viewport();
      return { x: (-e.x / t) * i, y: (-e.y / t) * i };
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵdir = B({
      type: n,
      selectors: [['', 'ngDiagramMinimapNavigation', '']],
      hostBindings: function (t, i) {
        t & 1 &&
          ee('pointerdown', function (r) {
            return i.onPointerDown(r);
          });
      },
      inputs: { transform: [1, 'transform'], viewport: [1, 'viewport'] },
    });
  },
  e_ = (n) => ({
    x: -n.x / n.scale,
    y: -n.y / n.scale,
    width: (n.width ?? 0) / n.scale,
    height: (n.height ?? 0) / n.scale,
  }),
  t_ = (n, e) => (e.width === 0 || e.height === 0 ? n : In([n, e])),
  n_ = (n, e, t, i) =>
    n.width === 0 || n.height === 0
      ? 1
      : Math.min((e - 2 * i) / n.width, (t - 2 * i) / n.height),
  i_ = (n, e, t, i) => ({
    offsetX: (e - n.width * i) / 2 - n.x * i,
    offsetY: (t - n.height * i) / 2 - n.y * i,
  }),
  o_ = (n, e, t, i) => {
    let o = n_(n, e, t, i),
      { offsetX: r, offsetY: s } = i_(n, e, t, o);
    return { scale: o, offsetX: r, offsetY: s };
  },
  ev = { width: 100, height: 50 },
  r_ = (n, e = ev) => {
    let t = n.size ?? e,
      i = n.angle ?? 0;
    return {
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      width: t.width,
      height: t.height,
      angle: i,
      transform: `rotate(${i} ${n.position.x + t.width / 2} ${n.position.y + t.height / 2})`,
    };
  },
  s_ = (n, e = ev) =>
    In(
      n
        .filter((t) => !t.computedHidden)
        .map((t) => {
          let i = t.size ?? e;
          return Bf(
            {
              x: t.position.x,
              y: t.position.y,
              width: i.width,
              height: i.height,
            },
            t.angle ?? 0,
          );
        }),
    ) ?? { x: 0, y: 0, width: 0, height: 0 },
  a_ = (n, e) => ({
    x: (-n.x / n.scale) * e.scale + e.offsetX,
    y: (-n.y / n.scale) * e.scale + e.offsetY,
    width: ((n.width ?? 0) / n.scale) * e.scale,
    height: ((n.height ?? 0) / n.scale) * e.scale,
  }),
  bf = class extends Map {},
  Sf = class {
    cache = new WeakMap();
    clear() {
      this.cache = new WeakMap();
    }
    getOrCompute(e, t) {
      let i = this.cache.get(e);
      if (i) return i;
      let o = t();
      return (this.cache.set(e, o), o);
    }
  },
  Us = class n {
    renderer = m(st);
    cache = new Sf();
    lastStyleFn;
    lastTemplateMap;
    computeMinimapNodes(e, t) {
      return (
        this.invalidateCacheIfNeeded(e, t),
        this.renderer
          .nodes()
          .filter((i) => !i.computedHidden)
          .map((i) =>
            this.cache.getOrCompute(i, () => ({
              bounds: r_(i),
              diagramNode: i,
              nodeStyle: e?.(i) ?? {},
              template: i.type ? (t.get(i.type) ?? null) : null,
            })),
          )
      );
    }
    computeDiagramBounds() {
      return (
        zf(this.renderer.nodes(), []) ?? { x: 0, y: 0, width: 0, height: 0 }
      );
    }
    invalidateCacheIfNeeded(e, t) {
      (e === this.lastStyleFn && t === this.lastTemplateMap) ||
        (this.cache.clear(),
        (this.lastStyleFn = e),
        (this.lastTemplateMap = t));
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Bt = (n, e, t, i) =>
    i?.waitForMeasurements && !n.transactionManager.isActive()
      ? n
          .transaction(
            e,
            async (o) => {
              await o.emit(e, t);
            },
            y(h({}, i), { waitForMeasurements: !0 }),
          )
          .then(() => {})
      : (i?.waitForMeasurements &&
          console.warn(
            '[ngDiagram] waitForMeasurements is ignored inside a transaction \u2014 pass { waitForMeasurements: true } to the transaction itself instead.',
          ),
        n.commandHandler.emit(e, t)),
  Tt = class n extends St {
    diagramService = m($e);
    _nodes = P([]);
    _edges = P([]);
    _metadata = P({ viewport: { x: 0, y: 0, scale: 1 } });
    nodes = this._nodes.asReadonly();
    edges = this._edges.asReadonly();
    metadata = this._metadata.asReadonly();
    constructor() {
      (super(),
        fe(() => {
          this.diagramService.isInitialized() &&
            (this.flowCore.model.onChange(this.modelListener),
            ke(() =>
              this.modelListener({
                nodes: this.flowCore.model.getNodes(),
                edges: this.flowCore.model.getEdges(),
                metadata: this.flowCore.model.getMetadata(),
              }),
            ));
        }));
    }
    ngOnDestroy() {
      this.flowCoreProvider.isInitialized() &&
        this.flowCore.model.unregisterOnChange(this.modelListener);
    }
    getModel() {
      return this.flowCore.model;
    }
    toJSON() {
      return this.flowCore.model.toJSON();
    }
    addEdges(e, t) {
      return Bt(this.flowCore, 'addEdges', { edges: e }, t);
    }
    addNodes(e, t) {
      return Bt(this.flowCore, 'addNodes', { nodes: e }, t);
    }
    getEdgeById(e) {
      return this.flowCore.getEdgeById(e) || null;
    }
    getNearestNodeInRange(e, t) {
      return this.flowCore.getNearestNodeInRange(e, t) || null;
    }
    getNearestPortInRange(e, t) {
      return this.flowCore.getNearestPortInRange(e, t) || null;
    }
    getDanglingEndpoints() {
      return pM(this.flowCore.modelLookup.danglingEdges);
    }
    getNearestDanglingEndpointInRange(e, t) {
      return mM(this.flowCore.modelLookup.danglingEdges, e, t);
    }
    detachEdge(e, t, i) {
      if (!this.flowCore.config.danglingEdges.enabled)
        return (
          console.warn(
            '[ngDiagram] detachEdge ignored: dangling edges are disabled. Set config.danglingEdges.enabled = true to detach edge endpoints.',
          ),
          Promise.resolve()
        );
      let o = this.getEdgeById(e);
      if (!o) return Promise.resolve();
      let r = t === 'source' ? o.source : o.target;
      if (!r)
        return i
          ? this.updateEdge(
              e,
              h(
                h(
                  {},
                  t === 'source'
                    ? { sourcePosition: i }
                    : { targetPosition: i },
                ),
                En(o, t, i),
              ),
            )
          : Promise.resolve();
      let s = i ?? ml(o, t, this.getNodeById(r));
      return s
        ? this.updateEdge(
            e,
            h(
              h(
                {},
                t === 'source'
                  ? { source: '', sourcePort: void 0, sourcePosition: s }
                  : { target: '', targetPort: void 0, targetPosition: s },
              ),
              En(o, t, s),
            ),
          )
        : Promise.resolve();
    }
    async attachEdge(e, t, i, o) {
      let r = this.getEdgeById(e);
      if (
        !r ||
        !Vy(this.flowCore, t, i, o) ||
        !Ys(
          this.flowCore,
          t === 'source' ? i : r.source || void 0,
          t === 'source' ? o : r.sourcePort,
          t === 'target' ? i : r.target || void 0,
          t === 'target' ? o : r.targetPort,
          !0,
          { reason: 'attach', edge: r, end: t },
        )
      )
        return !1;
      let s = this.getNodeById(i),
        a = s && o ? Co(s, o) : null;
      return (
        await this.updateEdge(
          e,
          h(
            h(
              {},
              t === 'source'
                ? { source: i, sourcePort: o, sourcePosition: void 0 }
                : { target: i, targetPort: o, targetPosition: void 0 },
            ),
            a ? En(r, t, a) : {},
          ),
        ),
        !0
      );
    }
    getNodeById(e) {
      return this.flowCore.getNodeById(e);
    }
    getNodesInRange(e, t) {
      return this.flowCore.getNodesInRange(e, t);
    }
    getConnectedEdges(e) {
      return this.flowCore.getConnectedEdges(e);
    }
    getConnectedNodes(e) {
      return this.flowCore.getConnectedNodes(e);
    }
    getNodeEnds(e) {
      return this.flowCore.getNodeEnds(e);
    }
    getChildren(e) {
      return this.flowCore.getChildren(e);
    }
    getChildrenNested(e) {
      return this.flowCore.getChildrenNested(e);
    }
    isNestedChild(e, t) {
      return this.flowCore.isNestedChild(e, t);
    }
    getParentHierarchy(e) {
      return this.flowCore.getParentHierarchy(e);
    }
    getOverlappingNodes(e) {
      return this.flowCore.getOverlappingNodes(e);
    }
    computePartsBounds(e, t) {
      return zf(e, t) ?? { x: 0, y: 0, width: 0, height: 0 };
    }
    updateEdge(e, t, i) {
      return Bt(
        this.flowCore,
        'updateEdge',
        { id: e, edgeChanges: h({}, t) },
        i,
      );
    }
    updateEdgeData(e, t, i) {
      return this.updateEdge(e, { data: t }, i);
    }
    updateNode(e, t, i) {
      return Bt(
        this.flowCore,
        'updateNode',
        { id: e, nodeChanges: h({}, t) },
        i,
      );
    }
    updateNodeData(e, t, i) {
      return this.updateNode(e, { data: t }, i);
    }
    updateNodes(e, t) {
      return Bt(this.flowCore, 'updateNodes', { nodes: e }, t);
    }
    updateEdges(e, t) {
      return Bt(this.flowCore, 'updateEdges', { edges: e }, t);
    }
    deleteEdges(e) {
      return this.flowCore.commandHandler.emit('deleteEdges', { ids: e });
    }
    deleteNodes(e) {
      return this.flowCore.commandHandler.emit('deleteNodes', { ids: e });
    }
    modelListener = (e) => {
      (this._nodes.set(e.nodes),
        this._edges.set(e.edges),
        this._metadata.set(e.metadata));
    };
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  $s = class n {
    modelService = m(Tt);
    computeMinimapNodes() {
      return [];
    }
    computeDiagramBounds() {
      return s_(this.modelService.nodes());
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Ey = class n {
    VIEWPORT_STROKE_WIDTH_CSS_VAR = '--ngd-minimap-viewport-stroke-width';
    renderer = m(st);
    flowCoreProvider = m(z);
    interactionTracker = m(js);
    elementRef = m(ie);
    directStrategy = m(Us);
    virtualizedStrategy = m($s);
    strokePadding = P(1);
    position = E('bottom-right');
    width = E(200);
    height = E(150);
    showZoomControls = E(!0);
    nodeStyle = E();
    minimapNodeTemplateMap = E(new bf());
    deferNodeUpdates = E(!1);
    ngAfterViewInit() {
      this.strokePadding.set(this.getStrokePaddingFromCss());
    }
    isDiagramInitialized = this.renderer.isInitialized;
    viewport = this.renderer.viewport;
    hasValidViewport = w(() => {
      let e = this.viewport();
      return !!e.width && !!e.height && e.width > 0 && e.height > 0;
    });
    viewportRect = w(() => a_(this.viewport(), this.transform()));
    strategy = w(() =>
      this.isDiagramInitialized() &&
      this.flowCoreProvider.provide().isVirtualizationActive
        ? this.virtualizedStrategy
        : this.directStrategy,
    );
    transform = w(() =>
      o_(
        this.combinedBounds(),
        this.width(),
        this.height(),
        this.strokePadding(),
      ),
    );
    nodesGroupTransform = w(() => {
      let e = this.transform();
      return `translate(${e.offsetX}, ${e.offsetY}) scale(${e.scale})`;
    });
    isDeferringUpdates = w(
      () => this.deferNodeUpdates() && this.interactionTracker.isInteracting(),
    );
    cachedMinimapNodes = [];
    cachedDiagramBounds = { x: 0, y: 0, width: 0, height: 0 };
    minimapNodes = w(() => {
      if (this.isDeferringUpdates()) return this.cachedMinimapNodes;
      let e = this.strategy().computeMinimapNodes(
        this.nodeStyle(),
        this.minimapNodeTemplateMap(),
      );
      return ((this.cachedMinimapNodes = e), e);
    });
    showDiagramBounds = w(
      () =>
        this.isDiagramInitialized() &&
        this.flowCoreProvider.provide().isVirtualizationActive,
    );
    diagramBounds = w(() => {
      if (this.isDeferringUpdates()) return this.cachedDiagramBounds;
      let e = this.strategy().computeDiagramBounds();
      return ((this.cachedDiagramBounds = e), e);
    });
    viewportBoundsInDiagramSpace = w(() => e_(this.viewport()));
    combinedBounds = w(() =>
      t_(this.diagramBounds(), this.viewportBoundsInDiagramSpace()),
    );
    getStrokePaddingFromCss() {
      let e = getComputedStyle(this.elementRef.nativeElement)
        .getPropertyValue(this.VIEWPORT_STROKE_WIDTH_CSS_VAR)
        .trim();
      return parseFloat(e) || 1;
    }
    static ɵfac = function (t) {
      return new (t || n)();
    };
    static ɵcmp = k({
      type: n,
      selectors: [['ng-diagram-minimap']],
      hostVars: 2,
      hostBindings: function (t, i) {
        t & 2 && je(i.position());
      },
      inputs: {
        position: [1, 'position'],
        width: [1, 'width'],
        height: [1, 'height'],
        showZoomControls: [1, 'showZoomControls'],
        nodeStyle: [1, 'nodeStyle'],
        minimapNodeTemplateMap: [1, 'minimapNodeTemplateMap'],
        deferNodeUpdates: [1, 'deferNodeUpdates'],
      },
      features: [wn([Us, $s, js])],
      decls: 5,
      vars: 10,
      consts: [
        [3, 'position'],
        [
          'ngDiagramMinimapNavigation',
          '',
          1,
          'minimap-svg',
          3,
          'transform',
          'viewport',
        ],
        ['x', '0', 'y', '0', 1, 'minimap-background'],
        [
          'ng-diagram-minimap-diagram-bounds',
          '',
          3,
          'diagramBounds',
          'minimapTransform',
        ],
        [1, 'minimap-viewport'],
        ['ng-diagram-default-minimap-node', '', 3, 'bounds', 'nodeStyle'],
        [4, 'ngComponentOutlet', 'ngComponentOutletInputs'],
      ],
      template: function (t, i) {
        (t & 1 &&
          (W(0, 'ng-diagram-panel', 0),
          de(),
          W(1, 'svg', 1),
          $(2, 'rect', 2),
          oe(3, BI, 5, 3),
          Y(),
          oe(4, HI, 1, 0, 'ng-diagram-zoom-controls'),
          Y()),
          t & 2 &&
            (O('position', i.position()),
            _(),
            O('transform', i.transform())('viewport', i.viewport()),
            q('viewBox', '0 0 ' + i.width() + ' ' + i.height())(
              'width',
              i.width(),
            )('height', i.height()),
            _(),
            q('width', i.width())('height', i.height()),
            _(),
            re(i.isDiagramInitialized() ? 3 : -1),
            _(),
            re(i.showZoomControls() && i.isDiagramInitialized() ? 4 : -1)));
      },
      dependencies: [Mf, oo, is, Cf, If, Ef, Df],
      styles: [
        '[_nghost-%COMP%]{display:block;position:absolute;pointer-events:auto;z-index:10}.bottom-right[_nghost-%COMP%]{bottom:var(--ngd-minimap-margin);right:var(--ngd-minimap-margin)}.bottom-left[_nghost-%COMP%]{bottom:var(--ngd-minimap-margin);left:var(--ngd-minimap-margin)}.top-right[_nghost-%COMP%]{top:var(--ngd-minimap-margin);right:var(--ngd-minimap-margin)}.top-left[_nghost-%COMP%]{top:var(--ngd-minimap-margin);left:var(--ngd-minimap-margin)}.minimap-svg[_ngcontent-%COMP%]{display:block;cursor:pointer;touch-action:none}.minimap-background[_ngcontent-%COMP%]{fill:transparent}.minimap-viewport[_ngcontent-%COMP%]{stroke:var(--ngd-minimap-viewport-stroke-color);stroke-width:var(--ngd-minimap-viewport-stroke-width);fill:transparent;pointer-events:none}.minimap-footer[_ngcontent-%COMP%]{display:flex;justify-content:center;align-items:center}',
      ],
      changeDetection: 0,
    });
  };
var Tf = class n extends St {
    copy() {
      return this.flowCore.commandHandler.emit('copy');
    }
    cut() {
      return this.flowCore.commandHandler.emit('cut');
    }
    paste(e, t) {
      return Bt(this.flowCore, 'paste', { position: e }, t);
    }
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  _f = class n extends St {
    addToGroup(e, t) {
      return this.flowCore.commandHandler.emit('addToGroup', {
        groupId: e,
        nodeIds: t,
      });
    }
    highlightGroup(e, t) {
      return this.flowCore.commandHandler.emit('highlightGroup', {
        groupId: e,
        nodes: t,
      });
    }
    highlightGroupClear() {
      return this.flowCore.commandHandler.emit('highlightGroupClear');
    }
    removeFromGroup(e, t) {
      return this.flowCore.commandHandler.emit('removeFromGroup', {
        groupId: e,
        nodeIds: t,
      });
    }
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  Nf = class n extends St {
    moveNodesBy(e, t) {
      return this.flowCore.commandHandler.emit('moveNodesBy', {
        nodes: e,
        delta: t,
      });
    }
    resizeNode(e, t, i, o, r) {
      return Bt(
        this.flowCore,
        'resizeNode',
        { id: e, size: t, position: i, disableAutoSize: o },
        r,
      );
    }
    rotateNodeTo(e, t) {
      return this.flowCore.commandHandler.emit('rotateNodeTo', {
        nodeId: e,
        angle: t,
      });
    }
    bringToFront(e, t) {
      return this.flowCore.commandHandler.emit('bringToFront', {
        nodeIds: e,
        edgeIds: t,
      });
    }
    sendToBack(e, t) {
      return this.flowCore.commandHandler.emit('sendToBack', {
        nodeIds: e,
        edgeIds: t,
      });
    }
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵprov = I({ token: n, factory: n.ɵfac });
  },
  xf = class n extends St {
    modelService = m(Tt);
    selection = w(() => ({
      nodes: this.modelService.nodes().filter((e) => e.selected),
      edges: this.modelService.edges().filter((e) => e.selected),
    }));
    select(e = [], t = []) {
      return this.flowCore.commandHandler.emit('select', {
        nodeIds: e,
        edgeIds: t,
      });
    }
    deselect(e = [], t = []) {
      return this.flowCore.commandHandler.emit('deselect', {
        nodeIds: e,
        edgeIds: t,
      });
    }
    deselectAll() {
      return this.flowCore.commandHandler.emit('deselectAll');
    }
    deleteSelection() {
      return this.flowCore.commandHandler.emit('deleteSelection');
    }
    static ɵfac = (() => {
      let e;
      return function (i) {
        return (e || (e = ze(n)))(i || n);
      };
    })();
    static ɵprov = I({ token: n, factory: n.ɵfac });
  };
function tv(n) {
  let d = n,
    {
      selected: e,
      measuredPorts: t,
      measuredBounds: i,
      computedZIndex: o,
      computedHidden: r,
      _internalId: s,
    } = d;
  return bn(d, [
    'selected',
    'measuredPorts',
    'measuredBounds',
    'computedZIndex',
    'computedHidden',
    '_internalId',
  ]);
}
function nv(n) {
  let d = n,
    {
      sourcePosition: e,
      targetPosition: t,
      measuredLabels: i,
      computedZIndex: o,
      computedHidden: r,
      _internalId: s,
    } = d,
    a = bn(d, [
      'sourcePosition',
      'targetPosition',
      'measuredLabels',
      'computedZIndex',
      'computedHidden',
      '_internalId',
    ]);
  return h(
    h(h({}, a), !n.source && e ? { sourcePosition: e } : {}),
    !n.target && t ? { targetPosition: t } : {},
  );
}
var Pf = class n {
  stripNodeRuntimeProperties = tv;
  stripEdgeRuntimeProperties = nv;
  effectRef = null;
  nodes = P([]);
  edges = P([]);
  metadata = P({ viewport: { x: 0, y: 0, scale: 1 } });
  callbacks = [];
  constructor() {
    this.effectRef = fe(() => {
      let e = this.nodes(),
        t = this.edges(),
        i = this.metadata();
      ke(() => {
        for (let o of this.callbacks) o({ nodes: e, edges: t, metadata: i });
      });
    });
  }
  destroy() {
    (this.effectRef?.destroy(),
      (this.callbacks = []),
      this.nodes.set([]),
      this.edges.set([]),
      this.metadata.set({ viewport: { x: 0, y: 0, scale: 1 } }));
  }
  getNodes() {
    return this.nodes();
  }
  getEdges() {
    return this.edges();
  }
  updateNodes(e) {
    this.nodes.update((t) => (typeof e == 'function' ? e(t) : e));
  }
  updateEdges(e) {
    this.edges.update((t) => (typeof e == 'function' ? e(t) : e));
  }
  getMetadata() {
    return this.metadata();
  }
  updateMetadata(e) {
    this.metadata.update((t) => (typeof e == 'function' ? e(t) : e));
  }
  onChange(e) {
    this.callbacks.push(e);
  }
  unregisterOnChange(e) {
    this.callbacks = this.callbacks.filter((t) => t !== e);
  }
  undo() {
    console.warn(
      'Undo is not implemented in the current model. Please implement a custom ModelAdapter to support undo functionality.',
    );
  }
  redo() {
    console.warn(
      'Redo is not implemented in the current model. Please implement a custom ModelAdapter to support redo functionality.',
    );
  }
  toJSON() {
    let e = this.metadata();
    return JSON.stringify({
      nodes: this.nodes().map((t) => this.stripNodeRuntimeProperties(t)),
      edges: this.edges().map((t) => this.stripEdgeRuntimeProperties(t)),
      metadata: e,
    });
  }
  static ɵfac = function (t) {
    return new (t || n)();
  };
  static ɵprov = I({ token: n, factory: n.ɵfac });
};
function Gf(n = {}, e, t) {
  return ke(() => {
    let i = () => {
      let o = new Pf();
      return (
        t?.stripNodeRuntimeProperties &&
          (o.stripNodeRuntimeProperties = t.stripNodeRuntimeProperties),
        t?.stripEdgeRuntimeProperties &&
          (o.stripEdgeRuntimeProperties = t.stripEdgeRuntimeProperties),
        d_(o, n, void 0, t)
      );
    };
    return e ? tn(e, i) : i();
  });
}
function d_(n, e, t, i) {
  let o = () => {
    let r = m(fo),
      s = () => r.generateId(),
      a = i?.stripNodeRuntimeProperties ?? tv,
      d = i?.stripEdgeRuntimeProperties ?? nv;
    return (
      e &&
        (n.updateNodes(e.nodes || []),
        n.updateEdges(e.edges || []),
        n.updateMetadata((c) => h(h({}, c), e.metadata))),
      n.updateNodes(n.getNodes().map((c) => Ds(a(c), s))),
      n.updateEdges(n.getEdges().map((c) => Ds(d(c), s))),
      n
    );
  };
  return t ? tn(t, o) : o();
}
function iv() {
  return [
    Ss,
    z,
    Ms,
    go,
    st,
    ue,
    bs,
    $e,
    ri,
    zt,
    ho,
    Tt,
    xf,
    Tf,
    Nf,
    _f,
    ai,
    ks,
    Ls,
    mo,
    Bs,
    si,
    Do,
  ];
}
var ea = class n {
    constructor() {
      this.node = E.required();
    }
    static {
      this.ɵfac = function (t) {
        return new (t || n)();
      };
    }
    static {
      this.ɵcmp = k({
        type: n,
        selectors: [['cb-concept-node']],
        inputs: { node: [1, 'node'] },
        decls: 2,
        vars: 2,
        consts: [[1, 'concept', 3, 'title']],
        template: function (t, i) {
          (t & 1 && (ge(0, 'div', 0), pt(1), he()),
            t & 2 &&
              (Lt('title', i.node().data.path), _(), vn(i.node().data.title)));
        },
        encapsulation: 2,
        changeDetection: 0,
      });
    }
  },
  ta = class n {
    constructor() {
      this.node = E.required();
      this.model = m(Tt);
    }
    rename(e) {
      this.model.updateNodeData(
        this.node().id,
        y(h({}, this.node().data), { name: e }),
      );
    }
    static {
      this.ɵfac = function (t) {
        return new (t || n)();
      };
    }
    static {
      this.ɵcmp = k({
        type: n,
        selectors: [['cb-layer-node']],
        inputs: { node: [1, 'node'] },
        decls: 4,
        vars: 3,
        consts: [
          [1, 'layer'],
          [
            'type',
            'text',
            'placeholder',
            'Group name',
            1,
            'name',
            3,
            'input',
            'pointerdown',
            'keydown',
            'value',
          ],
          ['id', 'base', 'type', 'target', 'side', 'top'],
          ['id', 'builds-on', 'type', 'source', 'side', 'bottom'],
        ],
        template: function (t, i) {
          (t & 1 &&
            (W(0, 'div', 0)(1, 'input', 1),
            ee('input', function (r) {
              return i.rename(r.target.value);
            })('pointerdown', function (r) {
              return r.stopPropagation();
            })('keydown', function (r) {
              return r.stopPropagation();
            }),
            Y()(),
            $(2, 'ng-diagram-port', 2)(3, 'ng-diagram-port', 3)),
            t & 2 &&
              (Ne('highlighted', i.node().highlighted),
              _(),
              O('value', i.node().data.name)));
        },
        dependencies: [wo],
        encapsulation: 2,
        changeDetection: 0,
      });
    }
  };
function c_(n, e) {
  if ((n & 1 && $(0, 'ng-diagram', 0), n & 2)) {
    let t = e.$implicit,
      i = R();
    O('model', t)('config', i.config)('nodeTemplateMap', i.templates);
  }
}
var Mn = { width: 300, height: 130 },
  l_ = 24,
  na = class n {
    constructor() {
      this.injector = m(We);
      this.service = m(Tt);
      this.seq = 0;
      this.model = Gf({}, this.injector);
      this.models = P([this.model]);
      this.templates = new di([
        ['concept', ea],
        ['layer', ta],
      ]);
      this.config = {
        computeNodeId: () => `n${++this.seq}`,
        computeEdgeId: () => `e${++this.seq}`,
        grouping: {
          canGroup: (e, t) => e.type === 'concept' && t.type === 'layer',
        },
        linking: {
          validateConnection: (e, t, i) =>
            !!e &&
            !!i &&
            e.id !== i.id &&
            e.type === 'layer' &&
            i.type === 'layer',
          finalEdgeDataBuilder: (e) =>
            y(h({}, e), { targetArrowhead: 'ng-diagram-arrow' }),
        },
        zoom: { min: 0.4, max: 2 },
      };
    }
    load(e) {
      let t = [],
        i = [],
        o = new Map(),
        r = e.prefill?.groups ?? [];
      r.forEach((d, c) => {
        let l = `n${++this.seq}`;
        (o.set(d.name, l),
          t.push({
            id: l,
            type: 'layer',
            isGroup: !0,
            highlighted: !1,
            position: {
              x: 260 + Math.floor(c / 3) * (Mn.width + 40),
              y: 320 - (c % 3) * (Mn.height + 50),
            },
            size: Mn,
            autoSize: !1,
            resizable: !0,
            data: { name: d.name },
          }));
      });
      let s = new Map(
          r.flatMap((d) => d.concepts.map((c) => [c.path, d.name])),
        ),
        a = new Map();
      e.concepts.forEach((d, c) => {
        let l = s.get(d.path),
          u = l ? o.get(l) : void 0,
          f = u ? t.find((v) => v.id === u) : null,
          g = u ? (a.get(u) ?? 0) : 0;
        u && a.set(u, g + 1);
        let p = f
          ? {
              x: f.position.x + 16 + (g % 2) * 140,
              y: f.position.y + 56 + Math.floor(g / 2) * 36,
            }
          : { x: l_, y: 40 + c * 44 };
        t.push(
          y(
            h(
              { id: `n${++this.seq}`, type: 'concept', position: p },
              u ? { groupId: u } : {},
            ),
            { data: { path: d.path, title: d.title } },
          ),
        );
      });
      for (let d of e.prefill?.buildsOn ?? []) {
        let [c, l] = [o.get(d.from), o.get(d.to)];
        c &&
          l &&
          i.push({
            id: `e${++this.seq}`,
            source: c,
            target: l,
            sourcePort: 'builds-on',
            targetPort: 'base',
            targetArrowhead: 'ng-diagram-arrow',
            data: {},
          });
      }
      ((this.model = Gf({ nodes: t, edges: i }, this.injector)),
        this.models.set([this.model]));
    }
    addGroup() {
      let e = this.model.getNodes().filter((r) => r.type === 'layer'),
        t = e.length
          ? e.reduce((r, s) => (s.position.y < r.position.y ? s : r))
          : null,
        i = { x: 260, y: 320 };
      t &&
        (i =
          t.position.y - Mn.height - 50 >= 20
            ? { x: t.position.x, y: t.position.y - Mn.height - 50 }
            : {
                x: Math.max(...e.map((r) => r.position.x)) + Mn.width + 40,
                y: 320,
              });
      let o = {
        id: `n${++this.seq}`,
        type: 'layer',
        isGroup: !0,
        highlighted: !1,
        position: i,
        size: Mn,
        autoSize: !1,
        resizable: !0,
        data: { name: '' },
      };
      this.service.addNodes([o]);
    }
    drawing() {
      let e = this.model.getNodes(),
        t = e.filter((o) => o.type === 'layer'),
        i = (o) => (e.find((r) => r.id === o)?.data?.name ?? '').trim();
      return {
        groups: t.map((o) => ({
          name: o.data.name.trim(),
          concepts: e
            .filter(
              (r) =>
                r.type === 'concept' && 'groupId' in r && r.groupId === o.id,
            )
            .map((r) => r.data.path),
        })),
        builds_on: this.model
          .getEdges()
          .filter(
            (o) =>
              t.some((r) => r.id === o.source) &&
              t.some((r) => r.id === o.target),
          )
          .map((o) => ({ from: i(o.source), to: i(o.target) })),
      };
    }
    static {
      this.ɵfac = function (t) {
        return new (t || n)();
      };
    }
    static {
      this.ɵcmp = k({
        type: n,
        selectors: [['climb-board']],
        features: [wn([iv()])],
        decls: 2,
        vars: 0,
        consts: [[3, 'model', 'config', 'nodeTemplateMap']],
        template: function (t, i) {
          (t & 1 && ot(0, c_, 1, 3, 'ng-diagram', 0, Yi),
            t & 2 && rt(i.models()));
        },
        dependencies: [Eo],
        encapsulation: 2,
        changeDetection: 0,
      });
    }
  };
nl(na, { providers: [jc()] })
  .then((n) => {
    let e = n.components[0].instance;
    ((window.climbBoard = {
      load: (t) => {
        (e.load(t), n.tick());
      },
      addGroup: () => {
        (e.addGroup(), n.tick());
      },
      drawing: () => e.drawing(),
    }),
      window.dispatchEvent(new CustomEvent('climb-board:ready')));
  })
  .catch((n) => console.error('climb board', n));
