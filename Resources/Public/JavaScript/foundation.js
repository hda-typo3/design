'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.1';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets

    /**
     * Compares the dimensions of an element to a container and determines collision events with container.
     * @function
     * @param {jQuery} element - jQuery object to test for collisions.
     * @param {jQuery} parent - jQuery object to use as bounding container.
     * @param {Boolean} lrOnly - set to true to check left and right values only.
     * @param {Boolean} tbOnly - set to true to check top and bottom values only.
     * @default if no parent object passed, detects collisions with `window`.
     * @returns {Boolean} - true if collision free, false if a collision in any direction.
     */
  };function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';


!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is: function (size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';


!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';



var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.keyboard
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        this.$element.addClass('is-transition-' + this.options.transition);

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add an overlay over the content if necessary
        if (this.options.contentOverlay === true) {
          var overlay = document.createElement('div');
          var overlayPosition = $(this.$element).css("position") === 'fixed' ? 'is-overlay-fixed' : 'is-overlay-absolute';
          overlay.setAttribute('class', 'js-off-canvas-overlay ' + overlayPosition);
          this.$overlay = $(overlay);
          if (overlayPosition === 'is-overlay-fixed') {
            $('body').append(this.$overlay);
          } else {
            this.$element.siblings('[data-off-canvas-content]').append(this.$overlay);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed === true) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime === true) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick === true) {
          var $target = this.options.contentOverlay ? this.$overlay : $('[data-off-canvas-content]');
          $target.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          this.$element.attr('aria-hidden', 'false');
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          this.$element.attr('aria-hidden', 'true');
          this.$element.off('open.zf.trigger toggle.zf.trigger').on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Stops scrolling of the body when offcanvas is open on mobile Safari and other troublesome browsers.
       * @private
       */

    }, {
      key: '_stopScrolling',
      value: function _stopScrolling(event) {
        return false;
      }

      // Taken and adapted from http://stackoverflow.com/questions/16889447/prevent-full-page-scrolling-ios
      // Only really works for y, not sure how to extend to x or if we need to.

    }, {
      key: '_recordScrollable',
      value: function _recordScrollable(event) {
        var elem = this; // called from event handler context with this as elem

        // If the element is scrollable (content overflows), then...
        if (elem.scrollHeight !== elem.clientHeight) {
          // If we're at the top, scroll down one pixel to allow scrolling up
          if (elem.scrollTop === 0) {
            elem.scrollTop = 1;
          }
          // If we're at the bottom, scroll up one pixel to allow scrolling down
          if (elem.scrollTop === elem.scrollHeight - elem.clientHeight) {
            elem.scrollTop = elem.scrollHeight - elem.clientHeight - 1;
          }
        }
        elem.allowUp = elem.scrollTop > 0;
        elem.allowDown = elem.scrollTop < elem.scrollHeight - elem.clientHeight;
        elem.lastY = event.originalEvent.pageY;
      }
    }, {
      key: '_stopScrollPropagation',
      value: function _stopScrollPropagation(event) {
        var elem = this; // called from event handler context with this as elem
        var up = event.pageY < elem.lastY;
        var down = !up;
        elem.lastY = event.pageY;

        if (up && elem.allowUp || down && elem.allowDown) {
          event.stopPropagation();
        } else {
          event.preventDefault();
        }
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this;

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.forceTo === 'top') {
          window.scrollTo(0, 0);
        } else if (this.options.forceTo === 'bottom') {
          window.scrollTo(0, document.body.scrollHeight);
        }

        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        _this.$element.addClass('is-open');

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        // If `contentScroll` is set to false, add class and disable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').addClass('is-off-canvas-open').on('touchmove', this._stopScrolling);
          this.$element.on('touchstart', this._recordScrollable);
          this.$element.on('touchmove', this._stopScrollPropagation);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.addClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.addClass('is-closable');
        }

        if (this.options.autoFocus === true) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            var canvasFocus = _this.$element.find('[data-autofocus]');
            if (canvasFocus.length) {
              canvasFocus.eq(0).focus();
            } else {
              _this.$element.find('a, button').eq(0).focus();
            }
          });
        }

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').attr('tabindex', '-1');
          Foundation.Keyboard.trapFocus(this.$element);
        }
      }

      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        _this.$element.removeClass('is-open');

        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');

        // If `contentScroll` is set to false, remove class and re-enable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').removeClass('is-off-canvas-open').off('touchmove', this._stopScrolling);
          this.$element.off('touchstart', this._recordScrollable);
          this.$element.off('touchmove', this._stopScrollPropagation);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-closable');
        }

        this.$triggers.attr('aria-expanded', 'false');

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').removeAttr('tabindex');
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(e) {
        var _this2 = this;

        Foundation.Keyboard.handleKey(e, 'OffCanvas', {
          close: function () {
            _this2.close();
            _this2.$lastTrigger.focus();
            return true;
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$overlay.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,

    /**
     * Adds an overlay on top of `[data-off-canvas-content]`.
     * @option
     * @type {boolean}
     * @default true
     */
    contentOverlay: true,

    /**
     * Enable/disable scrolling of the main content when an off canvas panel is open.
     * @option
     * @type {boolean}
     * @default true
     */
    contentScroll: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @type {number}
     * @default 0
     */
    transitionTime: 0,

    /**
     * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
     * @option
     * @type {string}
     * @default push
     */
    transition: 'push',

    /**
     * Force the page to scroll to top or bottom on open.
     * @option
     * @type {?string}
     * @default null
     */
    forceTo: null,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @type {boolean}
     * @default false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @type {?string}
     * @default null
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @type {boolean}
     * @default true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * @type {string}
     * @default reveal-for-
     * @todo improve the regex testing for this.
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @type {boolean}
     * @default false
     */
    trapFocus: false

    // Window exports
  };Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';



var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]').filter(function () {
          var target = $(this).data('toggle');
          return target === targetID || target === "";
        });
        this.options = $.extend({}, this.options, this.$targetMenu.data());

        // If they were set, parse the animation classes
        if (this.options.animate) {
          var input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        var _this2 = this;

        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          /**
           * Fires when the element attached to the tab bar toggles.
           * @event ResponsiveToggle#toggled
           */
          if (this.options.animate) {
            if (this.$targetMenu.is(':hidden')) {
              Foundation.Motion.animateIn(this.$targetMenu, this.animationIn, function () {
                _this2.$element.trigger('toggled.zf.responsiveToggle');
                _this2.$targetMenu.find('[data-mutate]').triggerHandler('mutateme.zf.trigger');
              });
            } else {
              Foundation.Motion.animateOut(this.$targetMenu, this.animationOut, function () {
                _this2.$element.trigger('toggled.zf.responsiveToggle');
              });
            }
          } else {
            this.$targetMenu.toggle(0);
            this.$targetMenu.find('[data-mutate]').trigger('mutateme.zf.trigger');
            this.$element.trigger('toggled.zf.responsiveToggle');
          }
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @type {string}
     * @default 'medium'
     */
    hideFor: 'medium',

    /**
     * To decide if the toggle should be animated or not.
     * @option
     * @type {boolean}
     * @default false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($(this.options.appendTo));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay() {
        return $('<div></div>').addClass('reveal-overlay').appendTo(this.options.appendTo);
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }

        var _this = this;

        function addRevealOpenClasses() {
          if (_this.isMobile) {
            if (!_this.originalScrollPos) {
              _this.originalScrollPos = window.pageYOffset;
            }
            $('html, body').addClass('is-reveal-open');
          } else {
            $('body').addClass('is-reveal-open');
          }
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          var afterAnimation = function () {
            _this.$element.attr({
              'aria-hidden': false,
              'tabindex': -1
            }).focus();
            addRevealOpenClasses();
            Foundation.Keyboard.trapFocus(_this.$element);
          };

          if (this.options.overlay) {
            Foundation.Motion.animateIn(this.$overlay, 'fade-in');
          }
          Foundation.Motion.animateIn(this.$element, this.options.animationIn, function () {
            if (_this3.$element) {
              // protect against object having been removed
              _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
              afterAnimation();
            }
          });
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();
        Foundation.Keyboard.trapFocus(this.$element);

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        addRevealOpenClasses();

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        if (!this.$element) {
          return;
        } // If we're in the middle of cleanup, don't freak out
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {

            this.$element.hide(this.options.hideDelay);

            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            if ($('.reveal:visible').length === 0) {
              $('html, body').removeClass('is-reveal-open');
            }
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            if ($('.reveal:visible').length === 0) {
              $('body').removeClass('is-reveal-open');
            }
          }

          Foundation.Keyboard.releaseFocus(_this.$element);

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState('', document.title, window.location.href.replace('#' + this.id, ''));
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($(this.options.appendTo)); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @type {boolean}
     * @default false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @type {boolean}
     * @default false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @type {number}
     * @default 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @type {boolean}
     * @default true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @type {boolean}
     * @default false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,
    /**
    * Allows the modal to append to custom div.
    * @option
    * @type {string}
    * @default "body"
    */
    appendTo: "body"

  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';


// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;"use strict";

/*!
 * imagesLoaded PACKAGED v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

(function () {
  function e() {}function t(e, t) {
    for (var n = e.length; n--;) {
      if (e[n].listener === t) return n;
    }return -1;
  }function n(e) {
    return function () {
      return this[e].apply(this, arguments);
    };
  }var i = e.prototype,
      r = this,
      o = r.EventEmitter;i.getListeners = function (e) {
    var t,
        n,
        i = this._getEvents();if ("object" == typeof e) {
      t = {};for (n in i) {
        i.hasOwnProperty(n) && e.test(n) && (t[n] = i[n]);
      }
    } else t = i[e] || (i[e] = []);return t;
  }, i.flattenListeners = function (e) {
    var t,
        n = [];for (t = 0; e.length > t; t += 1) {
      n.push(e[t].listener);
    }return n;
  }, i.getListenersAsObject = function (e) {
    var t,
        n = this.getListeners(e);return n instanceof Array && (t = {}, t[e] = n), t || n;
  }, i.addListener = function (e, n) {
    var i,
        r = this.getListenersAsObject(e),
        o = "object" == typeof n;for (i in r) {
      r.hasOwnProperty(i) && -1 === t(r[i], n) && r[i].push(o ? n : { listener: n, once: !1 });
    }return this;
  }, i.on = n("addListener"), i.addOnceListener = function (e, t) {
    return this.addListener(e, { listener: t, once: !0 });
  }, i.once = n("addOnceListener"), i.defineEvent = function (e) {
    return this.getListeners(e), this;
  }, i.defineEvents = function (e) {
    for (var t = 0; e.length > t; t += 1) {
      this.defineEvent(e[t]);
    }return this;
  }, i.removeListener = function (e, n) {
    var i,
        r,
        o = this.getListenersAsObject(e);for (r in o) {
      o.hasOwnProperty(r) && (i = t(o[r], n), -1 !== i && o[r].splice(i, 1));
    }return this;
  }, i.off = n("removeListener"), i.addListeners = function (e, t) {
    return this.manipulateListeners(!1, e, t);
  }, i.removeListeners = function (e, t) {
    return this.manipulateListeners(!0, e, t);
  }, i.manipulateListeners = function (e, t, n) {
    var i,
        r,
        o = e ? this.removeListener : this.addListener,
        s = e ? this.removeListeners : this.addListeners;if ("object" != typeof t || t instanceof RegExp) for (i = n.length; i--;) {
      o.call(this, t, n[i]);
    } else for (i in t) {
      t.hasOwnProperty(i) && (r = t[i]) && ("function" == typeof r ? o.call(this, i, r) : s.call(this, i, r));
    }return this;
  }, i.removeEvent = function (e) {
    var t,
        n = typeof e,
        i = this._getEvents();if ("string" === n) delete i[e];else if ("object" === n) for (t in i) {
      i.hasOwnProperty(t) && e.test(t) && delete i[t];
    } else delete this._events;return this;
  }, i.removeAllListeners = n("removeEvent"), i.emitEvent = function (e, t) {
    var n,
        i,
        r,
        o,
        s = this.getListenersAsObject(e);for (r in s) {
      if (s.hasOwnProperty(r)) for (i = s[r].length; i--;) {
        n = s[r][i], n.once === !0 && this.removeListener(e, n.listener), o = n.listener.apply(this, t || []), o === this._getOnceReturnValue() && this.removeListener(e, n.listener);
      }
    }return this;
  }, i.trigger = n("emitEvent"), i.emit = function (e) {
    var t = Array.prototype.slice.call(arguments, 1);return this.emitEvent(e, t);
  }, i.setOnceReturnValue = function (e) {
    return this._onceReturnValue = e, this;
  }, i._getOnceReturnValue = function () {
    return this.hasOwnProperty("_onceReturnValue") ? this._onceReturnValue : !0;
  }, i._getEvents = function () {
    return this._events || (this._events = {});
  }, e.noConflict = function () {
    return r.EventEmitter = o, e;
  }, "function" == typeof define && define.amd ? define("eventEmitter/EventEmitter", [], function () {
    return e;
  }) : "object" == typeof module && module.exports ? module.exports = e : this.EventEmitter = e;
}).call(this), function (e) {
  function t(t) {
    var n = e.event;return n.target = n.target || n.srcElement || t, n;
  }var n = document.documentElement,
      i = function () {};n.addEventListener ? i = function (e, t, n) {
    e.addEventListener(t, n, !1);
  } : n.attachEvent && (i = function (e, n, i) {
    e[n + i] = i.handleEvent ? function () {
      var n = t(e);i.handleEvent.call(i, n);
    } : function () {
      var n = t(e);i.call(e, n);
    }, e.attachEvent("on" + n, e[n + i]);
  });var r = function () {};n.removeEventListener ? r = function (e, t, n) {
    e.removeEventListener(t, n, !1);
  } : n.detachEvent && (r = function (e, t, n) {
    e.detachEvent("on" + t, e[t + n]);try {
      delete e[t + n];
    } catch (i) {
      e[t + n] = void 0;
    }
  });var o = { bind: i, unbind: r };"function" == typeof define && define.amd ? define("eventie/eventie", o) : e.eventie = o;
}(this), function (e, t) {
  "function" == typeof define && define.amd ? define(["eventEmitter/EventEmitter", "eventie/eventie"], function (n, i) {
    return t(e, n, i);
  }) : "object" == typeof exports ? module.exports = t(e, require("wolfy87-eventemitter"), require("eventie")) : e.imagesLoaded = t(e, e.EventEmitter, e.eventie);
}(window, function (e, t, n) {
  function i(e, t) {
    for (var n in t) {
      e[n] = t[n];
    }return e;
  }function r(e) {
    return "[object Array]" === d.call(e);
  }function o(e) {
    var t = [];if (r(e)) t = e;else if ("number" == typeof e.length) for (var n = 0, i = e.length; i > n; n++) {
      t.push(e[n]);
    } else t.push(e);return t;
  }function s(e, t, n) {
    if (!(this instanceof s)) return new s(e, t);"string" == typeof e && (e = document.querySelectorAll(e)), this.elements = o(e), this.options = i({}, this.options), "function" == typeof t ? n = t : i(this.options, t), n && this.on("always", n), this.getImages(), a && (this.jqDeferred = new a.Deferred());var r = this;setTimeout(function () {
      r.check();
    });
  }function f(e) {
    this.img = e;
  }function c(e) {
    this.src = e, v[e] = this;
  }var a = e.jQuery,
      u = e.console,
      h = u !== void 0,
      d = Object.prototype.toString;s.prototype = new t(), s.prototype.options = {}, s.prototype.getImages = function () {
    this.images = [];for (var e = 0, t = this.elements.length; t > e; e++) {
      var n = this.elements[e];"IMG" === n.nodeName && this.addImage(n);var i = n.nodeType;if (i && (1 === i || 9 === i || 11 === i)) for (var r = n.querySelectorAll("img"), o = 0, s = r.length; s > o; o++) {
        var f = r[o];this.addImage(f);
      }
    }
  }, s.prototype.addImage = function (e) {
    var t = new f(e);this.images.push(t);
  }, s.prototype.check = function () {
    function e(e, r) {
      return t.options.debug && h && u.log("confirm", e, r), t.progress(e), n++, n === i && t.complete(), !0;
    }var t = this,
        n = 0,
        i = this.images.length;if (this.hasAnyBroken = !1, !i) return this.complete(), void 0;for (var r = 0; i > r; r++) {
      var o = this.images[r];o.on("confirm", e), o.check();
    }
  }, s.prototype.progress = function (e) {
    this.hasAnyBroken = this.hasAnyBroken || !e.isLoaded;var t = this;setTimeout(function () {
      t.emit("progress", t, e), t.jqDeferred && t.jqDeferred.notify && t.jqDeferred.notify(t, e);
    });
  }, s.prototype.complete = function () {
    var e = this.hasAnyBroken ? "fail" : "done";this.isComplete = !0;var t = this;setTimeout(function () {
      if (t.emit(e, t), t.emit("always", t), t.jqDeferred) {
        var n = t.hasAnyBroken ? "reject" : "resolve";t.jqDeferred[n](t);
      }
    });
  }, a && (a.fn.imagesLoaded = function (e, t) {
    var n = new s(this, e, t);return n.jqDeferred.promise(a(this));
  }), f.prototype = new t(), f.prototype.check = function () {
    var e = v[this.img.src] || new c(this.img.src);if (e.isConfirmed) return this.confirm(e.isLoaded, "cached was confirmed"), void 0;if (this.img.complete && void 0 !== this.img.naturalWidth) return this.confirm(0 !== this.img.naturalWidth, "naturalWidth"), void 0;var t = this;e.on("confirm", function (e, n) {
      return t.confirm(e.isLoaded, n), !0;
    }), e.check();
  }, f.prototype.confirm = function (e, t) {
    this.isLoaded = e, this.emit("confirm", this, t);
  };var v = {};return c.prototype = new t(), c.prototype.check = function () {
    if (!this.isChecked) {
      var e = new Image();n.bind(e, "load", this), n.bind(e, "error", this), e.src = this.src, this.isChecked = !0;
    }
  }, c.prototype.handleEvent = function (e) {
    var t = "on" + e.type;this[t] && this[t](e);
  }, c.prototype.onload = function (e) {
    this.confirm(!0, "onload"), this.unbindProxyEvents(e);
  }, c.prototype.onerror = function (e) {
    this.confirm(!1, "onerror"), this.unbindProxyEvents(e);
  }, c.prototype.confirm = function (e, t) {
    this.isConfirmed = !0, this.isLoaded = e, this.emit("confirm", this, t);
  }, c.prototype.unbindProxyEvents = function (e) {
    n.unbind(e.target, "load", this), n.unbind(e.target, "error", this);
  }, s;
});
;"use strict";

jQuery(document).foundation();
;'use strict';

/*!
 * Packery PACKAGED v1.4.3
 * bin-packing layout library
 *
 * Licensed GPLv3 for open source use
 * or Flickity Commercial License for commercial use
 *
 * http://packery.metafizzy.co
 * Copyright 2015 Metafizzy
 */

/**
 * Bridget makes jQuery widgets
 * v1.1.0
 * MIT license
 */

(function (window) {

  // -------------------------- utils -------------------------- //

  var slice = Array.prototype.slice;

  function noop() {}

  // -------------------------- definition -------------------------- //

  function defineBridget($) {

    // bail if no jQuery
    if (!$) {
      return;
    }

    // -------------------------- addOptionMethod -------------------------- //

    /**
     * adds option method -> $().plugin('option', {...})
     * @param {Function} PluginClass - constructor class
     */
    function addOptionMethod(PluginClass) {
      // don't overwrite original option method
      if (PluginClass.prototype.option) {
        return;
      }

      // option setter
      PluginClass.prototype.option = function (opts) {
        // bail out if not an object
        if (!$.isPlainObject(opts)) {
          return;
        }
        this.options = $.extend(true, this.options, opts);
      };
    }

    // -------------------------- plugin bridge -------------------------- //

    // helper function for logging errors
    // $.error breaks jQuery chaining
    var logError = typeof console === 'undefined' ? noop : function (message) {
      console.error(message);
    };

    /**
     * jQuery plugin bridge, access methods like $elem.plugin('method')
     * @param {String} namespace - plugin name
     * @param {Function} PluginClass - constructor class
     */
    function bridge(namespace, PluginClass) {
      // add to jQuery fn namespace
      $.fn[namespace] = function (options) {
        if (typeof options === 'string') {
          // call plugin method when first argument is a string
          // get arguments for method
          var args = slice.call(arguments, 1);

          for (var i = 0, len = this.length; i < len; i++) {
            var elem = this[i];
            var instance = $.data(elem, namespace);
            if (!instance) {
              logError("cannot call methods on " + namespace + " prior to initialization; " + "attempted to call '" + options + "'");
              continue;
            }
            if (!$.isFunction(instance[options]) || options.charAt(0) === '_') {
              logError("no such method '" + options + "' for " + namespace + " instance");
              continue;
            }

            // trigger method with arguments
            var returnValue = instance[options].apply(instance, args);

            // break look and return first value if provided
            if (returnValue !== undefined) {
              return returnValue;
            }
          }
          // return this if no return value
          return this;
        } else {
          return this.each(function () {
            var instance = $.data(this, namespace);
            if (instance) {
              // apply options & init
              instance.option(options);
              instance._init();
            } else {
              // initialize new instance
              instance = new PluginClass(this, options);
              $.data(this, namespace, instance);
            }
          });
        }
      };
    }

    // -------------------------- bridget -------------------------- //

    /**
     * converts a Prototypical class into a proper jQuery plugin
     *   the class must have a ._init method
     * @param {String} namespace - plugin name, used in $().pluginName
     * @param {Function} PluginClass - constructor class
     */
    $.bridget = function (namespace, PluginClass) {
      addOptionMethod(PluginClass);
      bridge(namespace, PluginClass);
    };

    return $.bridget;
  }

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('jquery-bridget/jquery.bridget', ['jquery'], defineBridget);
  } else if (typeof exports === 'object') {
    defineBridget(require('jquery'));
  } else {
    // get jquery from browser global
    defineBridget(window.jQuery);
  }
})(window);

/*!
 * classie v1.0.1
 * class helper functions
 * from bonzo https://github.com/ded/bonzo
 * MIT license
 * 
 * classie.has( elem, 'my-class' ) -> true/false
 * classie.add( elem, 'my-new-class' )
 * classie.remove( elem, 'my-unwanted-class' )
 * classie.toggle( elem, 'my-class' )
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false, module: false */

(function (window) {

  // class helper functions from bonzo https://github.com/ded/bonzo

  function classReg(className) {
    return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
  }

  // classList support for class management
  // altho to be fair, the api sucks because it won't accept multiple classes at once
  var hasClass, addClass, removeClass;

  if ('classList' in document.documentElement) {
    hasClass = function (elem, c) {
      return elem.classList.contains(c);
    };
    addClass = function (elem, c) {
      elem.classList.add(c);
    };
    removeClass = function (elem, c) {
      elem.classList.remove(c);
    };
  } else {
    hasClass = function (elem, c) {
      return classReg(c).test(elem.className);
    };
    addClass = function (elem, c) {
      if (!hasClass(elem, c)) {
        elem.className = elem.className + ' ' + c;
      }
    };
    removeClass = function (elem, c) {
      elem.className = elem.className.replace(classReg(c), ' ');
    };
  }

  function toggleClass(elem, c) {
    var fn = hasClass(elem, c) ? removeClass : addClass;
    fn(elem, c);
  }

  var classie = {
    // full names
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    toggleClass: toggleClass,
    // short names
    has: hasClass,
    add: addClass,
    remove: removeClass,
    toggle: toggleClass
  };

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('classie/classie', classie);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = classie;
  } else {
    // browser global
    window.classie = classie;
  }
})(window);

/*!
 * getStyleProperty v1.0.4
 * original by kangax
 * http://perfectionkills.com/feature-testing-css-properties/
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true */
/*global define: false, exports: false, module: false */

(function (window) {

  var prefixes = 'Webkit Moz ms Ms O'.split(' ');
  var docElemStyle = document.documentElement.style;

  function getStyleProperty(propName) {
    if (!propName) {
      return;
    }

    // test standard property first
    if (typeof docElemStyle[propName] === 'string') {
      return propName;
    }

    // capitalize
    propName = propName.charAt(0).toUpperCase() + propName.slice(1);

    // test vendor specific properties
    var prefixed;
    for (var i = 0, len = prefixes.length; i < len; i++) {
      prefixed = prefixes[i] + propName;
      if (typeof docElemStyle[prefixed] === 'string') {
        return prefixed;
      }
    }
  }

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('get-style-property/get-style-property', [], function () {
      return getStyleProperty;
    });
  } else if (typeof exports === 'object') {
    // CommonJS for Component
    module.exports = getStyleProperty;
  } else {
    // browser global
    window.getStyleProperty = getStyleProperty;
  }
})(window);

/*!
 * getSize v1.2.2
 * measure size of elements
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false, exports: false, require: false, module: false, console: false */

(function (window, undefined) {

  // -------------------------- helpers -------------------------- //

  // get a number from a string, not a percentage
  function getStyleSize(value) {
    var num = parseFloat(value);
    // not a percent like '100%', and a number
    var isValid = value.indexOf('%') === -1 && !isNaN(num);
    return isValid && num;
  }

  function noop() {}

  var logError = typeof console === 'undefined' ? noop : function (message) {
    console.error(message);
  };

  // -------------------------- measurements -------------------------- //

  var measurements = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'];

  function getZeroSize() {
    var size = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    };
    for (var i = 0, len = measurements.length; i < len; i++) {
      var measurement = measurements[i];
      size[measurement] = 0;
    }
    return size;
  }

  function defineGetSize(getStyleProperty) {

    // -------------------------- setup -------------------------- //

    var isSetup = false;

    var getStyle, boxSizingProp, isBoxSizeOuter;

    /**
     * setup vars and functions
     * do it on initial getSize(), rather than on script load
     * For Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=548397
     */
    function setup() {
      // setup once
      if (isSetup) {
        return;
      }
      isSetup = true;

      var getComputedStyle = window.getComputedStyle;
      getStyle = function () {
        var getStyleFn = getComputedStyle ? function (elem) {
          return getComputedStyle(elem, null);
        } : function (elem) {
          return elem.currentStyle;
        };

        return function getStyle(elem) {
          var style = getStyleFn(elem);
          if (!style) {
            logError('Style returned ' + style + '. Are you running this code in a hidden iframe on Firefox? ' + 'See http://bit.ly/getsizebug1');
          }
          return style;
        };
      }();

      // -------------------------- box sizing -------------------------- //

      boxSizingProp = getStyleProperty('boxSizing');

      /**
       * WebKit measures the outer-width on style.width on border-box elems
       * IE & Firefox measures the inner-width
       */
      if (boxSizingProp) {
        var div = document.createElement('div');
        div.style.width = '200px';
        div.style.padding = '1px 2px 3px 4px';
        div.style.borderStyle = 'solid';
        div.style.borderWidth = '1px 2px 3px 4px';
        div.style[boxSizingProp] = 'border-box';

        var body = document.body || document.documentElement;
        body.appendChild(div);
        var style = getStyle(div);

        isBoxSizeOuter = getStyleSize(style.width) === 200;
        body.removeChild(div);
      }
    }

    // -------------------------- getSize -------------------------- //

    function getSize(elem) {
      setup();

      // use querySeletor if elem is string
      if (typeof elem === 'string') {
        elem = document.querySelector(elem);
      }

      // do not proceed on non-objects
      if (!elem || typeof elem !== 'object' || !elem.nodeType) {
        return;
      }

      var style = getStyle(elem);

      // if hidden, everything is 0
      if (style.display === 'none') {
        return getZeroSize();
      }

      var size = {};
      size.width = elem.offsetWidth;
      size.height = elem.offsetHeight;

      var isBorderBox = size.isBorderBox = !!(boxSizingProp && style[boxSizingProp] && style[boxSizingProp] === 'border-box');

      // get all measurements
      for (var i = 0, len = measurements.length; i < len; i++) {
        var measurement = measurements[i];
        var value = style[measurement];
        value = mungeNonPixel(elem, value);
        var num = parseFloat(value);
        // any 'auto', 'medium' value will be 0
        size[measurement] = !isNaN(num) ? num : 0;
      }

      var paddingWidth = size.paddingLeft + size.paddingRight;
      var paddingHeight = size.paddingTop + size.paddingBottom;
      var marginWidth = size.marginLeft + size.marginRight;
      var marginHeight = size.marginTop + size.marginBottom;
      var borderWidth = size.borderLeftWidth + size.borderRightWidth;
      var borderHeight = size.borderTopWidth + size.borderBottomWidth;

      var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter;

      // overwrite width and height if we can get it from style
      var styleWidth = getStyleSize(style.width);
      if (styleWidth !== false) {
        size.width = styleWidth + (
        // add padding and border unless it's already including it
        isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth);
      }

      var styleHeight = getStyleSize(style.height);
      if (styleHeight !== false) {
        size.height = styleHeight + (
        // add padding and border unless it's already including it
        isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight);
      }

      size.innerWidth = size.width - (paddingWidth + borderWidth);
      size.innerHeight = size.height - (paddingHeight + borderHeight);

      size.outerWidth = size.width + marginWidth;
      size.outerHeight = size.height + marginHeight;

      return size;
    }

    // IE8 returns percent values, not pixels
    // taken from jQuery's curCSS
    function mungeNonPixel(elem, value) {
      // IE8 and has percent value
      if (window.getComputedStyle || value.indexOf('%') === -1) {
        return value;
      }
      var style = elem.style;
      // Remember the original values
      var left = style.left;
      var rs = elem.runtimeStyle;
      var rsLeft = rs && rs.left;

      // Put in the new values to get a computed value out
      if (rsLeft) {
        rs.left = elem.currentStyle.left;
      }
      style.left = value;
      value = style.pixelLeft;

      // Revert the changed values
      style.left = left;
      if (rsLeft) {
        rs.left = rsLeft;
      }

      return value;
    }

    return getSize;
  }

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD for RequireJS
    define('get-size/get-size', ['get-style-property/get-style-property'], defineGetSize);
  } else if (typeof exports === 'object') {
    // CommonJS for Component
    module.exports = defineGetSize(require('desandro-get-style-property'));
  } else {
    // browser global
    window.getSize = defineGetSize(window.getStyleProperty);
  }
})(window);

/*!
 * eventie v1.0.6
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false, module: false */

(function (window) {

  var docElem = document.documentElement;

  var bind = function () {};

  function getIEEvent(obj) {
    var event = window.event;
    // add event.target
    event.target = event.target || event.srcElement || obj;
    return event;
  }

  if (docElem.addEventListener) {
    bind = function (obj, type, fn) {
      obj.addEventListener(type, fn, false);
    };
  } else if (docElem.attachEvent) {
    bind = function (obj, type, fn) {
      obj[type + fn] = fn.handleEvent ? function () {
        var event = getIEEvent(obj);
        fn.handleEvent.call(fn, event);
      } : function () {
        var event = getIEEvent(obj);
        fn.call(obj, event);
      };
      obj.attachEvent("on" + type, obj[type + fn]);
    };
  }

  var unbind = function () {};

  if (docElem.removeEventListener) {
    unbind = function (obj, type, fn) {
      obj.removeEventListener(type, fn, false);
    };
  } else if (docElem.detachEvent) {
    unbind = function (obj, type, fn) {
      obj.detachEvent("on" + type, obj[type + fn]);
      try {
        delete obj[type + fn];
      } catch (err) {
        // can't delete window object properties
        obj[type + fn] = undefined;
      }
    };
  }

  var eventie = {
    bind: bind,
    unbind: unbind
  };

  // ----- module definition ----- //

  if (typeof define === 'function' && define.amd) {
    // AMD
    define('eventie/eventie', eventie);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = eventie;
  } else {
    // browser global
    window.eventie = eventie;
  }
})(window);

/*!
 * EventEmitter v4.2.11 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function () {

  /**
   * Class for managing events.
   * Can be extended to provide event functionality in other classes.
   *
   * @class EventEmitter Manages event registering and emitting.
   */
  function EventEmitter() {}

  // Shortcuts to improve speed and size
  var proto = EventEmitter.prototype;
  var exports = this;
  var originalGlobalValue = exports.EventEmitter;

  /**
   * Finds the index of the listener for the event in its storage array.
   *
   * @param {Function[]} listeners Array of listeners to search through.
   * @param {Function} listener Method to look for.
   * @return {Number} Index of the specified listener, -1 if not found
   * @api private
   */
  function indexOfListener(listeners, listener) {
    var i = listeners.length;
    while (i--) {
      if (listeners[i].listener === listener) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Alias a method while keeping the context correct, to allow for overwriting of target method.
   *
   * @param {String} name The name of the target method.
   * @return {Function} The aliased method
   * @api private
   */
  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }

  /**
   * Returns the listener array for the specified event.
   * Will initialise the event object and listener arrays if required.
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Function[]|Object} All listener functions for the event.
   */
  proto.getListeners = function getListeners(evt) {
    var events = this._getEvents();
    var response;
    var key;

    // Return a concatenated array of all matching events if
    // the selector is a regular expression.
    if (evt instanceof RegExp) {
      response = {};
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          response[key] = events[key];
        }
      }
    } else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  };

  /**
   * Takes a list of listener objects and flattens it into a list of listener functions.
   *
   * @param {Object[]} listeners Raw listener objects.
   * @return {Function[]} Just the listener functions.
   */
  proto.flattenListeners = function flattenListeners(listeners) {
    var flatListeners = [];
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  };

  /**
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Object} All listener functions for an event in an object.
   */
  proto.getListenersAsObject = function getListenersAsObject(evt) {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
      response = {};
      response[evt] = listeners;
    }

    return response || listeners;
  };

  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListener = function addListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = typeof listener === 'object';
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
        listeners[key].push(listenerIsWrapped ? listener : {
          listener: listener,
          once: false
        });
      }
    }

    return this;
  };

  /**
   * Alias of addListener
   */
  proto.on = alias('addListener');

  /**
   * Semi-alias of addListener. It will add a listener that will be
   * automatically removed after its first execution.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
      listener: listener,
      once: true
    });
  };

  /**
   * Alias of addOnceListener.
   */
  proto.once = alias('addOnceListener');

  /**
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.
   *
   * @param {String} evt Name of the event to create.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
  };

  /**
   * Uses defineEvent to define multiple events.
   *
   * @param {String[]} evts An array of event names to define.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvents = function defineEvents(evts) {
    for (var i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }
    return this;
  };

  /**
   * Removes a listener function from the specified event.
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to remove the listener from.
   * @param {Function} listener Method to remove from the event.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListener = function removeListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var index;
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        index = indexOfListener(listeners[key], listener);

        if (index !== -1) {
          listeners[key].splice(index, 1);
        }
      }
    }

    return this;
  };

  /**
   * Alias of removeListener
   */
  proto.off = alias('removeListener');

  /**
   * Adds listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.
   * Yeah, this function does quite a bit. That's probably a bad thing.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  };

  /**
   * Removes listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.
   * You can also pass it a regular expression to remove the listeners from all events that match it.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  };

  /**
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.
   *
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of its properties to this method
    if (typeof evt === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === 'function') {
            single.call(this, i, value);
          } else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value);
          }
        }
      }
    } else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;
      while (i--) {
        single.call(this, evt, listeners[i]);
      }
    }

    return this;
  };

  /**
   * Removes all listeners from a specified event.
   * If you do not specify an event then all listeners will be removed.
   * That means every event will be emptied.
   * You can also pass a regex to remove all events that match it.
   *
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeEvent = function removeEvent(evt) {
    var type = typeof evt;
    var events = this._getEvents();
    var key;

    // Remove different things depending on the state of evt
    if (type === 'string') {
      // Remove all listeners for the specified event
      delete events[evt];
    } else if (evt instanceof RegExp) {
      // Remove all events matching the regex.
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    } else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  };

  /**
   * Alias of removeEvent.
   *
   * Added to mirror the node API.
   */
  proto.removeAllListeners = alias('removeEvent');

  /**
   * Emits an event of your choice.
   * When emitted, every listener attached to that event will be executed.
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
   * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
   * So they will not arrive within the array on the other side, they will be separate.
   * You can also pass a regular expression to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {Array} [args] Optional array of arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emitEvent = function emitEvent(evt, args) {
    var listeners = this.getListenersAsObject(evt);
    var listener;
    var i;
    var key;
    var response;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        i = listeners[key].length;

        while (i--) {
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
          listener = listeners[key][i];

          if (listener.once === true) {
            this.removeListener(evt, listener.listener);
          }

          response = listener.listener.apply(this, args || []);

          if (response === this._getOnceReturnValue()) {
            this.removeListener(evt, listener.listener);
          }
        }
      }
    }

    return this;
  };

  /**
   * Alias of emitEvent
   */
  proto.trigger = alias('emitEvent');

  /**
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {...*} Optional additional arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emit = function emit(evt) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  };

  /**
   * Sets the current value to check against when executing listeners. If a
   * listeners return value matches the one set here then it will be removed
   * after execution. This value defaults to true.
   *
   * @param {*} value The new value to check for when executing listeners.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
  };

  /**
   * Fetches the current value to check against when executing listeners. If
   * the listeners return value matches this one then it should be removed
   * automatically. It will return true by default.
   *
   * @return {*|Boolean} The current value to check for or the default, true.
   * @api private
   */
  proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
      return this._onceReturnValue;
    } else {
      return true;
    }
  };

  /**
   * Fetches the events object and creates one if required.
   *
   * @return {Object} The events storage object.
   * @api private
   */
  proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
  };

  /**
   * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
   *
   * @return {Function} Non conflicting EventEmitter class.
   */
  EventEmitter.noConflict = function noConflict() {
    exports.EventEmitter = originalGlobalValue;
    return EventEmitter;
  };

  // Expose the class either via AMD, CommonJS or the global object
  if (typeof define === 'function' && define.amd) {
    define('eventEmitter/EventEmitter', [], function () {
      return EventEmitter;
    });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = EventEmitter;
  } else {
    exports.EventEmitter = EventEmitter;
  }
}).call(this);

/*!
 * docReady v1.0.4
 * Cross browser DOMContentLoaded event emitter
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true*/
/*global define: false, require: false, module: false */

(function (window) {

  var document = window.document;
  // collection of functions to be triggered on ready
  var queue = [];

  function docReady(fn) {
    // throw out non-functions
    if (typeof fn !== 'function') {
      return;
    }

    if (docReady.isReady) {
      // ready now, hit it
      fn();
    } else {
      // queue function when ready
      queue.push(fn);
    }
  }

  docReady.isReady = false;

  // triggered on various doc ready events
  function onReady(event) {
    // bail if already triggered or IE8 document is not ready just yet
    var isIE8NotReady = event.type === 'readystatechange' && document.readyState !== 'complete';
    if (docReady.isReady || isIE8NotReady) {
      return;
    }

    trigger();
  }

  function trigger() {
    docReady.isReady = true;
    // process queue
    for (var i = 0, len = queue.length; i < len; i++) {
      var fn = queue[i];
      fn();
    }
  }

  function defineDocReady(eventie) {
    // trigger ready if page is ready
    if (document.readyState === 'complete') {
      trigger();
    } else {
      // listen for events
      eventie.bind(document, 'DOMContentLoaded', onReady);
      eventie.bind(document, 'readystatechange', onReady);
      eventie.bind(window, 'load', onReady);
    }

    return docReady;
  }

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('doc-ready/doc-ready', ['eventie/eventie'], defineDocReady);
  } else if (typeof exports === 'object') {
    module.exports = defineDocReady(require('eventie'));
  } else {
    // browser global
    window.docReady = defineDocReady(window.eventie);
  }
})(window);

/**
 * matchesSelector v1.0.3
 * matchesSelector( element, '.selector' )
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false, module: false */

(function (ElemProto) {

  var matchesMethod = function () {
    // check for the standard method name first
    if (ElemProto.matches) {
      return 'matches';
    }
    // check un-prefixed
    if (ElemProto.matchesSelector) {
      return 'matchesSelector';
    }
    // check vendor prefixes
    var prefixes = ['webkit', 'moz', 'ms', 'o'];

    for (var i = 0, len = prefixes.length; i < len; i++) {
      var prefix = prefixes[i];
      var method = prefix + 'MatchesSelector';
      if (ElemProto[method]) {
        return method;
      }
    }
  }();

  // ----- match ----- //

  function match(elem, selector) {
    return elem[matchesMethod](selector);
  }

  // ----- appendToFragment ----- //

  function checkParent(elem) {
    // not needed if already has parent
    if (elem.parentNode) {
      return;
    }
    var fragment = document.createDocumentFragment();
    fragment.appendChild(elem);
  }

  // ----- query ----- //

  // fall back to using QSA
  // thx @jonathantneal https://gist.github.com/3062955
  function query(elem, selector) {
    // append to fragment if no parent
    checkParent(elem);

    // match elem with all selected elems of parent
    var elems = elem.parentNode.querySelectorAll(selector);
    for (var i = 0, len = elems.length; i < len; i++) {
      // return true if match
      if (elems[i] === elem) {
        return true;
      }
    }
    // otherwise return false
    return false;
  }

  // ----- matchChild ----- //

  function matchChild(elem, selector) {
    checkParent(elem);
    return match(elem, selector);
  }

  // ----- matchesSelector ----- //

  var matchesSelector;

  if (matchesMethod) {
    // IE9 supports matchesSelector, but doesn't work on orphaned elems
    // check for that
    var div = document.createElement('div');
    var supportsOrphans = match(div, 'div');
    matchesSelector = supportsOrphans ? match : matchChild;
  } else {
    matchesSelector = query;
  }

  // transport
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('matches-selector/matches-selector', [], function () {
      return matchesSelector;
    });
  } else if (typeof exports === 'object') {
    module.exports = matchesSelector;
  } else {
    // browser global
    window.matchesSelector = matchesSelector;
  }
})(Element.prototype);

/**
 * Fizzy UI utils v1.0.1
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true, strict: true */

(function (window, factory) {
  /*global define: false, module: false, require: false */

  // universal module definition

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('fizzy-ui-utils/utils', ['doc-ready/doc-ready', 'matches-selector/matches-selector'], function (docReady, matchesSelector) {
      return factory(window, docReady, matchesSelector);
    });
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory(window, require('doc-ready'), require('desandro-matches-selector'));
  } else {
    // browser global
    window.fizzyUIUtils = factory(window, window.docReady, window.matchesSelector);
  }
})(window, function factory(window, docReady, matchesSelector) {

  var utils = {};

  // ----- extend ----- //

  // extends objects
  utils.extend = function (a, b) {
    for (var prop in b) {
      a[prop] = b[prop];
    }
    return a;
  };

  // ----- modulo ----- //

  utils.modulo = function (num, div) {
    return (num % div + div) % div;
  };

  // ----- isArray ----- //

  var objToString = Object.prototype.toString;
  utils.isArray = function (obj) {
    return objToString.call(obj) == '[object Array]';
  };

  // ----- makeArray ----- //

  // turn element or nodeList into an array
  utils.makeArray = function (obj) {
    var ary = [];
    if (utils.isArray(obj)) {
      // use object if already an array
      ary = obj;
    } else if (obj && typeof obj.length == 'number') {
      // convert nodeList to array
      for (var i = 0, len = obj.length; i < len; i++) {
        ary.push(obj[i]);
      }
    } else {
      // array of single index
      ary.push(obj);
    }
    return ary;
  };

  // ----- indexOf ----- //

  // index of helper cause IE8
  utils.indexOf = Array.prototype.indexOf ? function (ary, obj) {
    return ary.indexOf(obj);
  } : function (ary, obj) {
    for (var i = 0, len = ary.length; i < len; i++) {
      if (ary[i] === obj) {
        return i;
      }
    }
    return -1;
  };

  // ----- removeFrom ----- //

  utils.removeFrom = function (ary, obj) {
    var index = utils.indexOf(ary, obj);
    if (index != -1) {
      ary.splice(index, 1);
    }
  };

  // ----- isElement ----- //

  // http://stackoverflow.com/a/384380/182183
  utils.isElement = typeof HTMLElement == 'function' || typeof HTMLElement == 'object' ? function isElementDOM2(obj) {
    return obj instanceof HTMLElement;
  } : function isElementQuirky(obj) {
    return obj && typeof obj == 'object' && obj.nodeType == 1 && typeof obj.nodeName == 'string';
  };

  // ----- setText ----- //

  utils.setText = function () {
    var setTextProperty;
    function setText(elem, text) {
      // only check setTextProperty once
      setTextProperty = setTextProperty || (document.documentElement.textContent !== undefined ? 'textContent' : 'innerText');
      elem[setTextProperty] = text;
    }
    return setText;
  }();

  // ----- getParent ----- //

  utils.getParent = function (elem, selector) {
    while (elem != document.body) {
      elem = elem.parentNode;
      if (matchesSelector(elem, selector)) {
        return elem;
      }
    }
  };

  // ----- getQueryElement ----- //

  // use element as selector string
  utils.getQueryElement = function (elem) {
    if (typeof elem == 'string') {
      return document.querySelector(elem);
    }
    return elem;
  };

  // ----- handleEvent ----- //

  // enable .ontype to trigger from .addEventListener( elem, 'type' )
  utils.handleEvent = function (event) {
    var method = 'on' + event.type;
    if (this[method]) {
      this[method](event);
    }
  };

  // ----- filterFindElements ----- //

  utils.filterFindElements = function (elems, selector) {
    // make array of elems
    elems = utils.makeArray(elems);
    var ffElems = [];

    for (var i = 0, len = elems.length; i < len; i++) {
      var elem = elems[i];
      // check that elem is an actual element
      if (!utils.isElement(elem)) {
        continue;
      }
      // filter & find items if we have a selector
      if (selector) {
        // filter siblings
        if (matchesSelector(elem, selector)) {
          ffElems.push(elem);
        }
        // find children
        var childElems = elem.querySelectorAll(selector);
        // concat childElems to filterFound array
        for (var j = 0, jLen = childElems.length; j < jLen; j++) {
          ffElems.push(childElems[j]);
        }
      } else {
        ffElems.push(elem);
      }
    }

    return ffElems;
  };

  // ----- debounceMethod ----- //

  utils.debounceMethod = function (_class, methodName, threshold) {
    // original method
    var method = _class.prototype[methodName];
    var timeoutName = methodName + 'Timeout';

    _class.prototype[methodName] = function () {
      var timeout = this[timeoutName];
      if (timeout) {
        clearTimeout(timeout);
      }
      var args = arguments;

      var _this = this;
      this[timeoutName] = setTimeout(function () {
        method.apply(_this, args);
        delete _this[timeoutName];
      }, threshold || 100);
    };
  };

  // ----- htmlInit ----- //

  // http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/
  utils.toDashed = function (str) {
    return str.replace(/(.)([A-Z])/g, function (match, $1, $2) {
      return $1 + '-' + $2;
    }).toLowerCase();
  };

  var console = window.console;
  /**
   * allow user to initialize classes via .js-namespace class
   * htmlInit( Widget, 'widgetName' )
   * options are parsed from data-namespace-option attribute
   */
  utils.htmlInit = function (WidgetClass, namespace) {
    docReady(function () {
      var dashedNamespace = utils.toDashed(namespace);
      var elems = document.querySelectorAll('.js-' + dashedNamespace);
      var dataAttr = 'data-' + dashedNamespace + '-options';

      for (var i = 0, len = elems.length; i < len; i++) {
        var elem = elems[i];
        var attr = elem.getAttribute(dataAttr);
        var options;
        try {
          options = attr && JSON.parse(attr);
        } catch (error) {
          // log error, do not initialize
          if (console) {
            console.error('Error parsing ' + dataAttr + ' on ' + elem.nodeName.toLowerCase() + (elem.id ? '#' + elem.id : '') + ': ' + error);
          }
          continue;
        }
        // initialize
        var instance = new WidgetClass(elem, options);
        // make available via $().data('layoutname')
        var jQuery = window.jQuery;
        if (jQuery) {
          jQuery.data(elem, namespace, instance);
        }
      }
    });
  };

  // -----  ----- //

  return utils;
});

/**
 * Outlayer Item
 */

(function (window, factory) {

  // universal module definition
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('outlayer/item', ['eventEmitter/EventEmitter', 'get-size/get-size', 'get-style-property/get-style-property', 'fizzy-ui-utils/utils'], function (EventEmitter, getSize, getStyleProperty, utils) {
      return factory(window, EventEmitter, getSize, getStyleProperty, utils);
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(window, require('wolfy87-eventemitter'), require('get-size'), require('desandro-get-style-property'), require('fizzy-ui-utils'));
  } else {
    // browser global
    window.Outlayer = {};
    window.Outlayer.Item = factory(window, window.EventEmitter, window.getSize, window.getStyleProperty, window.fizzyUIUtils);
  }
})(window, function factory(window, EventEmitter, getSize, getStyleProperty, utils) {

  // ----- helpers ----- //

  var getComputedStyle = window.getComputedStyle;
  var getStyle = getComputedStyle ? function (elem) {
    return getComputedStyle(elem, null);
  } : function (elem) {
    return elem.currentStyle;
  };

  function isEmptyObj(obj) {
    for (var prop in obj) {
      return false;
    }
    prop = null;
    return true;
  }

  // -------------------------- CSS3 support -------------------------- //

  var transitionProperty = getStyleProperty('transition');
  var transformProperty = getStyleProperty('transform');
  var supportsCSS3 = transitionProperty && transformProperty;
  var is3d = !!getStyleProperty('perspective');

  var transitionEndEvent = {
    WebkitTransition: 'webkitTransitionEnd',
    MozTransition: 'transitionend',
    OTransition: 'otransitionend',
    transition: 'transitionend'
  }[transitionProperty];

  // properties that could have vendor prefix
  var prefixableProperties = ['transform', 'transition', 'transitionDuration', 'transitionProperty'];

  // cache all vendor properties
  var vendorProperties = function () {
    var cache = {};
    for (var i = 0, len = prefixableProperties.length; i < len; i++) {
      var prop = prefixableProperties[i];
      var supportedProp = getStyleProperty(prop);
      if (supportedProp && supportedProp !== prop) {
        cache[prop] = supportedProp;
      }
    }
    return cache;
  }();

  // -------------------------- Item -------------------------- //

  function Item(element, layout) {
    if (!element) {
      return;
    }

    this.element = element;
    // parent layout class, i.e. Masonry, Isotope, or Packery
    this.layout = layout;
    this.position = {
      x: 0,
      y: 0
    };

    this._create();
  }

  // inherit EventEmitter
  utils.extend(Item.prototype, EventEmitter.prototype);

  Item.prototype._create = function () {
    // transition objects
    this._transn = {
      ingProperties: {},
      clean: {},
      onEnd: {}
    };

    this.css({
      position: 'absolute'
    });
  };

  // trigger specified handler for event type
  Item.prototype.handleEvent = function (event) {
    var method = 'on' + event.type;
    if (this[method]) {
      this[method](event);
    }
  };

  Item.prototype.getSize = function () {
    this.size = getSize(this.element);
  };

  /**
   * apply CSS styles to element
   * @param {Object} style
   */
  Item.prototype.css = function (style) {
    var elemStyle = this.element.style;

    for (var prop in style) {
      // use vendor property if available
      var supportedProp = vendorProperties[prop] || prop;
      elemStyle[supportedProp] = style[prop];
    }
  };

  // measure position, and sets it
  Item.prototype.getPosition = function () {
    var style = getStyle(this.element);
    var layoutOptions = this.layout.options;
    var isOriginLeft = layoutOptions.isOriginLeft;
    var isOriginTop = layoutOptions.isOriginTop;
    var xValue = style[isOriginLeft ? 'left' : 'right'];
    var yValue = style[isOriginTop ? 'top' : 'bottom'];
    // convert percent to pixels
    var layoutSize = this.layout.size;
    var x = xValue.indexOf('%') != -1 ? parseFloat(xValue) / 100 * layoutSize.width : parseInt(xValue, 10);
    var y = yValue.indexOf('%') != -1 ? parseFloat(yValue) / 100 * layoutSize.height : parseInt(yValue, 10);

    // clean up 'auto' or other non-integer values
    x = isNaN(x) ? 0 : x;
    y = isNaN(y) ? 0 : y;
    // remove padding from measurement
    x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
    y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;

    this.position.x = x;
    this.position.y = y;
  };

  // set settled position, apply padding
  Item.prototype.layoutPosition = function () {
    var layoutSize = this.layout.size;
    var layoutOptions = this.layout.options;
    var style = {};

    // x
    var xPadding = layoutOptions.isOriginLeft ? 'paddingLeft' : 'paddingRight';
    var xProperty = layoutOptions.isOriginLeft ? 'left' : 'right';
    var xResetProperty = layoutOptions.isOriginLeft ? 'right' : 'left';

    var x = this.position.x + layoutSize[xPadding];
    // set in percentage or pixels
    style[xProperty] = this.getXValue(x);
    // reset other property
    style[xResetProperty] = '';

    // y
    var yPadding = layoutOptions.isOriginTop ? 'paddingTop' : 'paddingBottom';
    var yProperty = layoutOptions.isOriginTop ? 'top' : 'bottom';
    var yResetProperty = layoutOptions.isOriginTop ? 'bottom' : 'top';

    var y = this.position.y + layoutSize[yPadding];
    // set in percentage or pixels
    style[yProperty] = this.getYValue(y);
    // reset other property
    style[yResetProperty] = '';

    this.css(style);
    this.emitEvent('layout', [this]);
  };

  Item.prototype.getXValue = function (x) {
    var layoutOptions = this.layout.options;
    return layoutOptions.percentPosition && !layoutOptions.isHorizontal ? x / this.layout.size.width * 100 + '%' : x + 'px';
  };

  Item.prototype.getYValue = function (y) {
    var layoutOptions = this.layout.options;
    return layoutOptions.percentPosition && layoutOptions.isHorizontal ? y / this.layout.size.height * 100 + '%' : y + 'px';
  };

  Item.prototype._transitionTo = function (x, y) {
    this.getPosition();
    // get current x & y from top/left
    var curX = this.position.x;
    var curY = this.position.y;

    var compareX = parseInt(x, 10);
    var compareY = parseInt(y, 10);
    var didNotMove = compareX === this.position.x && compareY === this.position.y;

    // save end position
    this.setPosition(x, y);

    // if did not move and not transitioning, just go to layout
    if (didNotMove && !this.isTransitioning) {
      this.layoutPosition();
      return;
    }

    var transX = x - curX;
    var transY = y - curY;
    var transitionStyle = {};
    transitionStyle.transform = this.getTranslate(transX, transY);

    this.transition({
      to: transitionStyle,
      onTransitionEnd: {
        transform: this.layoutPosition
      },
      isCleaning: true
    });
  };

  Item.prototype.getTranslate = function (x, y) {
    // flip cooridinates if origin on right or bottom
    var layoutOptions = this.layout.options;
    x = layoutOptions.isOriginLeft ? x : -x;
    y = layoutOptions.isOriginTop ? y : -y;

    if (is3d) {
      return 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    }

    return 'translate(' + x + 'px, ' + y + 'px)';
  };

  // non transition + transform support
  Item.prototype.goTo = function (x, y) {
    this.setPosition(x, y);
    this.layoutPosition();
  };

  // use transition and transforms if supported
  Item.prototype.moveTo = supportsCSS3 ? Item.prototype._transitionTo : Item.prototype.goTo;

  Item.prototype.setPosition = function (x, y) {
    this.position.x = parseInt(x, 10);
    this.position.y = parseInt(y, 10);
  };

  // ----- transition ----- //

  /**
   * @param {Object} style - CSS
   * @param {Function} onTransitionEnd
   */

  // non transition, just trigger callback
  Item.prototype._nonTransition = function (args) {
    this.css(args.to);
    if (args.isCleaning) {
      this._removeStyles(args.to);
    }
    for (var prop in args.onTransitionEnd) {
      args.onTransitionEnd[prop].call(this);
    }
  };

  /**
   * proper transition
   * @param {Object} args - arguments
   *   @param {Object} to - style to transition to
   *   @param {Object} from - style to start transition from
   *   @param {Boolean} isCleaning - removes transition styles after transition
   *   @param {Function} onTransitionEnd - callback
   */
  Item.prototype._transition = function (args) {
    // redirect to nonTransition if no transition duration
    if (!parseFloat(this.layout.options.transitionDuration)) {
      this._nonTransition(args);
      return;
    }

    var _transition = this._transn;
    // keep track of onTransitionEnd callback by css property
    for (var prop in args.onTransitionEnd) {
      _transition.onEnd[prop] = args.onTransitionEnd[prop];
    }
    // keep track of properties that are transitioning
    for (prop in args.to) {
      _transition.ingProperties[prop] = true;
      // keep track of properties to clean up when transition is done
      if (args.isCleaning) {
        _transition.clean[prop] = true;
      }
    }

    // set from styles
    if (args.from) {
      this.css(args.from);
      // force redraw. http://blog.alexmaccaw.com/css-transitions
      var h = this.element.offsetHeight;
      // hack for JSHint to hush about unused var
      h = null;
    }
    // enable transition
    this.enableTransition(args.to);
    // set styles that are transitioning
    this.css(args.to);

    this.isTransitioning = true;
  };

  // dash before all cap letters, including first for
  // WebkitTransform => -webkit-transform
  function toDashedAll(str) {
    return str.replace(/([A-Z])/g, function ($1) {
      return '-' + $1.toLowerCase();
    });
  }

  var transitionProps = 'opacity,' + toDashedAll(vendorProperties.transform || 'transform');

  Item.prototype.enableTransition = function () /* style */{
    // HACK changing transitionProperty during a transition
    // will cause transition to jump
    if (this.isTransitioning) {
      return;
    }

    // make `transition: foo, bar, baz` from style object
    // HACK un-comment this when enableTransition can work
    // while a transition is happening
    // var transitionValues = [];
    // for ( var prop in style ) {
    //   // dash-ify camelCased properties like WebkitTransition
    //   prop = vendorProperties[ prop ] || prop;
    //   transitionValues.push( toDashedAll( prop ) );
    // }
    // enable transition styles
    this.css({
      transitionProperty: transitionProps,
      transitionDuration: this.layout.options.transitionDuration
    });
    // listen for transition end event
    this.element.addEventListener(transitionEndEvent, this, false);
  };

  Item.prototype.transition = Item.prototype[transitionProperty ? '_transition' : '_nonTransition'];

  // ----- events ----- //

  Item.prototype.onwebkitTransitionEnd = function (event) {
    this.ontransitionend(event);
  };

  Item.prototype.onotransitionend = function (event) {
    this.ontransitionend(event);
  };

  // properties that I munge to make my life easier
  var dashedVendorProperties = {
    '-webkit-transform': 'transform',
    '-moz-transform': 'transform',
    '-o-transform': 'transform'
  };

  Item.prototype.ontransitionend = function (event) {
    // disregard bubbled events from children
    if (event.target !== this.element) {
      return;
    }
    var _transition = this._transn;
    // get property name of transitioned property, convert to prefix-free
    var propertyName = dashedVendorProperties[event.propertyName] || event.propertyName;

    // remove property that has completed transitioning
    delete _transition.ingProperties[propertyName];
    // check if any properties are still transitioning
    if (isEmptyObj(_transition.ingProperties)) {
      // all properties have completed transitioning
      this.disableTransition();
    }
    // clean style
    if (propertyName in _transition.clean) {
      // clean up style
      this.element.style[event.propertyName] = '';
      delete _transition.clean[propertyName];
    }
    // trigger onTransitionEnd callback
    if (propertyName in _transition.onEnd) {
      var onTransitionEnd = _transition.onEnd[propertyName];
      onTransitionEnd.call(this);
      delete _transition.onEnd[propertyName];
    }

    this.emitEvent('transitionEnd', [this]);
  };

  Item.prototype.disableTransition = function () {
    this.removeTransitionStyles();
    this.element.removeEventListener(transitionEndEvent, this, false);
    this.isTransitioning = false;
  };

  /**
   * removes style property from element
   * @param {Object} style
  **/
  Item.prototype._removeStyles = function (style) {
    // clean up transition styles
    var cleanStyle = {};
    for (var prop in style) {
      cleanStyle[prop] = '';
    }
    this.css(cleanStyle);
  };

  var cleanTransitionStyle = {
    transitionProperty: '',
    transitionDuration: ''
  };

  Item.prototype.removeTransitionStyles = function () {
    // remove transition
    this.css(cleanTransitionStyle);
  };

  // ----- show/hide/remove ----- //

  // remove element from DOM
  Item.prototype.removeElem = function () {
    this.element.parentNode.removeChild(this.element);
    // remove display: none
    this.css({ display: '' });
    this.emitEvent('remove', [this]);
  };

  Item.prototype.remove = function () {
    // just remove element if no transition support or no transition
    if (!transitionProperty || !parseFloat(this.layout.options.transitionDuration)) {
      this.removeElem();
      return;
    }

    // start transition
    var _this = this;
    this.once('transitionEnd', function () {
      _this.removeElem();
    });
    this.hide();
  };

  Item.prototype.reveal = function () {
    delete this.isHidden;
    // remove display: none
    this.css({ display: '' });

    var options = this.layout.options;

    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('visibleStyle');
    onTransitionEnd[transitionEndProperty] = this.onRevealTransitionEnd;

    this.transition({
      from: options.hiddenStyle,
      to: options.visibleStyle,
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  Item.prototype.onRevealTransitionEnd = function () {
    // check if still visible
    // during transition, item may have been hidden
    if (!this.isHidden) {
      this.emitEvent('reveal');
    }
  };

  /**
   * get style property use for hide/reveal transition end
   * @param {String} styleProperty - hiddenStyle/visibleStyle
   * @returns {String}
   */
  Item.prototype.getHideRevealTransitionEndProperty = function (styleProperty) {
    var optionStyle = this.layout.options[styleProperty];
    // use opacity
    if (optionStyle.opacity) {
      return 'opacity';
    }
    // get first property
    for (var prop in optionStyle) {
      return prop;
    }
  };

  Item.prototype.hide = function () {
    // set flag
    this.isHidden = true;
    // remove display: none
    this.css({ display: '' });

    var options = this.layout.options;

    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('hiddenStyle');
    onTransitionEnd[transitionEndProperty] = this.onHideTransitionEnd;

    this.transition({
      from: options.visibleStyle,
      to: options.hiddenStyle,
      // keep hidden stuff hidden
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  Item.prototype.onHideTransitionEnd = function () {
    // check if still hidden
    // during transition, item may have been un-hidden
    if (this.isHidden) {
      this.css({ display: 'none' });
      this.emitEvent('hide');
    }
  };

  Item.prototype.destroy = function () {
    this.css({
      position: '',
      left: '',
      right: '',
      top: '',
      bottom: '',
      transition: '',
      transform: ''
    });
  };

  return Item;
});

/*!
 * Outlayer v1.4.2
 * the brains and guts of a layout library
 * MIT license
 */

(function (window, factory) {

  // universal module definition

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('outlayer/outlayer', ['eventie/eventie', 'eventEmitter/EventEmitter', 'get-size/get-size', 'fizzy-ui-utils/utils', './item'], function (eventie, EventEmitter, getSize, utils, Item) {
      return factory(window, eventie, EventEmitter, getSize, utils, Item);
    });
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory(window, require('eventie'), require('wolfy87-eventemitter'), require('get-size'), require('fizzy-ui-utils'), require('./item'));
  } else {
    // browser global
    window.Outlayer = factory(window, window.eventie, window.EventEmitter, window.getSize, window.fizzyUIUtils, window.Outlayer.Item);
  }
})(window, function factory(window, eventie, EventEmitter, getSize, utils, Item) {

  // ----- vars ----- //

  var console = window.console;
  var jQuery = window.jQuery;
  var noop = function () {};

  // -------------------------- Outlayer -------------------------- //

  // globally unique identifiers
  var GUID = 0;
  // internal store of all Outlayer intances
  var instances = {};

  /**
   * @param {Element, String} element
   * @param {Object} options
   * @constructor
   */
  function Outlayer(element, options) {
    var queryElement = utils.getQueryElement(element);
    if (!queryElement) {
      if (console) {
        console.error('Bad element for ' + this.constructor.namespace + ': ' + (queryElement || element));
      }
      return;
    }
    this.element = queryElement;
    // add jQuery
    if (jQuery) {
      this.$element = jQuery(this.element);
    }

    // options
    this.options = utils.extend({}, this.constructor.defaults);
    this.option(options);

    // add id for Outlayer.getFromElement
    var id = ++GUID;
    this.element.outlayerGUID = id; // expando
    instances[id] = this; // associate via id

    // kick it off
    this._create();

    if (this.options.isInitLayout) {
      this.layout();
    }
  }

  // settings are for internal use only
  Outlayer.namespace = 'outlayer';
  Outlayer.Item = Item;

  // default options
  Outlayer.defaults = {
    containerStyle: {
      position: 'relative'
    },
    isInitLayout: true,
    isOriginLeft: true,
    isOriginTop: true,
    isResizeBound: true,
    isResizingContainer: true,
    // item options
    transitionDuration: '0.4s',
    hiddenStyle: {
      opacity: 0,
      transform: 'scale(0.001)'
    },
    visibleStyle: {
      opacity: 1,
      transform: 'scale(1)'
    }
  };

  // inherit EventEmitter
  utils.extend(Outlayer.prototype, EventEmitter.prototype);

  /**
   * set options
   * @param {Object} opts
   */
  Outlayer.prototype.option = function (opts) {
    utils.extend(this.options, opts);
  };

  Outlayer.prototype._create = function () {
    // get items from children
    this.reloadItems();
    // elements that affect layout, but are not laid out
    this.stamps = [];
    this.stamp(this.options.stamp);
    // set container style
    utils.extend(this.element.style, this.options.containerStyle);

    // bind resize method
    if (this.options.isResizeBound) {
      this.bindResize();
    }
  };

  // goes through all children again and gets bricks in proper order
  Outlayer.prototype.reloadItems = function () {
    // collection of item elements
    this.items = this._itemize(this.element.children);
  };

  /**
   * turn elements into Outlayer.Items to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - collection of new Outlayer Items
   */
  Outlayer.prototype._itemize = function (elems) {

    var itemElems = this._filterFindItemElements(elems);
    var Item = this.constructor.Item;

    // create new Outlayer Items for collection
    var items = [];
    for (var i = 0, len = itemElems.length; i < len; i++) {
      var elem = itemElems[i];
      var item = new Item(elem, this);
      items.push(item);
    }

    return items;
  };

  /**
   * get item elements to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - item elements
   */
  Outlayer.prototype._filterFindItemElements = function (elems) {
    return utils.filterFindElements(elems, this.options.itemSelector);
  };

  /**
   * getter method for getting item elements
   * @returns {Array} elems - collection of item elements
   */
  Outlayer.prototype.getItemElements = function () {
    var elems = [];
    for (var i = 0, len = this.items.length; i < len; i++) {
      elems.push(this.items[i].element);
    }
    return elems;
  };

  // ----- init & layout ----- //

  /**
   * lays out all items
   */
  Outlayer.prototype.layout = function () {
    this._resetLayout();
    this._manageStamps();

    // don't animate first layout
    var isInstant = this.options.isLayoutInstant !== undefined ? this.options.isLayoutInstant : !this._isLayoutInited;
    this.layoutItems(this.items, isInstant);

    // flag for initalized
    this._isLayoutInited = true;
  };

  // _init is alias for layout
  Outlayer.prototype._init = Outlayer.prototype.layout;

  /**
   * logic before any new layout
   */
  Outlayer.prototype._resetLayout = function () {
    this.getSize();
  };

  Outlayer.prototype.getSize = function () {
    this.size = getSize(this.element);
  };

  /**
   * get measurement from option, for columnWidth, rowHeight, gutter
   * if option is String -> get element from selector string, & get size of element
   * if option is Element -> get size of element
   * else use option as a number
   *
   * @param {String} measurement
   * @param {String} size - width or height
   * @private
   */
  Outlayer.prototype._getMeasurement = function (measurement, size) {
    var option = this.options[measurement];
    var elem;
    if (!option) {
      // default to 0
      this[measurement] = 0;
    } else {
      // use option as an element
      if (typeof option === 'string') {
        elem = this.element.querySelector(option);
      } else if (utils.isElement(option)) {
        elem = option;
      }
      // use size of element, if element
      this[measurement] = elem ? getSize(elem)[size] : option;
    }
  };

  /**
   * layout a collection of item elements
   * @api public
   */
  Outlayer.prototype.layoutItems = function (items, isInstant) {
    items = this._getItemsForLayout(items);

    this._layoutItems(items, isInstant);

    this._postLayout();
  };

  /**
   * get the items to be laid out
   * you may want to skip over some items
   * @param {Array} items
   * @returns {Array} items
   */
  Outlayer.prototype._getItemsForLayout = function (items) {
    var layoutItems = [];
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (!item.isIgnored) {
        layoutItems.push(item);
      }
    }
    return layoutItems;
  };

  /**
   * layout items
   * @param {Array} items
   * @param {Boolean} isInstant
   */
  Outlayer.prototype._layoutItems = function (items, isInstant) {
    this._emitCompleteOnItems('layout', items);

    if (!items || !items.length) {
      // no items, emit event with empty array
      return;
    }

    var queue = [];

    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      // get x/y object from method
      var position = this._getItemLayoutPosition(item);
      // enqueue
      position.item = item;
      position.isInstant = isInstant || item.isLayoutInstant;
      queue.push(position);
    }

    this._processLayoutQueue(queue);
  };

  /**
   * get item layout position
   * @param {Outlayer.Item} item
   * @returns {Object} x and y position
   */
  Outlayer.prototype._getItemLayoutPosition = function () /* item */{
    return {
      x: 0,
      y: 0
    };
  };

  /**
   * iterate over array and position each item
   * Reason being - separating this logic prevents 'layout invalidation'
   * thx @paul_irish
   * @param {Array} queue
   */
  Outlayer.prototype._processLayoutQueue = function (queue) {
    for (var i = 0, len = queue.length; i < len; i++) {
      var obj = queue[i];
      this._positionItem(obj.item, obj.x, obj.y, obj.isInstant);
    }
  };

  /**
   * Sets position of item in DOM
   * @param {Outlayer.Item} item
   * @param {Number} x - horizontal position
   * @param {Number} y - vertical position
   * @param {Boolean} isInstant - disables transitions
   */
  Outlayer.prototype._positionItem = function (item, x, y, isInstant) {
    if (isInstant) {
      // if not transition, just set CSS
      item.goTo(x, y);
    } else {
      item.moveTo(x, y);
    }
  };

  /**
   * Any logic you want to do after each layout,
   * i.e. size the container
   */
  Outlayer.prototype._postLayout = function () {
    this.resizeContainer();
  };

  Outlayer.prototype.resizeContainer = function () {
    if (!this.options.isResizingContainer) {
      return;
    }
    var size = this._getContainerSize();
    if (size) {
      this._setContainerMeasure(size.width, true);
      this._setContainerMeasure(size.height, false);
    }
  };

  /**
   * Sets width or height of container if returned
   * @returns {Object} size
   *   @param {Number} width
   *   @param {Number} height
   */
  Outlayer.prototype._getContainerSize = noop;

  /**
   * @param {Number} measure - size of width or height
   * @param {Boolean} isWidth
   */
  Outlayer.prototype._setContainerMeasure = function (measure, isWidth) {
    if (measure === undefined) {
      return;
    }

    var elemSize = this.size;
    // add padding and border width if border box
    if (elemSize.isBorderBox) {
      measure += isWidth ? elemSize.paddingLeft + elemSize.paddingRight + elemSize.borderLeftWidth + elemSize.borderRightWidth : elemSize.paddingBottom + elemSize.paddingTop + elemSize.borderTopWidth + elemSize.borderBottomWidth;
    }

    measure = Math.max(measure, 0);
    this.element.style[isWidth ? 'width' : 'height'] = measure + 'px';
  };

  /**
   * emit eventComplete on a collection of items events
   * @param {String} eventName
   * @param {Array} items - Outlayer.Items
   */
  Outlayer.prototype._emitCompleteOnItems = function (eventName, items) {
    var _this = this;
    function onComplete() {
      _this.dispatchEvent(eventName + 'Complete', null, [items]);
    }

    var count = items.length;
    if (!items || !count) {
      onComplete();
      return;
    }

    var doneCount = 0;
    function tick() {
      doneCount++;
      if (doneCount === count) {
        onComplete();
      }
    }

    // bind callback
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      item.once(eventName, tick);
    }
  };

  /**
   * emits events via eventEmitter and jQuery events
   * @param {String} type - name of event
   * @param {Event} event - original event
   * @param {Array} args - extra arguments
   */
  Outlayer.prototype.dispatchEvent = function (type, event, args) {
    // add original event to arguments
    var emitArgs = event ? [event].concat(args) : args;
    this.emitEvent(type, emitArgs);

    if (jQuery) {
      // set this.$element
      this.$element = this.$element || jQuery(this.element);
      if (event) {
        // create jQuery event
        var $event = jQuery.Event(event);
        $event.type = type;
        this.$element.trigger($event, args);
      } else {
        // just trigger with type if no event available
        this.$element.trigger(type, args);
      }
    }
  };

  // -------------------------- ignore & stamps -------------------------- //


  /**
   * keep item in collection, but do not lay it out
   * ignored items do not get skipped in layout
   * @param {Element} elem
   */
  Outlayer.prototype.ignore = function (elem) {
    var item = this.getItem(elem);
    if (item) {
      item.isIgnored = true;
    }
  };

  /**
   * return item to layout collection
   * @param {Element} elem
   */
  Outlayer.prototype.unignore = function (elem) {
    var item = this.getItem(elem);
    if (item) {
      delete item.isIgnored;
    }
  };

  /**
   * adds elements to stamps
   * @param {NodeList, Array, Element, or String} elems
   */
  Outlayer.prototype.stamp = function (elems) {
    elems = this._find(elems);
    if (!elems) {
      return;
    }

    this.stamps = this.stamps.concat(elems);
    // ignore
    for (var i = 0, len = elems.length; i < len; i++) {
      var elem = elems[i];
      this.ignore(elem);
    }
  };

  /**
   * removes elements to stamps
   * @param {NodeList, Array, or Element} elems
   */
  Outlayer.prototype.unstamp = function (elems) {
    elems = this._find(elems);
    if (!elems) {
      return;
    }

    for (var i = 0, len = elems.length; i < len; i++) {
      var elem = elems[i];
      // filter out removed stamp elements
      utils.removeFrom(this.stamps, elem);
      this.unignore(elem);
    }
  };

  /**
   * finds child elements
   * @param {NodeList, Array, Element, or String} elems
   * @returns {Array} elems
   */
  Outlayer.prototype._find = function (elems) {
    if (!elems) {
      return;
    }
    // if string, use argument as selector string
    if (typeof elems === 'string') {
      elems = this.element.querySelectorAll(elems);
    }
    elems = utils.makeArray(elems);
    return elems;
  };

  Outlayer.prototype._manageStamps = function () {
    if (!this.stamps || !this.stamps.length) {
      return;
    }

    this._getBoundingRect();

    for (var i = 0, len = this.stamps.length; i < len; i++) {
      var stamp = this.stamps[i];
      this._manageStamp(stamp);
    }
  };

  // update boundingLeft / Top
  Outlayer.prototype._getBoundingRect = function () {
    // get bounding rect for container element
    var boundingRect = this.element.getBoundingClientRect();
    var size = this.size;
    this._boundingRect = {
      left: boundingRect.left + size.paddingLeft + size.borderLeftWidth,
      top: boundingRect.top + size.paddingTop + size.borderTopWidth,
      right: boundingRect.right - (size.paddingRight + size.borderRightWidth),
      bottom: boundingRect.bottom - (size.paddingBottom + size.borderBottomWidth)
    };
  };

  /**
   * @param {Element} stamp
  **/
  Outlayer.prototype._manageStamp = noop;

  /**
   * get x/y position of element relative to container element
   * @param {Element} elem
   * @returns {Object} offset - has left, top, right, bottom
   */
  Outlayer.prototype._getElementOffset = function (elem) {
    var boundingRect = elem.getBoundingClientRect();
    var thisRect = this._boundingRect;
    var size = getSize(elem);
    var offset = {
      left: boundingRect.left - thisRect.left - size.marginLeft,
      top: boundingRect.top - thisRect.top - size.marginTop,
      right: thisRect.right - boundingRect.right - size.marginRight,
      bottom: thisRect.bottom - boundingRect.bottom - size.marginBottom
    };
    return offset;
  };

  // -------------------------- resize -------------------------- //

  // enable event handlers for listeners
  // i.e. resize -> onresize
  Outlayer.prototype.handleEvent = function (event) {
    var method = 'on' + event.type;
    if (this[method]) {
      this[method](event);
    }
  };

  /**
   * Bind layout to window resizing
   */
  Outlayer.prototype.bindResize = function () {
    // bind just one listener
    if (this.isResizeBound) {
      return;
    }
    eventie.bind(window, 'resize', this);
    this.isResizeBound = true;
  };

  /**
   * Unbind layout to window resizing
   */
  Outlayer.prototype.unbindResize = function () {
    if (this.isResizeBound) {
      eventie.unbind(window, 'resize', this);
    }
    this.isResizeBound = false;
  };

  // original debounce by John Hann
  // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/

  // this fires every resize
  Outlayer.prototype.onresize = function () {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    var _this = this;
    function delayed() {
      _this.resize();
      delete _this.resizeTimeout;
    }

    this.resizeTimeout = setTimeout(delayed, 100);
  };

  // debounced, layout on resize
  Outlayer.prototype.resize = function () {
    // don't trigger if size did not change
    // or if resize was unbound. See #9
    if (!this.isResizeBound || !this.needsResizeLayout()) {
      return;
    }

    this.layout();
  };

  /**
   * check if layout is needed post layout
   * @returns Boolean
   */
  Outlayer.prototype.needsResizeLayout = function () {
    var size = getSize(this.element);
    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    var hasSizes = this.size && size;
    return hasSizes && size.innerWidth !== this.size.innerWidth;
  };

  // -------------------------- methods -------------------------- //

  /**
   * add items to Outlayer instance
   * @param {Array or NodeList or Element} elems
   * @returns {Array} items - Outlayer.Items
  **/
  Outlayer.prototype.addItems = function (elems) {
    var items = this._itemize(elems);
    // add items to collection
    if (items.length) {
      this.items = this.items.concat(items);
    }
    return items;
  };

  /**
   * Layout newly-appended item elements
   * @param {Array or NodeList or Element} elems
   */
  Outlayer.prototype.appended = function (elems) {
    var items = this.addItems(elems);
    if (!items.length) {
      return;
    }
    // layout and reveal just the new items
    this.layoutItems(items, true);
    this.reveal(items);
  };

  /**
   * Layout prepended elements
   * @param {Array or NodeList or Element} elems
   */
  Outlayer.prototype.prepended = function (elems) {
    var items = this._itemize(elems);
    if (!items.length) {
      return;
    }
    // add items to beginning of collection
    var previousItems = this.items.slice(0);
    this.items = items.concat(previousItems);
    // start new layout
    this._resetLayout();
    this._manageStamps();
    // layout new stuff without transition
    this.layoutItems(items, true);
    this.reveal(items);
    // layout previous items
    this.layoutItems(previousItems);
  };

  /**
   * reveal a collection of items
   * @param {Array of Outlayer.Items} items
   */
  Outlayer.prototype.reveal = function (items) {
    this._emitCompleteOnItems('reveal', items);

    var len = items && items.length;
    for (var i = 0; len && i < len; i++) {
      var item = items[i];
      item.reveal();
    }
  };

  /**
   * hide a collection of items
   * @param {Array of Outlayer.Items} items
   */
  Outlayer.prototype.hide = function (items) {
    this._emitCompleteOnItems('hide', items);

    var len = items && items.length;
    for (var i = 0; len && i < len; i++) {
      var item = items[i];
      item.hide();
    }
  };

  /**
   * reveal item elements
   * @param {Array}, {Element}, {NodeList} items
   */
  Outlayer.prototype.revealItemElements = function (elems) {
    var items = this.getItems(elems);
    this.reveal(items);
  };

  /**
   * hide item elements
   * @param {Array}, {Element}, {NodeList} items
   */
  Outlayer.prototype.hideItemElements = function (elems) {
    var items = this.getItems(elems);
    this.hide(items);
  };

  /**
   * get Outlayer.Item, given an Element
   * @param {Element} elem
   * @param {Function} callback
   * @returns {Outlayer.Item} item
   */
  Outlayer.prototype.getItem = function (elem) {
    // loop through items to get the one that matches
    for (var i = 0, len = this.items.length; i < len; i++) {
      var item = this.items[i];
      if (item.element === elem) {
        // return item
        return item;
      }
    }
  };

  /**
   * get collection of Outlayer.Items, given Elements
   * @param {Array} elems
   * @returns {Array} items - Outlayer.Items
   */
  Outlayer.prototype.getItems = function (elems) {
    elems = utils.makeArray(elems);
    var items = [];
    for (var i = 0, len = elems.length; i < len; i++) {
      var elem = elems[i];
      var item = this.getItem(elem);
      if (item) {
        items.push(item);
      }
    }

    return items;
  };

  /**
   * remove element(s) from instance and DOM
   * @param {Array or NodeList or Element} elems
   */
  Outlayer.prototype.remove = function (elems) {
    var removeItems = this.getItems(elems);

    this._emitCompleteOnItems('remove', removeItems);

    // bail if no items to remove
    if (!removeItems || !removeItems.length) {
      return;
    }

    for (var i = 0, len = removeItems.length; i < len; i++) {
      var item = removeItems[i];
      item.remove();
      // remove item from collection
      utils.removeFrom(this.items, item);
    }
  };

  // ----- destroy ----- //

  // remove and disable Outlayer instance
  Outlayer.prototype.destroy = function () {
    // clean up dynamic styles
    var style = this.element.style;
    style.height = '';
    style.position = '';
    style.width = '';
    // destroy items
    for (var i = 0, len = this.items.length; i < len; i++) {
      var item = this.items[i];
      item.destroy();
    }

    this.unbindResize();

    var id = this.element.outlayerGUID;
    delete instances[id]; // remove reference to instance by id
    delete this.element.outlayerGUID;
    // remove data for jQuery
    if (jQuery) {
      jQuery.removeData(this.element, this.constructor.namespace);
    }
  };

  // -------------------------- data -------------------------- //

  /**
   * get Outlayer instance from element
   * @param {Element} elem
   * @returns {Outlayer}
   */
  Outlayer.data = function (elem) {
    elem = utils.getQueryElement(elem);
    var id = elem && elem.outlayerGUID;
    return id && instances[id];
  };

  // -------------------------- create Outlayer class -------------------------- //

  /**
   * create a layout class
   * @param {String} namespace
   */
  Outlayer.create = function (namespace, options) {
    // sub-class Outlayer
    function Layout() {
      Outlayer.apply(this, arguments);
    }
    // inherit Outlayer prototype, use Object.create if there
    if (Object.create) {
      Layout.prototype = Object.create(Outlayer.prototype);
    } else {
      utils.extend(Layout.prototype, Outlayer.prototype);
    }
    // set contructor, used for namespace and Item
    Layout.prototype.constructor = Layout;

    Layout.defaults = utils.extend({}, Outlayer.defaults);
    // apply new options
    utils.extend(Layout.defaults, options);
    // keep prototype.settings for backwards compatibility (Packery v1.2.0)
    Layout.prototype.settings = {};

    Layout.namespace = namespace;

    Layout.data = Outlayer.data;

    // sub-class Item
    Layout.Item = function LayoutItem() {
      Item.apply(this, arguments);
    };

    Layout.Item.prototype = new Item();

    // -------------------------- declarative -------------------------- //

    utils.htmlInit(Layout, namespace);

    // -------------------------- jQuery bridge -------------------------- //

    // make into jQuery plugin
    if (jQuery && jQuery.bridget) {
      jQuery.bridget(namespace, Layout);
    }

    return Layout;
  };

  // ----- fin ----- //

  // back in global
  Outlayer.Item = Item;

  return Outlayer;
});

/**
 * Rect
 * low-level utility class for basic geometry
 */

(function (window, factory) {

  // universal module definition
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('packery/js/rect', factory);
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.Packery = window.Packery || {};
    window.Packery.Rect = factory();
  }
})(window, function factory() {

  // -------------------------- Packery -------------------------- //

  // global namespace
  var Packery = window.Packery = function () {};

  // -------------------------- Rect -------------------------- //

  function Rect(props) {
    // extend properties from defaults
    for (var prop in Rect.defaults) {
      this[prop] = Rect.defaults[prop];
    }

    for (prop in props) {
      this[prop] = props[prop];
    }
  }

  // make available
  Packery.Rect = Rect;

  Rect.defaults = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  /**
   * Determines whether or not this rectangle wholly encloses another rectangle or point.
   * @param {Rect} rect
   * @returns {Boolean}
  **/
  Rect.prototype.contains = function (rect) {
    // points don't have width or height
    var otherWidth = rect.width || 0;
    var otherHeight = rect.height || 0;
    return this.x <= rect.x && this.y <= rect.y && this.x + this.width >= rect.x + otherWidth && this.y + this.height >= rect.y + otherHeight;
  };

  /**
   * Determines whether or not the rectangle intersects with another.
   * @param {Rect} rect
   * @returns {Boolean}
  **/
  Rect.prototype.overlaps = function (rect) {
    var thisRight = this.x + this.width;
    var thisBottom = this.y + this.height;
    var rectRight = rect.x + rect.width;
    var rectBottom = rect.y + rect.height;

    // http://stackoverflow.com/a/306332
    return this.x < rectRight && thisRight > rect.x && this.y < rectBottom && thisBottom > rect.y;
  };

  /**
   * @param {Rect} rect - the overlapping rect
   * @returns {Array} freeRects - rects representing the area around the rect
  **/
  Rect.prototype.getMaximalFreeRects = function (rect) {

    // if no intersection, return false
    if (!this.overlaps(rect)) {
      return false;
    }

    var freeRects = [];
    var freeRect;

    var thisRight = this.x + this.width;
    var thisBottom = this.y + this.height;
    var rectRight = rect.x + rect.width;
    var rectBottom = rect.y + rect.height;

    // top
    if (this.y < rect.y) {
      freeRect = new Rect({
        x: this.x,
        y: this.y,
        width: this.width,
        height: rect.y - this.y
      });
      freeRects.push(freeRect);
    }

    // right
    if (thisRight > rectRight) {
      freeRect = new Rect({
        x: rectRight,
        y: this.y,
        width: thisRight - rectRight,
        height: this.height
      });
      freeRects.push(freeRect);
    }

    // bottom
    if (thisBottom > rectBottom) {
      freeRect = new Rect({
        x: this.x,
        y: rectBottom,
        width: this.width,
        height: thisBottom - rectBottom
      });
      freeRects.push(freeRect);
    }

    // left
    if (this.x < rect.x) {
      freeRect = new Rect({
        x: this.x,
        y: this.y,
        width: rect.x - this.x,
        height: this.height
      });
      freeRects.push(freeRect);
    }

    return freeRects;
  };

  Rect.prototype.canFit = function (rect) {
    return this.width >= rect.width && this.height >= rect.height;
  };

  return Rect;
});

/**
 * Packer
 * bin-packing algorithm
 */

(function (window, factory) {

  // universal module definition
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('packery/js/packer', ['./rect'], factory);
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory(require('./rect'));
  } else {
    // browser global
    var Packery = window.Packery = window.Packery || {};
    Packery.Packer = factory(Packery.Rect);
  }
})(window, function factory(Rect) {

  // -------------------------- Packer -------------------------- //

  /**
   * @param {Number} width
   * @param {Number} height
   * @param {String} sortDirection
   *   topLeft for vertical, leftTop for horizontal
   */
  function Packer(width, height, sortDirection) {
    this.width = width || 0;
    this.height = height || 0;
    this.sortDirection = sortDirection || 'downwardLeftToRight';

    this.reset();
  }

  Packer.prototype.reset = function () {
    this.spaces = [];
    this.newSpaces = [];

    var initialSpace = new Rect({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    });

    this.spaces.push(initialSpace);
    // set sorter
    this.sorter = sorters[this.sortDirection] || sorters.downwardLeftToRight;
  };

  // change x and y of rect to fit with in Packer's available spaces
  Packer.prototype.pack = function (rect) {
    for (var i = 0, len = this.spaces.length; i < len; i++) {
      var space = this.spaces[i];
      if (space.canFit(rect)) {
        this.placeInSpace(rect, space);
        break;
      }
    }
  };

  Packer.prototype.placeInSpace = function (rect, space) {
    // place rect in space
    rect.x = space.x;
    rect.y = space.y;

    this.placed(rect);
  };

  // update spaces with placed rect
  Packer.prototype.placed = function (rect) {
    // update spaces
    var revisedSpaces = [];
    for (var i = 0, len = this.spaces.length; i < len; i++) {
      var space = this.spaces[i];
      var newSpaces = space.getMaximalFreeRects(rect);
      // add either the original space or the new spaces to the revised spaces
      if (newSpaces) {
        revisedSpaces.push.apply(revisedSpaces, newSpaces);
      } else {
        revisedSpaces.push(space);
      }
    }

    this.spaces = revisedSpaces;

    this.mergeSortSpaces();
  };

  Packer.prototype.mergeSortSpaces = function () {
    // remove redundant spaces
    Packer.mergeRects(this.spaces);
    this.spaces.sort(this.sorter);
  };

  // add a space back
  Packer.prototype.addSpace = function (rect) {
    this.spaces.push(rect);
    this.mergeSortSpaces();
  };

  // -------------------------- utility functions -------------------------- //

  /**
   * Remove redundant rectangle from array of rectangles
   * @param {Array} rects: an array of Rects
   * @returns {Array} rects: an array of Rects
  **/
  Packer.mergeRects = function (rects) {
    for (var i = 0, len = rects.length; i < len; i++) {
      var rect = rects[i];
      // skip over this rect if it was already removed
      if (!rect) {
        continue;
      }
      // clone rects we're testing, remove this rect
      var compareRects = rects.slice(0);
      // do not compare with self
      compareRects.splice(i, 1);
      // compare this rect with others
      var removedCount = 0;
      for (var j = 0, jLen = compareRects.length; j < jLen; j++) {
        var compareRect = compareRects[j];
        // if this rect contains another,
        // remove that rect from test collection
        var indexAdjust = i > j ? 0 : 1;
        if (rect.contains(compareRect)) {
          // console.log( 'current test rects:' + testRects.length, testRects );
          // console.log( i, j, indexAdjust, rect, compareRect );
          rects.splice(j + indexAdjust - removedCount, 1);
          removedCount++;
        }
      }
    }

    return rects;
  };

  // -------------------------- sorters -------------------------- //

  // functions for sorting rects in order
  var sorters = {
    // top down, then left to right
    downwardLeftToRight: function (a, b) {
      return a.y - b.y || a.x - b.x;
    },
    // left to right, then top down
    rightwardTopToBottom: function (a, b) {
      return a.x - b.x || a.y - b.y;
    }
  };

  // --------------------------  -------------------------- //

  return Packer;
});
/**
 * Packery Item Element
**/

(function (window, factory) {

  // universal module definition

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('packery/js/item', ['get-style-property/get-style-property', 'outlayer/outlayer', './rect'], factory);
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory(require('desandro-get-style-property'), require('outlayer'), require('./rect'));
  } else {
    // browser global
    window.Packery.Item = factory(window.getStyleProperty, window.Outlayer, window.Packery.Rect);
  }
})(window, function factory(getStyleProperty, Outlayer, Rect) {

  // -------------------------- Item -------------------------- //

  var transformProperty = getStyleProperty('transform');

  // sub-class Item
  var Item = function PackeryItem() {
    Outlayer.Item.apply(this, arguments);
  };

  Item.prototype = new Outlayer.Item();

  var protoCreate = Item.prototype._create;
  Item.prototype._create = function () {
    // call default _create logic
    protoCreate.call(this);
    this.rect = new Rect();
    // rect used for placing, in drag or Packery.fit()
    this.placeRect = new Rect();
  };

  // -------------------------- drag -------------------------- //

  Item.prototype.dragStart = function () {
    this.getPosition();
    this.removeTransitionStyles();
    // remove transform property from transition
    if (this.isTransitioning && transformProperty) {
      this.element.style[transformProperty] = 'none';
    }
    this.getSize();
    // create place rect, used for position when dragged then dropped
    // or when positioning
    this.isPlacing = true;
    this.needsPositioning = false;
    this.positionPlaceRect(this.position.x, this.position.y);
    this.isTransitioning = false;
    this.didDrag = false;
  };

  /**
   * handle item when it is dragged
   * @param {Number} x - horizontal position of dragged item
   * @param {Number} y - vertical position of dragged item
   */
  Item.prototype.dragMove = function (x, y) {
    this.didDrag = true;
    var packerySize = this.layout.size;
    x -= packerySize.paddingLeft;
    y -= packerySize.paddingTop;
    this.positionPlaceRect(x, y);
  };

  Item.prototype.dragStop = function () {
    this.getPosition();
    var isDiffX = this.position.x != this.placeRect.x;
    var isDiffY = this.position.y != this.placeRect.y;
    // set post-drag positioning flag
    this.needsPositioning = isDiffX || isDiffY;
    // reset flag
    this.didDrag = false;
  };

  // -------------------------- placing -------------------------- //

  /**
   * position a rect that will occupy space in the packer
   * @param {Number} x
   * @param {Number} y
   * @param {Boolean} isMaxYContained
   */
  Item.prototype.positionPlaceRect = function (x, y, isMaxYOpen) {
    this.placeRect.x = this.getPlaceRectCoord(x, true);
    this.placeRect.y = this.getPlaceRectCoord(y, false, isMaxYOpen);
  };

  /**
   * get x/y coordinate for place rect
   * @param {Number} coord - x or y
   * @param {Boolean} isX
   * @param {Boolean} isMaxOpen - does not limit value to outer bound
   * @returns {Number} coord - processed x or y
   */
  Item.prototype.getPlaceRectCoord = function (coord, isX, isMaxOpen) {
    var measure = isX ? 'Width' : 'Height';
    var size = this.size['outer' + measure];
    var segment = this.layout[isX ? 'columnWidth' : 'rowHeight'];
    var parentSize = this.layout.size['inner' + measure];

    // additional parentSize calculations for Y
    if (!isX) {
      parentSize = Math.max(parentSize, this.layout.maxY);
      // prevent gutter from bumping up height when non-vertical grid
      if (!this.layout.rowHeight) {
        parentSize -= this.layout.gutter;
      }
    }

    var max;

    if (segment) {
      segment += this.layout.gutter;
      // allow for last column to reach the edge
      parentSize += isX ? this.layout.gutter : 0;
      // snap to closest segment
      coord = Math.round(coord / segment);
      // contain to outer bound
      // contain non-growing bound, allow growing bound to grow
      var mathMethod;
      if (this.layout.options.isHorizontal) {
        mathMethod = !isX ? 'floor' : 'ceil';
      } else {
        mathMethod = isX ? 'floor' : 'ceil';
      }
      var maxSegments = Math[mathMethod](parentSize / segment);
      maxSegments -= Math.ceil(size / segment);
      max = maxSegments;
    } else {
      max = parentSize - size;
    }

    coord = isMaxOpen ? coord : Math.min(coord, max);
    coord *= segment || 1;

    return Math.max(0, coord);
  };

  Item.prototype.copyPlaceRectPosition = function () {
    this.rect.x = this.placeRect.x;
    this.rect.y = this.placeRect.y;
  };

  // -----  ----- //

  // remove element from DOM
  Item.prototype.removeElem = function () {
    this.element.parentNode.removeChild(this.element);
    // add space back to packer
    this.layout.packer.addSpace(this.rect);
    this.emitEvent('remove', [this]);
  };

  // -----  ----- //

  return Item;
});

/*!
 * Packery v1.4.3
 * bin-packing layout library
 *
 * Licensed GPLv3 for open source use
 * or Flickity Commercial License for commercial use
 *
 * http://packery.metafizzy.co
 * Copyright 2015 Metafizzy
 */

(function (window, factory) {

  // universal module definition
  if (typeof define == 'function' && define.amd) {
    // AMD
    define(['classie/classie', 'get-size/get-size', 'outlayer/outlayer', 'packery/js/rect', 'packery/js/packer', 'packery/js/item'], factory);
  } else if (typeof exports == 'object') {
    // CommonJS
    module.exports = factory(require('desandro-classie'), require('get-size'), require('outlayer'), require('./rect'), require('./packer'), require('./item'));
  } else {
    // browser global
    window.Packery = factory(window.classie, window.getSize, window.Outlayer, window.Packery.Rect, window.Packery.Packer, window.Packery.Item);
  }
})(window, function factory(classie, getSize, Outlayer, Rect, Packer, Item) {

  // ----- Rect ----- //

  // allow for pixel rounding errors IE8-IE11 & Firefox; #227
  Rect.prototype.canFit = function (rect) {
    return this.width >= rect.width - 1 && this.height >= rect.height - 1;
  };

  // -------------------------- Packery -------------------------- //

  // create an Outlayer layout class
  var Packery = Outlayer.create('packery');
  Packery.Item = Item;

  Packery.prototype._create = function () {
    // call super
    Outlayer.prototype._create.call(this);

    // initial properties
    this.packer = new Packer();

    // Left over from v1.0
    this.stamp(this.options.stamped);

    // create drag handlers
    var _this = this;
    this.handleDraggabilly = {
      dragStart: function () {
        _this.itemDragStart(this.element);
      },
      dragMove: function () {
        _this.itemDragMove(this.element, this.position.x, this.position.y);
      },
      dragEnd: function () {
        _this.itemDragEnd(this.element);
      }
    };

    this.handleUIDraggable = {
      start: function handleUIDraggableStart(event, ui) {
        // HTML5 may trigger dragstart, dismiss HTML5 dragging
        if (!ui) {
          return;
        }
        _this.itemDragStart(event.currentTarget);
      },
      drag: function handleUIDraggableDrag(event, ui) {
        if (!ui) {
          return;
        }
        _this.itemDragMove(event.currentTarget, ui.position.left, ui.position.top);
      },
      stop: function handleUIDraggableStop(event, ui) {
        if (!ui) {
          return;
        }
        _this.itemDragEnd(event.currentTarget);
      }
    };
  };

  // ----- init & layout ----- //

  /**
   * logic before any new layout
   */
  Packery.prototype._resetLayout = function () {
    this.getSize();

    this._getMeasurements();

    // reset packer
    var packer = this.packer;
    // packer settings, if horizontal or vertical
    if (this.options.isHorizontal) {
      packer.width = Number.POSITIVE_INFINITY;
      packer.height = this.size.innerHeight + this.gutter;
      packer.sortDirection = 'rightwardTopToBottom';
    } else {
      packer.width = this.size.innerWidth + this.gutter;
      packer.height = Number.POSITIVE_INFINITY;
      packer.sortDirection = 'downwardLeftToRight';
    }

    packer.reset();

    // layout
    this.maxY = 0;
    this.maxX = 0;
  };

  /**
   * update columnWidth, rowHeight, & gutter
   * @private
   */
  Packery.prototype._getMeasurements = function () {
    this._getMeasurement('columnWidth', 'width');
    this._getMeasurement('rowHeight', 'height');
    this._getMeasurement('gutter', 'width');
  };

  Packery.prototype._getItemLayoutPosition = function (item) {
    this._packItem(item);
    return item.rect;
  };

  /**
   * layout item in packer
   * @param {Packery.Item} item
   */
  Packery.prototype._packItem = function (item) {
    this._setRectSize(item.element, item.rect);
    // pack the rect in the packer
    this.packer.pack(item.rect);
    this._setMaxXY(item.rect);
  };

  /**
   * set max X and Y value, for size of container
   * @param {Packery.Rect} rect
   * @private
   */
  Packery.prototype._setMaxXY = function (rect) {
    this.maxX = Math.max(rect.x + rect.width, this.maxX);
    this.maxY = Math.max(rect.y + rect.height, this.maxY);
  };

  /**
   * set the width and height of a rect, applying columnWidth and rowHeight
   * @param {Element} elem
   * @param {Packery.Rect} rect
   */
  Packery.prototype._setRectSize = function (elem, rect) {
    var size = getSize(elem);
    var w = size.outerWidth;
    var h = size.outerHeight;
    // size for columnWidth and rowHeight, if available
    // only check if size is non-zero, #177
    if (w || h) {
      w = this._applyGridGutter(w, this.columnWidth);
      h = this._applyGridGutter(h, this.rowHeight);
    }
    // rect must fit in packer
    rect.width = Math.min(w, this.packer.width);
    rect.height = Math.min(h, this.packer.height);
  };

  /**
   * fits item to columnWidth/rowHeight and adds gutter
   * @param {Number} measurement - item width or height
   * @param {Number} gridSize - columnWidth or rowHeight
   * @returns measurement
   */
  Packery.prototype._applyGridGutter = function (measurement, gridSize) {
    // just add gutter if no gridSize
    if (!gridSize) {
      return measurement + this.gutter;
    }
    gridSize += this.gutter;
    // fit item to columnWidth/rowHeight
    var remainder = measurement % gridSize;
    var mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';
    measurement = Math[mathMethod](measurement / gridSize) * gridSize;
    return measurement;
  };

  Packery.prototype._getContainerSize = function () {
    if (this.options.isHorizontal) {
      return {
        width: this.maxX - this.gutter
      };
    } else {
      return {
        height: this.maxY - this.gutter
      };
    }
  };

  // -------------------------- stamp -------------------------- //

  /**
   * makes space for element
   * @param {Element} elem
   */
  Packery.prototype._manageStamp = function (elem) {

    var item = this.getItem(elem);
    var rect;
    if (item && item.isPlacing) {
      rect = item.placeRect;
    } else {
      var offset = this._getElementOffset(elem);
      rect = new Rect({
        x: this.options.isOriginLeft ? offset.left : offset.right,
        y: this.options.isOriginTop ? offset.top : offset.bottom
      });
    }

    this._setRectSize(elem, rect);
    // save its space in the packer
    this.packer.placed(rect);
    this._setMaxXY(rect);
  };

  // -------------------------- methods -------------------------- //

  function verticalSorter(a, b) {
    return a.position.y - b.position.y || a.position.x - b.position.x;
  }

  function horizontalSorter(a, b) {
    return a.position.x - b.position.x || a.position.y - b.position.y;
  }

  Packery.prototype.sortItemsByPosition = function () {
    var sorter = this.options.isHorizontal ? horizontalSorter : verticalSorter;
    this.items.sort(sorter);
  };

  /**
   * Fit item element in its current position
   * Packery will position elements around it
   * useful for expanding elements
   *
   * @param {Element} elem
   * @param {Number} x - horizontal destination position, optional
   * @param {Number} y - vertical destination position, optional
   */
  Packery.prototype.fit = function (elem, x, y) {
    var item = this.getItem(elem);
    if (!item) {
      return;
    }

    // prepare internal properties
    this._getMeasurements();

    // stamp item to get it out of layout
    this.stamp(item.element);
    // required for positionPlaceRect
    item.getSize();
    // set placing flag
    item.isPlacing = true;
    // fall back to current position for fitting
    x = x === undefined ? item.rect.x : x;
    y = y === undefined ? item.rect.y : y;

    // position it best at its destination
    item.positionPlaceRect(x, y, true);

    this._bindFitEvents(item);
    item.moveTo(item.placeRect.x, item.placeRect.y);
    // layout everything else
    this.layout();

    // return back to regularly scheduled programming
    this.unstamp(item.element);
    this.sortItemsByPosition();
    // un set placing flag, back to normal
    item.isPlacing = false;
    // copy place rect position
    item.copyPlaceRectPosition();
  };

  /**
   * emit event when item is fit and other items are laid out
   * @param {Packery.Item} item
   * @private
   */
  Packery.prototype._bindFitEvents = function (item) {
    var _this = this;
    var ticks = 0;
    function tick() {
      ticks++;
      if (ticks != 2) {
        return;
      }
      _this.dispatchEvent('fitComplete', null, [item]);
    }
    // when item is laid out
    item.on('layout', function () {
      tick();
      return true;
    });
    // when all items are laid out
    this.on('layoutComplete', function () {
      tick();
      return true;
    });
  };

  // -------------------------- resize -------------------------- //

  // debounced, layout on resize
  Packery.prototype.resize = function () {
    // don't trigger if size did not change
    var size = getSize(this.element);
    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    var hasSizes = this.size && size;
    var innerSize = this.options.isHorizontal ? 'innerHeight' : 'innerWidth';
    if (hasSizes && size[innerSize] == this.size[innerSize]) {
      return;
    }

    this.layout();
  };

  // -------------------------- drag -------------------------- //

  /**
   * handle an item drag start event
   * @param {Element} elem
   */
  Packery.prototype.itemDragStart = function (elem) {
    this.stamp(elem);
    var item = this.getItem(elem);
    if (item) {
      item.dragStart();
    }
  };

  /**
   * handle an item drag move event
   * @param {Element} elem
   * @param {Number} x - horizontal change in position
   * @param {Number} y - vertical change in position
   */
  Packery.prototype.itemDragMove = function (elem, x, y) {
    var item = this.getItem(elem);
    if (item) {
      item.dragMove(x, y);
    }

    // debounce
    var _this = this;
    // debounce triggering layout
    function delayed() {
      _this.layout();
      delete _this.dragTimeout;
    }

    this.clearDragTimeout();

    this.dragTimeout = setTimeout(delayed, 40);
  };

  Packery.prototype.clearDragTimeout = function () {
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
    }
  };

  /**
   * handle an item drag end event
   * @param {Element} elem
   */
  Packery.prototype.itemDragEnd = function (elem) {
    var item = this.getItem(elem);
    var itemDidDrag;
    if (item) {
      itemDidDrag = item.didDrag;
      item.dragStop();
    }
    // if elem didn't move, or if it doesn't need positioning
    // unignore and unstamp and call it a day
    if (!item || !itemDidDrag && !item.needsPositioning) {
      this.unstamp(elem);
      return;
    }
    // procced with dragged item

    classie.add(item.element, 'is-positioning-post-drag');

    // save this var, as it could get reset in dragStart
    var onLayoutComplete = this._getDragEndLayoutComplete(elem, item);

    if (item.needsPositioning) {
      item.on('layout', onLayoutComplete);
      item.moveTo(item.placeRect.x, item.placeRect.y);
    } else if (item) {
      // item didn't need placement
      item.copyPlaceRectPosition();
    }

    this.clearDragTimeout();
    this.on('layoutComplete', onLayoutComplete);
    this.layout();
  };

  /**
   * get drag end callback
   * @param {Element} elem
   * @param {Packery.Item} item
   * @returns {Function} onLayoutComplete
   */
  Packery.prototype._getDragEndLayoutComplete = function (elem, item) {
    var itemNeedsPositioning = item && item.needsPositioning;
    var completeCount = 0;
    var asyncCount = itemNeedsPositioning ? 2 : 1;
    var _this = this;

    return function onLayoutComplete() {
      completeCount++;
      // don't proceed if not complete
      if (completeCount != asyncCount) {
        return true;
      }
      // reset item
      if (item) {
        classie.remove(item.element, 'is-positioning-post-drag');
        item.isPlacing = false;
        item.copyPlaceRectPosition();
      }

      _this.unstamp(elem);
      // only sort when item moved
      _this.sortItemsByPosition();

      // emit item drag event now that everything is done
      if (itemNeedsPositioning) {
        _this.dispatchEvent('dragItemPositioned', null, [item]);
      }
      // listen once
      return true;
    };
  };

  /**
   * binds Draggabilly events
   * @param {Draggabilly} draggie
   */
  Packery.prototype.bindDraggabillyEvents = function (draggie) {
    draggie.on('dragStart', this.handleDraggabilly.dragStart);
    draggie.on('dragMove', this.handleDraggabilly.dragMove);
    draggie.on('dragEnd', this.handleDraggabilly.dragEnd);
  };

  /**
   * binds jQuery UI Draggable events
   * @param {jQuery} $elems
   */
  Packery.prototype.bindUIDraggableEvents = function ($elems) {
    $elems.on('dragstart', this.handleUIDraggable.start).on('drag', this.handleUIDraggable.drag).on('dragstop', this.handleUIDraggable.stop);
  };

  Packery.Rect = Rect;
  Packery.Packer = Packer;

  return Packery;
});
;/* Sticky Footer */

/*(function($) {

  var $footer = $('#footer-container'); // only search once

  $(window).bind('load resize orientationChange', function () {

    var pos = $footer.position(),
        height = ($(window).height() - pos.top) - ($footer.height() -1);

    if (height > 0) {
       $footer.css('margin-top', height);
    }

  });

})(jQuery);*/
"use strict";