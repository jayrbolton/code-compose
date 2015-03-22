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

