(function() {
    var root=(typeof self==='object'&&self.self===self&&self)||(typeof global==='object'&&global.global===global&&global)||this||{};

    var lastTime=0;
    var venders=['webkit','moz'];
    for(var x=0;x<venders.length&&!window.requestAnimationFrame;++x){
        window.requestAnimationFrame=window[venders[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[venders[x] + 'CancelAnimationFrame'] || window[venders[x] +'CancelRequestAnimationFrame'];
    }

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

    Function.prototype.bind=Function.prototype.bind||function(context) {
        if (typeof this!=='function') {
            throw new Error('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var self=this;
        var args=[].slicec.call(arguments);
        var fNop=function(){};
        var fBound=function() {
            var bindArgs=[].slice.call(arguments);
            return self.apply(this instanceof fBound?this:context,bindArgs.concat(args));
        };
        fNop.prototype=self.prototype;
        fBound.prototype=new fNop();
        return fBound;
    };

    var util={
      extend:function(target) {
          for(var i=1,len=arguments.length;i<len;i++){
              for(var prop in arguments[i]){
                  if (arguments[i].hasOwnProperty(prop)) {
                      target[prop]=arguments[i][prop];
                  }
              }
          }
          return target;
      },
      getStyle:function(elem,prop) {
          return elem.currentStyle ? elem.currentStyle[prop] : document.defaultView.getComputedStyle(elem)[prop];
      },
      getScrollOffsets: function () {
            var w = window;
            if (w.pageXOffset != null) return { x: w.pageXOffset, y: w.pageYOffset };
            var d = w.document;
            if (document.compatMode == "CSS1Compat") {
                return {
                    x: d.documentElement.scrollLeft,
                    y: d.documentElement.scrollTop
                };
            }
            return { x: d.body.scrollLeft, y: d.body.scrollTop };
        },
      setOpacity:function(elem,opacity) {
          if (elem.style.opacity!=undefined) {
              elem.style.opacity=opacity/100;
          }else{
              elem.style.filter="alpha(opacity="+opacity+")";
          }
      },
      fadeIn:function(elem,speed) {
          var opacity=0;
          util.setOpacity(elem,0);
          var timer;

          function step() {
              util.setOpacity(elem,opacity+=speed);
              if (opacity<100) {
                  timer=requestAnimationFrame(step);
              }else{
                  cancelAnimationFrame(timer);
              }
          }
          requestAnimationFrame(step);
      },
      fadeOut:function(elem,speed) {
          var opacity=100;
          util.setOpacity(elem,100);
          var timer;

          function step() {
              util.setOpacity(elem,opacity-=speed);
              if (opacity>0) {
                  timer=requestAnimationFrame(step);
              }else{
                  cancelAnimationFrame(timer);
              }
          }
          requestAnimationFrame(step);
      },
       addEvent:function(elem,type,fn) {
           if (document.addEventListener) {
               elem.addEventListener(type,fn,false);
           }else if(document.attachEvent){
               var bound=function() {
                   return fn.apply(elem,arguments);
               };
               elem.attachEvent('on'+type,bound);
               //返回事件绑定函数执行结果
               return bound;
           }
       },
       indexOf:function(arr,item) {
           var result=-1;
           for(var i=0,len=arr.length;i<len;i++){
               if (arr[i]===item) {
                   result=i;
                   break;
               }
           }
           return result;
       },
       addClass:function(elem,className) {
           var classNames=elem.className.split(/\s+/);
           if (util.indexOf(classNames,className)==-1) {
               classNames.push(className);
           }
           elem.className=classNames.join(" ");
       },
       removeClass:function(elem,className) {
           var classNames=elem.className.split(/\s+/);
           var index=util.indexOf(classNames,className);
           if (index!=-1) {
               classNames.splice(index,1);
           }
           elem.className=classNames.join(" ");
       },
       supportTouch:function() {
           return 'ontouchstart' in window ||
               window.DocumentTouch && document instanceof window.DocumentTouch;
       },
       getTime:function() {
           return new Date().getTime();
       }
    };

    function ScrollToTop(elem,options) {
        this.elem=typeof elem==='string'?document.querySelector(elem):elem;
        this.options=util.extend({},this.constructor.defaultOptions,options);
        this.init();
    }

    ScrollToTop.VERSION='1.0.0';

    ScrollToTop.defaultOptions={
        //滚动条下滑多少时，出现按钮
        showWhen:100,
        //回到顶部的速度
        speed:100,
        //淡入淡出的速度
        fadeSpeed:10
    };

    var proto=ScrollToTop.prototype;

    proto.init=function() {
        this.hideElement();
        this.bindScrollEvent();
        this.bindToTopEvent();
    };

    proto.hideElement=function() {
        util.setOpacity(this.elem,0);
        this.status='hide';
    };

    proto.bindScrollEvent=function() {
        var self=this;
        util.addEvent(window,"scroll",function() {
            if (util.getScrollOffsets().y>self.options.showWhen) {
                if (self.status=='hide') {
                    util.fadeIn(self.elem,self.options.fadeSpeed);
                    self.status='show';
                }
            }else{
                if (self.status=='show') {
                    util.fadeOut(self.elem,self.options.fadeSpeed);
                    self.status='hide';
                    util.removeClass(self.elem,'backing');
                }
            }
        });    
    };

    proto.handleBack=function() {
        var timer,self=this;
        util.addClass(self.elem,'backing');
        cancelAnimationFrame(timer);
        timer=requestAnimationFrame(function fn() {
            var oTop=document.body.scrollTop||document.documentElement.scrollTop;
            if (oTop>0) {
                document.body.scrollTop=document.documentElement.scrollTop=oTop-self.options.speed;
                timer=requestAnimationFrame(fn);
            }else{
                cancelAnimationFrame(timer);
            }
        });  
    };

    proto.bindToTopEvent=function() {
        var self=this;
        util.addEvent(self.elem,'click',self.handleBack.bind(self));
    };
    
    if (typeof exports != 'undefined' && !exports.nodeType) {
        if (typeof module != 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = ScrollToTop;
        }
        exports.ScrollToTop = ScrollToTop;
    } else {
        root.ScrollToTop = ScrollToTop;
    }
})();