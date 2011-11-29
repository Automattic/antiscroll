
(function ($) {

  /**
   * Augment jQuery prototype.
   */

  if ($) {
    $.fn.antiscroll = function (options) {
      return this.each(function () {
        if ($(this).data('antiscroll')) {
          $(this).data('antiscroll').destroy();
        }

        $(this).data('antiscroll', new $.Antiscroll(this, options));
      });
    };
  }

  /**
   * Expose constructor.
   */

  window.Antiscroll = Antiscroll;

  /**
   * Antiscroll pane constructor.
   *
   * @param {Element|jQuery} main pane
   * @parma {Object} options
   * @api public
   */

  function Antiscroll (el, opts) {
    this.el = el;
    this.options = opts || {};
    this.padding = undefined == this.options.padding ? 2 : this.options.padding;
    this.inner = this.el.getElementsByClassName('antiscroll-inner')[0];

    var width = parseInt(this.inner.style.width, 10)
      , height = parseInt(this.inner.style.height, 10);

    this.inner.style.width = (width + scrollbarSize()) + 'px';
    this.inner.style.height = (height + scrollbarSize()) + 'px';

    if (this.inner.scrollWidth > getWidth(this.el)) {
      this.horizontal = new Scrollbar.Horizontal(this);
    }

    if (this.inner.scrollHeight > getHeight(this.el)) {
      this.vertical = new Scrollbar.Vertical(this);
    }
  }

  /**
   * Cleans up.
   *
   * @return {Antiscroll} for chaining
   * @api public
   */

  Antiscroll.prototype.destroy = function () {
    if (this.horizontal) {
      this.horizontal.destroy();
    }
    if (this.vertical) {
      this.vertical.destroy();
    }
    return this;
  };

  /**
   * Scrolbar constructor.
   *
   * @param {Element|jQuery} element
   * @api public
   */

  function Scrollbar (pane) {
    this.pane = pane;
    this.pane.el.appendChild(this.el);
    this.innerEl = this.pane.inner;

    this.dragging = false;
    this.enter = false;
    this.shown = false;

    // hovering
    // TODO: Emulate mouseenter/mouseleave events.
    addEvent(this.pane.el, 'mouseover', proxy(this, 'mouseenter'));
    addEvent(this.pane.el, 'mouseout', proxy(this, 'mouseleave'));

    // dragging
    addEvent(this.el, 'mousedown', proxy(this, 'mousedown'));

    // scrolling
    addEvent(this.pane.inner, 'scroll', proxy(this, 'scroll'));

    // wheel -optional-
    // TODO: Remove?
    //this.pane.inner.bind('mousewheel', proxy(this, 'mousewheel'));

    // show
    var initialDisplay = this.pane.options.initialDisplay;

    if (initialDisplay !== false) {
      this.show();
      this.hiding = setTimeout(proxy(this, 'hide'), parseInt(initialDisplay, 10) || 3000);
    }
  };

  /**
   * Cleans up.
   *
   * @return {Scrollbar} for chaining
   * @api public
   */

  Scrollbar.prototype.destroy = function () {
    this.el.remove();
    return this;
  };

  /**
   * Called upon mouseenter.
   *
   * @api private
   */

  Scrollbar.prototype.mouseenter = function () {
    this.enter = true;
    this.show();
  };

  /**
   * Called upon mouseleave.
   *
   * @api private
   */

  Scrollbar.prototype.mouseleave = function () {
    this.enter = false;

    if (!this.dragging) {
      this.hide();
    }
  }

  /**
   * Called upon wrap scroll.
   *
   * @api private
   */

  Scrollbar.prototype.scroll = function () {
    if (!this.shown) {
      this.show();
      if (!this.enter && !this.dragging) {
        this.hiding = setTimeout(proxy(this, 'hide'), 1500);
      }
    }

    this.update();
  };

  /**
   * Called upon scrollbar mousedown.
   *
   * @api private
   */

  Scrollbar.prototype.mousedown = function (ev) {
    ev.preventDefault();

    this.dragging = true;

    this.startPageY = ev.pageY - parseInt(this.el.style.top, 10);
    this.startPageX = ev.pageX - parseInt(this.el.style.left, 10);

    // prevent crazy selections on IE
    document.onselectstart = function () { return false; };

    var pane = this.pane
      , move = proxy(this, 'mousemove')
      , self = this

    addEvent(document, 'mousemove', move);
    addEvent(document, 'mouseup', function() {
      self.dragging = false;

      document.onselectstart = null;

      removeEvent(document, 'mousemove', move);

      if (!self.enter) {
        self.hide();
      }
    });
  };

  /**
   * Show scrollbar.
   *
   * @api private
   */

  Scrollbar.prototype.show = function (duration) {
    if (!this.shown) {
      this.update();
      this.el.className += ' antiscroll-scrollbar-shown';
      if (this.hiding) {
        clearTimeout(this.hiding);
        this.hiding = null;
      }
      this.shown = true;
    }
  };

  /**
   * Hide scrollbar.
   *
   * @api private
   */

  Scrollbar.prototype.hide = function () {
    if (this.shown) {
      // check for dragging
      this.el.className = this.el.className.replace(/\bantiscroll-scrollbar-shown\b/, '');
      this.shown = false;
    }
  };

  /**
   * Horizontal scrollbar constructor
   *
   * @api private
   */

  Scrollbar.Horizontal = function (pane) {
    this.el = document.createElement('div');
    this.el.setAttribute('class', 'antiscroll-scrollbar antiscroll-scrollbar-horizontal');
    Scrollbar.call(this, pane);
  }

  /**
   * Inherits from Scrollbar.
   */

  inherits(Scrollbar.Horizontal, Scrollbar);

  /**
   * Updates size/position of scrollbar.
   *
   * @api private
   */

  Scrollbar.Horizontal.prototype.update = function () {
    var paneWidth = getWidth(this.pane.el)
      , trackWidth = paneWidth - this.pane.padding * 2
      , innerEl = this.pane.inner;

    this.el.style.width = (trackWidth * paneWidth / innerEl.scrollWidth) + 'px';
    this.el.style.left = (trackWidth * innerEl.scrollLeft / innerEl.scrollWidth) + 'px';
  }

  /**
   * Called upon drag.
   *
   * @api private
   */

  Scrollbar.Horizontal.prototype.mousemove = function (ev) {
    var trackWidth = getWidth(this.pane.el) - this.pane.padding * 2
      , pos = ev.pageX - this.startPageX
      , barWidth = getWidth(this.el)
      , innerEl = this.pane.inner

    // minimum top is 0, maximum is the track height
    var y = Math.min(Math.max(pos, 0), trackWidth - barWidth)

    innerEl.scrollLeft = (innerEl.scrollWidth - getWidth(this.pane.el))
      * y / (trackWidth - barWidth)
  };

  /**
   * Called upon container mousewheel.
   *
   * @api private
   */

  Scrollbar.Horizontal.prototype.mousewheel = function (ev, delta, x, y) {
    if ((x < 0 && 0 == this.pane.inner.scrollLeft) ||
        (x > 0 && (this.innerEl.scrollLeft + getWidth(this.pane.el)
          == this.innerEl.scrollWidth))) {
      ev.preventDefault();
      return false;
    }
  };

  /**
   * Vertical scrollbar constructor
   *
   * @api private
   */

  Scrollbar.Vertical = function (pane) {
    this.el = document.createElement('div');
    this.el.setAttribute('class', 'antiscroll-scrollbar antiscroll-scrollbar-vertical');
    Scrollbar.call(this, pane);
  };

  /**
   * Inherits from Scrollbar.
   */

  inherits(Scrollbar.Vertical, Scrollbar);

  /**
   * Updates size/position of scrollbar.
   *
   * @api private
   */

  Scrollbar.Vertical.prototype.update = function () {
    var paneHeight = getHeight(this.pane.el)
      , trackHeight = paneHeight - this.pane.padding * 2
      , innerEl = this.innerEl

    this.el.style.height = (trackHeight * paneHeight / innerEl.scrollHeight) + 'px';
    this.el.style.top = (trackHeight * innerEl.scrollTop / innerEl.scrollHeight) + 'px';
  };

  /**
   * Called upon drag.
   *
   * @api private
   */

  Scrollbar.Vertical.prototype.mousemove = function (ev) {
    var paneHeight = getHeight(this.pane.el)
      , trackHeight = paneHeight - this.pane.padding * 2
      , pos = ev.pageY - this.startPageY
      , barHeight = getHeight(this.el)
      , innerEl = this.innerEl

    // minimum top is 0, maximum is the track height
    var y = Math.min(Math.max(pos, 0), trackHeight - barHeight)

    innerEl.scrollTop = (innerEl.scrollHeight - paneHeight)
      * y / (trackHeight - barHeight)
  };

  /**
   * Called upon container mousewheel.
   *
   * @api private
   */

  Scrollbar.Vertical.prototype.mousewheel = function (ev, delta, x, y) {
    if ((y > 0 && 0 == this.innerEl.scrollTop) ||
        (y < 0 && (this.innerEl.scrollTop + getHeight(this.pane.el)
          == this.innerEl.scrollHeight))) {
      ev.preventDefault();
      return false;
    }
  };

  /**
   * Cross-browser inheritance.
   *
   * @param {Function} constructor
   * @param {Function} constructor we inherit from
   * @api private
   */

  function inherits (ctorA, ctorB) {
    function f() {};
    f.prototype = ctorB.prototype;
    ctorA.prototype = new f;
  };

  /**
   * Scrollbar size detection.
   */

  var size;

  function scrollbarSize () {
    if (!size) {
      var body = document.getElementsByTagName('body')[0]
        , div = body.appendChild(document.createElement('div'));

      div.innerHTML = '<div style="width:50px;height:50px;overflow:hidden;'
                      + 'position:absolute;top:-200px;left:-200px;"><div style="height:100px;">'
                      + '</div>';

      var child = div.firstChild
         , w1 = getWidth(child);

      div.style.overflowY = 'scorll';

      var w2 = getWidth(child);

      body.removeChild(div);

      size = w1 - w2;
    }

    return size;
  };

  function addEvent (el, name, fn) {
    if (el.addEventListener) {
      el.addEventListener(name, fn, false);
    } else if (el.attachEvent) {
      el.attachEvent('on' + name, fn);
    }
  };

  function removeEvent (el, name, fn) {
    if (el.removeEventListener) {
      el.removeEventListener(name, fn, false);
    } else if (el.detachEvent) {
      el.detachEvent('on' + name, fn);
    }
  };

  function getWidth (el) {
    return el.getBoundingClientRect().width;
  };

  function getHeight (el) {
    return el.getBoundingClientRect().height;
  };

  function proxy (fn, context) {
    if (typeof context === 'string') {
      var tmp = fn[context];
      context = fn;
      fn = tmp;
    }

    var slice = Array.prototype.slice,
        args  = slice.call(arguments, 2);

    return function() {
      return fn.apply(context, args.concat(slice.call(arguments)));
    };
  };

})(jQuery);
