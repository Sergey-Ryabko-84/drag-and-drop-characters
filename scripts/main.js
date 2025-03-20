const cellSize = 40
const mainContainer = document.getElementById("main-container")
let gridColumns = 0
let draggedChar = null
let groupDragData = null

// Generate grid based on container size
function createGrid() {
	mainContainer.innerHTML = ""
	const containerWidth = mainContainer.clientWidth
	const containerHeight = mainContainer.clientHeight
	gridColumns = Math.floor(containerWidth / cellSize)
	const rows = Math.floor(containerHeight / cellSize)
	const totalCells = gridColumns * rows

	mainContainer.style.gridTemplateColumns = `repeat(${gridColumns}, ${cellSize}px)`

	for (let i = 0; i < totalCells; i++) {
		const cell = document.createElement("div")
		cell.className = "cell"
		cell.dataset.index = i
		cell.addEventListener("dragover", dragOverHandler)
		cell.addEventListener("dragleave", dragLeaveHandler)
		cell.addEventListener("drop", dropHandler)
		cell.addEventListener("click", cellClickHandler)
		mainContainer.appendChild(cell)
	}
}

window.addEventListener("load", createGrid)
window.addEventListener("resize", createGrid)

// Handle text input and character placement
const submitButton = document.getElementById("submit-button")
submitButton.addEventListener("click", (e) => {
	e.preventDefault()
	const text = document.getElementById("text-input").value
	const cells = mainContainer.querySelectorAll(".cell")
	cells.forEach((cell) => (cell.innerHTML = ""))
	for (let i = 0; i < cells.length && i < text.length; i++) {
		const charSpan = document.createElement("span")
		charSpan.className = "char"
		charSpan.textContent = text[i]
		charSpan.draggable = true
		charSpan.addEventListener("dragstart", dragStartHandler)
		cells[i].appendChild(charSpan)
	}
})

function clearAllSelections() {
	const selected = document.querySelectorAll(".char.selected")
	selected.forEach((el) => el.classList.remove("selected"))
}

// Handle character selection
function cellClickHandler(e) {
	if (!this.firstChild) {
		clearAllSelections()
		return
	}
	const charEl = this.firstChild
	if (e.ctrlKey) {
		charEl.classList.toggle("selected")
	} else {
		clearAllSelections()
		charEl.classList.add("selected")
	}
}

// Handle character dragging
function dragStartHandler(e) {
	if (!this.classList.contains("selected")) {
		clearAllSelections()
		this.classList.add("selected")
	}
	draggedChar = this
	e.dataTransfer.setData("text/plain", "")

	const selectedChars = document.querySelectorAll(".char.selected")
	if (selectedChars.length > 1) {
		let positions = []
		let minRow = Infinity,
			minCol = Infinity
		selectedChars.forEach((char) => {
			const cell = char.parentElement
			const index = parseInt(cell.dataset.index, 10)
			const row = Math.floor(index / gridColumns)
			const col = index % gridColumns
			positions.push({ char, row, col })
			if (row < minRow) minRow = row
			if (col < minCol) minCol = col
		})
		groupDragData = { positions, base: { row: minRow, col: minCol } }
	} else {
		groupDragData = null
	}
}

function dragOverHandler(e) {
	e.preventDefault()
	e.dataTransfer.dropEffect = "move"
	this.classList.add("drag-over")
}

function dragLeaveHandler(e) {
	this.classList.remove("drag-over")
}

function dropHandler(e) {
	e.preventDefault()
	this.classList.remove("drag-over")
	const targetCell = this
	const sourceCell = draggedChar ? draggedChar.parentElement : null

	if (groupDragData) {
		const targetIndex = parseInt(targetCell.dataset.index, 10)
		const targetRow = Math.floor(targetIndex / gridColumns)
		const targetCol = targetIndex % gridColumns
		groupDragData.positions.forEach((item) => {
			const offsetRow = item.row - groupDragData.base.row
			const offsetCol = item.col - groupDragData.base.col
			const newRow = targetRow + offsetRow
			const newCol = targetCol + offsetCol
			const newIndex = newRow * gridColumns + newCol
			const newCell = mainContainer.querySelector(
				`.cell[data-index='${newIndex}']`
			)
			if (newCell) {
				if (
					newCell.firstChild &&
					!newCell.firstChild.classList.contains("selected")
				) {
					const tempChar = newCell.firstChild
					newCell.removeChild(tempChar)
					item.char.parentElement.appendChild(tempChar)
				}
				if (item.char.parentElement) {
					item.char.parentElement.removeChild(item.char)
				}
				newCell.appendChild(item.char)
			}
		})
	} else if (draggedChar) {
		if (targetCell === sourceCell) return
		if (targetCell.firstChild && draggedChar) {
			const targetChar = targetCell.firstChild
			sourceCell.removeChild(draggedChar)
			targetCell.removeChild(targetChar)
			sourceCell.appendChild(targetChar)
			targetCell.appendChild(draggedChar)
		} else if (draggedChar) {
			sourceCell.removeChild(draggedChar)
			targetCell.appendChild(draggedChar)
		}
	}
	draggedChar = null
	groupDragData = null
}

// Selection box logic
let isSelecting = false
let selectionStart = { x: 0, y: 0 }
let selectionRect = null

// Start selection if clicking on an empty area or an empty cell
mainContainer.addEventListener("mousedown", function (e) {
	if (
		e.target === mainContainer ||
		(e.target.classList.contains("cell") && !e.target.firstChild)
	) {
		isSelecting = true
		selectionStart = { x: e.pageX, y: e.pageY }
		selectionRect = document.createElement("div")
		selectionRect.className = "selection-rect"
		selectionRect.style.left = `${selectionStart.x}px`
		selectionRect.style.top = `${selectionStart.y}px`
		selectionRect.style.width = "0px"
		selectionRect.style.height = "0px"
		document.body.appendChild(selectionRect)
		if (!e.ctrlKey) {
			clearAllSelections()
		}
	}
})

// Update selection box size on mouse move
document.addEventListener("mousemove", function (e) {
	if (isSelecting && selectionRect) {
		const currentX = e.pageX
		const currentY = e.pageY
		const rectLeft = Math.min(selectionStart.x, currentX)
		const rectTop = Math.min(selectionStart.y, currentY)
		const rectWidth = Math.abs(selectionStart.x - currentX)
		const rectHeight = Math.abs(selectionStart.y - currentY)
		selectionRect.style.left = `${rectLeft}px`
		selectionRect.style.top = `${rectTop}px`
		selectionRect.style.width = `${rectWidth}px`
		selectionRect.style.height = `${rectHeight}px`
	}
})

// End selection on mouse release and highlight characters inside the selection box
document.addEventListener("mouseup", function (e) {
	if (isSelecting && selectionRect) {
		const selRect = selectionRect.getBoundingClientRect()
		const cells = document.querySelectorAll(".cell")
		cells.forEach((cell) => {
			if (cell.firstChild && cell.firstChild.classList.contains("char")) {
				const charRect = cell.firstChild.getBoundingClientRect()
				if (
					!(
						charRect.right < selRect.left ||
						charRect.left > selRect.right ||
						charRect.bottom < selRect.top ||
						charRect.top > selRect.bottom
					)
				) {
					cell.firstChild.classList.add("selected")
				}
			}
		})
		if (selectionRect.parentElement) {
			selectionRect.parentElement.removeChild(selectionRect)
		}
		selectionRect = null
		isSelecting = false
	}
})

// Cleanup remaining selection boxes
document.addEventListener("click", function (e) {
	const rects = document.querySelectorAll(".selection-rect")
	rects.forEach((rect) => {
		if (rect.parentElement) {
			rect.parentElement.removeChild(rect)
		}
	})
})
