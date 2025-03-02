document.addEventListener('DOMContentLoaded', e => {
	const fileSelector = document.getElementById('file-selector');
	fileSelector.addEventListener('change', (event) => {
		const fileList = event.target.files;

		for (const file of fileList) {
			// Not supported in Safari for iOS.
			const name = file.name ? file.name : 'NOT SUPPORTED';
			// Not supported in Firefox for Android or Opera for Android.
			const type = file.type ? file.type : 'NOT SUPPORTED';
			// Unknown cross-browser support.
			const size = file.size ? file.size : 'NOT SUPPORTED';

			if (file.type && !file.type.startsWith('application/x-webarchive')) {
				console.log('File is not a webarchive.', file.type, file);
				return;
			}

			const reader = new FileReader();
			reader.addEventListener('load', (event) => {
				const buffer = event.target.result;

				// Header
				const headerBuffer = buffer.slice(0, 8);
				const headerArray = new Uint8Array(headerBuffer);
				const headerString = String.fromCharCode.apply(null, headerArray)
				console.debug(headerString, buffer.byteLength);

				// Trailer
				const trailerBuffer = buffer.slice(buffer.byteLength - 32, buffer.byteLength);
				const trailerArray = new Uint8Array(trailerBuffer);
				let trailer = {};
				trailer.sort_version = trailerArray[5];
				trailer.offset_table_offset_size = trailerArray[6];
				trailer.object_ref_size = trailerArray[7];
				trailer.num_objects = parseInt(new DataView(trailerBuffer.slice(8, 16)).getBigUint64());
				trailer.top_object_offset = parseInt(new DataView(trailerBuffer.slice(16, 24)).getBigUint64());
				trailer.offset_table_start = parseInt(new DataView(trailerBuffer.slice(24, 32)).getBigUint64());
				console.debug(trailer);

				// Object table

				// Offset table

			});
			reader.readAsArrayBuffer(file);

		}

	});

});
