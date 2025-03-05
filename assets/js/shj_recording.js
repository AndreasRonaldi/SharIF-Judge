/**
 * SharIF Judge
 * @file shj_recording.js
 * author: Andreas Ronaldi <andreasronaldi25@gmail.com>
 * 
 *     Javascript codes for "Recording" page
 */

$(document).ready(() => {
	// ######################################################
	// ############           Variable           ############
	// ######################################################
	const editor = ace.edit("code_editor");
	const Range = ace.Range;
	let funcTimeout = null;

	editor.setOptions({
		theme: "ace/theme/monokai",
		fontSize: "11pt",
		readOnly: true,
		// enableLiveAutocompletion: true,
		// enableBasicAutocompletion: true,
		// enableSnippets: true,
	});

	const recording = {
		events: {},
		curIndex: Date.now() + "",
		duration: -1,
		save_state: [],

		reset: () => {
			recording.events = {};
			recording.curIndex = Date.now() + "";
			recording.duration = -1;
			recording.save_state = [];
		},
	};

	const handlers = {
		insert: (args) => {
			// console.log([args.start.row, args.start.column]);
			// console.log("Testing: ", JSON.stringify(args.data.join("\n")), ".");
			// setSelection(editor, [args.start.row, args.start.column]);
			editor.session.replace(
				new ace.Range(
					args.start.row,
					args.start.column,
					args.start.row,
					args.start.column
				),
				args.data.join("\n")
			);
			// editor.selection.fromJSON({ start: args.start, end: args.start });
			// editor.insert(args.data.join(".\n."), -1);
			// editor.execCommand("insertstring", "a");
			// editor.session.insert("a");
			// editor.session.insert(
			// 	{ row: args.start.row, column: args.start.column },
			// 	args.data
			// ),
		},
		remove: (args) =>
			editor.session.remove({ start: args.start, end: args.end }),
		cursor_selection: (args) => setSelection(editor, args),
		sel_selection: (args) => setSelection(editor, args),
		focus: (args) => {},
		blur: (args) => {},
		visibility: (args) => {},
		pdf_focus: (args) => {},
		pdf_blur: (args) => {},
		input_change: (args) => $("#editor_input").val(args),
		output_change: (args) => $("#editor_output").val(args),
		save: (args) => {},
		submit: (args) => {},
		execute: (args) => {},
	};

	// ######################################################
	// ############          Main Method         ############
	// ######################################################

	const getRecording = () => {
		recording.reset();
		emptyEditor();
		
		console.log("GETTING recording/download_record/" + rec_path);

		$.ajax({
			type: "GET",
			url: shj.site_url + "recording/download_record/" + rec_path,
			cache: false,
			success: (data) => {
				console.log(data);
				recording.events = data;

				$("select#rec_selection").empty();
				// get first curIndex
				Object.keys(data).forEach((c) => {
					// Push to the selection
					$(
						`<option value=${c}>Saved ${c}</option>`
					).appendTo("select#rec_selection");

					recording.curIndex = recording.curIndex < c ? recording.curIndex : c;
				});
			},
			error: function (error) {
				console.error(error);
			},
		});
	};

	const playRecording = (index) => {
		let events = recording.events[recording.curIndex];
		if (index >= events.length) return;

		let event = events[index];
		let timeDiff = event.time - (index - 1 < 0 ? 0 : events[index - 1].time);

		handlers[event.event](event.args);
		console.log(timeDiff, events[index]);

		while (timeDiff <= 0) {
			index++;
			event = events[index];
			timeDiff = event.time - events[index - 1].time;
			handlers[event.event](event.args);
		}

		funcTimeout = setTimeout(() => {
			playRecording(index + 1);
		}, timeDiff);
	};

	const stopRecording = () => {
		clearTimeout(funcTimeout);
	}

	// ######################################################
	// ############           Listener           ############
	// ######################################################

	$("select#rec_selection").change((e) => {
		stopRecording();
		recording.curIndex = e.currentTarget.value;
	})

	$("#rec_play").click(() => {
		emptyEditor();
		let firstIndex = recording.events[recording.curIndex].findIndex(
			(c) => c.time > 0
		);

		playRecording(firstIndex);
	});

	$("#rec_stop").click(() => {
		stopRecording();
	});

	// ######################################################
	// ############          Misc Method         ############
	// ######################################################

	function setSelection(editor, data) {
		let x = data;
		let start = { row: x[0], column: x[1] };
		let end = x.length == 2 ? start : { row: x[2], column: x[3] };
		let isBackwards = Range.comparePoints(start, end) > 0;
		editor.selection.fromJSON(
			isBackwards
				? {
						start: end,
						end: start,
						isBackwards: true,
				  }
				: {
						start: start,
						end: end,
						isBackwards: true,
				  }
		);
	}

	const emptyEditor = () => {
		editor.session.setValue("", -1);
	}

	// ######################################################
	// ############            Runner            ############
	// ######################################################

	getRecording();
});
