class Selection {
    constructor() {
        this.v_items = [];
        this.k_items = [];
        this.k_idx = new Map();
        this.v_idx = new Map();
    }
    move(start, end) {
        let k_items = this.k_items;
        if (!k_items.isRangeL(start) || !k_items.isRangeL(end)) return;
        let k = this.k_items.splice(start, 1);
        this.k_items.splice(end, 0, ...k);
        let v = this.v_items.splice(start, 1);
        this.v_items.splice(end, 0, ...v);
        this._updateIdx(start, end);
        return this;
    }
    // *uint,T : me
    insert(...arg) {
        let me = this;
        let idx = arg.length > 1 ? arg[0] : this.k_items.length;
        arg.forEach((a, c) => {
            if (c === 0) return;
            if (typeof me.v_idx.get(a) === "undefined")
                me.add(Symbol(), a, idx++);
        })
        return this;
    }
    append(...vs) {
        return this.insert(this.k_items.length, ...vs);
    }
    len() {
        return this.k_items.length;
    }
    // (K,T,*uint)/Selection : me
    add(k, v, ...idx) {
        if (k instanceof Selection) {
            let me = this;
            k.forEach((k, v, idx) => {
                me.add(k, v);
            });
        } else {
            if (this.exist(v)) return this;
            let len = this.len();
            let _idx = this.k_items.isRangeL(idx[0]) ? idx[0] : len;
            this.k_items.splice(_idx, 0, k);
            this.v_items.splice(_idx, 0, v);
            this.k_idx.set(k, _idx);
            this.v_idx.set(v, _idx);
            this._updateIdx(_idx);
        }
        return this;
    }
    // K/Selection : me
    rm(k) {
        let idx = this.k_idx.get(k);
        let v = this.v_items[idx];
        return this._rm(k, v, idx);
    }
    rmByValue(...vs) {
        let me = this;
        vs.forEach(v => {
            let idx = this.v_idx.get(v);
            let k = this.k_items[idx];
            me._rm(k, v, idx);
        })
        return this;
    }
    rmByIndex(idx) {
        let k = this.k_items[idx];
        let v = this.v_items[idx];
        return this._rm(k, v, idx);
    }
    _rm(k, v, idx) {
        if (k instanceof Selection) {
            k.forEach((k, v, idx) => {
                me._rm(k, v, idx);
            });
        } else {
            if (!this.k_items.isRangeL(idx)) return this;
            if (!this.exist(v)) return this;
            this.k_items.splice(idx, 1);
            this.v_items.splice(idx, 1);
            this.k_idx.delete(k);
            this.v_idx.delete(v);
            this._updateIdx(idx);
        }
        return this;
    }
    // K : T
    get(k) {
        let idx = this.k_idx[k];
        return this.k_items[idx];
    }
    getByIndex(idx) {
        return this.v_items[idx];
    }
    getKeyByIndex(idx) {
        return this.k_items[idx];
    }
    // : bool
    exist(v) {
        return typeof this.v_idx.get(v) === "number";
    }
    existByKey(k) {
        return typeof this.k_idx.get(k) === "number";
    }
    // fn(K,T,uint) : me
    forEach(fn) {
        for (let i = 0; i < this.k_items.length; i++) {
            let k = this.k_items[i],
                v = this.v_items[i];
            fn(k, v, i);
        }
        return this;
    }
    // : []T
    getAll() {
        return this.v_items;
    }
    // : []K
    getAllKey() {
        return this.k_items;
    }
    _updateIdx(start, end) {
        end = typeof end === "number" ? end : this.len() - 1;
        let max, min;
        start > end ?
            (max = start, min = end) :
            (max = end, min = start);
        for (let i = min; i <= max; i++) {
            this.k_idx.set(this.k_items[i], i);
            this.v_idx.set(this.v_items[i], i);
        }
        return this;
    }
    clear() {
        this.k_items = [];
        this.v_items = [];
        this.k_idx = new Map();
        this.v_idx = new Map();
        return this;
    }
    set(selection) {
        let me = this;
        for (let i = 0; i < selection.k_items.length; i++) {
            me.k_items[i] = selection.k_items[i];
        }
        for (let i = 0; i < selection.v_items.length; i++) {
            me.v_items[i] = selection.v_items[i];
        }
        selection.k_idx.forEach((k, idx) => {
            me.k_idx.set(idx, k);
        });
        selection.v_idx.forEach((v, idx) => {
            me.v_idx.set(idx, v);
        });
        return this;
    }
}
Selection.eventTypeList = {
    addAfter: true,
    rmAfter: true,
    moveAfter: true,
    addBefore: true,
    rmBefore: true,
    moveBefore: true,
    clearBefore: true,
};
class MEvent {
    constructor(...eTypes) {
        this.fns = new Map();
        this.eTypes = new Map();
        this.isPrevent = new Map();
        this.expand(...eTypes);
    }
    _okType(et) {
        return this.eTypes.get(et);
    }
    execute(et, ...arg) {
        let me = this;
        this.fns.get(et).forEach((_, fn) => {
            let prevent = fn(...arg);
            if (prevent) {
                me.isPrevent.set(et, true);
            }
        });
        return this;
    }
    expand(...eTypes) {
        eTypes.forEach(t => {
            this.eTypes.set(t, true);
            this.isPrevent.set(t, false);
            this.fns.set(t, new Selection());
        })
        return this;
    }
    add(et, fn) {
        if (!this._okType(et)) return;
        this.fns.get(et).append(fn);
        return this;
    }
    rm(et, fn) {
        if (!this._okType) return;
        this.fns.get(et).rmByValue(fn);
        return this;
    }
    // : bool
    getIsPrevent(et) {
        if (!this._okType(et)) return false;
        return this.isPrevent.get(et);
    }
}

class SelectionEv extends Selection {
    constructor() {
        super();
        this.et = new MEvent(
            "add-after", "rm-after", "move-after",
            "add-before", "rm-before", "move-before", "clear-before"
        );
    }
    on(et, fn) {
        this.et.add(et, fn);
        return this;
    }
    add(k, v, ...idx) {
        if (!(k instanceof Selection)) {
            if (this.et.execute("add-before", k, v, ...idx).getIsPrevent("add-before")) return;
        }
        let ret = Selection.prototype.add.apply(this, arguments);
        if (!(k instanceof Selection)) {
            this.et.execute("add-after", k, v, ...idx);
        }
        return ret;
    }
    _rm(k, v, idx) {
        if (!(k instanceof Selection)) {
            if (this.et.execute("rm-before", k, v, idx).getIsPrevent("rm-before")) return;
        }
        let ret = Selection.prototype._rm.apply(this, arguments);
        if (!(k instanceof Selection)) {
            this.et.execute("rm-after", k, v, idx);
        }
        return ret;
    }
    move(idx, dIdx) {
        if (this.et.execute("move-before", idx, dIdx).getIsPrevent("move-before")) return;
        let ret = Selection.prototype.move.apply(this, arguments);
        this.et.execute("move-after", idx, dIdx);
        return ret;
    }
    clear() {
        if (this.et.execute("clear-before").getIsPrevent("clear-before")) return;
        let ret = Selection.prototype.clear.apply(this, arguments);
        return ret;
    }
}

let sct1 = new Selection();
sct1.append(1, 2, 3);
let sct2 = new Selection();
sct2.append(4, 5, 6);
sct1.add(sct2);
console.log(sct1);