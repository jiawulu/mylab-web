/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */

;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+/, '').replace(/\s+$/, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()
var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
    // and document fragment node types.
    elementTypes = [1, 3, 8, 9, 11],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    toString = ({}).toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function isFunction(value) { return toString.call(value) == "[object Function]" }
  function isObject(value) { return value instanceof Object }
  function isPlainObject(value) {
    var key, ctor
    if (toString.call(value) !== "[object Object]") return false
    ctor = (isFunction(value.constructor) && value.constructor.prototype)
    if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
    for (key in value);
    return key === undefined || hasOwnProperty.call(value, key)
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return array.filter(function(item){ return item !== undefined && item !== null }) }
  function flatten(array) { return array.length > 0 ? [].concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return array.filter(function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name) {
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'
    var container = containers[name]
    container.innerHTML = '' + html
    return $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = arguments.callee.prototype
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // if a JavaScript object is given, return a copy of it
      // this is a somewhat peculiar option, but supported by
      // jQuery so we'll do it, too
      else if (isPlainObject(selector))
        dom = [$.extend({}, selector)], selector = null
      // wrap stuff like `document` or `window`
      else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, whichs makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    slice.call(arguments, 1).forEach(function(source) {
      for (key in source)
        if (source[key] !== undefined)
          target[key] = source[key]
    })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (element === document && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : emptyArray ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  function funcArg(context, arg, idx, payload) {
   return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  $.isFunction = isFunction
  $.isObject = isObject
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $.map(this, function(el, i){ return fn.call(el, i, el) })
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      this.forEach(function(el, idx){ callback.call(el, idx, el) })
      return this
    },
    filter: function(selector){
      return $([].filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result
      if (this.length == 1) result = zepto.qsa(this[0], selector)
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return $(result)
    },
    closest: function(selector, context){
      var node = this[0]
      while (node && !zepto.matches(node, selector))
        node = node !== context && node !== document && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return slice.call(this.children) }), selector)
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return slice.call(el.parentNode.children).filter(function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return this.map(function(){ return this[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(newContent){
      return this.each(function(){
        $(this).wrapAll($(newContent)[0].cloneNode(false))
      })
    },
    wrapAll: function(newContent){
      if (this[0]) {
        $(this[0]).before(newContent = $(newContent))
        newContent.append(this)
      }
      return this
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return $(this.map(function(){ return this.cloneNode(true) }))
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
    },
    prev: function(){ return $(this.pluck('previousElementSibling')) },
    next: function(){ return $(this.pluck('nextElementSibling')) },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) this.setAttribute(key, name[key])
          else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ if (this.nodeType === 1) this.removeAttribute(name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] ? this[0][name] : undefined) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? data : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this.length > 0 ? this[0].value : undefined) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(){
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
      }
    },
    css: function(property, value){
      if (value === undefined && typeof property == 'string')
        return (
          this.length == 0
            ? undefined
            : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      for (key in property)
        if(typeof property[key] == 'string' && property[key] == '')
          this.each(function(){ this.style.removeProperty(dasherize(key)) })
        else
          css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

      if (typeof property == 'string')
        if (value == '')
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (this.length < 1) return false
      else return classRE(name).test(this[0].className)
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = this.className, newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined)
          return this.className = ''
        classList = this.className
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        this.className = classList.trim()
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var newName = funcArg(this, name, idx, this.className)
        ;(when === undefined ? !$(this).hasClass(newName) : when) ?
          $(this).addClass(newName) : $(this).removeClass(newName)
      })
    }
  }

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
        this[0] == document ? document.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        var el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function insert(operator, target, node) {
    var parent = (operator % 2) ? target : target.parentNode
    parent ? parent.insertBefore(node,
      !operator ? target.nextSibling :      // after
      operator == 1 ? parent.firstChild :   // prepend
      operator == 2 ? target :              // before
      null) :                               // append
      $(node).remove()
  }

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(key, operator) {
    $.fn[key] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var nodes = $.map(arguments, function(n){ return isObject(n) ? n : zepto.fragment(n) })
      if (nodes.length < 1) return this
      var size = this.length, copyByClone = size > 1, inReverse = operator < 2

      return this.each(function(index, target){
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[inReverse ? nodes.length-i-1 : i]
          traverseNode(node, function(node){
            if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
              window['eval'].call(window, node.innerHTML)
          })
          if (copyByClone && index < size - 1) node = node.cloneNode(true)
          insert(operator, target, node)
        }
      })
    }

    $.fn[(operator % 2) ? key+'To' : 'insert'+(operator ? 'Before' : 'After')] = function(html){
      $(html)[key](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.camelize = camelize
  zepto.uniq = uniq
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)
;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={}

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.isObject(events)) $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function add(element, events, fn, selector, getDelegate, capture){
    capture = !!capture
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var delegate = getDelegate && getDelegate(fn, event),
        callback = delegate || fn
      var proxyfn = function (event) {
        var result = callback.apply(element, [event].concat(event.data))
        if (result === false) event.preventDefault()
        return result
      }
      var handler = $.extend(parse(event), {fn: fn, proxy: proxyfn, sel: selector, del: delegate, i: set.length})
      set.push(handler)
      element.addEventListener(handler.e, proxyfn, capture)
    })
  }
  function remove(element, events, fn, selector){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(handler.e, handler.proxy, false)
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var proxy = $.extend({originalEvent: event}, event)
    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    var capture = false
    if(event == 'blur' || event == 'focus'){
      if($.iswebkit)
        event = event == 'blur' ? 'focusout' : event == 'focus' ? 'focusin' : event
      else
        capture = true
    }

    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      }, capture)
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.bind(event, selector) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.unbind(event, selector) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string') event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback){ return this.bind(event, callback) }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else if (this.length) try { this.get(0)[name]() } catch(e){}
      return this
    }
  })

  $.Event = function(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    return event
  }

})(Zepto)
;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

    // todo clean this up with a better OS/browser
    // separation. we need to discern between multiple
    // browsers on android, and decide if kindle fire in
    // silk mode is android or not

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)
;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    clearProperties = {}

  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  clearProperties[prefix + 'transition-property'] =
  clearProperties[prefix + 'transition-duration'] =
  clearProperties[prefix + 'transition-timing-function'] =
  clearProperties[prefix + 'animation-name'] =
  clearProperties[prefix + 'animation-duration'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = duration / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var transforms, cssProperties = {}, key, that = this, wrappedCallback, endEvent = $.fx.transitionEnd
    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssProperties[prefix + 'animation-name'] = properties
      cssProperties[prefix + 'animation-duration'] = duration + 's'
      endEvent = $.fx.animationEnd
    } else {
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) {
          transforms || (transforms = [])
          transforms.push(key + '(' + properties[key] + ')')
        }
        else cssProperties[key] = properties[key]

      if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
      if (!$.fx.off && typeof properties === 'object') {
        cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
        cssProperties[prefix + 'transition-duration'] = duration + 's'
        cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, arguments.callee)
      }
      $(this).css(clearProperties)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    setTimeout(function() {
      that.css(cssProperties)
      if (duration <= 0) setTimeout(function() {
        that.each(function(){ wrappedCallback.call(this) })
      }, 0)
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;(function($){
  var jsonpID = 0,
      isObject = $.isObject,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      abort = function(){
        $(script).remove()
        if (callbackName in window) window[callbackName] = empty
        ajaxComplete('abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (options.error) script.onerror = function() {
      xhr.abort()
      options.error()
    }

    window[callbackName] = function(data){
      clearTimeout(abortTimeout)
      $(script).remove()
      delete window[callbackName]
      ajaxSuccess(data, xhr, options)
    }

    serializeData(options)
    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.abort()
        ajaxComplete('timeout', xhr, options)
      }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0
  }

  function mimeToDataType(mime) {
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (isObject(options.data)) options.data = $.param(options.data)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = $.ajaxSettings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, 'error', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  $.get = function(url, success){ return $.ajax({ url: url, success: success }) }

  $.post = function(url, data, success, dataType){
    if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
    return $.ajax({ type: 'POST', url: url, data: data, success: success, dataType: dataType })
  }

  $.getJSON = function(url, success){
    return $.ajax({ url: url, success: success, dataType: 'json' })
  }

  $.fn.load = function(url, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector
    if (parts.length > 1) url = parts[0], selector = parts[1]
    $.get(url, function(response){
      self.html(selector ?
        $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html()
        : response)
      success && success.call(self)
    })
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var array = $.isArray(obj)
    $.each(obj, function(key, value) {
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (traditional ? $.isArray(value) : isObject(value))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace('%20', '+')
  }
})(Zepto)
;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)
;(function($){
  var touch = {}, touchTimeout

  function parentIfText(node){
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2){
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  var longTapDelay = 750, longTapTimeout

  function longTap(){
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap(){
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  $(document).ready(function(){
    var now, delta

    $(document.body).bind('touchstart', function(e){
      now = Date.now()
      delta = now - (touch.last || now)
      touch.el = $(parentIfText(e.touches[0].target))
      touchTimeout && clearTimeout(touchTimeout)
      touch.x1 = e.touches[0].pageX
      touch.y1 = e.touches[0].pageY
      if (delta > 0 && delta <= 250) touch.isDoubleTap = true
      touch.last = now
      longTapTimeout = setTimeout(longTap, longTapDelay)
    }).bind('touchmove', function(e){
      cancelLongTap()
      touch.x2 = e.touches[0].pageX
      touch.y2 = e.touches[0].pageY
    }).bind('touchend', function(e){
       cancelLongTap()

      // double tap (tapped twice within 250ms)
      if (touch.isDoubleTap) {
        touch.el.trigger('doubleTap')
        touch = {}

      // swipe
      } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                 (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
        touch.el.trigger('swipe') &&
          touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
        touch = {}

      // normal tap
      } else if ('last' in touch) {
        touch.el.trigger('tap')

        touchTimeout = setTimeout(function(){
          touchTimeout = null
          touch.el.trigger('singleTap')
          touch = {}
        }, 250)
      }
    }).bind('touchcancel', function(){
      if (touchTimeout) clearTimeout(touchTimeout)
      if (longTapTimeout) clearTimeout(longTapTimeout)
      longTapTimeout = touchTimeout = null
      touch = {}
    })
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto)
;
//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);
//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.Zepto;
  //var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function(lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }

  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, value, options) {
      var attrs, attr, val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) attrs[attr] = void 0;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function(resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) this._pending[attr] = true;

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, index, length, model, cid, id, cids = {}, ids = {}, dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || ((id != null) && (ids[id] || this._byId[id]))) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({silent: true});
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.map(this.models, function(model){ return model.get(attr); });
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      models  || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function(nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function () {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function(options) {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      Backbone.history || (Backbone.history = new History);
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    }
  });

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = (element instanceof $) ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    }

  });

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);
window.App || (window.App = {});
(function($) {

  $.support || ($.support = {});

  if ($.support.fixedPosition == null) {
    $.support.fixedPosition = (function() {
      var isSupported = null;
      if (document.createElement) {
        var el = document.createElement("div");
        if (el && el.style) {
          el.style.position = "fixed";
          el.style.top = "10px";
          var root = document.body;
          if (root && root.appendChild && root.removeChild) {
            root.appendChild(el);
            isSupported = el.offsetTop === 10;
            root.removeChild(el);
          }
        }
      }
      return isSupported;
    })();
  }

  window.H5 || (window.H5 = {});

  window.H5.notify = function(message) {
    $('.float-notify').remove();
    $('body').prepend('<div class="float-notify"><p>' + message + '</p></div>');

    var $float = $('.float-notify');
    var height = $float[0].offsetHeight;
    var scrollY = $.support.fixedPosition ? 0 : window.pageYOffset;

    $float.css('top', -height + scrollY).animate({ top: scrollY }, 200);
    setTimeout(function() {
      $float.animate({ top: -height + scrollY }, 
                   { duration: 200, easing: 'ease', complete: function() { $float.remove() } });
    }, 2000);

  };

})(Zepto);

(function($) {
  $.swipeTopTouch = function(options){
    var op = {
      el : null,
      direction : 'y',  //滑动坐标
      limitDirection : '', //控制滑动方向，空表示不控制
      limitLen : 20,  //滑动距离最小值
      noTouchFun : null, //未滑动(等同点击)执行的事件
      touchmove : null, //touchmove执行的事件
      touchend : null  //touchend执行的事件
    }
    $.extend(op,options);
    if(!op.el){return;}
    this.el = $(op.el)[0];
    this.op = op;
    this.isAndroid = (/android/gi).test(navigator.appVersion);
    //定义事件
    this._isTouch = "ontouchstart" in window;
    this._touchstart = "ontouchstart";
    this._touchmove = "ontouchmove";
    this._touchend = "ontouchend";
    if(!this._isTouch){
      this._touchstart = "onmousedown";
      this._touchmove = "onmousemove";
      this._touchend = "onmouseup";
    }
    this.init();
  }
  $.extend($.swipeTopTouch.prototype,{
    init : function(){
      var that = this;
      that.el[that._touchstart] = function(e){
        that.start.call(that,e);
      };
    },
    getXY : function(e){
      var touchs = this._isTouch ? e.touches[0] : e;
      return {x:touchs.pageX,y:touchs.pageY};
    },
    start : function(e){  //触摸开始
      var that = this;
      that._coord = that.getXY(e);
      that.el[that._touchmove] = function(e){
        that.move.call(that,e);
      };
      that.el[that._touchend] = function(e){
        that.end.call(that,e);
      };
    },
    move : function(e){
      var that = this,
      op = that.op,
      dire = op.direction.toLowerCase();
      that._moveCoord = that.getXY(e);
      var newdisX = that._moveCoord.x - that._coord.x,
      newdisY = that._moveCoord.y - that._coord.y;
      
      if(dire == 'x'){
        if(Math.abs(newdisX) - Math.abs(newdisY) > 10){  //如果是左右
          e.preventDefault();
          that._movestart = true;
        }
      }
      else if(dire == 'y'){
        if(Math.abs(newdisY) - Math.abs(newdisX) > 10){  //如果是上下
          e.preventDefault();
          that._movestart = true;
          op.touchmove && op.touchmove();
        }
      }
    },
    end : function(e){
      var that = this,
        op = that.op,
        dire = op.direction.toLowerCase(),
        limitDire = op.limitDirection.toLowerCase(),
        limitLen = op.limitLen,
        distance,
        isSure = false;
      if(that._movestart){  //如果执行了move
        e.preventDefault();
        distance = dire == 'x' ? (that._moveCoord.x - that._coord.x) : (that._moveCoord.y - that._coord.y);
        switch(limitDire){
          case 'down':case 'left':
            if(distance > limitLen){isSure = true;}
            break;
          case 'up':case 'right':
            if(distance < -limitLen){isSure = true;}
            break;
          default:
            if(Math.abs(distance) > limitLen){isSure = true;}
            break;
        }
        if(isSure && op.touchend){
          op.touchend(e);
        }
        that._movestart = false;
        distance = null;
        isSure = null;
      }
      else{
        if(op.noTouchFun){e.preventDefault();setTimeout(op.noTouchFun,that.isAndroid ? 500 : 0);}
      }
      that.el[that._touchmove] = null;
      that.el[that._touchend] = null;
      that._coord = {};
      that._moveCoord = {};
    }
  });

  $.swipeTop = function(options,self) {  
    var doc = document,
    op = {
      isInit : true,
      wrap : '',  //列表容器
      topEl : 'ttype',     //顶部容器id
      header : 'header',  //title栏id
      //category : 'favCategory',  //分类按钮id
      shade : 'J_shade',  //列表阴影id
      hShade : 'h-Shade',  //header内的阴影
      scrollArr : null,  //顶部列表容器id集合
      favScroll : null,  //iscroll对象引入
      swipeTopGap : 60,
      ease : 'ease',  //动画运动公式
      easetime : 500,  //动画持续时间
      opacity : 0.1,  //阴影透明度
      isSwipeDown : false,  //header支持下拉
      toptabHeight : 50,  //顶部页签高度
      headerHeight : 50,  //header高度
      surplusHeight : 80,  //header和阴影的高度
    };
    
    if(options){$.extend(op,options);}
    if(self){$.extend(this,self);}
    
    this.op = op;
    this.wrap = doc.getElementById(op.wrap);
    var tempwt = doc.getElementById(op.topEl);
    this.swipeTop = tempwt ? $(tempwt) : null;
    this.header = doc.getElementById(op.header);
    //this.typea = $(doc.getElementById(op.category));
    
    /*bodyHeight = $(window).height(),  //页面的高度
    newHeight = bodyHeight - surplusHeight + headerHeight,  //swipeTop的高度
    ntop = -(bodyHeight - surplusHeight),  //swipeTop的初始top值
    touchHeight = bodyHeight - surplusHeight - toptabHeight - 10,  //顶部滑块容器高度*/
    
    this.shade = $(doc.getElementById(op.shade));
    this.hShade = $(doc.getElementById(op.hShade));
    
    this.wrap.style.cssText = 'position:relative';
    //$(this.wrap).css({position:'relative','-webkit-transform':'translate(0px,0px)'});
    var header = $(this.header);
    divt = $(document.createElement('div'));
    divt.css({'height':op.headerHeight});
    header.after(divt);
    this.notop = false;  //有下拉内容
    if(this.swipeTop){
      header.addClass('header');
      header.appendTo(this.swipeTop);
    }
    else{
      this.swipeTop = header;
      this.swipeTop.css({'position':'absolute','z-index':118});
      this.notop = true;
    }
    this.topCache = {  //缓存对象
      isSlip : 0,     //header是否滑出，默认未滑出
      isShow : false,  //swipeTop是否显示
      shadeShow : false,  //shade是否显示
      isScroll : false  //是否正在滑动
    }
    if(op.isInit){
      this.init();
    }
  }
  $.extend($.swipeTop.prototype,{
    setOp : function(key,value){
      if(typeof key == 'string'){
        this['op'][key] = value;
      }
      else{
        for(var k in key){
          this['op'][k] = key[k];
        }
      }
    },
    createShade : function(){  //创建阴影
      var that = this,
      op = that.op,
      swipeTop = that.swipeTop,
      header = that.header,
      shade,hShade,
      doc = document;
      if(!doc.getElementById(op.shade)){
        shade = $(doc.createElement('div'));
        shade.attr("id","J_shade");
        shade.addClass("J_shade");
        shade.appendTo(swipeTop.parent());
        that.shade = shade;
        that.shadeTouch(shade);
      }
      if(!doc.getElementById(op.hShade) && !that.notop){
        hShade = $(doc.createElement('div'));
        hShade.attr("id","h-Shade");
        hShade.addClass("h_shade");
        hShade.appendTo(header);
        hShade.css('height',op.headerHeight);
        that.hShade = hShade;
        that.shadeTouch(hShade);
      }
    },
    init : function(scrolls){  //初始化高度
      var that = this,
      op = that.op;
      op.favScroll = scrolls || null;
      that.initHeight(1);
      that.triggerEvent();
      var resize = 'onorientationchange' in window ? 'orientationchange' : 'resize',
      isAndroid = (/android/gi).test(navigator.appVersion);
      //旋转
      if(op.scrollArr){
        window.addEventListener(resize,function(){
          setTimeout(function(){
            that.initHeight();
            if(op.scrollArr.length > 0){
              var nitem = null;
              $(op.scrollArr).each(function(n,item){
                nitem = $('#'+item);
                if(nitem.hasClass('none')){
                  nitem.parent().prev().find('li:not(.sel)').removeAttr('ajax');
                }
                else{
                  if(that['tab'+n]){that['tab'+n].refresh();}
                }
              });
            }
          },isAndroid ? 500 : 0);
        },false);
      }
      //顶部下拉
      /*if(!that.notop){  //有下拉内容
        var doc = $(document),
        touch = {},
        wrap = $(that.wrap),
        nstep = that.nstep - op.headerHeight,
        getxy = function(e){
          var ev = e.touches ? e.touches[0] : e;
          return{x:ev.pageX,y:ev.pageY};
        },
        isTouch = "ontouchstart" in window,
        _start = isTouch ? 'touchstart' : 'mousedown',
        _move = isTouch ? 'touchmove' : 'mousemove',
        _end = isTouch ? 'touchend' : 'mouseup';
        doc.bind(_start,function(e){
          var ts = getxy(e);
          touch.sx = ts.x;
          touch.sy = ts.y;
          function movefuc(e){
            var bounce = document.body.getAttribute('bounce');
            if(bounce){
              e.preventDefault();
              return;
            }
            var top = document.body.scrollTop;
            if(touch && top <= 0){  //在顶部
              touch.moved = true;
              touch.mx = getxy(e).x;
              touch.my = getxy(e).y;
              var distance = touch.my - touch.sy;
              if(distance > 10 && distance < nstep){
                wrap.css('-webkit-transform','translateY('+distance+'px)');
                e.preventDefault();
              }
            }
          }
          doc.bind(_move,movefuc);
          doc.one(_end,function(e){
            //$('#shows').html('');
            if(touch && touch.moved){
              var enddis = touch.my - touch.sy;
              if(enddis > op.swipeTopGap){
                that.showTop(enddis,'slide');
              }
              wrap.animate({translateY:0},300,'ease-out');
            }
            doc.unbind(_move,movefuc);
            touch = {};
          });
        });
      }
      else{*/
        document.addEventListener('touchmove',function(e){
          var bounce = document.body.getAttribute('bounce');
          if(bounce){
            e.preventDefault();
            return;
          }
        },false);
      //}
    },
    initHeight : function(n){
      var that = this,
      op = that.op,
      swipeTop = that.swipeTop,
      win = $(window),
      //m = n ? Math.abs(parseInt(n,10)) : 0,
      m = that.getScroll(),
      tempCache = that.topCache,
      isShow = tempCache.isShow,
      toptabHeight = op.toptabHeight,
      headerHeight = op.headerHeight,
      surplusHeight = op.surplusHeight,
      bodyHeight = win.height();
      bodyHeight = bodyHeight > 380 ? 380 : bodyHeight;
      var newHeight = bodyHeight - surplusHeight + headerHeight,
      ntop = this.ntop = -newHeight,
      nstep = this.nstep = newHeight;
      //touchHeight = bodyHeight - surplusHeight - toptabHeight - 10;
      if(that.notop){ //木有顶部下拉内容
        newHeight = headerHeight;
        ntop = this.ntop = -50;
        this.op.isSwipeDown = false;
      }
      var cssJson = {
        'height' : newHeight,
        'width' : '100%'
      },
      temptop = ntop, 
      transy = headerHeight,
      mingun = Math.min(headerHeight,m);
      if(!n){  //旋转触发
        /*temptop += m;
        if(m > 0 && !isShow){  //不在页面顶部,且顶部下拉内容未显示
          temptop -= Math.min(headerHeight,m);
        }
        else{
          if(m > headerHeight){
            temptop -= headerHeight;
          }
          else{
            temptop = ntop;
          }
        }
        if(isShow || tempCache.isSlip == 1){  //顶部下拉内容全部显示,或淘加呼出
          transy = isShow ? (transy + nstep) : (transy + Math.min(headerHeight,m));
          if(isShow && m < headerHeight){
            transy = nstep + Math.min(headerHeight,m);
          }
        }
        else{
          temptop = ntop;
        }*/
        if(m > 0 && tempCache.isSlip == 1){  //不在顶部
          transy += mingun;
          if(m > headerHeight){  //滚动距离大于header
            temptop += (m - headerHeight);
          }
        }
        if(isShow){  //顶部下拉展出
          transy = nstep + mingun;
        }
      }
      cssJson['top'] = temptop;
      cssJson['-webkit-transform'] = 'translate(0,'+transy+'px)';
      swipeTop.css(cssJson);
    },
    showShade : function(){  //显示阴影
      var that = this,
      hShade = that.hShade;
      if(!that.topCache.shadeShow){  //已显示
        that.showSingleShade();
      }
      hShade[0].style.cssText = 'opacity:'+that.op.opacity+';display:block';
      //hShade.css('opacity',op.opacity).show();
      //hShade.animate({opacity:op.opacity},op.easetime,op.ease);
    },
    showSingleShade : function(){
      var that = this,
      shade = this.shade;
      shade[0].style.cssText = 'opacity:'+that.op.opacity+';display:block';
      //shade.css('opacity',op.opacity).show();
      //shade.animate({opacity:op.opacity},op.easetime,op.ease);
    },
    editCategory : function(str){  //小箭头显示
      var that = this,
      header = $(that.header.firstElementChild);
      if(header.length == 0){return;}  //不存在则返回
      if(str == 'remove'){
        header.removeClass('c-inav-down');
      }
      else if(str == 'add'){
        header.addClass('c-inav-down');
      }
    },
    editScroll : function(bool){  //改变iscroll状态
      var that = this,
      favScroll = that.op.favScroll;
      if(!favScroll){  //原生滚动
        var nbody = document.body;
        if(bool){
          nbody.removeAttribute('bounce');
        }
        else{
          nbody.setAttribute('bounce',1);
        }
        return;
      }
      favScroll.enabled = bool;
    },
    getScroll : function(n){  //获取iscroll的y值,没有iscroll取滚动条的距离
      var that = this,
      favScroll = that.op.favScroll,
      result = 0;
      if(!favScroll){
        result = document.body.scrollTop;
      }
      else{
        result = favScroll.y;
      }
      result = n || result;
      return Math.abs(result);
    },
    swipeAni : function(str,callback){  //swipetop展示动画
      var that = this,
      op = that.op,
      swipeTop = that.swipeTop,
      top = str || 0;
      top += 'px';
      swipeTop.animate({translateY:top},op.easetime,op.ease,function(){
        callback && callback.call(this);
      });
    },
    hidetab : function(str){  //隐藏第一个实例的iscroll内容块
      var that = this,
      op = that.op;
      if(that['tab0'] && that['tabBody'] && op.scrollArr){
        var ind = that['tabBody'].index,
        scrol = $('#'+op.scrollArr[ind]);
        if(str){
          scrol.removeClass('none');
        }
        else{
          var s = setTimeout(function(){
            scrol.addClass('none');
          },0)
          clearTimeout(s);
        }
      }
    },
    hideTop : function(str){  //隐藏顶部容器
      var that = this,
      op = that.op,
      wrap = that.wrap,
      swipeTop = that.swipeTop,
      shade = that.shade,
      hShade = that.hShade,
      ntop = that.ntop,
      headerHeight = op.headerHeight,
      tdis = parseInt(swipeTop.css('top'),10) - ntop + headerHeight,
      //y = ntop + tdis,
      tempCache = that.topCache;
      
      //temdis = tempCache.isSlip == 1 ? (y-headerHeight) : y;
      if(str && str == 'noAnimate'){  //header栏呼出，点击页签切换数据，不能使用动画
        //swipeTop.css('top',ntop);
        swipeTop.css({'-webkit-transform':'translate(0,'+headerHeight+'px)',top:ntop});
        that.hidetab();
        /*if(arguments[1] && swipeTop.parent()[0].id != op.wrap){  //顶部且swipetop在wrap外
          swipeTop.appendTo(wrap);
          swipeTop.css({width:'100%'});
        }*/
      }
      else{
        //console.log(tdis,headerHeight);
        
        if(tdis > headerHeight){ //滚动距离大于header高度
          if(swipeTop.width() == 0){
            swipeTop.css({'-webkit-transform':'translate(0,'+headerHeight+'px)',top:ntop});
          }
          else{
            that.swipeAni(headerHeight,function(){this.style.top = ntop + 'px';that.hidetab();});
          }
        }
        else{
          /*if(tdis == 0 && swipeTop.parent()[0].id != op.wrap){  //顶部收回分类的时候
            swipeTop.animate({top:ntop},op.easetime,op.ease,function(){
              $(this).appendTo(wrap);
              //$(this).css({width:'100%'});
            });
          }*/
          /*else{
            //alert(tempCache.isShow);
            if(y > ntop || tempCache.isShow){  //不在顶部 || swipetop已显示
              swipeTop.animate({top:ntop},op.easetime,op.ease,function(){
                this.style.top = ntop + 'px';
              });
            }
          }*/
          
          that.swipeAni(headerHeight,function(){that.hidetab();});
        }
      }
      /*shade.animate({opacity:0},op.easetime,op.ease,function(){
        $(this).hide();
      });*/
      //shade.hide();
      shade[0].style.display = 'none';
      that.editScroll(true);
      tempCache.isSlip = 2;
      if(!tempCache.shadeShow){  //显示
        /*hShade.animate({opacity:0},op.easetime,op.ease,function(){
          $(this).hide();
        });*/
        hShade[0].style.display = 'none';
        //hShade.hide();
        tempCache.isShow = false;
        that.editCategory('remove');
      }
      tempCache.shadeShow = false;
      //显示淘加
      if(str && str == 'taojia'){return;}
      var taojia = op.taojia;
      if(taojia){
        if(taojia.st() == 2){
          taojia.circlHide();
        }
        else{
          taojia.taojiaShow();
        }
      }
    },
    showTop : function(n,scrol){  //显示顶部容器
      var doc = document,
      that = this,
      op = that.op,
      wrap = that.wrap,
      swipeTop = that.swipeTop,
      ntop = that.ntop,
      tempCache = that.topCache,
      isShow = tempCache.isShow,
      istop = n && typeof n == 'number' ? true : false,
      nstep = that['nstep'];
      that.createShade();
      //if(doc.getElementById(op.category)){that.typea = $(doc.getElementById(op.category));}
      if(!isShow){
        //favScroll.enabled = false;
        that.editScroll(false);  //阻止页面滑动
        var fy = that.getScroll(n),
        headerHeight = op.headerHeight,
        transy = Math.min(op.headerHeight,fy);
        if(istop){nstep -= headerHeight;} //在顶部下拉
        /*if(istop){ 
          swipeTop.css({top:ntop + fy});
          swipeTop.appendTo(wrap.parentNode);
        }*/
        //swipeTop.animate({top:y},op.easetime,op.ease);
        that.swipeAni(nstep + transy);
        tempCache.isShow = true;
        that.editCategory('add');
        that.showShade();
        //请求数据
        if(that.swipeDown){that.swipeDown(scrol);}
        //隐藏淘加
        if(op.taojia){
          op.taojia.taojiaHide();
        }
        if(tempCache.shadeShow){
          tempCache.shadeShow = false;//设为false以隐藏shade
        }
        that.hidetab(true);
      }
      else{
        that.hideTop();
      }
    },
    tapDown : function(){  //点淘加呼出header
      var that = this,
      swipeTop = that.swipeTop,
      tempCache = that.topCache,
      op = that.op,
      ntop = that.ntop,
      headerHeight = op.headerHeight,
      header = that.header;
      if(tempCache.isScroll){return;}  //滑动过程不允许点击
      var offy = that.getScroll(),
      toph = offy + ntop,
      temptop = toph - headerHeight,
      transy = headerHeight + Math.min(headerHeight,offy);
      //console.log(tempCache.isSlip);
      
      if(tempCache.isSlip == 1){  //已呼出
        that.hideTop('taojia');
        //if(op.isSwipeDown){header['on' + startev] = null};
        return; 
      }
      if(toph > ntop && offy > headerHeight){  //不在顶部，且看不到header栏
        swipeTop.css('top',temptop);
      }
      if(toph > ntop){  //不在顶部
        //swipeTop.animate({top:toph},op.easetime,op.ease);
        that.swipeAni(transy);
      }
      that.createShade(); //创建阴影
      that.showSingleShade();
      tempCache.isSlip = 1;
      tempCache.shadeShow = true;
      that.editScroll(false);  //阻止页面滑动
      
      //增加下拉事件
      /*if(!op.isSwipeDown){return;}  //无下拉返回
      header['on' + startev] = fucstart;
      function fucstart(e){
        var startm = gete(e),movem;
        header['on' + moveev] = fucmove;
        header['on' + endev] = fucend;
        
        function fucmove(e){
          movem = gete(e);
          var distancem = movem.y - startm.y;
          if(distancem > 5){
            header.moved = true;
            //swipeTop.css('top',toph + distancem);
            distancem += headerHeight;
            swipeTop[0].style['-webkit-transform'] = 'translate(0,'+distancem+'px)';
          }
        }
        function fucend(e){
          if(header.moved){
            var distanceend = movem.y-startm.y;
            //alert(distanceend);
            if(distanceend > 20){
              that.showTop(undefined,'slide');
              header['on' + startev] = null;
            }else{
              //swipeTop.animate({top:toph},op.easetime,op.ease);
              that.swipeAni(headerHeight);
            }
            header.moved = null;
          }
          header['on' + moveev] = null;
          header['on' + endev] = null;
        }
        function gete(e){
          var evo = isTouch ? e.touches[0] : e;
          return{x:evo.pageX,y:evo.pageY};
        }
      }*/
    },
    shadeTouch : function(item){  //阴影上滑点击
      if(!item){return;}
      var that = this;
      new $.swipeTopTouch({el:item,
        limitDirection:'up',
        noTouchFun:function(){that.hideTop();},
        touchend:function(){that.hideTop();}
      });
    },
    triggerEvent : function(){
      var that = this;
      if(that.tiggerFunc){
        that.tiggerFunc();
      }
    }
  });

})(Zepto);
(function($) {

  window.H5 = window.H5 || {};

  H5.TaoPlus = {
    initialize : function(opt){
      var that = this;
      that._opt = opt || {};
      


      //辨别环境
      var _environment = {
          init:function(){
            var _checkSysType = 'm',
            host = location.host;
            if(!host.match('m.(taobao|tmall|etao|alibaba|alipay|aliyun)')){
              if(host=='localhost' || host.match('(?:.*\\.)?waptest\\.(taobao|tmall|etao|alibaba|alipay|aliyun)\\.com.*')){
                _checkSysType = 'waptest';
              }else if (host.match('(?:.*\\.)?wapa\\.(taobao|tmall|etao|alibaba|alipay|aliyun)\\.com.*')){
                _checkSysType = 'wapa';
              }
            }
            return _checkSysType;
          }
      }

      //chrome
      if((window.navigator.userAgent).indexOf('Chrome') !=-1){
        $('body > div').addClass('chrome'); 
      }

      //判断url是否存在ttid
      var checkParam = function(){
        var url = location.search,
        param = 'ttid=',
        value,
        reg = /ttid=(\w*)(?: |&|$)/;
        if(reg.test(url)){
          value = RegExp.$1;
        }
        var result = value && ('&' + param + value) || ''
        return result;
      };

      //Dom插入
      var dom = {
       //插入DOM对象
        _generate:function(){
          var _checkSysType =  _environment.init();
          var urls = {};
        
          //urls.s = 'http://s.' + _checkSysType + '.taobao.com/search.htm';
          urls.s = 'http://' + _checkSysType + '.taobao.com/channel/act/sale/searchlist.html?pds=search%23h%23taojia' + checkParam();//搜索
          urls.cart = 'http://cart.' + _checkSysType + '.taobao.com/my_cart.htm?pds=cart%23h%23taojia' + checkParam();//购物车
          urls.my = 'http://my.' + _checkSysType + '.taobao.com/my_taobao.htm?pds=mytaobao%23h%23taojia' + checkParam();//个人中心
          urls.im = 'http://im.' + _checkSysType + '.taobao.com/ww/ad_ww_lately_contacts.htm?pds=ww%23h%23taojia' + checkParam();//旺旺
          urls.logis = 'http://tm.' + _checkSysType + '.taobao.com/order_list.htm?statusId=5&pds=wuliu%23h%23taojia' + checkParam();//物流
          //urls.home = 'http://' + _checkSysType + '.taobao.com';
          urls.more = 'http://' + _checkSysType + '.taobao.com/channel/chn/mobile/application.html?pds=apply%23h%23taojia' + checkParam();//更多
          
          var div ='<div class="taoplus" id="J_Taojia"><div class="taoplus-btn on" data-time="0"><div class="taoplus-btn-iconbox"><ul><li>t</li><li id="J_btnmsg">w</li><li>t</li></ul></div></div><div class="taoplus-main" data-total="" data-totalNew="" ><div class="circlbg"><span>o</span></div><ul class="icons"><li class="search"><a data-url="'+urls.s+'">s</a><span class="bg"><span>p</span></span></li><li class="car"><a data-url="'+urls.cart+'">u</a><span class="bg"><span>p</span></span></li><li class="individ"><a data-url="'+urls.my+'">r</a><span class="bg">p</span></li><li class="ww"><a data-url="'+urls.im+'">w</a><span class="bg">p</span></li><li class="logis"><a data-url="'+urls.logis+'">q</a><span class="bg">p</span></li><li class="more"><a data-url="'+urls.more+'">ooo</a><span class="bg">p</span></li></ul><div class="biglogo"><a data-url="http://'+_checkSysType+'.taobao.com?pds=home%23h%23taojia'+checkParam()+'">x</a><span class="biglogobg"></span></div></div></div>'
          $('body > div').append(div);
        }

      }
      
      //dom._css();
      dom._generate();

      var init = {        

        btn:$('#J_Taojia .taoplus-btn'),
        main:$('#J_Taojia .taoplus-main'),        

        //检测ua
        _browser:function(){
          var ua = navigator.userAgent;
              var filter = ['iPhone OS ', 'Android '];
              var platform={
                 'iphone':false,
                 'adnroid':false
              };
              var version = '';
              var vArray = [];
              for (var i = 0; i < filter.length; i++) {
                 var index = ua.indexOf(filter[i]);
                 if (index > -1) {
                    switch(i){
                       case 0:
                          platform['iphone']=true;
                          break;
                       case 1:
                          platform['adnroid']=true;
                          break;  
                    }
                    var len = filter[i].length;
                    version = ua.substr(index + len, 6);
                    vArray = version.split( /_|\./ );
                 }
              }
              return{
                 'iphone':platform['iphone'],
                 'android':platform['adnroid'],
                 'version':vArray
              }
        }(),

        //ios4及以下定位
        _slide:function(){


          //ios
          if(init._browser.iphone){
            $('body > div').addClass('ios');
          }

          function Scroll(event) {
            init.btn.css({
              'opacity':'1',
              '-webkit-transition':'opacity 3s linear ',
            })
                }
                function touchMove(event) {
                  init.btn.css({
                    'opacity':'0',
                    'top':window.innerHeight + window.scrollY - 80 + 'px',
                    '-webkit-transition':'none',
                  })
                }

              if((init._browser.iphone && Number(init._browser.version[0]+'.'+init._browser.version[1]) < 5) || (init._browser.android && Number(init._browser.version[0]+'.'+init._browser.version[1]) <= 2.1)){
                //alert('ios');
                window.addEventListener('scroll', Scroll, false);
                document.addEventListener('touchmove', touchMove, false);   
                
              }
        },

        //main屏幕定位
        _maintop:function(){
          mainTop();
          $(window).bind('scroll touchend resize',function(){   
            mainTop();
          })
          function mainTop(){
            init.main.css({
              'top':window.innerHeight + window.scrollY - 230
            })
          } 

        },

        //接收消息
        _msg:function(){
          var _checkSysType =  _environment.init();
          var ajaxurl = 'http://'+_checkSysType+'.taobao.com/indexHeaderAjax.htm?callback=?';

          $.ajax({
            url:ajaxurl,
            type:'post',
            dataType:'json',
            //crossDomain:true,
            success:function(json){
              //console.log('成功')
              var result = json.result, //结果，true / false
                totalMsgCount = json.totalMsgCount, //总消息数目
                taobaoRadioMsgCount = json.taobaoRadioMsgCount, //推推消息数目
                wwMsgCout = json.wwMsgCout, //旺旺消息数目
                logisticsMsgCount = json.logisticsMsgCount; //物流消息数目

              if(result){
                var oDiv = $('#J_Taojia'),
                  ww = oDiv.find('.ww a'),
                  logis = oDiv.find('.logis a');

                //消息为0的时候不显示数字，消息大于10的时候现实为‘N’
                if(wwMsgCout > 0){
                  wwMsgCout >= 10 ? ww.append('<strong class="num">N</strong>') : ww.append('<strong class="num">'+wwMsgCout+'</strong>');
                }
                if(logisticsMsgCount){
                  logisticsMsgCount >= 10 ? logis.append('<strong class="num">N</strong>') : logis.append('<strong class="num">'+logisticsMsgCount+'</strong>');
                }

                //来消息记录cookie；
                var strcookie = document.cookie;
                // edit by caochun,strcookie.indexOf('wwmsg=')判断会存在文字,线上cookie有lastgetwwmsg,匹配就不正确
                if(!strcookie || strcookie.match(/wwmsg=\d+/) == null){   
                  document.cookie = "wwmsg="+0 +'&';            
                  document.cookie = "logismsg="+0 +'&';
                  strcookie = document.cookie;
                }
                //console.log(strcookie.match(/wwmsg=\d+/)[0].split('=')[1])
                var wwmsg = Number(strcookie.match(/wwmsg=\d+/)[0].split('=')[1]);
                var logismsg = Number(strcookie.match(/logismsg=\d+/)[0].split('=')[1]);
                if(wwmsg != wwMsgCout && logismsg == logisticsMsgCount){//只有旺旺消息的时候
                  document.cookie ="wwmsg="+wwMsgCout +'&';
                  getwwmsg();
                  that.getmsg();
                }

                if(logismsg != logisticsMsgCount && wwmsg == wwMsgCout){//只有物流消息的时候
                  document.cookie ="logismsg="+logisticsMsgCount +'&';

                  getlogismsg();
                  that.getmsg();
                }
                if(logismsg != logisticsMsgCount && wwmsg != wwMsgCout){//既有旺旺消息又有物流消息，先显示物流的动画，在现实往往旺旺的动画
                  var timer = null;           
                  document.cookie ="logismsg="+logisticsMsgCount +'&';
                  getlogismsg();
                  that.getmsg();
                  timer = setTimeout(function(){
                    document.cookie ="wwmsg="+wwMsgCout +'&';
                    getwwmsg();
                    that.getmsg();
                  },6000);
                }
                
              }

            },
            error:function(xhr, type){
              //console.log('网络连接失败')
            }
          })        


          function getwwmsg(){
            $('#J_btnmsg').removeClass('logisaction').addClass('wwaction');
            $('#J_btnmsg').html('w');
            $('#J_Taojia').find('.taoplus-btn-iconbox ul').addClass('btnact');
            //console.log('来旺旺消息了，扑通扑通扑通')
          }

          function getlogismsg(){
            $('#J_btnmsg').removeClass('wwaction').addClass('wwaction');
            $('#J_btnmsg').html('q');
            $('#J_Taojia').find('.taoplus-btn-iconbox ul').addClass('btnact');
            //console.log('来物流消息了，扑通扑通扑通')
          }
        }
      }

      init._slide();init._maintop();init._msg();that._switched();
      

    },

    //来消息动画
    getmsg:function(){
      var oDiv = $('#J_Taojia').find('.taoplus-btn-iconbox ul'),
        msg = $('#J_btnmsg'),
        timer = null;
        

      timer = setInterval(function(){
        var left = oDiv[0].offsetLeft;
        oDiv.addClass('btnact');
        if(left <= -96){
          clearInterval(timer);
          oDiv.removeClass('btnact')
          oDiv.css('left',0);
        }else{
          oDiv.css('left',left-48);
        }
      },2000)
    },

    //加入购物车
    shopcar:function(img){
      var src = img;
      var img = '<div class="taoplus-goimg"><img src="' + src + '"/></div>'
      var taojia = $('#J_Taojia');
      var gocar = '<div class="taoplus-gocar">u</div>'
      var timer = null;
      $('#J_btnmsg').html('u');
      that.getmsg();
      taojia.append(img,gocar)
      
      timer = setTimeout(function(){

        $('.taoplus-gocar').css({
          'right':'250px',
          'opacity':'0'
        })
      },1800)
    },

    //事件动画
    _switched:function(){
      var that = this;
      var init = {
        taojiaTouch : $('#J_Taojia').find('.taoplus-btn'),
        taojiaLogo : $('#J_Taojia').find('.biglogo').find('a'),
        taojiaIcons : $('#J_Taojia').find('.icons').find('a'),

        btn:function(){
          //点击tao+
          init.taojiaTouch.click(function(){
            var t= new Date().getTime();
            var t2 = Number($(this).attr('data-time'));
            if(t-t2 >=600){//防止快速不停点
              $(this).attr('data-time',t);
              
              if(that.st() == 1){
                that.circlBg(1);
                that._opt.onShow && that._opt.onShow();
              }else if(that.st() == 2){
                that.circlBg(0);
                that._opt.onHide && that._opt.onHide();
              }
            };
          })

          //点击icons--
          init.taojiaIcons.click(function(e){   
            var self = $(this);
            var _Href = self.attr('data-url');
            var name = self.attr('name');
            timer = setTimeout(function(){
              that.circlHide2();
              that._opt.onIconClick && that._opt.onIconClick(name);
              window.location.href = _Href;
            },500);     
          })

          //点击中间的LOGO--动画
          init.taojiaLogo.click(function(e){  
            var _Href = $(this).attr('data-url');
            timer = setTimeout(function(){
              that.circlHide2();
              TaoJia._opt.onLogoClick && TaoJia._opt.onLogoClick();
              window.location.href = _Href;
            },500);   
          })
        }

      }

      init.btn()
    },

    //圆盘动画
    circlBg:function(st){
      var that =this;
      var init = {        
        taojiaDiv : $('#J_Taojia'),
        taojiaTouch : $('#J_Taojia').find('.taoplus-btn'),
        taojiaCircle : $('#J_Taojia').find('.taoplus-main'),
        circlBg : $('#J_Taojia').find('.circlbg'),
        circlLogo : $('#J_Taojia').find('.biglogo'),
        taojiaLogo : $('#J_Taojia').find('.biglogo').find('a'),
        taojiaIcons : $('#J_Taojia').find('.icons').find('a'),
        taojiaIconBg : $('#J_Taojia').find('.backgrounds').find('li'),
        timer : null,
        num : 0,
      

        //淘+ icon 展示
        taojiaIconShow:function(){
          init.taojiaTouch.removeClass('hide').addClass('on');
        },

        //淘+ icon 隐藏
        taojiaIconHide:function(){
          init.taojiaTouch.removeClass('on').addClass('hide');
        },

        //大圆盘展现动画
        circlShow:function(){
          //isCircle = true;
          timer = setTimeout(init.circlAllShow,0);
          timer = setTimeout(init.circlBgShow,0);
          timer = setTimeout(init.circlIconShow,100);
          timer = setTimeout(init.circlLogoShow,200);
        },

        //大圆盘消失动画
        circlHide:function(){
          //isCircle = true;
          timer = setTimeout(init.circlIconHide,0);
          timer = setTimeout(init.circlLogoHide,0);
          timer = setTimeout(init.circlBgHide,300);
          timer = setTimeout(init.circlAllHide,400);
        },

        //大圆盘整体出现
        circlAllShow:function(){
          init.taojiaCircle.addClass('show')
        },

        //大圆盘整体消失
        circlAllHide:function(){
          init.taojiaCircle.removeClass('show')
        },

        //大圆盘大背景展现
        circlBgShow:function(){
          init.circlBg.addClass('show');
        },

        //大圆盘大背景消失
        circlBgHide:function(){
          init.circlBg.removeClass('show');
        },

        //大圆盘logo展现
        circlLogoShow:function(){
          init.circlLogo.addClass('show');
        },

        //大圆盘logo消失
        circlLogoHide:function(){
          init.circlLogo.removeClass('show');
        },

        //大圆盘icons展现
        circlIconShow:function(){
          var timer = null,
            speed = 25,

          timer = setInterval(function(){
            var oIconShow = $('#J_Taojia .icons').find('.show'),
              oLi = $('#J_Taojia .icons li'),
              oA = $('#J_Taojia .icons').find('a'),
              oBgLi = $('#J_Taojia .backgrounds li'),
              oLS = oIconShow.size(),
              oLA = oA.size();
            if(oLS <= 0){
              $(oLi[oLA-1]).removeClass('hide').addClass('show');
              $(oBgLi[oLA-1]).removeClass('o').addClass('gray');
              oA.removeClass('on');
            }else if(oLS > 0 && oLS < oLA){
              $(oLi[oLA-oLS-1]).removeClass('hide').addClass('show');
              $(oBgLi[oLA-oLS-1]).removeClass('o').addClass('gray');
              $(oBgLi[oLA-oLS-1]).siblings('li').removeClass('gray');
              oA.removeClass('on');
            }else if(oLS == oLA){
              oBgLi.removeClass('gray')
              clearInterval(timer);
            }
          },speed)
        },

        //大圆盘icons消失
        circlIconHide:function(){
          var speed = 25;

          timer = setInterval(function(){
            var oIconHIde = $('#J_Taojia .icons').find('.hide'),
              oLi = $('#J_Taojia .icons li'),
              oA = $('#J_Taojia .icons').find('a'),
              oBgLi = $('#J_Taojia .backgrounds li'),
              oLS = oIconHIde.size(),
              oLA = oA.size();
            if(oLS <= 0){
              $(oLi[0]).removeClass('show').addClass('hide');
              $(oBgLi[0]).removeClass('o').addClass('gray');
            }else if(oLS > 0 && oLS < oLA){
              $(oLi[oLS]).removeClass('show').addClass('hide');
              $(oBgLi[oLS]).removeClass('o').addClass('gray');
              $(oBgLi[oLS]).siblings('li').removeClass('gray');
            }else if(oLS == oLA){
              oBgLi.removeClass('gray');
              clearInterval(timer);
            }
          },speed)
        },

        //淘+ 大圆盘整体消失方案2--普通消失
        circlHide2:function(){
          var timer = null,
            speed = 20;
            timer = setTimeout(function(){
              init.taojiaTouch.removeClass('hide').addClass('on');
              init.taojiaCircle.find('.show').removeClass('show');
              init.taojiaCircle.find('.o').removeClass('o');
              init.taojiaCircle.removeClass('show')
          },speed)
        } 

      }

      /*1为显示，0为隐藏*/
      if($($('body > div')[0]).hasClass('ios')){
        if(st==1){      
          init.circlShow();
          init.taojiaIconHide();
        }else if(st==0){
          init.circlHide();
          init.taojiaIconShow();
        }
      }else{
        if(st==1){        
          init.circlAllShow();
          init.taojiaIconHide();      
        }else if(st==0){  
          init.circlAllHide();
          init.taojiaIconShow();
        }

      }

    },

    //记录淘+状态
    st:function(){
      var init = {
        btn:$('#J_Taojia .taoplus-btn'),
        taojia:$('#J_Taojia'),
        st:function(){
          if(init.taojia.attr('style') == 'none'){
            return 0;
          }else if(init.btn.hasClass('on')){
            return 1;
          }else if(init.btn.hasClass('hide')){
            return 2;
          }
        }
      }
      return init.st()
    },
    
    taojiaHide : function(){
      $('#J_Taojia').hide();
      this.circlBg(0);
    },

    taojiaShow : function(){
      $('#J_Taojia').show();
    },

    circlHide : function(){
      this.circlBg(0);
    },

    circlHide2 : function(){
      var taojiaTouch = $('#J_Taojia').find('.taoplus-btn'),
        taojiaCircle = $('#J_Taojia').find('.taoplus-main'),
        timer = null,
        speed = 20;
        timer = setTimeout(function(){
          taojiaTouch.removeClass('hide').addClass('on');
          taojiaCircle.find('.show').removeClass('show');
          taojiaCircle.find('.o').removeClass('o');
          taojiaCircle.removeClass('show')
      },speed)
    }
  };

  TaoJia = H5.TaoPlus;

})(Zepto);
(function($) {
  
  $.fn.folder = function(options) {
    var defaults = {
      triggerEl:  '.trigger',
      foldableEl: '.foldable'
    };

    var options = _.extend(defaults, options);

    this.each(function() {
      var $this = $(this);
      var trigger  = $this.find('.trigger');
      var foldable = $this.find('.foldable');
      trigger.on('click', function(e) {
        if (foldable.hasClass('fold')) {
          foldable.show().removeClass('fold');
          trigger.find('.arrow').removeClass('down').addClass('up');
        } else {
          foldable.hide().addClass('fold');
          trigger.find('.arrow').removeClass('up').addClass('down');
        }
      });
    });

    return this;
  };

})(Zepto);
(function($) {

  App.Item = Backbone.Model.extend({
    
    available: function() {
      return this.get('available');
    }
    
  });

})(Zepto);
(function($) {

  App.Order = Backbone.Model.extend({
    
    defaults: {
      'counted': false
    },

    initialize: function() {
      this.itemList = new App.ItemList(this.get('items'), { order: this });
    },

    toJSON: function() {
      return _.extend(_.clone(this.attributes), 
                      { availItems: this.itemList.availItems() });
    }
    
  });
  
})(Zepto);
(function($) {

  App.ItemList = Backbone.Collection.extend({

    model: App.Item,

    initialize: function(models, options) {
      this.order = options.order;
    },

    availItems: function() {
      return this.filter(function(item) { return item.available(); });
    }

  });

})(Zepto);


(function($) {

  App.OrderList = Backbone.Collection.extend({

    model: App.Order,

    countedOrders: function() {
      return this.filter(function(order) { return order.get('counted'); });
    },

    countedOrdersTotalPrice: function() {
      var total = 0;
      _.each(this.countedOrders(), function(order) {
        _.each(order.itemList.availItems(), function(item) {
          total += item.get('subtotal');
        });
      });
      return total;
    }

  });

})(Zepto);
(function() {
  this.JST || (this.JST = {});
  this.JST["templates/checkout"] = function(obj){var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="summary">\n  <p>对 <span id="counted-orders">', countedOrders.length ,'</span> 个卖家进行结算</p>\n  <p>商品总价(不含运费): <span id="total-price">￥ ', totalPrice.toFixed(2) ,'</span></p>\n</div>\n\n<div class="action">\n  <form id="place-order-form" action="', placeOrderUrl ,'" method="POST">\n    <input id="cart-ids" type="hidden" name="cart_id">\n    <input id="checkout-btn" type="submit" value="结 算">\n  </form>\n</div>\n');}return __p.join('');};
}).call(this);
(function() {
  this.JST || (this.JST = {});
  this.JST["templates/empty_cart"] = function(obj){var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="empty-cart">\n  <div class="cart-logo">\n  </div>\n  <header>\n    <h1>你的购物车里没有宝贝</h1>\n  </header>\n  <ul class="list">\n    <li><a href="', indexUrl ,'">去购物</a><span class="arrow right"></span></li>\n    <li><a href="', goFavUrl ,'">查看我的收藏夹</a><span class="arrow right"></span></li>\n  </ul>\n</div>\n');}return __p.join('');};
}).call(this);
(function() {
  this.JST || (this.JST = {});
  this.JST["templates/item"] = function(obj){var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="pic">\n  '); if (available && link) { __p.push('\n    <a href="', link ,'"> <img src="', image + '_90x90.jpg' ,'" /></a>\n  '); } else { __p.push('\n    <img src="', image + '_90x90.jpg' ,'" />\n  '); } __p.push('\n</div>\n<div class="desc">\n  '); if (available) { __p.push('\n    <a class="name" href="', link ,'">', title ,'</a>\n    <p class="props">', props ,'</p>\n    <p>\n      <input class="quantity" type="number" value="', quantity ,'" min="1" max="999999" />\n      <span class="subtotal">￥', subtotal.toFixed(2) ,'</span>\n      <span class="trash"></span>\n    </p>\n  '); } else { __p.push('\n    <p class="name">', title ,'</p>\n    <p>\n      <span class="prompt">已失效，请删除</span>\n      <span class="trash"></span>\n    </p>\n  '); } __p.push('\n</div>\n<div class="float-remove" style="display: none; opacity: 0;">\n  <span class="remove">删除</span>\n  <span class="loading" style="display: none;"></span>\n</div>\n');}return __p.join('');};
}).call(this);
(function() {
  this.JST || (this.JST = {});
  this.JST["templates/order"] = function(obj){var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<header>\n  <h1 class="shop">\n    <input type="checkbox" ', counted ? 'checked' : '' ,'>\n    <span class="trigger">\n      <strong class="name">卖家: ', shop ,'（<em class="avail-item-count">', availItems.length ,'</em>）</strong><b class="arrow up"></b></span>\n  </h1>\n</header>\n<div class="info foldable">\n  '); if (event) { __p.push('\n    <a href="', event.link ,'" class="event">', event.text ,'</a>\n  '); } __p.push('\n</div>\n');}return __p.join('');};
}).call(this);
(function($) {

  App.CheckoutView = Backbone.View.extend({

    className: 'checkout',
    template: JST['templates/checkout'],

    events: {
      'click #checkout-btn': 'checkout'
    },

    initialize: function() {
      this.collection.on('recalculate', this.render, this);

      $('.func-btn').click(_.bind(this.checkout, this));
    },

    render: function() {
      var data = {
        countedOrders: this.collection.countedOrders(),
        totalPrice: this.collection.countedOrdersTotalPrice(),
        placeOrderUrl: App.data.placeOrderUrl
      }
      this.$el.html(this.template(data));
      return this;
    },

    checkout: function(e) {
      e.preventDefault();
      if ($('.func-btn').hasClass('disabled')) return null;

      var countedOrders = this.collection.countedOrders();
      if (countedOrders.length > 0) {
        var cartIds = [];
        _.each(countedOrders, function(order) {
          _.each(order.itemList.availItems(), function(item) {
            cartIds.push(item.get('cartId'));
          });
        });

        if (cartIds.length == 0) {
          H5.notify("请选择包含有效商品的卖家进行结算");
          return;
        }

        this.$('#cart-ids').val(cartIds.join());
        this.$('#place-order-form').submit();

      } else {
        H5.notify("请选择需要结算的卖家");
      }
    }

  });

})(Zepto);
(function($) {

  App.ItemListView = Backbone.View.extend({
    
    tagName: 'ul',

    initialize: function(options) {
    },

    render: function() {
      this.addAll();
      return this;
    },

    addOne: function(item) {
      var view = new App.ItemView({ model: item });
      this.$el.append(view.render().el);
    },

    addAll: function() {
      this.collection.each(this.addOne, this);
    }

  });

})(Zepto);
(function($) {
  
  App.ItemView = Backbone.View.extend({

    tagName: 'li',
    className: 'item',
    template: JST['templates/item'],

    events: {
      'swipeLeft': 'showOverlay',
      'swipeRight': 'hideOverlay',
      'click  .remove': 'removeCartItem',
      'click  .trash' : 'toggleOverlay',
      'change input.quantity': 'updateQuantity'
    },

    initialize: function() {
      if (!this.model.available()) this.$el.addClass('unavailable');

      // https://github.com/madrobby/zepto/issues/315
      // this.$el.on('touchmove', function(e) { e.preventDefault(); });
      this.model.view = this;

      this.model.on('change:subtotal', this.render, this);
      this.model.on('change:quantity', this.render, this);
    },

    render: function() {
      var content = this.template(this.model.toJSON());
      this.$el.html(content);
      
      return this;
    },

    updateQuantity: function() {
      var val = $.trim(this.$('input.quantity').val());
      if (/^[1-9]\d{0,5}$/.test(val)) {
        this.udpateCartItem(val);
      } else {
        this.render();
      }
    },

    getCartIds: function() {
      var self = this;
      return _.reject(this.model.collection.pluck('cartId'), function(cartId) {
        return cartId == self.model.get('cartId');
      }).join('|');
    },

    udpateCartItem: function(quantity) {
      var self = this;

      $.ajax({
        url: App.data.updateItemUrl,
        type: 'POST',
        dataType: 'json',
        data: {
          'item_id':  self.model.get('itemId'),
          'quantity': quantity,
          'cart_id':  self.model.get('cartId'),
          'cartIds':  self.getCartIds()
        },
        error: function() {
          self.render();
          H5.notify('网络连接失败，请刷新页面重试'); 
        },
        success: function(data) {
          if (data.status == "true") {

            self.model.set('quantity', quantity);

            if (data.group && data.group.length > 0) {  // items' price change
              _.each(data.group, function(newItem) {
                self.model.collection.each(function(item) {
                  // newItem.price is actually subtotal of item
                  if (item.get('cartId') == newItem.cartId) item.set('subtotal', newItem.price);
                });
              });
            }

            App.orderList.trigger('recalculate');

          } else {  // data.status == "false"
            self.render();
            if (data.max) H5.notify('宝贝只剩 ' + data.max + ' 个，请重新选择购买数量');
            else H5.notify(data.error);
          }
        }
      });
    },

    showLoading: function() {
      this.$('.remove').hide();
      this.$('.loading').show();
    },

    hideLoading: function() {
      this.$('.loading').hide();
    },

    removeCartItem: function() {
      this.showLoading();
      var self = this;

      $.ajax({
        url: App.data.removeItemUrl,
        type: 'POST',
        dataType: 'json',
        data: {
          'item_id':  self.model.get('itemId'),
          'cart_id':  self.model.get('cartId'),
          'cartIds':  self.getCartIds()
        },
        error: function() {
          self.render();
          H5.notify("网络连接失败，请刷新页面重试");
        },
        success: function(data) {
          if (data.status == "true") {

            var itemList = self.model.collection;
            if (data.group && data.group.length > 0) {  // items' price change
              _.each(data.group, function(newItem) {
                itemList.each(function(item) {
                  if (item.get('cartId') == newItem.cartId) item.set('subtotal', newItem.price);
                });
              });
            }

            itemList.remove(self.model);
            itemList.order.trigger('remove');

            self.$el.remove();

            App.orderList.trigger('recalculate');

          } else {  // data.status == "false"
            self.render();
            data.error && H5.notify(data.error);
          }
        }
      });

    },

    toggleOverlay: function() {
      var $overlay = this.$('.float-remove');
      $overlay.css('opacity') > 0 ? this.hideOverlay() : this.showOverlay();
    },

    showOverlay: function() {
      App.orderList.trigger('hideOverlays');
      this.$('.float-remove').show().animate({ opacity: .6 }, 200, 'ease-in');
    },

    hideOverlay: function() {
      var $overlay = this.$('.float-remove');
      $overlay.css('opacity') > 0 && $overlay.animate({ opacity: 0 }, 200, 'ease-in', function() { $(this).hide(); });
    }

  });

})(Zepto);
(function($) {

  App.OrderListView = Backbone.View.extend({
    
    className: 'order-list',

    events: {
    
    },

    initialize: function() {
      this.collection.on('hideOverlays', this.hideOverlays, this);

      this.collection.on('remove', this.checkIfOrderListEmpty, this);
    },

    render: function() {
      this.addAll();
      return this;
    },

    addOne: function(shop) {
      var view = new App.OrderView({ model: shop });
      this.$el.append(view.render().el);
    },

    addAll: function() {
      this.collection.each(this.addOne, this);
    },

    hideOverlays: function() {
      this.collection.each(function(order) {
        order.itemList.each(function(item) {
          item.view.hideOverlay();
        });
      });
    },

    checkIfOrderListEmpty: function() {
      if (this.collection.length == 0) {
        var content = JST['templates/empty_cart']({ indexUrl: App.data.indexUrl,
                                                    goFavUrl: App.data.goFavUrl });
        $('.content').html(content);

        $('.func-btn').addClass('disabled');
      }
    }

  });

})(Zepto);
(function($) {
  
  App.OrderView = Backbone.View.extend({

    tagName: 'section',
    className: 'order',
    template: JST['templates/order'],

    events: {
      'click input[type="checkbox"]': 'toggleOrderStatus'
    },

    initialize: function() {
      this.model.on('change:counted', this.calcTotal, this);
      this.model.on('remove', this.updateOrder, this);
    },

    render: function() {
      var content = this.template(this.model.toJSON());
      this.$el.html(content).folder();
      this.renderItemList();
      return this;
    },

    updateOrder: function() {
      if (this.model.itemList.length == 0) {
        this.model.collection.remove(this.model);
        this.remove();
      } else {
        this.$('.avail-item-count').text(this.model.itemList.availItems().length);
      }
    },

    renderItemList: function() {
      var view = new App.ItemListView({ collection: this.model.itemList });
      this.$('.info').append(view.render().el);
    },

    toggleOrderStatus: function() {
      this.model.get('counted') ? 
        this.model.set('counted', false) :
        this.model.set('counted', true);
    },

    calcTotal: function() {
      this.model.collection.trigger('recalculate')
    }
    
  });

})(Zepto);
(function($) {

  App.Router = Backbone.Router.extend({
    routes: {
      '': 'index'
    },

    initialize: function() {

      if (App.data.taoPlus) {
        this.initTaoPlus();
      }

      if (App.data.orderList == null || App.data.orderList.length == 0) {
        var content = JST['templates/empty_cart']({ indexUrl: App.data.indexUrl,
                                                    goFavUrl: App.data.goFavUrl });
        $('.content').html(content);
        
        $('.func-btn').addClass('disabled');
        return null;
      }

      App.orderList = new App.OrderList(App.data['orderList']);
      App.orderList.at(0).set({ 'counted': true });
      App.orderListView = new App.OrderListView({ collection: App.orderList });
      $('.content').append(App.orderListView.render().el);
      $('.order .trigger').trigger('click'); // fold all orders
      $('.order:first-child .trigger').trigger('click'); // unfold first order

      App.checkoutView = new App.CheckoutView({ collection: App.orderList });
      $('.content').append(App.checkoutView.render().el);

      if (App.data['quantityUpdated']) {
        H5.notify("宝贝库存不足，购买数量已更改");
      }

      $(window).on('scroll', function() { App.orderList.trigger('hideOverlays'); });
      $(window).on('click', function(e) {
        if (!$(e.target).hasClass('float-remove') && !$(e.target).hasClass('trash')) 
          App.orderList.trigger('hideOverlays');
      });

    },

    index: function() {
      
    },

    initTaoPlus: function() {
      $('header').attr('id', 'header');
      $('.h5').attr('id', 'tbh5v0');

      var swipetop = new $.swipeTop({
        wrap: 'tbh5v0',
        toptabHeight : 0,
        headerHeight : 50
      });
    
      swipetop.setOp('taojia', H5.TaoPlus);

      H5.TaoPlus.initialize({
        onShow:function() {
          swipetop.tapDown();
        },
        onHide:function(){
          swipetop.tapDown();
        }
      });
    },

    start: function() {
      Backbone.history.start();
    }

  });

  //$(function() {
      $(window).on('data:success',function(){
          (new App.Router).start();
      })

  //});

})(Zepto);


//FIXME
//TODO
(function($){
    var appData = window.App.data;
    //判断version
    _version = localStorage.getItem("h5_cart_version");
    var version = _version ? parseInt(_version) : 0;
    //页面是刚刷新的数据为最新的数据
    if( parseInt(appData.version) > version ){
        localStorage.setItem("h5_cart_version",appData.version);
        localStorage.setItem("orderList",JSON.stringify(appData.orderList));
        _over();
    }else{
        var local_orderList = JSON.parse(localStorage.getItem("orderList"));
        //否则appData中的数据已经失效，需要考虑localstorage及异步
        if(navigator && !navigator.onLine){
            appData.orderList = local_orderList;
            _over();
        }else{
            Zepto('#J_Loading').show();
            Zepto.ajax({
                url : "ajax/cart_list.do",
                dataType : "json",
                success: function(data){
                    //跳转去登录环境
                    if(data && data.loginUrl){
                        window.location.href = data.loginUrl;
                        return;
                    }
                    if(data && data.orderList){
                        //merge data
                        var _jsonStr = JSON.stringify(data.orderList);
                        //var _orderStr = JSON.stringify(appData.orderList);
                        //console.log(_jsonStr);
                        //console.log(_orderStr);
                        //console.log(_jsonStr == _orderStr);
                        localStorage.setItem("orderList",_jsonStr);
                        localStorage.setItem("h5_cart_version",data.version);
                        //TODO
                        //window.location.href = window.location.href;
                        appData.orderList = data.orderList;
                    }
                    _over();
                },
                error: function(){
                    appData.orderList = local_orderList;
                    //Zepto(window).trigger('data:success');
                    _over();
                }});
        }
    }
    function _over(){
        Zepto('#J_Loading').remove();
        Zepto(window).trigger('data:success');
    }
})(Zepto);
