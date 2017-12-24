(function() {

    var root = (typeof self == 'object' && self.self == self && self) ||
        (typeof global == 'object' && global.global == global && global) ||
        this || {};

    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || // Webkit中此取消方法的名字变了
            window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    //兼容方法，让刷新频率尽量保持在60帧的样子
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16.7 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }

    var util = {
        //这里之所以使用浅克隆的方法，是因为旧设定总会被新设定所覆盖
        extend: function (target) {
            for (var i = 1, len = arguments.length; i < len; i++) {
                for (var prop in arguments[i]) {
                    if (arguments[i].hasOwnProperty(prop)) {
                        //强行替换掉原对象同名属性
                        target[prop] = arguments[i][prop];
                    }
                }
            }
            return target;
        },//浏览器内实际可见高度
        getViewPortSizeHeight: function () {
            var w = window;
            if (w.innerWidth != null) return w.innerHeight;
            var d = w.document;
            if (document.compatMode == 'CSS1Compat') {
                return d.documentElement.clientHeight;
            }
            return d.body.clientHeight;
        },//滚轮卷起的高度
        getScrollOffsetsTop: function () {
            var w = window;
            if (w.pageXOffset != null) return w.pageYOffset;
            var d = w.document;
            if (document.compatMode == 'CSS1Compat') {
                return d.documentElement.scrollTop;
            }
            return d.body.scrollTop;
        },
        addEvent: function (elem, type, fn) {
            if (document.addEventListener) {
                elem.addEventListener(type, fn, false);
                return fn;
            } else if (document.attachEvent) {
                //这么写的原因是因为attachEvent方法不绑定this指向？而且无法返回函数执行的结果？
                var bound = function () {
                    return fn.apply(elem, arguments);
                };
                elem.attachEvent('on' + type, bound);
                return bound;
            }
        },//判断最里层的listener属性是否是函数,如果不是，证明这个事件并没有绑定对应的方法
        isValidListener: function (listener) {
            if (typeof listener == 'function') {
                return true;
            } else if (listener && typeof listener == 'object') {
                return util.isValidListener(listener.listener);
            } else {
                return false;
            }
        },
        indexOf: function (arr, item) {
            if (arr.indexOf) {
                return arr.indexOf(item);
            } else {
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
    };

    function EventEmitter() {
        this._event = {};
    }

    var proto = EventEmitter.prototype;

    proto.on=function(eventName,listener) {
        if (!eventName||!listener) {
            return;
        }  
        if (!util.isValidListener(listener)) {
            throw new TypeError("listener must be a function");
        }

        var event=this._event;
        var listeners=event[eventName]=event[eventName]||[];
        var listenerIsWrapped=typeof listener=='object';

        if (util.indexOf(listeners,listener)==-1) {
            listeners.push(listenerIsWrapped?listener:{
                listener:listener,
                once:false
            });
        }
        return this;
    };

    proto.once=function (eventName,listener) {
        return this.on(eventName,{
            listener:listener,
            once:true
        });
    };

    proto.off=function(eventName,listener) {
        var listeners=this._event[eventName];
        if(!listeners)return;
        
        var index;
        for(var i=0,len=listeners.length;i<len;i++){
            if (listeners[i]&&listeners[i].listener===listener) {
                index=i;
                break;
            }
        }
        if (typeof index!='undefined') {
            listeners.splice(index,1,null);
        }
        
        return this;
    };

    proto.emit=function(eventName,args) {
        var listeners=this._event[eventName];
        if(!listeners)return;
        
        for(var i=0,len=listeners.length;i<len;i++){
            var listener=listeners[i];
            if (listener) {
                listener.listener.apply(this,args||[]);
                if (listener.once) {
                    this.off(eventName,listener.listener);
                }
            }
        }
        return this;
    };

    function ProgressIndicator(options) {
        //构造函数上所绑定的方法，也就是静态方法
        this.options=util.extend({},this.constructor.defaultOptions,options);
        this.init();
    }

    ProgressIndicator.VERSION='1.0.0';
    ProgressIndicator.defaultOptions={
        color:'#0A74DA'
    };

    //先继承EventEmitter
    //新建一个原型对象等于原先继承过的对象，因为对象是引用类型，所以在Mproto上添加方法，等同于在ProgressIndicator.prototype上添加
    //等价于ProgressIndicator.prototype=new EventEmitter();
    //var Mproto=ProgressIndicator.prototype;
    var Mproto=ProgressIndicator.prototype=new EventEmitter();
    Mproto.constructor=ProgressIndicator;
    //初始化
    Mproto.init=function() {
        this.createIndicator();
        var width=this.calculateWidthPercent();
        this.setWidth(width);
        this.bindScrollEvent();
    };

    Mproto.createIndicator=function() {
        var div=document.createElement('div');  
        div.id="progress-indicator";
        div.className="progress-indicator";

        div.style.position='fixed';
        div.style.top=0;
        div.style.left=0;
        div.style.height='3px';
        //动态改变元素颜色
        div.style.backgroundColor=this.options.color;
        this.elem=div;
        document.body.appendChild(div);
    };

    Mproto.calculateWidthPercent=function() {
        //文档高度
        //如果有滚动条，算上没有显示出来的内容，也就是实际上占据的内容
        this.docHeight=Math.max(document.documentElement.scrollHeight,document.documentElement.clientHeight);

        this.viewPortHeight=util.getViewPortSizeHeight();
        //这里指的是实际上你能滚动的内容高度，因为滑倒高度最后的innerHeight之后滑动条就到底了
        this.sHeight=Math.max(this.docHeight-this.viewPortHeight);
        var scrollTop=util.getScrollOffsetsTop();
        return this.sHeight?scrollTop/this.sHeight:0;
    };

    Mproto.setWidth=function(perc) {
        this.elem.style.width=perc*100+'%';
    };

    Mproto.bindScrollEvent=function() {
        var self=this; 

        util.addEvent(window,"scroll",function() {
            window.requestAnimationFrame(function() {
                var perc = Math.min(util.getScrollOffsetsTop() / self.sHeight, 1);
                if (perc==1) {
                    //执行自定义事件
                    self.emit('end');
                }
                self.setWidth(perc);
            });
        });
    };

    if (typeof exports != 'undefined' && !exports.nodeType) {
        if (typeof module != 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = ProgressIndicator;
        }
        exports.ProgressIndicator = ProgressIndicator;
    } else {
        root.ProgressIndicator = ProgressIndicator;
    }
})();