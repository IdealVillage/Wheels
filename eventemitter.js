(function () {
    //全局对象
    var root = (typeof self === 'object' && self.self === self && self) || (typeof global === 'object' && global.global === global && global) || this || {};

    //判断listener是否有效
    //要保证传入的事件是函数，但如果是对象的方法（嵌套的比较深的话），就用递归一层层剥开，直到找到需要的函数为止
    function isValidListener(listener) {
        if (typeof listener === 'function') {
            return true;
            //为了确保这个对象不为null
        } else if (listener && typeof listener === 'object') {
            //一层一层剥开你的心
            return isValidListener(listener.listener);
        } else {
            //剥开发现最里层还不是函数，再就拜拜了
            return false;
        }
    }

    function indexOf(arr, item) {
        //判断当前环境是否有indexOf函数，如果有就返回
        if (arr.indexOf) {
            return arr.indexOf(item);
        } else {
            //如果没有就自己实现
            //初始化result为-1，如果字符串没有匹配成功则返回-1，成功则返回在字符串中的位置
            var result = -1;
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === item) {
                    result = i;
                    break;
                }
            }
            return result;
        }
    }

    function EventEmitter() {
        this.__events = {};
    }

    EventEmitter.VERSION = '1.0.0';

    var proto = EventEmitter.prototype;

    proto.on = function (eventName, listener) {
        if (!eventName || !listener) return;

        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var events = this.__events;
        //初始化，为后续要添加的事件创建空数组，用于后续存放
        var listeners = events[eventName] = events[eventName] || [];
        //判断传入listener是否为对象 
        var listenerIsWrapper = typeof listener === 'object';

        //不重复添加事件
        if (indexOf(listeners, listener) === -1) {
            listeners.push(listenerIsWrapper ? listener : {
                //listener方法传入listener函数
                listener: listener,
                once: false
            });
        }
        //return this的目的是为了链式调用
        return this;
    };

    //像once这种情况，listener就是一个对象
    proto.once = function (eventName, listener) {
        return this.on(eventName, {
            listener: listener,
            once: true
        });
    };

    //this.__events[eventName],里面储存了一个数组，数组每一项储存的是对象
    proto.off = function (eventName, listener) {
        var listeners = this.__events[eventName];
        if (!listener) return;

        var index;
        for (var i = 0, len = listeners.length; i < len; i++) {
            //保存listener和once的对象不为空，且listener函数不为空
            if (listeners[i] && listeners[i].listener === listener) {
                index = i;
                break;
            }
        }

        if (typeof index !== 'undefined') {
            listeners.splice(index, 1, null);
        }

        return this;
    };

    proto.emit = function (eventName, args) {
        var listeners = this.__events[eventName];
        if (!listeners) return;

        for (var i = 0; i < listeners.length; i++) {
            var listener = listeners[i];
            if (listener) {
                listener.listener.apply(this, args || []);
                if (listener.once) {
                    //这里只是删除了对应事件所绑定的动作，并没有删除事件
                    this.off(eventName, listener.listener);
                }
            }
        }
        return this;
    };

    proto.allOf = function (eventName) {
        //删除某个特定事件
        if (eventName && this.__events[eventName]) {
            this.__events[eventName] = [];
        } else {
            //删除所有事件
            this.__events = {};
        }
    };

    if (typeof exports != 'undefined' && !exports.nodeType) {
        if (typeof module != 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = EventEmitter;
        }
        exports.EventEmitter = EventEmitter;
    } else {
        root.EventEmitter = EventEmitter;
    }

}());
