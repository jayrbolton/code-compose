var save_as = require('./FileSaver').saveAs
var app = require('view-script')


var wrapper_el = document.querySelector('.notation')
var content_el = document.querySelector('#notation-canvas')
var width = wrapper_el.offsetWidth

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
	resize_canvas_wrapper()
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


app.def('load_file_from_input', function(node) {
	var file = document.querySelector("#loadFile").files[0]
	app.load_from_file(file)
})


app.def('load_from_file', function(file) {
	var reader = new FileReader()
	reader.readAsText(file)
	reader.onload = function(e) {
		editor.setValue(reader.result)
		app.render_vextab(editor.getValue())
	}
})


var editor = ace.edit("editor")
window.editor = editor


app.render_vextab(editor.getValue())

editor.commands.addCommand({
	name: 'save',
	bindKey: {win: "Ctrl-s", mac: "Command-s"},
	exec: function(editor) {
		save_as(new Blob([editor.getValue()], {type: 'text/plain;charset=utf8'}), app.file_save_path)
	}
})

editor.commands.addCommand({
	name: 'render',
	bindKey: {win: 'Ctrl-Space', mac: "Command-Space"},
	exec: function(editor) {
		app.render_vextab(editor.getValue())
	}
})

editor.commands.addCommand({
	name: 'load',
	bindKey: {win: 'Ctrl-o', mac: 'Command-o'},
	exec: function(editor) {
		document.querySelector('#loadFile').click()
	}
})

editor.commands.addCommand({
	name: 'hide_menus',
	bindKey: {win: 'Ctrl-m', mac: 'Command-m'},
	exec: function(editor) {
		if(app.menus_hidden) app.def('menus_hidden', false)
		else app.def('menus_hidden', true)
	}
})

function resize_canvas_wrapper() {
	wrapper_el.offsetHeight = document.body.offsetHeight
}

