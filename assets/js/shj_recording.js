$(document).ready(() => {
	const editor = ace.edit("code_editor");
	const Range = ace.Range;

	editor.setOptions({
		theme: "ace/theme/monokai",
		fontSize: "11pt",
		readOnly: true,
		// enableLiveAutocompletion: true,
		// enableBasicAutocompletion: true,
		// enableSnippets: true,
	});

	const recording = {
		events: [],
		diration: -1,
		save_state: [],

		reset: () => {
			recording.events = [];
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

	let funcTimeout = null;

	const playRecording = (index) => {
		// Get first index in recording that is more than "startTime"
		// let firstIndex = recording.events.findIndex((c) => c.time > startTime);

		// Finish...
		if (index >= recording.events.length) return;

		let event = recording.events[index];
		let timeDiff =
			event.time - (index - 1 < 0 ? 0 : recording.events[index - 1].time);

		handlers[event.event](event.args);
		// console.log(timeDiff, recording.events[index]);

		while (timeDiff <= 10) {
			index++;
			event = recording.events[index];
			timeDiff = event.time - recording.events[index - 1].time;
			handlers[event.event](event.args);
		}

		funcTimeout = setTimeout(() => {
			playRecording(index + 1);
		}, timeDiff);
	};

	$("#rec_play").click(() => {
		recording.reset();
		editor.session.setValue("Starting...", -1);

		$.ajax({
			type: "GET",
			url: shj.site_url + "recording/proto/test.json",
			// cache: false,
			success: (data) => {
				data = JSON.parse(data);
				recording.events = data.events;

				editor.session.setValue(data.startValue);
				setSelection(editor, data.startSelection);

				// console.log(recording);
				let firstIndex = recording.events.findIndex((c) => c.time > 0);

				playRecording(firstIndex);
				// playRecording(883);
			},
			error: function (error) {
				console.error(error);
			},
		});
	});

	$("#rec_stop").click(() => {
		clearTimeout(funcTimeout);
	});

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
});
