(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/big/j/code/vextab-live-compose/js/FileSaver.js":[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 2015-03-04
 *
 * By Eli Grey, http://eligrey.com
 * License: X11/MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs
  // IE 10+ (native saveAs)
  || (typeof navigator !== "undefined" &&
      navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator))
  // Everyone else
  || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof navigator !== "undefined" &&
	    /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0
				, false, false, false, false, 0, null
			);
			node.dispatchEvent(event);
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		// See https://code.google.com/p/chromium/issues/detail?id=375297#c7 and
		// https://github.com/eligrey/FileSaver.js/commit/485930a#commitcomment-8768047
		// for the reasoning behind the timeout and revocation flow
		, arbitrary_revoke_timeout = 500 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			if (view.chrome) {
				revoker();
			} else {
				setTimeout(revoker, arbitrary_revoke_timeout);
			}
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, FileSaver = function(blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (target_view) {
						target_view.location.href = object_url;
					} else {
						var new_tab = view.open(object_url, "_blank");
						if (new_tab == undefined && typeof safari !== "undefined") {
							//Apple do not allow window.open, see http://bit.ly/1kZffRI
							view.location.href = object_url
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				save_link.href = object_url;
				save_link.download = name;
				click(save_link);
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				revoke(object_url);
				return;
			}
			// prepend BOM for UTF-8 XML and text/plain types
			if (/^\s*(?:text\/(?:plain|xml)|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				blob = new Blob(["\ufeff", blob], {type: blob.type});
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			// Update: Google errantly closed 91158, I submitted it again:
			// https://code.google.com/p/chromium/issues/detail?id=389642
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
									revoke(file);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name) {
			return new FileSaver(blob, name);
		}
	;
	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
  define([], function() {
    return saveAs;
  });
}

},{}],"/home/big/j/code/vextab-live-compose/js/index.js":[function(require,module,exports){
var save_as = require('./FileSaver').saveAs
var app = require('view-script')


var content_el = document.querySelector('#notation-canvas')
var width = document.querySelector('.notation-content').offsetWidth

var Renderer = Vex.Flow.Renderer

renderer = new Renderer(content_el, Renderer.Backends.CANVAS)
artist = new Artist(20, 20, width + width/5, {scale: 0.8, space: 20})
var vextab = new VexTab(artist)


app.def('render_vextab', function(text) {
	try {
		vextab.reset()
		artist.reset()
		vextab.parse(text)
		artist.render(renderer)
		app.def('error_message', null)
	} catch(e) {
		app.def('error_message', e.message.replace(/[\n]/g, '<br>'))
	}
})


app.def('set_editor_mode', function(mode) {
	editor.setKeyboardHandler("ace/keyboard/" + mode)
})


app.def('set_editor_font_size', function(size) {
	document.querySelector("#editor").style.fontSize = size
})


app.def('file_save_path', 'vextab.txt')

app.def('save_code', function() {
	save_as(new Blob([editor.getValue()], {type: 'text/plain;charset=utf8'}), app.file_save_path)
})


app.def('load_from_file', function(val, node) {
	var reader = new FileReader()
	var file = app.prev_elem(node).files[0]
	reader.readAsText(file)
	reader.onload = function(e) {
		editor.setValue(reader.result)
	}
})


var editor = ace.edit("editor")
window.editor = editor

editor.getSession().on('change', function(e) {
	app.render_vextab(editor.getValue())
})


app.render_vextab(editor.getValue())
	editor.commands.addCommand({
		name: 'save',
		bindKey: {win: "Ctrl-s", mac: "Command-s"},
		exec: function(editor) {
			save_as(new Blob([editor.getValue()], {type: 'text/plain;charset=utf8'}), app.file_save_path)
		}
	})


},{"./FileSaver":"/home/big/j/code/vextab-live-compose/js/FileSaver.js","view-script":"/home/big/j/code/vextab-live-compose/node_modules/view-script/index.js"}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/index.js":[function(require,module,exports){
var each_node = require('./lib/each_node'),
	copy = require('./lib/copy'),
	iter = require('./lib/iter'),
	parse = require('./lib/parse'),
	flatten_keys = require('./lib/flatten_keys'),
	unflatten_keys = require('./lib/unflatten_keys'),
	evaluate = require('./lib/evaluate'),
	get_keys = require('./lib/get_keys'),
	prev_elem = require('./lib/prev_elem')

var app = module.exports = { _bindings: {}, _scopes: {}}

app.view = function(expr, node) { return evaluate(expr, this, node) }
app.v = app.view


app.def = function() {
	var self = this, node = arguments[arguments.length-1], obj

	if(arguments[0].constructor === Object)
		obj = arguments[0]
	else if(typeof arguments[0] === 'string')
		obj = unflatten_keys(arguments[0], arguments[1])
	else return self

	for(var key in obj) {
		if(obj[key] && obj[key].constructor === Object && self[key] && self[key].constructor === Object) {
			if(self.hasOwnProperty(key)) {
				copy.deep(obj[key], self[key])
			} else { // Make a complete copy so we do not affect objects in parents and siblings
				self[key] = copy.deep(obj[key], copy.deep(self[key]))
			}
		} else {
			self[key] = obj[key]
		}
	}

	iter.each(flatten_keys(obj), function(key) {
		if(self._bindings[key])
			iter.each(self._bindings[key], function(n) {
				var result = evaluate(n.textContent.slice(1), self, n)
			})
	})
	return self
}


app.def_lazy = function(key, fn) {
	this.def(key, { _lazy: fn })
}


app.render = function(node) {
	var self = this

	each_node(node, function(n) {
		var cont = true

		if(n.nodeType === 8 && n.textContent[0] === '=') { // nodeType 8 == comment
			var keys = get_keys(n.textContent.slice(1))
			iter.each(keys, function(k) {
				self._bindings[k] = self._bindings[k] || []
				if(self._bindings[k].indexOf(n) === -1) self._bindings[k].push(n)
			})

			var result = evaluate(n.textContent.slice(1), self, n)
			if(result && result.skip) cont = false
		}

		return cont
	})

	return self
}


app.clear_bindings = function() {
	this._bindings = {}
	return this
}


// Inherit a view & namespace the parent
// scope_name is optional
app.scope = function(scope_name, node) {

	if(scope_name && node) {
		if(!node.parentNode) return
		var existing = this._scopes[scope_name],
			parent = node.parentNode

		if(existing)
			existing.push(parent)
		else
			this._scopes[scope_name] = [parent]

		// We only need to save the scope once per pageload
		parent.removeChild(node)
		delete this._bindings.scope
		return {skip: true}
	}

	var child_view = Object.create(this)
	child_view.parent = this
	child_view._scopes = {}
	child_view._bindings = {}

	if(scope_name && this._scopes[scope_name] !== undefined) {
		iter.each(this._scopes[scope_name], function(el) {
			child_view.render(el)
		})
	}

	else { // Inheret bindings and scopes
		child_view._bindings = Object.create(this._bindings)
		child_view._scopes = Object.create(this._scopes)
	}

	return child_view
}


app.def('set_at', function(arr_key, index, val, node) {
	var arr = this.v(arr_key, node)
	copy.deep(val, arr[index])
	this.def(arr_key, arr)
})


// Default view helpers

app.def('no_op', function() {})
app.def('id', function(x) { return x })

app.def('put', function() {
	var node = arguments[arguments.length-1]
	if(!node) return

	if(arguments.length <= 1) return

	var exprs = iter.slice(arguments, 0, arguments.length-1),
		interp = node.nextSibling

	if(!interp || interp.className !== 'deja-put') {
		interp = document.createElement('span')
		interp.className = 'deja-put'
		node.parentNode.insertBefore(interp, node.nextSibling)
	}

	interp.innerHTML = String(exprs)
	return exprs
})


// Array funcs

app.def('concat', function(arr1_key, arr2, node) {
	var arr1 = this.v(arr1_key, node)
	this.def(arr1_key, arr1.concat(arr2))
	return arr1
})


app.def('push', function(val, arr_key, node) {
	var arr = this.v(arr_key, node)
	if(!arr.length) arr = []
	arr.push(val)
	this.def(arr_key, arr)
	return arr
})


app.def('pop', function(arr_key, node) {
	var arr = this.v(arr_key, node),
		val = arr.pop()
	this.def(arr_key, arr)
	return val
})


app.def('show_if', function(pred, node) {
	if(!node) return
	if(pred)
		prev_elem(node).style.display = ''
	else
		prev_elem(node).style.display = 'none'
})


app.def('hide_if', function(pred, node) {
	if(!node) return
	if(pred)
		prev_elem(node).style.display = 'none'
	else
		prev_elem(node).style.display = ''
})


app.def('repeat', function(arr, node) {
	var self = this, parent = node.parentNode
	if(!node || !parent || !parent.parentNode) return

	parent.style.display = 'none'
	parent.removeChild(node) // Re-inserted at the bottom of this fn

	if(parent.parentNode.className.indexOf('deja-repeat') !== -1 || parent.parentNode.children.length === 1) {
		var wrapper = parent.parentNode
		wrapper.className += ' deja-repeat'
		while(wrapper.children.length > 1) wrapper.removeChild(wrapper.lastChild)
	} else {
		var wrapper = parent.nextSibling
		if(!wrapper || wrapper.className !== 'deja-repeat') {
			wrapper = document.createElement('span')
			wrapper.className = 'deja-repeat'
			parent.parentNode.insertBefore(wrapper, parent.nextSibling)
		}
		else while(wrapper.firstChild) wrapper.removeChild(wrapper.firstChild)
	}

	iter.each(arr, function(x, i) {
		var cloned = parent.cloneNode(true)
		cloned.style.display = ''
		var child = self.scope()
			.clear_bindings()
			.def('i', i)
			.def('each', x)
			.def(x)
			.render(cloned)
		wrapper.appendChild(cloned)
	})

	parent.insertBefore(node, parent.firstChild)
	return {skip: true}
})


app.def('add', function() {
	return sum(args_without_node(arguments))
})

app.def('sub', function() {
	return diff(args_without_node(arguments))
})

app.def('mul', function() {
	return prod(args_without_node(arguments))
})

app.def('divide', function(x,y) { return x/y })

app.def('incr', function(key, node) {
	var val = Number(this.v(key, node))
	if(val === undefined) return
	this.def(key, ++val)
	return val
})

app.def('decr', function(key, node) {
	var val = Number(this.v(key, node))
	if(val === undefined) return
	this.def(key, --val)
	return val
})

app.def('cat', function() {
	return iter.fold(args_without_node(arguments), '',
		function(str, term) { return str += term })
})


app.def_lazy('on', function(events) {
	if(arguments.length <= 2) return
	var node = arguments[arguments.length-1]
	if(!node) return

	var self = this,
		args = arguments,
		prev_node = prev_elem(node),
		terms = args_without_node(args).slice(1)

	events = self.v(events, node)
	if(!(events instanceof Array)) events = [events]

	iter.each(events, function(ev) {
		prev_node['on' + ev] = function(e) {
			e.preventDefault()
			iter.each(terms, function(t) { self.v(t, node) })
		}
	})
})


app.def('add_class', function(class_name, node) {
	if(!node) return
	add_class(prev_elem(node), class_name)
})

app.def('remove_class', function(class_name, node) {
	if(!node) return
	remove_class(prev_elem(node), class_name)
})

app.def('has_class', function(class_name, node) {
	if(!node) return
	has_class(prev_elem(node), class_name)
})

app.def('toggle_class', function(class_name, node) {
	if(!node) return
	if(has_class(prev_elem(node), class_name))
		remove_class(prev_elem(node), class_name)
	else
		add_class(prev_elem(node), class_name)
})

app.def('add_class_if', function(pred, class_name, node) {
	if(!node) return
	if(pred)
		add_class(prev_elem(node), class_name)
	else
		remove_class(prev_elem(node), class_name)
})

app.def('set_attr_if', function(pred, attr_key, attr_val, node) {
	if(!node) return
	if(pred)
		prev_elem(node).setAttribute(attr_key, attr_val)
	else
		prev_elem(node).removeAttribute(attr_key, attr_val)
})

app.def('set_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).setAttribute(key, val)
})

app.def('get_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).getAttribute(key, val)
})

app.def('has_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).has_attribute(key, val)
})

app.def('get_value', function(node) {
	if(!node) return
	return prev_elem(node).value
})

app.def('set_value', function(val, node) {
	if(!node) return
	if(val === undefined || val === null)
		prev_elem(node).value = ''
	else
		prev_elem(node).value = val
})

app.def('text_content', function(node) {
	return prev_elem(node).textContent
})

app.def('inner_html', function() {
	var node, content
	if(arguments.length === 1) {
		node = prev_elem(arguments[0])
	} else {
		content = arguments[0]
		node = prev_elem(arguments[1])
	}
	if(content) node.innerHTML = content
	return node.innerHTML
})

app.def('form_data', function(node) {
	if(!node) return
	return new FormData(node.parentNode)
})

app.def('empty',  function(arr) {
	return !arr || !arr.length
})

app.def('length', function(arr) {
	return (arr ? arr.length : 0)
})

app.def('tail', function(arr) {
	return arr.slice(1)
})

app.def('init', function(arr) {
	return arr.slice(0, arr.length-1)
})

app.def('head', function(arr) {
	return arr[0]
})

app.def('reload', function() {
	window.location.reload()
})

app.def('redirect', function(url) {
	window.location.href = url
})

app.def('stringify', function(obj) {
	return JSON.stringify(obj)
})

app.def('log', function() {
	console.log.apply(console, args_without_node(arguments))
})


app.def('form_object', function(node) {
	if(!node) return
	var result = {}
	each_node(node.parentNode, function(n) {
		if(n.nodeType === 1 && (n.nodeName ===  'INPUT' || n.nodeName === 'TEXTAREA' || n.nodeName === 'SELECT') && n.hasAttribute('name')) {
			var name = n.getAttribute('name'), existing = result[n.getAttribute('name')]
			if(existing === undefined)
				result[name] = n.value
			else {
				if(result[name] instanceof Array) result[name].push(n.value)
				else result[name] = [result[name], n.value]
			}
		}
		return true
	})
	return result
})

app.def('toggle', function(key, node) {
	var existing = this.v(key, node)
	if(existing === undefined) {
		this.def(key, arguments[1])
		return
	}

	for(var i = 1; i < arguments.length; ++i) {
		if(existing === arguments[i]) {
			var index = (i+1) % arguments.length
			if(index === 0) index = 1
			this.def(key, arguments[index])
			return
		}
	}

	this.def(key, arguments[1])
	return this.v(key, node)
})


app.def('style', function(style_rule, val, node) {
	if(!node) return
	prev_elem(node).style[style_rule] = val
})


app.def_lazy('if', function(predicate, then_expr) {
	var else_expr, node

	if(arguments.length === 4)
		else_expr = arguments[2], node = arguments[3]
	else
		node = arguments[2]

	if(this.v(predicate, node))
		return this.v(then_expr, node)
	else if(else_expr)
		return this.v(else_expr, node)
})


app.def_lazy('delay', function(ms, expr, node) {
	var self = this
	delay(self.v(ms, node), function() {
		self.v(expr, node)
	})
})


app.def('select_option', function(val, node) {
	if(!node) return
	var option = node.querySelector("option[value='" + val + "']")
	if(option) option.setAttribute('selected', 'selected')
})


app.def('not',  function(val) {return !val})

app.def('eq', function() {
	return compare(function(x, y) { return x == y }, args_without_node(arguments), this)
})

app.def('<', function() {
	return compare(function(x, y) { return x < y }, args_without_node(arguments), this)
})

app.def('>', function() {
	return compare(function(x, y) { return x > y }, args_without_node(arguments), this)
})

app.def('<=', function() {
	return compare(function(x, y) { return x <= y }, args_without_node(arguments), this)
})

app.def('>=', function() {
	return compare(function(x, y) { return x >= y }, args_without_node(arguments), this)
})


app.def('all', function() {
	var args = args_without_node(arguments)
	for(var i = 0; i < args.length; ++i)
		if(!args[i]) return false

	return args[args.length-1]
})


app.def('any', function() {
	var args = args_without_node(arguments)
	for(var i = 0; i < args.length; ++i)
		if(args[i]) return args[i]

	return args[args.length-1]
})


app.def('obj_to_url_params', function(obj) {
	var str = ''
	for(var key in obj) str += '&' + key + '=' + obj[key]
	str = str.replace(/^&/, '?')
	return str
})


app.render(document.body)


// Utilities

function args_without_node(args) {
	return iter.slice(args, 0, args.length-1)
}

function sum(ns) {
	return iter.fold(ns, 0, function(sum, n) {return sum+n})
}

function diff(ns) {
	return iter.fold(ns, function(diff, n) {return diff-n})
}

function prod(ns) {
	return iter.fold(ns, 1, function(prod, n) {return prod*n})
}

function add_class(node, class_name) {
	if(!has_class(node, class_name)) node.className += ' ' + class_name
}

function remove_class(node, class_name) {
	node.className = node.className.replace(class_name, '')
}

function has_class(node, class_name) {
	return node.className.indexOf(class_name) !== -1
}

// N-ary general purpose comparator func
function compare(fn, args) {
	var last = args[0]
	for(var i = 1; i < args.length; ++i) {
		if(!fn(last, args[i])) return false
		last = args[i]
	} return true
}

// General purpose function delayer
var delay = (function() {
	var timer = 0
	return function(ms, callback) {
		clearTimeout(timer)
		timer = setTimeout(callback, ms)
	}
})()
var each_node = require('./lib/each_node'),
	copy = require('./lib/copy'),
	iter = require('./lib/iter'),
	parse = require('./lib/parse'),
	flatten_keys = require('./lib/flatten_keys'),
	unflatten_keys = require('./lib/unflatten_keys'),
	evaluate = require('./lib/evaluate'),
	get_keys = require('./lib/get_keys'),
	prev_elem = require('./lib/prev_elem')

var app = module.exports = { _bindings: {}, _scopes: {}}

app.view = function(expr, node) { return evaluate(expr, this, node) }
app.v = app.view


app.def = function() {
	var self = this, node = arguments[arguments.length-1], obj

	if(arguments[0].constructor === Object)
		obj = arguments[0]
	else if(typeof arguments[0] === 'string')
		obj = unflatten_keys(arguments[0], arguments[1])
	else return self

	for(var key in obj) {
		if(obj[key] && obj[key].constructor === Object && self[key] && self[key].constructor === Object) {
			if(self.hasOwnProperty(key)) {
				copy.deep(obj[key], self[key])
			} else { // Make a complete copy so we do not affect objects in parents and siblings
				self[key] = copy.deep(obj[key], copy.deep(self[key]))
			}
		} else {
			self[key] = obj[key]
		}
	}

	iter.each(flatten_keys(obj), function(key) {
		if(self._bindings[key])
			iter.each(self._bindings[key], function(n) {
				var result = evaluate(n.textContent.slice(1), self, n)
			})
	})
	return self
}


app.def_lazy = function(key, fn) {
	this.def(key, { _lazy: fn })
}


app.render = function(node) {
	var self = this

	each_node(node, function(n) {
		var cont = true

		if(n.nodeType === 8 && n.textContent[0] === '=') { // nodeType 8 == comment
			var keys = get_keys(n.textContent.slice(1))
			iter.each(keys, function(k) {
				self._bindings[k] = self._bindings[k] || []
				if(self._bindings[k].indexOf(n) === -1) self._bindings[k].push(n)
			})

			var result = evaluate(n.textContent.slice(1), self, n)
			if(result && result.skip) cont = false
		}

		return cont
	})

	return self
}


app.clear_bindings = function() {
	this._bindings = {}
	return this
}


// Inherit a view & namespace the parent
// scope_name is optional
app.scope = function(scope_name, node) {

	if(scope_name && node) {
		if(!node.parentNode) return
		var existing = this._scopes[scope_name],
			parent = node.parentNode

		if(existing)
			existing.push(parent)
		else
			this._scopes[scope_name] = [parent]

		// We only need to save the scope once per pageload
		parent.removeChild(node)
		delete this._bindings.scope
		return {skip: true}
	}

	var child_view = Object.create(this)
	child_view.parent = this
	child_view._scopes = {}
	child_view._bindings = {}

	if(scope_name && this._scopes[scope_name] !== undefined) {
		iter.each(this._scopes[scope_name], function(el) {
			child_view.render(el)
		})
	}

	else { // Inheret bindings and scopes
		child_view._bindings = Object.create(this._bindings)
		child_view._scopes = Object.create(this._scopes)
	}

	return child_view
}


app.def('set_at', function(arr_key, index, val, node) {
	var arr = this.v(arr_key, node)
	copy.deep(val, arr[index])
	this.def(arr_key, arr)
})


// Default view helpers

app.def('no_op', function() {})
app.def('id', function(x) { return x })

app.def('put', function() {
	var node = arguments[arguments.length-1]
	if(!node) return

	if(arguments.length <= 1) return

	var exprs = iter.slice(arguments, 0, arguments.length-1),
		interp = node.nextSibling

	if(!interp || interp.className !== 'deja-put') {
		interp = document.createElement('span')
		interp.className = 'deja-put'
		node.parentNode.insertBefore(interp, node.nextSibling)
	}

	interp.innerHTML = exprs.join(" ")
	return exprs
})


// Array funcs

app.def('concat', function(arr1_key, arr2, node) {
	var arr1 = this.v(arr1_key, node)
	this.def(arr1_key, arr1.concat(arr2))
	return arr1
})


app.def('push', function(val, arr_key, node) {
	var arr = this.v(arr_key, node)
	if(!arr.length) arr = []
	arr.push(val)
	this.def(arr_key, arr)
	return arr
})


app.def('pop', function(arr_key, node) {
	var arr = this.v(arr_key, node),
		val = arr.pop()
	this.def(arr_key, arr)
	return val
})


app.def('show_if', function(pred, node) {
	if(!node) return
	if(pred)
		prev_elem(node).style.display = ''
	else
		prev_elem(node).style.display = 'none'
})


app.def('hide_if', function(pred, node) {
	if(!node) return
	if(pred)
		prev_elem(node).style.display = 'none'
	else
		prev_elem(node).style.display = ''
})


app.def('repeat', function(arr, node) {
	var self = this, parent = node.parentNode
	if(!node || !parent || !parent.parentNode) return

	parent.style.display = 'none'
	parent.removeChild(node) // Re-inserted at the bottom of this fn

	if(parent.parentNode.className.indexOf('deja-repeat') !== -1 || parent.parentNode.children.length === 1) {
		var wrapper = parent.parentNode
		wrapper.className += ' deja-repeat'
		while(wrapper.children.length > 1) wrapper.removeChild(wrapper.lastChild)
	} else {
		var wrapper = parent.nextSibling
		if(!wrapper || wrapper.className !== 'deja-repeat') {
			wrapper = document.createElement('span')
			wrapper.className = 'deja-repeat'
			parent.parentNode.insertBefore(wrapper, parent.nextSibling)
		}
		else while(wrapper.firstChild) wrapper.removeChild(wrapper.firstChild)
	}

	iter.each(arr, function(x, i) {
		var cloned = parent.cloneNode(true)
		cloned.style.display = ''
		var child = self.scope()
			.clear_bindings()
			.def('i', i)
			.def('each', x)
			.def(x)
			.render(cloned)
		wrapper.appendChild(cloned)
	})

	parent.insertBefore(node, parent.firstChild)
	return {skip: true}
})


app.def('add', function() {
	return sum(args_without_node(arguments))
})

app.def('sub', function() {
	return diff(args_without_node(arguments))
})

app.def('mul', function() {
	return prod(args_without_node(arguments))
})

app.def('divide', function(x,y) { return x/y })

app.def('incr', function(key, node) {
	var val = Number(this.v(key, node))
	if(val === undefined) return
	this.def(key, ++val)
	return val
})

app.def('decr', function(key, node) {
	var val = Number(this.v(key, node))
	if(val === undefined) return
	this.def(key, --val)
	return val
})

app.def('cat', function() {
	return iter.fold(args_without_node(arguments), '',
		function(str, term) { return str += term })
})


app.def_lazy('on', function(events) {
	if(arguments.length <= 2) return
	var node = arguments[arguments.length-1]
	if(!node) return

	var self = this,
		args = arguments,
		prev_node = prev_elem(node),
		terms = args_without_node(args).slice(1)

	events = self.v(events, node)
	if(!(events instanceof Array)) events = [events]

	iter.each(events, function(ev) {
		prev_node['on' + ev] = function(e) {
			e.preventDefault()
			iter.each(terms, function(t) { self.v(t, node) })
		}
	})
})


app.def('add_class', function(class_name, node) {
	if(!node) return
	add_class(prev_elem(node), class_name)
})

app.def('remove_class', function(class_name, node) {
	if(!node) return
	remove_class(prev_elem(node), class_name)
})

app.def('has_class', function(class_name, node) {
	if(!node) return
	has_class(prev_elem(node), class_name)
})

app.def('toggle_class', function(class_name, node) {
	if(!node) return
	if(has_class(prev_elem(node), class_name))
		remove_class(prev_elem(node), class_name)
	else
		add_class(prev_elem(node), class_name)
})

app.def('add_class_if', function(pred, class_name, node) {
	if(!node) return
	if(pred)
		add_class(prev_elem(node), class_name)
	else
		remove_class(prev_elem(node), class_name)
})

app.def('set_attr_if', function(pred, attr_key, attr_val, node) {
	if(!node) return
	if(pred)
		prev_elem(node).setAttribute(attr_key, attr_val)
	else
		prev_elem(node).removeAttribute(attr_key, attr_val)
})

app.def('set_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).setAttribute(key, val)
})

app.def('get_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).getAttribute(key, val)
})

app.def('has_attr', function(key, val, node) {
	if(!node) return
	prev_elem(node).has_attribute(key, val)
})

app.def('get_value', function(node) {
	if(!node) return
	return prev_elem(node).value
})

app.def('set_value', function(val, node) {
	if(!node) return
	if(val === undefined || val === null)
		prev_elem(node).value = ''
	else
		prev_elem(node).value = val
})

app.def('form_data', function(node) {
	if(!node) return
	return new FormData(node.parentNode)
})

app.def('empty',  function(arr) {
	return !arr || !arr.length
})

app.def('length', function(arr) {
	return (arr ? arr.length : 0)
})

app.def('tail', function(arr) {
	return arr.slice(1)
})

app.def('init', function(arr) {
	return arr.slice(0, arr.length-1)
})

app.def('head', function(arr) {
	return arr[0]
})

app.def('reload', function() {
	window.location.reload()
})

app.def('redirect', function(url) {
	window.location.href = url
})

app.def('stringify', function(obj) {
	return JSON.stringify(obj)
})

app.def('log', function() {
	console.log.apply(console, args_without_node(arguments))
})


app.def('form_object', function(node) {
	if(!node) return
	var result = {}
	each_node(node.parentNode, function(n) {
		if(n.nodeType === 1 && (n.nodeName ===  'INPUT' || n.nodeName === 'TEXTAREA' || n.nodeName === 'SELECT') && n.hasAttribute('name')) {
			var name = n.getAttribute('name'), existing = result[n.getAttribute('name')]
			if(existing === undefined)
				result[name] = n.value
			else {
				if(result[name] instanceof Array) result[name].push(n.value)
				else result[name] = [result[name], n.value]
			}
		}
		return true
	})
	return result
})

app.def('toggle', function(key, node) {
	var existing = this.v(key, node)
	if(existing === undefined) {
		this.def(key, arguments[1])
		return
	}

	for(var i = 1; i < arguments.length; ++i) {
		if(existing === arguments[i]) {
			var index = (i+1) % arguments.length
			if(index === 0) index = 1
			this.def(key, arguments[index])
			return
		}
	}

	this.def(key, arguments[1])
	return this.v(key, node)
})


app.def('style', function(style_rule, val, node) {
	if(!node) return
	prev_elem(node).style[style_rule] = val
})


app.def('do', function() {
	var self = this, terms = args_without_node(arguments)
	return iter.map(terms, function(t) {return self.v(t)})
})


app.def_lazy('if', function(predicate, then_expr) {
	var else_expr, node

	if(arguments.length === 4)
		else_expr = arguments[2], node = arguments[3]
	else
		node = arguments[2]

	if(this.v(predicate, node))
		return this.v(then_expr, node)
	else if(else_expr)
		return this.v(else_expr, node)
})


app.def_lazy('delay', function(ms, expr, node) {
	var self = this
	delay(self.v(ms, node), function() {
		self.v(expr, node)
	})
})


app.def('select_option', function(val, node) {
	if(!node) return
	var option = prev_elem(node).querySelector("option[value='" + val + "']")
	if(option) option.setAttribute('selected', 'selected')
})


app.def('not',  function(val) {return !val})

app.def('eq', function() {
	return compare(function(x, y) { return x == y }, args_without_node(arguments), this)
})

app.def('<', function() {
	return compare(function(x, y) { return x < y }, args_without_node(arguments), this)
})

app.def('>', function() {
	return compare(function(x, y) { return x > y }, args_without_node(arguments), this)
})

app.def('<=', function() {
	return compare(function(x, y) { return x <= y }, args_without_node(arguments), this)
})

app.def('>=', function() {
	return compare(function(x, y) { return x >= y }, args_without_node(arguments), this)
})


app.def('all', function() {
	var args = args_without_node(arguments)
	for(var i = 0; i < args.length; ++i)
		if(!args[i]) return false

	return args[args.length-1]
})


app.def('any', function() {
	var args = args_without_node(arguments)
	for(var i = 0; i < args.length; ++i)
		if(args[i]) return args[i]

	return args[args.length-1]
})


app.def('obj_to_url_params', function(obj) {
	var str = ''
	for(var key in obj) str += '&' + key + '=' + obj[key]
	str = str.replace(/^&/, '?')
	return str
})


app.def('prev_elem', prev_elem)


app.render(document.body)


// Utilities

function args_without_node(args) {
	return iter.slice(args, 0, args.length-1)
}

function sum(ns) {
	return iter.fold(ns, 0, function(sum, n) {return sum+n})
}

function diff(ns) {
	return iter.fold(ns, function(diff, n) {return diff-n})
}

function prod(ns) {
	return iter.fold(ns, 1, function(prod, n) {return prod*n})
}

function add_class(node, class_name) {
	if(!has_class(node, class_name)) node.className += ' ' + class_name
}

function remove_class(node, class_name) {
	node.className = node.className.replace(class_name, '')
}

function has_class(node, class_name) {
	return node.className.indexOf(class_name) !== -1
}

// N-ary general purpose comparator func
function compare(fn, args) {
	var last = args[0]
	for(var i = 1; i < args.length; ++i) {
		if(!fn(last, args[i])) return false
		last = args[i]
	} return true
}

// General purpose function delayer
var delay = (function() {
	var timer = 0
	return function(ms, callback) {
		clearTimeout(timer)
		timer = setTimeout(callback, ms)
	}
})()


},{"./lib/copy":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/copy.js","./lib/each_node":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/each_node.js","./lib/evaluate":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/evaluate.js","./lib/flatten_keys":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/flatten_keys.js","./lib/get_keys":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/get_keys.js","./lib/iter":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/iter.js","./lib/parse":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/parse.js","./lib/prev_elem":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/prev_elem.js","./lib/unflatten_keys":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/unflatten_keys.js"}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/copy.js":[function(require,module,exports){
// mutating object copy utilities

var copy = module.exports = {}

copy.shallow = function(from, to) {
	to = to || {}
	for(var key in from) to[key] = from[key]
	return to
}

copy.deep = function(from, to) {
	to = to || {}
	var stack = [{from: from, to: to}]
	while(stack.length) {
		var current = stack.pop()
		for(var key in current.from) {
			if(current.from[key] && current.from[key].constructor === Object) {
				if(!current.to[key] || current.to[key].constructor !== Object)
					current.to[key] = current.from[key]
				stack.push({from: current.from[key], to: current.to[key]})
			}
			else
				current.to[key] = current.from[key]
		}
	}
	return to
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/deep_get.js":[function(require,module,exports){
// Get a possibly nested set of keys 
// eg. deep_get('x', {x: 1}) -> 1
// eg. deep_get('x.y', {x: {y: 1}}) -> 1
// eg. deep_get('x.y', {'x.y': 1}) -> 1
//
// Indexes on arrays
// eg. deep_get('xs.1', {xs: ['a','b','c']}) -> 'b'
//
// Use 'this' for an identity property, useful for self-referencing inside
// scopes
// eg. deep_get('this', 1) -> 1
// eg. deep_get('x.this', {x: 1}) -> 1
//
// You can do a shadowing scope type of deal by passing in a third param, your scope
// eg. deep_get('x', {y: 1, thing: {x: 9}}, 'thing') -> 1
// eg. deep_get('x', {x: 9, thing: {y: 1}}, 'thing') -> 9
// eg. deep_get('this', {x: 9, thing: {y: 1}}, 'thing') -> {y: 1}

module.exports = deep_get

function deep_get(keys, obj) {
	if(obj[keys]) return obj[keys]
	var current = obj, keys = keys.split('.')

	for(var i = 0; i < keys.length; ++i) {
		if(current === undefined || current === null) return
		if(!isNaN(keys[i])) keys[i] = Number(keys[i])
		if(current[keys[i]] !== undefined) current = current[keys[i]]
		else return
	}
	return current
}

},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/each_node.js":[function(require,module,exports){
// Traverse a DOM tree and apply functions to each node
// You can bail the traversal early from within the same node by returning
// false on the enter function. It'll bail on the currrent node's parent node's
// evaluation of all its children.

module.exports = each_node

function each_node(node, fn) {
	var stack = [node], level_width = 1
	while(stack.length) {
		var current = stack.pop()
		--level_width

		if(current.nodeType !== 3) { // skip text nodes
			if(fn(current)) {
				level_width = current.childNodes.length
				for(var i = current.childNodes.length-1; i >= 0; --i) // Eval top down
					stack.push(current.childNodes[i])
			} else {
				stack = stack.slice(0, stack.length-level_width)
			}
		}
	}
}

},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/err.js":[function(require,module,exports){

module.exports = err

function err(msg, comment) {
	console.log("[deja-view] Error:", msg, "at", comment)
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/evaluate.js":[function(require,module,exports){
var deep_get = require('./deep_get'),
	parse = require('./parse'),
	iter = require('./iter'),
	err = require('./err')

module.exports = evaluate


function evaluate(expr, view, node) {
	if(expr === undefined) return
	var stack = expr instanceof Array ? expr.reverse() : [expr], results = []

	while(stack.length) {
		var call = stack.pop()

		if(call === undefined)
			return err("Unable to evaluate " + expr, node)

		if(typeof call === 'string')
			handle_parse(call, stack, results, node)

		else if(call.hasOwnProperty('val'))
			results.push(call.val)

		else if(call.key !== undefined)
			retrieve_key(call, results, stack, view)

		else if(call.fn)
			apply_fn(call, results, view, node)

		else err("Unable to evaluate " + expr, node)
	}

	if(results.length === 0) return undefined
	if(results.length === 1) return results[0]
	else return results
}


function retrieve_key(call, results, stack, view) {
	var val = deep_get(call.key, view)

	// If we're on a lazy function, push all the un-evaluated terms from the stack
	// into the results and apply the function to those
	if(val && val._lazy && typeof val._lazy === 'function') {
		var param_len = call.len - call.pos - 1
		for(var i = 0; i < param_len; ++i) {
			var param = stack.pop()
			if(param.key) {
				param.len = stack.length-1
				param.pos = i
			}
			results.push(param)
		}
		stack.push({fn: val._lazy, param_len: param_len, key_name: call.key})
	}

	// Evaluate each of the arguments to the function before applying it
	else if(typeof val === 'function') {
		var param_len = call.len - call.pos - 1
		stack.splice(stack.length - param_len, 0, {
			fn: val, param_len: call.len - call.pos - 1, key_name: call.key
		})
	}

	else if(val === undefined && call.first)
		stack.splice(0, stack.length)

	else results.push(val)
}


function apply_fn(call, results, view, node) {
	if(call.param_len !== undefined)
		var args = results.splice(results.length - call.param_len, call.param_len)
	else args = results.splice(0)
	args.push(node)

	var view_apply = view.parent && call.key_name.indexOf("parent") ? view.parent : view

	results.push(call.fn.apply(view, args))
}


function handle_parse(expr, stack, results, node) {
	var sub_exprs = parse(expr, node)

	sub_exprs[0].first = true

	for(var i = sub_exprs.length-1; i >= 0; --i) {
		if(sub_exprs[i].key) {
			sub_exprs[i].len = sub_exprs.length
			sub_exprs[i].pos = i
		}
		stack.push(sub_exprs[i])
	}
}


},{"./deep_get":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/deep_get.js","./err":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/err.js","./iter":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/iter.js","./parse":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/parse.js"}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/flatten_keys.js":[function(require,module,exports){
// Return all the flat key names for an object
// eg: {a: 1, b: {c: 2, {d: 1}}, e: [{q: 'q'}, {q: 'q'}]} // -> ['a', 'b', 'b.c', 'b.c.d', 'e']
// This is useful for binding nested keys 'a.b.c' to change events

module.exports = flatten_keys

function flatten_keys(obj) {
	var stack = [[obj, '']], // a pair of current object level and current parent key name
		keys = []
	while(stack.length) {
		var next = stack.pop(), currentObj = next[0], parentKey = next[1], nestedKey
		for(var key in currentObj) {
			nestedKey = key
			if(parentKey.length) nestedKey = parentKey + '.' + nestedKey
			keys.push(nestedKey)
			if(currentObj[key] && currentObj[key].constructor === Object)
				stack.push([currentObj[key], nestedKey])
		}
	}
	return keys
}

},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/get_keys.js":[function(require,module,exports){
// Given a view s-expr, return all the keywords
// eg. "(add 1 (incr x))" -> ["add", "incr", "x"]

module.exports = get_keys
function get_keys(expr) {
	return expr
		.replace(/([\(\)])|(\d+(\.\d+)?)|('.+?')|(".+?")/g,'')
		.replace(/  +/, ' ')
		.trim().split(" ")
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/iter.js":[function(require,module,exports){
// Very simple & tiny browser-compatible map/fold/each/filter without the extras

var iter = module.exports = {}

iter.each = function(arr, fn) {
	if(!arr) return
	for(var i = 0; i < arr.length; ++i)
		fn(arr[i], i)
}


iter.map = function(arr, fn) {
	if(!arr) return []
	var result = []
	for(var i = 0; i < arr.length; ++i)
		result.push(fn(arr[i], i))
	return result
}


iter.fold = function(arr, x, y) {
	if(!arr) return init

	if(!y) var fn = x, init = arr[0], i = 1
	else   var fn = y, init = x,      i = 0

	var result = init
	for(var len = arr.length; i < len; ++i)
		result = fn(result, arr[i], i)
	return result
}


iter.filter = function(arr, pred) {
	if(!arr) return []
	var result = []
	for(var i = 0; i < arr.length; ++i)
		if(pred(arr[i], i)) result.push(arr[i])
	return result
}


iter.slice = function(arr, i, j) {
	var result = []
	if(i === undefined) i = 0
	if(j === undefined) j = arr.length

	for(var len = arr.length; i < j && i < len; ++i)
		result.push(arr[i])
	return result
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/parse.js":[function(require,module,exports){
// Convert a string expression into an array that evaluate() can use
// eg. "(add 1 (fn (decr x)))"  ->  ["add", 1, "(fn (decr x))"]

// Due to the evaluator's laziness, this is kind of a weird combination of a
// lexer/parser. We only lex/parse the very top level of the expression and
// pass in any sub-expressions unparsed.


module.exports = parse

function parse(expr, node) {
	if(expr === undefined) return []
	expr = expr.trim()
	
	var pos = 0, matches = []

	while(pos < expr.length) {

		// Eat whitespace and extra close parens
		if(expr[pos].match(/[\s)]/))
			++pos

		else {

			if(expr[pos].match(/["']/)) {
				var lookahead = find_delimiter(pos, expr, expr[pos]) + 1
				matches.push({val: expr.slice(pos + 1, lookahead - 1)})
			}

			else if(expr[pos] === '(') {
				var lookahead = find_scope(pos, expr)
				matches.push(expr.slice(pos + 1, lookahead - 1))
			}

			else {
				var lookahead = find_delimiter(pos, expr, /[\$\)\(\[\]" ]/),
					word = expr.slice(pos, lookahead)

				if(word === 'true' || word === 'false') matches.push({val: word === 'true'})
				else if(word === 'null') matches.push({val: null})
				else if(word === 'undefined') matches.push({val: undefined})
				else if(!isNaN(word)) matches.push({val: Number(word)})
				else matches.push({key: word})
			}

			pos = lookahead
		}
	}
	return matches
}


function find_scope(pos, str) {
	++pos
	for(var level = 1, len = str.length; level > 0 && pos <= len; ++pos) {
		if     (str[pos] === ')') --level
		else if(str[pos] === '(') ++level
	}
	return pos
}


function find_delimiter(pos, str, delimiter) {
	++pos
	while(pos < str.length && !str[pos].match(delimiter)) ++pos
	return pos
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/prev_elem.js":[function(require,module,exports){
// Return the previous actual element (not a text node) for a given node
// If there is no previous sibling, return the parent

module.exports = function prev_open_tag(node) {
	if(!node) return document.body
	var prev = node

	while(prev && prev.nodeType !== 1)
		prev = prev.previousSibling

	if(prev) return prev
	else return node.parentNode
}


},{}],"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/unflatten_keys.js":[function(require,module,exports){
var iter = require('./iter')

module.exports = function unflatten_keys(keyStr, val) {
	if(!keyStr || !keyStr.length) throw new Error("[deja-view] Invalid key used for accessing view data: " + keyStr)
	var keys = keyStr.split('.'), obj = {}, nested = obj
	for(var i = 0; i < keys.length - 1; ++i) {
		nested[keys[i]] = {}
		nested = nested[keys[i]]
	}
	nested[keys[keys.length-1]] = val
	return obj
}

},{"./iter":"/home/big/j/code/vextab-live-compose/node_modules/view-script/lib/iter.js"}]},{},["/home/big/j/code/vextab-live-compose/js/index.js"]);
