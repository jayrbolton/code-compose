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

